/**
 * Broadcast Camera System for Pyroball
 * =====================================
 * NBA 2K–inspired dynamic camera that tracks the ball carrier,
 * anticipates movement toward the attacking goal, and adjusts
 * zoom based on game context — all while keeping gameplay readable.
 *
 * The camera outputs a simple { panX, panY, zoom } transform that
 * is applied to the canvas BEFORE all rendering. The existing
 * perspective projection (project()) is untouched.
 *
 * Camera modes:
 *   OFFENSE   — tight tracking on ball carrier, offset toward goal
 *   TRANSITION — wider view when possession changes
 *   SCORING   — slight tighten near the goal area
 *   SHOT      — smooth focus on goal during active shots
 *   IDLE      — centered, default zoom (pre-game, countdown, etc.)
 *
 * Key design principles:
 *   1. Gameplay readability > cinematic effects
 *   2. Player-group framing ensures both teams stay visible
 *   3. Zoom-rate limiting prevents jarring scale jumps
 *   4. Conservative constants keep the camera subtle
 */

import { COURT } from './gameConstants';
import type { GameState, PlayerState } from './gameConstants';

// ---- Camera tuning constants ----
export const BROADCAST_CAM = {
  // Zoom levels (1.0 = full arena visible, higher = tighter)
  ZOOM_DEFAULT: 1.18,       // Slightly zoomed in for broadcast feel
  ZOOM_OFFENSE: 1.22,       // Tracking ball carrier
  ZOOM_TRANSITION: 1.12,    // Wider during turnovers / loose ball
  ZOOM_SCORING: 1.28,       // Tighter near goal for intensity
  ZOOM_SHOT: 1.30,          // Focus on goal during shots
  ZOOM_MAX: 1.35,           // Hard cap — never zoom tighter than this
  ZOOM_MIN: 1.08,           // Hard cap — never zoom wider than this

  // Smoothing (lerp factors per frame at 60fps)
  PAN_LERP: 0.14,           // How fast camera pans (higher = more responsive)
  ZOOM_LERP: 0.10,          // How fast camera zooms (higher = more responsive)
  ANTICIPATION: 0.10,       // How far ahead to look (fraction of court width)
  
  // Offset: how much to shift toward the attacking goal direction
  ATTACK_OFFSET_X: 60,      // Pixels to shift toward goal on offense
  ATTACK_OFFSET_Y: 0,       // Vertical offset (minimal for broadcast)

  // Boundaries: keep camera from showing too much off-field
  MAX_PAN_X: 120,           // Max horizontal pan from center
  MAX_PAN_Y: 40,            // Max vertical pan from center

  // Mode transition timing
  TRANSITION_HOLD: 0.5,     // Seconds to hold wide view on possession change

  // Zoom-rate limiting (prevents jarring scale jumps)
  MAX_ZOOM_RATE: 0.3,       // Max zoom change per second

  // Player-group framing: minimum visible margin around key players
  FRAMING_MARGIN: 60,       // Pixels of margin to keep around player group
  FRAMING_WEIGHT: 0.3,      // How much framing adjusts pan (0=ignore, 1=full)
} as const;

// ---- Camera mode enum ----
export type CameraMode = 'idle' | 'offense' | 'transition' | 'scoring' | 'shot';

// ---- Camera state (persists between frames) ----
export interface CameraState {
  // Current smoothed values (what's actually applied)
  panX: number;
  panY: number;
  zoom: number;

  // Target values (what we're lerping toward)
  targetPanX: number;
  targetPanY: number;
  targetZoom: number;

  // Mode tracking
  mode: CameraMode;
  lastPossessionTeam: string | null;
  transitionTimer: number;

  // Velocity tracking for anticipation
  lastBallX: number;
  lastBallY: number;
  ballVelX: number;
  ballVelY: number;
}

/** Create initial camera state */
export function createCameraState(): CameraState {
  return {
    panX: 0,
    panY: 0,
    zoom: BROADCAST_CAM.ZOOM_DEFAULT,
    targetPanX: 0,
    targetPanY: 0,
    targetZoom: BROADCAST_CAM.ZOOM_DEFAULT,
    mode: 'idle',
    lastPossessionTeam: null,
    transitionTimer: 0,
    lastBallX: COURT.WIDTH / 2,
    lastBallY: COURT.HEIGHT / 2,
    ballVelX: 0,
    ballVelY: 0,
  };
}

/**
 * Determine the current camera mode from game state.
 * Pure function — no side effects.
 */
export function determineCameraMode(gs: GameState, cam: CameraState): CameraMode {
  // Not playing → idle
  if (!gs.isPlaying || gs.countdown > 0) return 'idle';

  // Active shot in flight → shot mode
  if (gs.ball.carrier === null && gs.shotMeter?.active === false && gs.ball.vel &&
      (Math.abs(gs.ball.vel.x) > 2 || Math.abs(gs.ball.vel.y) > 2)) {
    // Ball is moving fast with no carrier — likely a shot in flight
    const bx = gs.ball.pos.x;
    if (bx < 100 || bx > COURT.WIDTH - 100) return 'shot';
  }

  // Shot meter charging → shot mode
  if (gs.shotMeter?.active) return 'shot';

  // Transition: possession just changed
  if (cam.transitionTimer > 0) return 'transition';

  // Near scoring zone (ball carrier within 200 units of either goal)
  const carrier = gs.ball.carrier !== null
    ? gs.players.find(p => p.id === gs.ball.carrier)
    : null;
  if (carrier) {
    const distToLeftGoal = carrier.pos.x;
    const distToRightGoal = COURT.WIDTH - carrier.pos.x;
    if (Math.min(distToLeftGoal, distToRightGoal) < 200) return 'scoring';
    return 'offense';
  }

  // Loose ball — transition-like wider view
  return 'transition';
}

/**
 * Get the focus point in GAME coordinates.
 * This is where the camera should be looking.
 */
function getFocusPoint(gs: GameState, mode: CameraMode): { gx: number; gy: number } {
  const carrier = gs.ball.carrier !== null
    ? gs.players.find(p => p.id === gs.ball.carrier)
    : null;

  if (mode === 'idle') {
    // Center of court
    return { gx: COURT.WIDTH / 2, gy: COURT.HEIGHT / 2 };
  }

  if (mode === 'shot') {
    // Focus between ball and nearest goal
    const bx = gs.ball.pos.x;
    const by = gs.ball.pos.y;
    const goalX = bx < COURT.WIDTH / 2 ? 0 : COURT.WIDTH;
    return {
      gx: (bx + goalX) / 2,
      gy: by,
    };
  }

  if (carrier) {
    // Track the ball carrier
    return { gx: carrier.pos.x, gy: carrier.pos.y };
  }

  // Loose ball — track ball position
  return { gx: gs.ball.pos.x, gy: gs.ball.pos.y };
}

/**
 * Calculate the anticipation offset based on ball velocity.
 * Shifts the camera slightly ahead of movement direction.
 */
function getAnticipationOffset(cam: CameraState, mode: CameraMode): { dx: number; dy: number } {
  if (mode === 'idle') return { dx: 0, dy: 0 };

  const anticipation = BROADCAST_CAM.ANTICIPATION;
  return {
    dx: cam.ballVelX * anticipation * 8,
    dy: cam.ballVelY * anticipation * 4, // Less vertical anticipation
  };
}

/**
 * Calculate the attack direction offset.
 * Shifts camera toward the goal the offense is attacking.
 */
function getAttackOffset(gs: GameState, mode: CameraMode): { dx: number; dy: number } {
  if (mode !== 'offense' && mode !== 'scoring') return { dx: 0, dy: 0 };

  const carrier = gs.ball.carrier !== null
    ? gs.players.find(p => p.id === gs.ball.carrier)
    : null;
  if (!carrier) return { dx: 0, dy: 0 };

  // Determine attack direction based on which team has the ball
  // Home team attacks right goal, away team attacks left goal
  const isHome = carrier.teamId === gs.homeTeam;
  const attackDir = isHome ? 1 : -1;

  return {
    dx: attackDir * BROADCAST_CAM.ATTACK_OFFSET_X,
    dy: BROADCAST_CAM.ATTACK_OFFSET_Y,
  };
}

/**
 * Get target zoom for the current mode.
 */
function getTargetZoom(mode: CameraMode): number {
  switch (mode) {
    case 'idle': return BROADCAST_CAM.ZOOM_DEFAULT;
    case 'offense': return BROADCAST_CAM.ZOOM_OFFENSE;
    case 'transition': return BROADCAST_CAM.ZOOM_TRANSITION;
    case 'scoring': return BROADCAST_CAM.ZOOM_SCORING;
    case 'shot': return BROADCAST_CAM.ZOOM_SHOT;
    default: return BROADCAST_CAM.ZOOM_DEFAULT;
  }
}

/**
 * Clamp a value between min and max.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Linear interpolation.
 */
export function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

/**
 * Compute a bounding box (in screen space) around key players:
 * the ball carrier (or ball) plus the nearest 2 defenders and 2 teammates.
 * Returns { minX, minY, maxX, maxY } in screen pixels, or null if no players.
 */
export function computePlayerGroupBounds(
  gs: GameState,
  projectFn: (gx: number, gy: number) => { x: number; y: number; scale: number },
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (!gs.players || gs.players.length === 0) return null;

  const carrier = gs.ball.carrier !== null
    ? gs.players.find(p => p.id === gs.ball.carrier)
    : null;

  // Key players: ball carrier (or ball position) + nearest defenders + nearest teammates
  const focusX = carrier ? carrier.pos.x : gs.ball.pos.x;
  const focusY = carrier ? carrier.pos.y : gs.ball.pos.y;
  const carrierTeam = carrier?.teamId ?? null;

  // Sort all players by distance to focus point
  const withDist = gs.players.map(p => ({
    p,
    dist: Math.hypot(p.pos.x - focusX, p.pos.y - focusY),
    isTeammate: carrierTeam !== null && p.teamId === carrierTeam,
  }));

  // Pick: carrier + 2 nearest teammates + 2 nearest defenders
  const teammates = withDist
    .filter(d => d.isTeammate && d.p.id !== carrier?.id)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 2);
  const defenders = withDist
    .filter(d => !d.isTeammate)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 2);

  const keyPlayers: PlayerState[] = [];
  if (carrier) keyPlayers.push(carrier);
  teammates.forEach(t => keyPlayers.push(t.p));
  defenders.forEach(d => keyPlayers.push(d.p));

  if (keyPlayers.length === 0) return null;

  // Project all key players to screen space
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of keyPlayers) {
    const sp = projectFn(p.pos.x, p.pos.y);
    if (sp.x < minX) minX = sp.x;
    if (sp.y < minY) minY = sp.y;
    if (sp.x > maxX) maxX = sp.x;
    if (sp.y > maxY) maxY = sp.y;
  }

  // Also include ball position
  const ballScreen = projectFn(gs.ball.pos.x, gs.ball.pos.y);
  if (ballScreen.x < minX) minX = ballScreen.x;
  if (ballScreen.y < minY) minY = ballScreen.y;
  if (ballScreen.x > maxX) maxX = ballScreen.x;
  if (ballScreen.y > maxY) maxY = ballScreen.y;

  return { minX, minY, maxX, maxY };
}

/**
 * Adjust pan targets to ensure the player group bounding box
 * stays within the visible viewport with the required margin.
 */
function applyFramingCorrection(
  cam: CameraState,
  gs: GameState,
  canvasW: number,
  canvasH: number,
  projectFn: (gx: number, gy: number) => { x: number; y: number; scale: number },
): void {
  const bounds = computePlayerGroupBounds(gs, projectFn);
  if (!bounds) return;

  const margin = BROADCAST_CAM.FRAMING_MARGIN;
  const weight = BROADCAST_CAM.FRAMING_WEIGHT;

  // Compute the visible viewport edges given current target pan and zoom
  const halfW = (canvasW / 2) / cam.targetZoom;
  const halfH = (canvasH / 2) / cam.targetZoom;
  const viewCenterX = canvasW / 2 + cam.targetPanX;
  const viewCenterY = canvasH / 2 + cam.targetPanY;
  const viewLeft = viewCenterX - halfW;
  const viewRight = viewCenterX + halfW;
  const viewTop = viewCenterY - halfH;
  const viewBottom = viewCenterY + halfH;

  // Check if any key player is outside the visible area (with margin)
  let corrX = 0;
  let corrY = 0;

  if (bounds.minX - margin < viewLeft) {
    corrX = (bounds.minX - margin - viewLeft) * weight;
  } else if (bounds.maxX + margin > viewRight) {
    corrX = (bounds.maxX + margin - viewRight) * weight;
  }

  if (bounds.minY - margin < viewTop) {
    corrY = (bounds.minY - margin - viewTop) * weight;
  } else if (bounds.maxY + margin > viewBottom) {
    corrY = (bounds.maxY + margin - viewBottom) * weight;
  }

  // Apply correction (still clamped by MAX_PAN limits)
  cam.targetPanX = clamp(
    cam.targetPanX + corrX,
    -BROADCAST_CAM.MAX_PAN_X,
    BROADCAST_CAM.MAX_PAN_X,
  );
  cam.targetPanY = clamp(
    cam.targetPanY + corrY,
    -BROADCAST_CAM.MAX_PAN_Y,
    BROADCAST_CAM.MAX_PAN_Y,
  );
}

/**
 * Main camera update — call once per frame.
 * Mutates `cam` in place for performance (no allocation per frame).
 *
 * @param cam - Mutable camera state
 * @param gs - Current game state (read-only)
 * @param canvasW - Canvas width in pixels
 * @param canvasH - Canvas height in pixels
 * @param projectFn - The project(gx, gy) function that maps game coords to screen coords
 * @param dt - Delta time in seconds (default 1/60)
 */
export function updateCamera(
  cam: CameraState,
  gs: GameState,
  canvasW: number,
  canvasH: number,
  projectFn: (gx: number, gy: number) => { x: number; y: number; scale: number },
  dt: number = 1 / 60,
): void {
  // ---- Track ball velocity for anticipation ----
  const bx = gs.ball.pos.x;
  const by = gs.ball.pos.y;
  cam.ballVelX = lerp(cam.ballVelX, (bx - cam.lastBallX) / Math.max(dt, 0.001), 0.1);
  cam.ballVelY = lerp(cam.ballVelY, (by - cam.lastBallY) / Math.max(dt, 0.001), 0.1);
  cam.lastBallX = bx;
  cam.lastBallY = by;

  // ---- Detect possession changes → trigger transition ----
  const currentPossTeam = gs.ball.carrier !== null
    ? gs.players.find(p => p.id === gs.ball.carrier)?.teamId ?? null
    : null;
  if (currentPossTeam !== null && currentPossTeam !== cam.lastPossessionTeam && cam.lastPossessionTeam !== null) {
    cam.transitionTimer = BROADCAST_CAM.TRANSITION_HOLD;
  }
  if (currentPossTeam !== null) {
    cam.lastPossessionTeam = currentPossTeam;
  }

  // Decay transition timer
  if (cam.transitionTimer > 0) {
    cam.transitionTimer = Math.max(0, cam.transitionTimer - dt);
  }

  // ---- Determine camera mode ----
  cam.mode = determineCameraMode(gs, cam);

  // ---- Calculate focus point in game space ----
  const focus = getFocusPoint(gs, cam.mode);

  // ---- Project focus point to screen space ----
  const screenFocus = projectFn(focus.gx, focus.gy);

  // ---- Calculate offsets ----
  const anticipation = getAnticipationOffset(cam, cam.mode);
  const attackOffset = getAttackOffset(gs, cam.mode);

  // ---- Calculate target pan (offset from canvas center) ----
  const rawTargetPanX = (screenFocus.x + anticipation.dx + attackOffset.dx) - canvasW / 2;
  const rawTargetPanY = (screenFocus.y + anticipation.dy + attackOffset.dy) - canvasH / 2;

  // Clamp to prevent showing too much off-field area
  cam.targetPanX = clamp(rawTargetPanX, -BROADCAST_CAM.MAX_PAN_X, BROADCAST_CAM.MAX_PAN_X);
  cam.targetPanY = clamp(rawTargetPanY, -BROADCAST_CAM.MAX_PAN_Y, BROADCAST_CAM.MAX_PAN_Y);

  // ---- Calculate target zoom ----
  cam.targetZoom = clamp(
    getTargetZoom(cam.mode),
    BROADCAST_CAM.ZOOM_MIN,
    BROADCAST_CAM.ZOOM_MAX,
  );

  // ---- Player-group framing correction ----
  // Adjust pan to keep key offensive + defensive players visible
  if (gs.isPlaying && gs.countdown <= 0) {
    applyFramingCorrection(cam, gs, canvasW, canvasH, projectFn);
  }

  // ---- Smooth lerp toward targets ----
  // Use frame-rate independent lerp: factor = 1 - (1 - baseFactor)^(dt * 60)
  const panSmooth = 1 - Math.pow(1 - BROADCAST_CAM.PAN_LERP, dt * 60);
  const zoomSmooth = 1 - Math.pow(1 - BROADCAST_CAM.ZOOM_LERP, dt * 60);

  cam.panX = lerp(cam.panX, cam.targetPanX, panSmooth);
  cam.panY = lerp(cam.panY, cam.targetPanY, panSmooth);

  // ---- Zoom-rate limiting ----
  // Prevent zoom from changing faster than MAX_ZOOM_RATE per second
  const rawNewZoom = lerp(cam.zoom, cam.targetZoom, zoomSmooth);
  const maxDelta = BROADCAST_CAM.MAX_ZOOM_RATE * dt;
  const zoomDelta = rawNewZoom - cam.zoom;
  cam.zoom = cam.zoom + clamp(zoomDelta, -maxDelta, maxDelta);
}

/**
 * Apply camera transform to a canvas context.
 * Call this BEFORE all rendering, and ctx.restore() AFTER.
 *
 * The transform:
 * 1. Translate to canvas center
 * 2. Apply zoom scale
 * 3. Translate back, offset by pan
 *
 * This zooms around the canvas center while panning to track the focus.
 */
export function applyCameraTransform(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  canvasW: number,
  canvasH: number,
): void {
  const cx = canvasW / 2;
  const cy = canvasH / 2;

  ctx.translate(cx, cy);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cx - cam.panX, -cy - cam.panY);
}

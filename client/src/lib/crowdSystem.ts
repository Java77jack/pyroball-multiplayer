/**
 * Pyroball Dynamic Crowd System
 * Canvas-based crowd animations with reactive behavior:
 * - Crowd figures in the stands that wave arms and bounce on goals
 * - Confetti particle bursts on goals in scoring team colors
 * - Crowd color tinting that matches the scoring team
 * - Intensity scaling based on game state (crowdEnergy, goals, overtime)
 */

import { TEAMS, type GameState, type TeamData } from './gameConstants';

// ============================================================
// CONFETTI PARTICLE
// ============================================================

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  width: number;
  height: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
}

// ============================================================
// CROWD FIGURE (simplified dot/stick figure in the stands)
// ============================================================

interface CrowdFigure {
  /** Screen-space x position */
  x: number;
  /** Screen-space y position */
  y: number;
  /** Base color (tinted by team on goals) */
  baseColor: string;
  /** Current color (may be tinted) */
  color: string;
  /** Arm wave phase offset (randomized) */
  phaseOffset: number;
  /** Current arm wave amplitude (0 = still, 1 = max wave) */
  waveAmplitude: number;
  /** Target wave amplitude (lerps toward this) */
  targetWave: number;
  /** Vertical bounce offset */
  bounceOffset: number;
  /** Size multiplier (perspective — further = smaller) */
  size: number;
  /** Row index (for depth sorting) */
  row: number;
}

// ============================================================
// CROWD STATE
// ============================================================

export interface CrowdState {
  figures: CrowdFigure[];
  confetti: ConfettiParticle[];
  /** Current excitement level (0-1), drives wave intensity */
  excitement: number;
  /** Target excitement (lerps toward this) */
  targetExcitement: number;
  /** Goal celebration timer (seconds remaining) */
  goalCelebration: number;
  /** Team color for current celebration */
  celebrationColor: string;
  /** Last known score to detect new goals */
  lastScoreHome: number;
  lastScoreAway: number;
  /** Ambient sway phase */
  swayPhase: number;
}

// ============================================================
// CROWD REGIONS — where crowds sit in the arena image
// These are screen-space pixel regions on the 960x540 canvas
// The arena has crowds in the upper stands wrapping around
// ============================================================

// Define crowd seating zones (approximate regions in the arena image)
const CROWD_ZONES = [
  // Upper left stands (behind left goal)
  { xMin: 30, xMax: 200, yMin: 50, yMax: 140, density: 0.6, sizeRange: [1.5, 2.5] as [number, number] },
  // Upper center-left stands
  { xMin: 200, xMax: 400, yMin: 30, yMax: 120, density: 0.7, sizeRange: [1.5, 2.5] as [number, number] },
  // Upper center stands (back of arena)
  { xMin: 400, xMax: 560, yMin: 20, yMax: 110, density: 0.8, sizeRange: [1.5, 2.5] as [number, number] },
  // Upper center-right stands
  { xMin: 560, xMax: 760, yMin: 30, yMax: 120, density: 0.7, sizeRange: [1.5, 2.5] as [number, number] },
  // Upper right stands (behind right goal)
  { xMin: 760, xMax: 930, yMin: 50, yMax: 140, density: 0.6, sizeRange: [1.5, 2.5] as [number, number] },
  // Lower left sideline (near camera)
  { xMin: 50, xMax: 250, yMin: 390, yMax: 440, density: 0.4, sizeRange: [2.5, 3.5] as [number, number] },
  // Lower right sideline (near camera)
  { xMin: 710, xMax: 910, yMin: 390, yMax: 440, density: 0.4, sizeRange: [2.5, 3.5] as [number, number] },
];

// Random crowd colors (jersey colors, casual clothes)
const CROWD_COLORS = [
  '#E8E8E8', '#D0D0D0', '#B0B0B0', // whites/grays
  '#4A90D9', '#5BA0E0', '#3A80C9', // blues
  '#D94A4A', '#E05B5B', '#C93A3A', // reds
  '#4AD94A', '#5BE05B', '#3AC93A', // greens
  '#D9D94A', '#E0E05B', '#C9C93A', // yellows
  '#D94AD9', '#E05BE0', '#C93AC9', // pinks
  '#FF8C00', '#FFA500', '#FF7000', // oranges
];

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// ============================================================
// CREATE CROWD STATE
// ============================================================

export function createCrowdState(canvasW: number, canvasH: number): CrowdState {
  const figures: CrowdFigure[] = [];

  for (const zone of CROWD_ZONES) {
    // Calculate number of figures based on zone area and density
    const area = (zone.xMax - zone.xMin) * (zone.yMax - zone.yMin);
    const count = Math.floor(area * zone.density * 0.015);

    for (let i = 0; i < count; i++) {
      const x = randomInRange(zone.xMin, zone.xMax);
      const y = randomInRange(zone.yMin, zone.yMax);
      const baseColor = CROWD_COLORS[Math.floor(Math.random() * CROWD_COLORS.length)];
      const size = randomInRange(zone.sizeRange[0], zone.sizeRange[1]);
      // Row based on y position within zone (0=back, higher=front)
      const row = Math.floor(((y - zone.yMin) / (zone.yMax - zone.yMin)) * 4);

      figures.push({
        x,
        y,
        baseColor,
        color: baseColor,
        phaseOffset: Math.random() * Math.PI * 2,
        waveAmplitude: 0,
        targetWave: 0,
        bounceOffset: 0,
        size,
        row,
      });
    }
  }

  return {
    figures,
    confetti: [],
    excitement: 0.1,
    targetExcitement: 0.1,
    goalCelebration: 0,
    celebrationColor: '#FFFFFF',
    lastScoreHome: 0,
    lastScoreAway: 0,
    swayPhase: 0,
  };
}

// ============================================================
// SPAWN CONFETTI BURST
// ============================================================

function spawnConfetti(state: CrowdState, team: TeamData, canvasW: number, canvasH: number) {
  const colors = [team.secondary, team.glow, team.accent, '#FFFFFF', '#FFD700'];
  const count = 120; // generous burst

  for (let i = 0; i < count; i++) {
    // Spawn from top area, spread across width
    const x = randomInRange(canvasW * 0.1, canvasW * 0.9);
    const y = randomInRange(-20, canvasH * 0.15);

    state.confetti.push({
      x,
      y,
      vx: randomInRange(-3, 3),
      vy: randomInRange(1, 4),
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: randomInRange(-0.15, 0.15),
      width: randomInRange(4, 10),
      height: randomInRange(3, 7),
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0,
      maxLife: randomInRange(3, 6), // 3-6 seconds
      gravity: randomInRange(0.02, 0.06),
      drag: randomInRange(0.98, 0.995),
    });
  }
}

// ============================================================
// UPDATE CROWD STATE (called each frame)
// ============================================================

export function updateCrowd(
  state: CrowdState,
  gs: GameState,
  dt: number,
  canvasW: number,
  canvasH: number,
): void {
  // --- Detect new goals ---
  const homeScored = gs.score.home > state.lastScoreHome;
  const awayScored = gs.score.away > state.lastScoreAway;

  if (homeScored || awayScored) {
    const scoringTeamId = homeScored ? gs.homeTeam : gs.awayTeam;
    const team = TEAMS[scoringTeamId];
    if (team) {
      // Trigger celebration
      state.goalCelebration = 4.0; // 4 seconds of celebration
      state.celebrationColor = team.secondary;
      state.targetExcitement = 1.0;

      // Spawn confetti
      spawnConfetti(state, team, canvasW, canvasH);

      // Tint crowd figures toward team color
      for (const fig of state.figures) {
        if (Math.random() < 0.6) {
          fig.color = team.secondary;
        }
        fig.targetWave = 1.0;
      }
    }
  }

  state.lastScoreHome = gs.score.home;
  state.lastScoreAway = gs.score.away;

  // --- Update excitement based on game state ---
  let baseExcitement = 0.1;

  // crowdEnergy from game state
  if (gs.crowdEnergy > 0) {
    baseExcitement = Math.max(baseExcitement, gs.crowdEnergy * 0.5);
  }

  // Overtime/sudden death = high excitement
  if (gs.isOvertime) {
    baseExcitement = Math.max(baseExcitement, 0.7);
  }

  // Close game = more excitement
  const scoreDiff = Math.abs(gs.score.home - gs.score.away);
  if (scoreDiff <= 2 && gs.timer < 60) {
    baseExcitement = Math.max(baseExcitement, 0.6);
  }

  // ON FIRE = crowd excited
  if (gs.onFireTeam) {
    baseExcitement = Math.max(baseExcitement, 0.5);
  }

  // Flow state
  if (gs.flowState > 0) {
    baseExcitement = Math.max(baseExcitement, 0.4);
  }

  // Goal celebration overrides
  if (state.goalCelebration > 0) {
    baseExcitement = 1.0;
    state.goalCelebration -= dt;
  } else {
    // Gradually restore crowd colors
    for (const fig of state.figures) {
      fig.color = fig.baseColor;
      fig.targetWave = baseExcitement * 0.3;
    }
  }

  state.targetExcitement = baseExcitement;

  // Lerp excitement
  const exciteLerp = state.goalCelebration > 0 ? 5.0 : 1.5;
  state.excitement += (state.targetExcitement - state.excitement) * Math.min(1, dt * exciteLerp);

  // --- Update sway phase ---
  state.swayPhase += dt * (1.0 + state.excitement * 2.0);

  // --- Update crowd figures ---
  for (const fig of state.figures) {
    // Lerp wave amplitude
    fig.waveAmplitude += (fig.targetWave - fig.waveAmplitude) * Math.min(1, dt * 3.0);

    // Bounce during celebration
    if (state.goalCelebration > 0) {
      fig.bounceOffset = Math.abs(Math.sin(state.swayPhase * 3 + fig.phaseOffset)) * fig.size * 1.5;
    } else {
      fig.bounceOffset *= 0.9; // decay
    }
  }

  // --- Update confetti particles ---
  for (let i = state.confetti.length - 1; i >= 0; i--) {
    const p = state.confetti[i];
    p.life += dt;

    if (p.life >= p.maxLife || p.y > canvasH + 20) {
      state.confetti.splice(i, 1);
      continue;
    }

    // Physics
    p.vy += p.gravity;
    p.vx *= p.drag;
    p.vy *= p.drag;

    // Wind sway
    p.vx += Math.sin(state.swayPhase * 2 + p.x * 0.01) * 0.05;

    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.rotationSpeed;
  }
}

// ============================================================
// DRAW CROWD (called in the render loop)
// ============================================================

// Pre-sorted flag — figures are sorted once at creation and never move in y
let _figuresSorted = false;

export function drawCrowd(
  ctx: CanvasRenderingContext2D,
  state: CrowdState,
  canvasW: number,
  canvasH: number,
): void {
  // Sort figures once (they don't move in y) — avoids O(n log n) per frame
  if (!_figuresSorted && state.figures.length > 0) {
    state.figures.sort((a, b) => a.y - b.y);
    _figuresSorted = true;
  }

  const globalAlpha = 0.7 + state.excitement * 0.3;
  const swayPhase = state.swayPhase;
  const figures = state.figures;
  const len = figures.length;

  // Batch body dots
  ctx.globalAlpha = globalAlpha;
  for (let i = 0; i < len; i++) {
    const fig = figures[i];
    const wave = fig.waveAmplitude;
    const sway = Math.sin(swayPhase * 2 + fig.phaseOffset) * wave * fig.size * 2;
    const fx = fig.x + sway * 0.3;
    const fy = fig.y - fig.bounceOffset;

    // Body dot
    ctx.fillStyle = fig.color;
    ctx.beginPath();
    ctx.arc(fx, fy, fig.size, 0, Math.PI * 2);
    ctx.fill();

    // Head dot
    ctx.fillStyle = '#F5D0A9';
    ctx.beginPath();
    ctx.arc(fx, fy - fig.size * 1.2, fig.size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Arms (only when waving)
    if (wave > 0.1) {
      const armAngle = Math.sin(swayPhase * 4 + fig.phaseOffset) * wave * 0.8;
      ctx.strokeStyle = fig.color;
      ctx.lineWidth = Math.max(1, fig.size * 0.4);
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(fx - fig.size * 0.8, fy - fig.size * 0.3);
      ctx.lineTo(fx - fig.size * 2 + sway * 0.5, fy - fig.size * (1.5 + armAngle * 1.5));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(fx + fig.size * 0.8, fy - fig.size * 0.3);
      ctx.lineTo(fx + fig.size * 2 - sway * 0.5, fy - fig.size * (1.5 - armAngle * 1.5));
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 1;

  // --- Draw confetti ---
  const confetti = state.confetti;
  for (let i = 0; i < confetti.length; i++) {
    const p = confetti[i];
    const alpha = 1 - (p.life / p.maxLife);
    if (alpha <= 0) continue;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ============================================================
// DRAW CROWD GLOW (screen-space overlay for goal celebrations)
// Called AFTER camera restore for screen-space effects
// ============================================================

export function drawCrowdGlow(
  ctx: CanvasRenderingContext2D,
  state: CrowdState,
  canvasW: number,
  canvasH: number,
): void {
  if (state.goalCelebration <= 0) return;

  // Pulsing team-colored glow from the stands
  const pulse = Math.sin(state.swayPhase * 6) * 0.5 + 0.5;
  const intensity = (state.goalCelebration / 4.0) * pulse * 0.15;

  if (intensity > 0.01) {
    // Top glow (from upper stands)
    const grad = ctx.createLinearGradient(0, 0, 0, canvasH * 0.3);
    grad.addColorStop(0, state.celebrationColor + Math.floor(intensity * 255).toString(16).padStart(2, '0'));
    grad.addColorStop(1, state.celebrationColor + '00');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH * 0.3);

    // Bottom glow (from lower stands)
    const grad2 = ctx.createLinearGradient(0, canvasH, 0, canvasH * 0.7);
    grad2.addColorStop(0, state.celebrationColor + Math.floor(intensity * 200).toString(16).padStart(2, '0'));
    grad2.addColorStop(1, state.celebrationColor + '00');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, canvasH * 0.7, canvasW, canvasH * 0.3);
  }
}

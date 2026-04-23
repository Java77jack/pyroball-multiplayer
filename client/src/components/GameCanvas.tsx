import { useRef, useEffect, useCallback } from 'react';
import {
  COURT, GOAL, PLAYER, BALL, ZONES, TEAMS, MATCH, PASS_CHAIN, CENTER_CIRCLE_RADIUS,
  BACKBOARD, JUMP, SHOT_METER, SPIN, ON_FIRE,
  ASSET_URLS,
  type GameState, type PlayerState, type TeamData, type ShotMeterState,
} from '@/lib/gameConstants';
import {
  createCameraState, updateCamera, applyCameraTransform,
  type CameraState,
} from '@/lib/broadcastCamera';
import {
  createCrowdState, updateCrowd, drawCrowd,
  type CrowdState,
} from '@/lib/crowdSystem';
import {
  drawPlayerCharacter, getPlayerPose as getVectorPose,
  type PlayerPose,
} from '@/lib/playerRenderer';
import { SpriteAnimator, buildSpriteFrameSet } from '@/lib/spriteAnimator';
import { lerpColor } from '@/lib/utils';

// ============================================================
// PERSPECTIVE 3D RENDERING ENGINE
// Game logic stays in flat 900×500 court-space.
// This renderer projects every coordinate through a perspective
// trapezoid so the action appears inside the arena image.
// ============================================================

// --- Canvas dimensions (16:9 to match arena image) ---
const CANVAS_W = 960;
const CANVAS_H = 540;

// --- Perspective field corners (in canvas-pixel space) ---
// TILTED 3D PERSPECTIVE: Camera elevated, looking down-left.
// The court in the arena image is NOT horizontally aligned — the right side
// is higher (further from camera) than the left side. Each corner has its own
// unique (x, y) position. We use full bilinear interpolation across all 4 corners.
//
// Game coordinate system: x=0..900 (LEFT goal to RIGHT goal), y=0..500 (far sideline to near sideline)
//
// MAPPING:
//   game x=0   (left goal)       → image bottom-LEFT area (closer to camera)
//   game x=900 (right goal)      → image top-RIGHT area (further from camera)
//   game y=0   (far sideline)    → image TOP-LEFT edge
//   game y=500 (near sideline)   → image BOTTOM-RIGHT edge

const FIELD = {
  // Far edge (gy=0, top of field — further from camera)
  // Arena v2: symmetric front-facing camera, field wider at bottom
  farLeft:   { x: 198, y: 205 },   // gx=0, gy=0   (top-left corner of court)
  farRight:  { x: 762, y: 205 },   // gx=900, gy=0 (top-right corner — same height, symmetric)
  // Near edge (gy=500, bottom of field — closer to camera)
  nearLeft:  { x: 118, y: 375 },   // gx=0, gy=500 (bottom-left corner)
  nearRight: { x: 842, y: 375 },   // gx=900, gy=500 (bottom-right — same height, symmetric)
};

// --- Build field clipping path (quadrilateral) ---
function clipToField(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(FIELD.nearLeft.x, FIELD.nearLeft.y);
  ctx.lineTo(FIELD.nearRight.x, FIELD.nearRight.y);
  ctx.lineTo(FIELD.farRight.x, FIELD.farRight.y);
  ctx.lineTo(FIELD.farLeft.x, FIELD.farLeft.y);
  ctx.closePath();
  ctx.clip();
}

// --- Perspective projection: game (gx, gy) → screen (sx, sy) ---
// BILINEAR INTERPOLATION across all 4 corners to match the tilted court.
// u = gx/900 (0=left goal, 1=right goal)
// t = gy/500 (0=far sideline, 1=near sideline)
function project(gx: number, gy: number): { x: number; y: number; scale: number } {
  const t = gy / COURT.HEIGHT; // 0=far, 1=near
  const u = gx / COURT.WIDTH;  // 0=left, 1=right

  // Bilinear interpolation: blend all 4 corners
  // P = (1-u)(1-t)*farLeft + u*(1-t)*farRight + (1-u)*t*nearLeft + u*t*nearRight
  const sx = (1 - u) * (1 - t) * FIELD.farLeft.x
           + u       * (1 - t) * FIELD.farRight.x
           + (1 - u) * t       * FIELD.nearLeft.x
           + u       * t       * FIELD.nearRight.x;

  const sy = (1 - u) * (1 - t) * FIELD.farLeft.y
           + u       * (1 - t) * FIELD.farRight.y
           + (1 - u) * t       * FIELD.nearLeft.y
           + u       * t       * FIELD.nearRight.y;

  // Scale factor based on screen-space Y position (lower = closer = larger)
  // Map from the highest point (farRight.y ~138) to lowest (nearLeft.y ~428)
  const minY = Math.min(FIELD.farRight.y, FIELD.farLeft.y);
  const maxY = Math.max(FIELD.nearLeft.y, FIELD.nearRight.y);
  const yNorm = (sy - minY) / (maxY - minY); // 0=top/far, 1=bottom/near
  const scale = 0.55 + yNorm * 0.45; // far=0.55, near=1.0

  return { x: sx, y: sy, scale };
}

// --- Project a radius/size by depth ---
function projectSize(size: number, gy: number): number {
  // Use a representative point to estimate scale
  const t = gy / COURT.HEIGHT;
  const midU = 0.5;
  const sy = (1 - midU) * (1 - t) * FIELD.farLeft.y
           + midU     * (1 - t) * FIELD.farRight.y
           + (1 - midU) * t     * FIELD.nearLeft.y
           + midU     * t       * FIELD.nearRight.y;
  const minY = Math.min(FIELD.farRight.y, FIELD.farLeft.y);
  const maxY = Math.max(FIELD.nearLeft.y, FIELD.nearRight.y);
  const yNorm = (sy - minY) / (maxY - minY);
  return size * (0.55 + yNorm * 0.45);
}

// --- Utility functions ---
function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return '255,255,255';
  return `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}`;
}

function darken(hex: string, amt: number): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return hex;
  return `rgb(${Math.max(0, parseInt(r[1],16)-amt)},${Math.max(0, parseInt(r[2],16)-amt)},${Math.max(0, parseInt(r[3],16)-amt)})`;
}

function lighten(hex: string, amt: number): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return hex;
  return `rgb(${Math.min(255, parseInt(r[1],16)+amt)},${Math.min(255, parseInt(r[2],16)+amt)},${Math.min(255, parseInt(r[3],16)+amt)})`;
}



// ============================================================
// PLAYER RENDERING — Now uses canvas-drawn vector characters
// from playerRenderer.ts (replaces old sprite sheet system)
// ============================================================

// ============================================================
// FIELD OVERLAY REMOVED — arena base image has all zones baked in
// ============================================================

// ============================================================
// DRAW GOALS — Goal flash glow + Net Physics + LED Backboard
// ============================================================
function drawGoals(ctx: CanvasRenderingContext2D, gs: GameState, frame: number) {
  const H = COURT.HEIGHT;

  // --- Goal flash glow (ground) ---
  if (gs.goalFlash > 0) {
    const flashIntensity = gs.goalFlash;
    const drawGoalFlash = (goalX: number) => {
      const gc = project(goalX, H / 2);
      const gr = 120 * gc.scale;
      const gGrad = ctx.createRadialGradient(gc.x, gc.y, 0, gc.x, gc.y, gr);
      gGrad.addColorStop(0, `rgba(255, 200, 50, ${flashIntensity * 0.5})`);
      gGrad.addColorStop(0.4, `rgba(255, 150, 0, ${flashIntensity * 0.25})`);
      gGrad.addColorStop(1, 'rgba(255, 200, 50, 0)');
      ctx.fillStyle = gGrad;
      ctx.beginPath();
      ctx.arc(gc.x, gc.y, gr, 0, Math.PI * 2);
      ctx.fill();
    };
    drawGoalFlash(0);
    drawGoalFlash(COURT.WIDTH);
  }

  // --- NET PHYSICS: Mesh deformation when ball hits net ---
  if (gs.netDeform) {
    const nd = gs.netDeform;
    const goalX = nd.side === 'left' ? 0 : COURT.WIDTH;
    const goalCenter = project(goalX, H / 2);
    const s = goalCenter.scale;
    const intensity = nd.intensity;
    const wobble = Math.sin(frame * 0.4) * intensity * 0.3;

    // Draw net mesh lines that bulge outward
    ctx.save();
    const netW = 60 * s;  // net width on screen
    const netH = 40 * s;  // net height on screen
    const bulge = intensity * 25 * s * (1 + wobble);
    const netX = goalCenter.x + (nd.side === 'left' ? -netW : 0);
    const netY = goalCenter.y - netH;

    // Horizontal net lines (4 lines)
    for (let row = 0; row < 4; row++) {
      const t = row / 3;
      const y = netY + t * netH * 2;
      const rowBulge = bulge * Math.sin(t * Math.PI) * (0.5 + Math.sin(frame * 0.3 + row) * 0.2);
      ctx.beginPath();
      ctx.moveTo(netX, y);
      const cpX = nd.side === 'left' ? netX - rowBulge : netX + netW + rowBulge;
      ctx.quadraticCurveTo(cpX, y, netX + netW, y);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + intensity * 0.25})`;
      ctx.lineWidth = 1 * s;
      ctx.stroke();
    }

    // Vertical net lines (5 lines)
    for (let col = 0; col < 5; col++) {
      const t = col / 4;
      const x = netX + t * netW;
      const colBulge = bulge * Math.sin(t * Math.PI) * (0.6 + Math.cos(frame * 0.25 + col) * 0.15);
      ctx.beginPath();
      ctx.moveTo(x, netY);
      const cpY = netY + netH;
      const cpX = nd.side === 'left' ? x - colBulge : x + colBulge;
      ctx.quadraticCurveTo(cpX, cpY, x, netY + netH * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 + intensity * 0.2})`;
      ctx.lineWidth = 1 * s;
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- LED BACKBOARD FLASH ---
  if (gs.ledFlash) {
    const lf = gs.ledFlash;
    const goalX = lf.side === 'left' ? 0 : COURT.WIDTH;
    const goalTop = project(goalX, H / 2 - GOAL.WIDTH / 2);
    const goalBot = project(goalX, H / 2 + GOAL.WIDTH / 2);
    const s = goalTop.scale;

    ctx.save();
    // Backboard glow rectangle above the goal
    const bbH = 18 * s; // backboard height on screen
    const bbY = Math.min(goalTop.y, goalBot.y) - bbH - 5 * s;
    const bbX = Math.min(goalTop.x, goalBot.x) - 10 * s;
    const bbW = Math.abs(goalTop.x - goalBot.x) + 20 * s;

    // Pulsing strobe effect
    const pulse = (Math.sin(frame * 0.8) * 0.3 + 0.7) * lf.intensity;
    const color = lf.color;

    // Parse hex color for rgba
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    // Outer glow
    const glowGrad = ctx.createRadialGradient(
      bbX + bbW / 2, bbY + bbH / 2, 0,
      bbX + bbW / 2, bbY + bbH / 2, bbW * 0.8
    );
    glowGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${pulse * 0.4})`);
    glowGrad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${pulse * 0.15})`);
    glowGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = glowGrad;
    ctx.fillRect(bbX - bbW * 0.3, bbY - bbH * 2, bbW * 1.6, bbH * 5);

    // LED panel itself
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${pulse * 0.7})`;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20 * pulse;
    ctx.beginPath();
    ctx.roundRect(bbX, bbY, bbW, bbH, 3 * s);
    ctx.fill();

    // Inner bright strip
    ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.4})`;
    ctx.shadowBlur = 0;
    ctx.fillRect(bbX + 2 * s, bbY + bbH * 0.3, bbW - 4 * s, bbH * 0.4);

    ctx.restore();
  }
}

// ============================================================
// DRAW PLAYER — Canvas-drawn vector characters with team colors
// ============================================================
function drawPlayer(ctx: CanvasRenderingContext2D, p: PlayerState, team: TeamData, frame: number, gs: GameState) {
  const { x: gx, y: gy } = p.pos;
  const proj = project(gx, gy);
  const { x: sx, y: sy, scale: rawS } = proj;

  const SCALE_UP = 2.2;
  const s = rawS * SCALE_UP;
  const speed = Math.sqrt(p.vel.x * p.vel.x + p.vel.y * p.vel.y);
  const isMoving = speed > 0.3;
  const visR = PLAYER.RADIUS * s;

  // ---- JUMP offset ----
  const jumpOffset = p.jumpZ * s * 1.0;
  const isAirborne = p.isJumping && p.jumpZ > 0.5;

  // ---- SPIN ring ----
  if (p.isSpinning && p.spinTimer > 0) {
    ctx.save();
    const spinAlpha = (p.spinTimer / SPIN.DURATION) * 0.5;
    ctx.beginPath();
    ctx.arc(sx, sy - jumpOffset, visR * 1.2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 200, 0, ${spinAlpha})`;
    ctx.lineWidth = 2 * rawS;
    ctx.stroke();
    ctx.restore();
  }

  // ---- GROUND SHADOW (anchors player to court) ----
  ctx.save();
  const shScale = isAirborne ? Math.max(0.3, 1 - p.jumpZ * 0.015) : 1;
  const shAlpha = isAirborne ? Math.max(0.05, 0.35 - p.jumpZ * 0.006) : 0.4;
  ctx.beginPath();
  ctx.ellipse(sx, sy + 3 * s, 12 * s * shScale, 4 * s * shScale, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,0,0,${shAlpha})`;
  ctx.fill();
  ctx.restore();

  // ---- SPRITE CHARACTER RENDERING ----
  // Determine animation state based on player activity
  let animState: 'idle' | 'run' | 'jump' | 'shoot' | 'pass' | 'catch' = 'idle';
  
  if (isAirborne) {
    animState = 'jump';
  } else if (isMoving) {
    animState = 'run';
  }

  // Get or create sprite animator for this team
  const spriteKey = `sprite-${team.name}`;
  let animator = (window as any)[spriteKey] as SpriteAnimator;
  if (!animator) {
    animator = new SpriteAnimator(buildSpriteFrameSet(team.name.toLowerCase()));
    (window as any)[spriteKey] = animator;
  }

  // Update animation
  animator.setState(animState);
  animator.update(1 / 60); // 60fps

  // Draw sprite
  ctx.save();
  if (p.vel.x < -0.1) {
    // Flip sprite horizontally for left-facing
    ctx.translate(sx, sy - jumpOffset);
    ctx.scale(-1, 1);
    animator.draw(ctx, 0, 0, visR * 2.5, visR * 2.5);
  } else {
    animator.draw(ctx, sx, sy - jumpOffset, visR * 2.5, visR * 2.5);
  }
  ctx.restore();

  // ---- Adjusted Y for indicators ----
  const adjustedSy = sy - jumpOffset;

  // ---- SPIN VISUAL ----
  if (p.isSpinning) {
    ctx.save();
    const spinProg = p.spinAngle / 360;
    const trailA = 0.2 * (1 - spinProg);
    ctx.beginPath();
    ctx.arc(sx, adjustedSy, visR + 4 * s, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${hexToRgb(team.glow)}, ${trailA + 0.15})`;
    ctx.lineWidth = 2.5 * s;
    ctx.setLineDash([4 * s, 2 * s]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ---- JUMP HEIGHT INDICATOR ----
  if (isAirborne) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sx, sy + 2 * s);
    ctx.lineTo(sx, adjustedSy + 2 * s);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ---- CONTROLLED PLAYER INDICATOR ----
  if (p.isControlled) {
    ctx.save();
    const pulsePhase = frame * 0.1;
    const pulseAlpha = 0.35 + Math.sin(pulsePhase) * 0.25;
    const pulseSize = visR + 5 * s + Math.sin(pulsePhase * 0.7) * 1.5 * s;
    ctx.beginPath();
    ctx.arc(sx, adjustedSy, pulseSize, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${hexToRgb(team.glow)}, ${pulseAlpha})`;
    ctx.lineWidth = 2 * s;
    ctx.stroke();

    // Arrow above
    const arrowY = adjustedSy - visR - 18 * s;
    const bob = Math.sin(frame * 0.07) * 2 * s;
    ctx.beginPath();
    ctx.moveTo(sx, arrowY + bob + 3 * s);
    ctx.lineTo(sx - 4 * s, arrowY + bob - 2 * s);
    ctx.lineTo(sx + 4 * s, arrowY + bob - 2 * s);
    ctx.closePath();
    ctx.fillStyle = team.glow;
    ctx.shadowColor = team.glow;
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ---- POSSESSION TIMER RING ----
  if (p.hasBall && p.holdTimer > 0) {
    const holdRatio = p.holdTimer / MATCH.POSSESSION_TIMER;
    const urgent = holdRatio > 0.65;
    ctx.save();
    ctx.beginPath();
    ctx.arc(sx, adjustedSy, visR + 6 * s, -Math.PI / 2, -Math.PI / 2 + holdRatio * Math.PI * 2);
    ctx.strokeStyle = urgent
      ? `rgba(239,68,68,${0.6 + Math.sin(frame * 0.3) * 0.3})`
      : 'rgba(255,184,0,0.4)';
    ctx.lineWidth = 2 * s;
    ctx.stroke();
    ctx.restore();
  }

  // ---- FLOW STATE AURA ----
  const playerTeam: 'home' | 'away' = p.id < 3 ? 'home' : 'away';
  if (gs.flowState > 0 && gs.flowTeam === playerTeam) {
    ctx.save();
    const flowPulse = Math.sin(frame * 0.15) * 0.3 + 0.5;
    ctx.beginPath();
    ctx.arc(sx, adjustedSy, visR + 5 * s, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 215, 0, ${flowPulse * 0.5})`;
    ctx.lineWidth = 1.5 * s;
    ctx.setLineDash([4 * s, 2 * s]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ---- ON FIRE AURA (dramatic pulsing fire ring + glow) ----
  if (gs.onFireTeam === playerTeam) {
    ctx.save();
    const firePulse = Math.sin(frame * 0.12) * 0.3 + 0.7;
    const fireR = visR + 8 * s + Math.sin(frame * 0.08) * 2 * s;

    // Outer fire glow
    const fireGrad = ctx.createRadialGradient(sx, adjustedSy, visR * 0.5, sx, adjustedSy, fireR * 1.5);
    fireGrad.addColorStop(0, `rgba(255, 69, 0, ${firePulse * 0.15})`);
    fireGrad.addColorStop(0.5, `rgba(255, 140, 0, ${firePulse * 0.08})`);
    fireGrad.addColorStop(1, 'rgba(255, 69, 0, 0)');
    ctx.fillStyle = fireGrad;
    ctx.beginPath();
    ctx.arc(sx, adjustedSy, fireR * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Fire ring
    ctx.beginPath();
    ctx.arc(sx, adjustedSy, fireR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 100, 0, ${firePulse * 0.6})`;
    ctx.lineWidth = 2.5 * s;
    ctx.shadowColor = '#FF4500';
    ctx.shadowBlur = 12 * s;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner fire ring
    ctx.beginPath();
    ctx.arc(sx, adjustedSy, visR + 3 * s, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 200, 0, ${firePulse * 0.4})`;
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();

    // Fire particles rising from player
    for (let i = 0; i < 4; i++) {
      const particlePhase = (frame * 0.05 + i * 1.5 + p.id * 0.7) % 1;
      const px = sx + Math.sin(frame * 0.03 + i * 2.1) * 6 * s;
      const py = adjustedSy - particlePhase * 20 * s - 5 * s;
      const pAlpha = (1 - particlePhase) * 0.6;
      const pSize = (1 - particlePhase) * 2.5 * s;
      ctx.beginPath();
      ctx.arc(px, py, pSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, ${Math.round(100 + particlePhase * 155)}, 0, ${pAlpha})`;
      ctx.fill();
    }
    ctx.restore();
  }

  // ---- PLAYER NAME LABEL ----
  ctx.save();
  const labelY = sy + visR + 5 * s;
  const fontSize = Math.max(8, Math.round(8 * s));
  ctx.font = `bold ${fontSize}px Rajdhani, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const labelText = p.name;
  const textW = ctx.measureText(labelText).width;

  const pillPadX = 3 * s;
  const pillPadY = 1.5 * s;
  const pillW = textW + pillPadX * 2;
  const pillH = fontSize + pillPadY * 2 + 2;
  const pillX = sx - pillW / 2;
  const pillY2 = labelY - pillPadY;
  const pillR = 3 * s;

  ctx.beginPath();
  ctx.roundRect(pillX, pillY2, pillW, pillH, pillR);
  ctx.fillStyle = p.isControlled
    ? `rgba(${hexToRgb(team.glow)}, 0.75)`
    : 'rgba(0, 0, 0, 0.55)';
  ctx.fill();
  ctx.strokeStyle = p.isControlled
    ? team.glow
    : `rgba(${hexToRgb(team.secondary)}, 0.35)`;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.fillStyle = p.isControlled ? '#FFFFFF' : 'rgba(255,255,255,0.85)';
  ctx.fillText(labelText, sx, labelY);
  ctx.restore();
}

// ============================================================
// DRAW SHOT METER (arc meter above charging player)
// ============================================================
function drawShotMeter(ctx: CanvasRenderingContext2D, gs: GameState, frame: number) {
  const meter = gs.shotMeter;
  
  // Draw result flash after shot
  if (meter.result !== 'none' && meter.resultTimer > 0 && meter.playerId !== null) {
    const player = gs.players.find(p => p.id === meter.playerId);
    if (player) {
      const proj = project(player.pos.x, player.pos.y);
      const s = projectSize(1, player.pos.y);
      const alpha = Math.min(1, meter.resultTimer * 2);
      const yOff = (1 - meter.resultTimer / 0.8) * -20; // float upward
      
      const resultColors: Record<string, string> = {
        green: '#22FF44',
        yellow: '#FFD700',
        red: '#FF3333',
        weak: '#888888',
      };
      const resultLabels: Record<string, string> = {
        green: 'PERFECT!',
        yellow: 'GOOD',
        red: 'OVERCHARGED',
        weak: 'WEAK',
      };
      
      const color = resultColors[meter.result] || '#fff';
      const label = resultLabels[meter.result] || '';
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${Math.round(12 * s)}px Rajdhani, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      
      // Glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = color;
      ctx.fillText(label, proj.x, proj.y - 35 * s + yOff);
      ctx.shadowBlur = 0;
      
      // Outline
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 2;
      ctx.strokeText(label, proj.x, proj.y - 35 * s + yOff);
      ctx.fillText(label, proj.x, proj.y - 35 * s + yOff);
      
      ctx.restore();
    }
    return;
  }
  
  // Draw active charging meter
  if (!meter.active || meter.playerId === null) return;
  
  const player = gs.players.find(p => p.id === meter.playerId);
  if (!player) return;
  
  const proj = project(player.pos.x, player.pos.y);
  const s = projectSize(1, player.pos.y);
  const jumpOff = player.isJumping ? player.jumpZ * 3 * s : 0;
  
  // Meter position: arc above the player
  const cx = proj.x;
  const cy = proj.y - 40 * s - jumpOff;
  const radius = 22 * s;
  const lineW = 4 * s;
  
  // Arc from -PI to 0 (bottom half = left to right semicircle above player)
  const startAngle = Math.PI;
  const endAngle = 0;
  const totalArc = Math.PI; // 180 degrees
  
  const { greenStart, greenEnd } = meter;
  const yellowEnd = Math.min(1, greenEnd + (SHOT_METER.YELLOW_END - SHOT_METER.GREEN_END));
  
  ctx.save();
  ctx.lineCap = 'round';
  
  // Draw zone backgrounds (dimmed)
  // Weak zone (0 to WEAK_END)
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, startAngle + totalArc * SHOT_METER.WEAK_END, false);
  ctx.strokeStyle = 'rgba(100,100,100,0.3)';
  ctx.lineWidth = lineW;
  ctx.stroke();
  
  // Middle zone (WEAK_END to greenStart) — in-between
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle + totalArc * SHOT_METER.WEAK_END, startAngle + totalArc * greenStart, false);
  ctx.strokeStyle = 'rgba(255,200,50,0.2)';
  ctx.lineWidth = lineW;
  ctx.stroke();
  
  // Green zone
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle + totalArc * greenStart, startAngle + totalArc * greenEnd, false);
  ctx.strokeStyle = 'rgba(34,255,68,0.35)';
  ctx.lineWidth = lineW + 1;
  ctx.stroke();
  
  // Yellow zone
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle + totalArc * greenEnd, startAngle + totalArc * yellowEnd, false);
  ctx.strokeStyle = 'rgba(255,215,0,0.25)';
  ctx.lineWidth = lineW;
  ctx.stroke();
  
  // Red zone
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle + totalArc * yellowEnd, endAngle, false);
  ctx.strokeStyle = 'rgba(255,50,50,0.25)';
  ctx.lineWidth = lineW;
  ctx.stroke();
  
  // Draw fill progress (bright, on top)
  const fillAngle = startAngle + totalArc * meter.charge;
  
  // Determine fill color based on current charge position
  let fillColor: string;
  if (meter.charge < SHOT_METER.WEAK_END) {
    fillColor = '#888888';
  } else if (meter.charge >= greenStart && meter.charge <= greenEnd) {
    fillColor = '#22FF44';
  } else if (meter.charge > greenEnd && meter.charge <= yellowEnd) {
    fillColor = '#FFD700';
  } else if (meter.charge > yellowEnd) {
    fillColor = '#FF3333';
  } else {
    fillColor = '#FFFFFF';
  }
  
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, fillAngle, false);
  ctx.strokeStyle = fillColor;
  ctx.lineWidth = lineW + 1;
  ctx.shadowColor = fillColor;
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Draw needle/indicator at current position
  const needleAngle = fillAngle;
  const needleX = cx + Math.cos(needleAngle) * radius;
  const needleY = cy + Math.sin(needleAngle) * radius;
  
  ctx.beginPath();
  ctx.arc(needleX, needleY, 3 * s, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = fillColor;
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;
  
  // Draw green zone markers (small ticks)
  const greenStartAngle = startAngle + totalArc * greenStart;
  const greenEndAngle = startAngle + totalArc * greenEnd;
  for (const tickAngle of [greenStartAngle, greenEndAngle]) {
    const innerR = radius - lineW;
    const outerR = radius + lineW;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(tickAngle) * innerR, cy + Math.sin(tickAngle) * innerR);
    ctx.lineTo(cx + Math.cos(tickAngle) * outerR, cy + Math.sin(tickAngle) * outerR);
    ctx.strokeStyle = 'rgba(34,255,68,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  
  // Pressure indicator
  if (meter.underPressure) {
    ctx.font = `bold ${Math.round(8 * s)}px Rajdhani, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,100,100,0.8)';
    ctx.fillText('PRESSURE', cx, cy - radius - 4 * s);
  }
  
  ctx.restore();
}

// ============================================================
// DRAW BALL (perspective-projected)
// ============================================================
function drawBall(ctx: CanvasRenderingContext2D, gs: GameState, frame: number) {
  if (gs.ball.carrier === null) {
    const bx = gs.ball.pos.x;
    const by = gs.ball.pos.y;
    const bp = project(bx, by);
    const br = BALL.RADIUS * bp.scale;

    // Ball height offset (ball.z maps to vertical screen offset)
    const ballZ = gs.ball.z || 0;
    const ballHeightOffset = ballZ * bp.scale * 1.0;
    const isAirborne = ballZ > 2;

    // Shadow on ground (stays at bp.y, shrinks/fades when high)
    const shadowScale = isAirborne ? Math.max(0.3, 1 - ballZ * 0.01) : 1;
    const shadowAlpha = isAirborne ? Math.max(0.08, 0.3 - ballZ * 0.004) : 0.3;
    ctx.beginPath();
    ctx.ellipse(bp.x, bp.y + 3 * bp.scale, br * 1.2 * shadowScale, br * 0.3 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    ctx.fill();

    // Ball draw position (lifted by height)
    const ballDrawY = bp.y - ballHeightOffset;

    // FIRE power shot glow — detect high-speed ball with high z arc (power shot signature)
    const ballSpeed = Math.sqrt(gs.ball.vel.x ** 2 + gs.ball.vel.y ** 2);
    const isPowerShot = ballSpeed > 12 && gs.ball.z > 5;

    // Glow
    const glowSize = isPowerShot ? br + 10 * bp.scale : gs.flowState > 0 ? br + 5 * bp.scale : br + 2.5 * bp.scale;
    const glowAlpha = isPowerShot ? 0.7 : gs.flowState > 0 ? 0.45 : 0.25;
    const glowColor = isPowerShot ? `rgba(255, 220, 0, ${glowAlpha})` : `rgba(255, 100, 0, ${glowAlpha})`;
    ctx.beginPath();
    ctx.arc(bp.x, ballDrawY, glowSize, 0, Math.PI * 2);
    ctx.fillStyle = glowColor;
    ctx.fill();

    // Power shot outer ring pulse
    if (isPowerShot) {
      const pulse = Math.sin(frame * 0.5) * 0.3 + 0.5;
      ctx.beginPath();
      ctx.arc(bp.x, ballDrawY, br + 15 * bp.scale, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 180, 0, ${pulse * 0.5})`;
      ctx.lineWidth = 2 * bp.scale;
      ctx.stroke();
    }

    // Rebound indicator (pulsing ring when ball is a rebound)
    if (gs.ball.isRebound) {
      const reboundPulse = Math.sin(frame * 0.3) * 0.3 + 0.5;
      ctx.beginPath();
      ctx.arc(bp.x, ballDrawY, br + 6 * bp.scale, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 50, 50, ${reboundPulse})`;
      ctx.lineWidth = 2 * bp.scale;
      ctx.stroke();
    }

    // Pass chain glow rings
    if (gs.passChain >= PASS_CHAIN.BALL_GLOW_AT) {
      const ringPulse = Math.sin(frame * 0.2) * 3 * bp.scale;
      ctx.beginPath();
      ctx.arc(bp.x, ballDrawY, br + 8 * bp.scale + ringPulse, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 215, 0, ${0.3 + Math.sin(frame * 0.15) * 0.2})`;
      ctx.lineWidth = 1.5 * bp.scale;
      ctx.stroke();
    }

    // Ball body
    ctx.beginPath();
    ctx.arc(bp.x, ballDrawY, br, 0, Math.PI * 2);
    const ballGrad = ctx.createRadialGradient(bp.x - 1 * bp.scale, ballDrawY - 1 * bp.scale, 0, bp.x, ballDrawY, br);
    ballGrad.addColorStop(0, '#FFB800');
    ballGrad.addColorStop(0.5, '#FF6B00');
    ballGrad.addColorStop(1, '#CC3300');
    ctx.fillStyle = ballGrad;
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.arc(bp.x - 1.5 * bp.scale, ballDrawY - 1.5 * bp.scale, br * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();

    // Height indicator line (when ball is high)
    if (isAirborne) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(bp.x, bp.y + 3 * bp.scale);
      ctx.lineTo(bp.x, ballDrawY + br);
      ctx.strokeStyle = 'rgba(255,150,0,0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  } else {
    const carrier = gs.players[gs.ball.carrier];
    if (carrier) {
      const bAngle = Math.atan2(carrier.vel.y, carrier.vel.x);
      const ballGx = carrier.pos.x + Math.cos(bAngle) * 10;
      const ballGy = carrier.pos.y + Math.sin(bAngle) * 10;
      const bp = project(ballGx, ballGy);
      const br = 4 * bp.scale;
      // Carrier ball also lifts when carrier is jumping
      const carrierJumpOffset = carrier.jumpZ * bp.scale * 1.0;

      const carriedBallY = bp.y - carrierJumpOffset;

      // Glow
      ctx.beginPath();
      ctx.arc(bp.x, carriedBallY, br + 2 * bp.scale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 100, 0, 0.2)';
      ctx.fill();

      // Ball
      ctx.beginPath();
      ctx.arc(bp.x, carriedBallY, br, 0, Math.PI * 2);
      const cGrad = ctx.createRadialGradient(bp.x - 0.5 * bp.scale, carriedBallY - 0.5 * bp.scale, 0, bp.x, carriedBallY, br);
      cGrad.addColorStop(0, '#FFB800');
      cGrad.addColorStop(1, '#FF6B00');
      ctx.fillStyle = cGrad;
      ctx.fill();
      ctx.strokeStyle = '#FFB800';
      ctx.lineWidth = 0.6 * bp.scale;
      ctx.stroke();
    }
  }
}

// ============================================================
// DRAW MINIMAL OVERLAYS (clean NBA 2K style — only essential feedback)
// ============================================================
function drawMinimalOverlays(ctx: CanvasRenderingContext2D, gs: GameState, frame: number) {
  const W = CANVAS_W;
  const H = CANVAS_H;

  // ---- SCREEN FLASH (juice effect) ----
  if (gs.screenFlash > 0) {
    const flashColor = gs.screenFlashColor || '#FFFFFF';
    // Parse hex color for rgba
    const r = parseInt(flashColor.slice(1, 3), 16);
    const g = parseInt(flashColor.slice(3, 5), 16);
    const b = parseInt(flashColor.slice(5, 7), 16);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${gs.screenFlash * 0.35})`;
    ctx.fillRect(0, 0, W, H);
  }

  // ---- SPEED LINES (radial from center) ----
  if (gs.speedLines > 0) {
    ctx.save();
    const lineCount = 16;
    const cx = W / 2;
    const cy = H / 2;
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2 + frame * 0.02;
      const innerR = 100 + Math.sin(frame * 0.05 + i) * 30;
      const outerR = 350 + Math.sin(frame * 0.03 + i * 1.5) * 50;
      const x1 = cx + Math.cos(angle) * innerR;
      const y1 = cy + Math.sin(angle) * innerR;
      const x2 = cx + Math.cos(angle) * outerR;
      const y2 = cy + Math.sin(angle) * outerR;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${gs.speedLines * 0.08})`;
      ctx.lineWidth = 1.5 + Math.sin(frame * 0.1 + i) * 0.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Goal flash — subtle golden flash
  if (gs.goalFlash > 0) {
    ctx.fillStyle = `rgba(255, 240, 200, ${gs.goalFlash * 0.12})`;
    ctx.fillRect(0, 0, W, H);
  }

  // ---- SUDDEN DEATH VIGNETTE (red pulsing edges) ----
  if (gs.isOvertime && gs.isPlaying) {
    ctx.save();
    const sdPulse = Math.sin(frame * 0.04) * 0.15 + 0.35;
    const vigGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.65);
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(0.7, `rgba(80, 0, 0, ${sdPulse * 0.15})`);
    vigGrad.addColorStop(1, `rgba(120, 0, 0, ${sdPulse * 0.4})`);
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ---- ON FIRE AMBIENT GLOW (subtle orange tint on edges) ----
  if (gs.onFireTeam !== null) {
    ctx.save();
    const firePulse = Math.sin(frame * 0.06) * 0.1 + 0.2;
    const fireVig = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.6);
    fireVig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    fireVig.addColorStop(0.8, `rgba(255, 69, 0, ${firePulse * 0.06})`);
    fireVig.addColorStop(1, `rgba(255, 69, 0, ${firePulse * 0.15})`);
    ctx.fillStyle = fireVig;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Slow-mo GOAL text
  if (gs.slowMo > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 200, 50, ${Math.min(gs.slowMo * 0.8, 0.9)})`;
    ctx.font = 'bold 48px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255, 100, 0, 0.8)';
    ctx.shadowBlur = 20;
    ctx.fillText('GOAL!', W / 2, H / 2);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Countdown
  if (gs.countdown > 0) {
    ctx.fillStyle = gs.isOvertime ? 'rgba(40, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = gs.isOvertime ? '#FF4500' : '#FFB800';
    ctx.font = 'bold 64px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = gs.isOvertime ? 'rgba(255, 69, 0, 0.7)' : 'rgba(255, 180, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.fillText(String(gs.countdown), W / 2, H / 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = gs.isOvertime ? 'rgba(255,100,50,0.8)' : 'rgba(255,255,255,0.5)';
    ctx.font = gs.isOvertime ? 'bold 18px Rajdhani, sans-serif' : '14px Space Grotesk, sans-serif';
    ctx.fillText(gs.isOvertime ? 'SUDDEN DEATH — NEXT GOAL WINS' : 'GET READY', W / 2, H / 2 + 45);
  }

  // Match over
  if (!gs.isPlaying && gs.timer <= 0 && gs.countdown <= 0) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#FFB800';
    ctx.font = 'bold 42px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255, 180, 0, 0.5)';
    ctx.shadowBlur = 15;
    ctx.fillText('MATCH OVER', W / 2, H / 2);
    ctx.shadowBlur = 0;
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================
interface GameCanvasProps {
  gameState: GameState;
}

export default function GameCanvas({ gameState }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const sizedRef = useRef(false);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const bgLoadedRef = useRef(false);
  const camRef = useRef<CameraState>(createCameraState());
  const crowdRef = useRef<CrowdState>(createCrowdState(CANVAS_W, CANVAS_H));
  const lastTimeRef = useRef(performance.now());

  // Load arena background image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      bgImageRef.current = img;
      bgLoadedRef.current = true;
    };
    img.src = ASSET_URLS.arenaHQ;
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, gs: GameState) => {
    frameRef.current++;
    const frame = frameRef.current;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // ---- BROADCAST CAMERA SYSTEM ----
    const now = performance.now();
    const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05); // cap at 50ms
    lastTimeRef.current = now;

    // Update broadcast camera state
    const cam = camRef.current;
    updateCamera(cam, gs, CANVAS_W, CANVAS_H, project, dt);

    ctx.save();
    // Apply broadcast camera transform (pan + zoom)
    applyCameraTransform(ctx, cam, CANVAS_W, CANVAS_H);

    // Layer game-event camera effects on top of broadcast camera
    // Camera shake from goals/events
    if (gs.cameraShake > 0) {
      const shakeX = (Math.random() - 0.5) * gs.cameraShake * 8;
      const shakeY = (Math.random() - 0.5) * gs.cameraShake * 8;
      ctx.translate(shakeX, shakeY);
    }

    // ---- ARENA BACKGROUND IMAGE ----
    if (bgLoadedRef.current && bgImageRef.current) {
      ctx.drawImage(bgImageRef.current, 0, 0, CANVAS_W, CANVAS_H);
    } else {
      // Fallback dark background while loading
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // ---- DYNAMIC CROWD (drawn on top of arena bg, behind field elements) ----
    const crowd = crowdRef.current;
    updateCrowd(crowd, gs, dt, CANVAS_W, CANVAS_H);
    drawCrowd(ctx, crowd, CANVAS_W, CANVAS_H);

    // ---- FIELD OVERLAY: scoring zones, court lines, labels ----
    // Field overlay removed — arena base image has all zones baked in

    // ---- GOALS (drawn before players for proper depth) ----
    drawGoals(ctx, gs, frame);

    // ---- SORT ALL ENTITIES BY DEPTH (y position) for proper occlusion ----
    // Entities further from camera (lower gy) are drawn first
    type Entity = { type: 'player'; data: PlayerState } | { type: 'ball'; data: null };
    const entities: Entity[] = [];

    gs.players.forEach(p => {
      entities.push({ type: 'player', data: p });
    });

    // Add ball as entity if not carried
    if (gs.ball.carrier === null) {
      entities.push({ type: 'ball', data: null });
    }

    // Sort by game-space y (ascending = far first, near last = painter's algorithm)
    // Side-view: lower gy = further from camera (top), higher gy = closer (bottom)
    entities.sort((a, b) => {
      const ay = a.type === 'player' ? a.data!.pos.y : gs.ball.pos.y;
      const by2 = b.type === 'player' ? b.data!.pos.y : gs.ball.pos.y;
      return ay - by2;
    });

    // Draw sorted entities
    entities.forEach(e => {
      if (e.type === 'player') {
        const team = TEAMS[e.data!.teamId];
        if (team) drawPlayer(ctx, e.data!, team, frame, gs);
        // Draw carried ball right after the carrier
        if (e.data!.hasBall && gs.ball.carrier !== null) {
          drawBall(ctx, gs, frame);
        }
      } else if (e.type === 'ball') {
        drawBall(ctx, gs, frame);
      }
    });

    // ---- SHOT METER (above charging player — stays in camera space) ----
    drawShotMeter(ctx, gs, frame);

    ctx.restore(); // end broadcast camera + shake transform

    // ---- SCREEN-SPACE OVERLAYS (not affected by camera pan/zoom) ----
    drawMinimalOverlays(ctx, gs, frame);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;

    if (!sizedRef.current) {
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      sizedRef.current = true;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    draw(ctx, gameState);
  }, [gameState, draw]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-auto"
      style={{
        imageRendering: 'auto',
        maxHeight: '55vh',
        borderRadius: 6,
      }}
    />
  );
}

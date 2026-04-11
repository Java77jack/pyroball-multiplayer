/**
 * PlayerRenderer — Canvas-drawn vector characters for Pyroball
 * 
 * Draws stylized 2D players with:
 * - Helmet with visor and face cage
 * - Jersey with player number
 * - Shorts/pants with team stripes
 * - Animated arms (swing when running, extend for shoot/pass/catch)
 * - Animated legs (run cycle, jump, idle weight shift)
 * - Dynamic team colors from TeamData
 * 
 * Style: Retro Bowl / NBA Jam inspired — chunky, readable, animated
 */

import type { PlayerState, TeamData, GameState } from './gameConstants';

// ============================================================
// POSE DETERMINATION
// ============================================================
export type PlayerPose = 'idle' | 'running' | 'shooting' | 'jumping' | 'passing' | 'catching';

export function getPlayerPose(p: PlayerState, gs: GameState): PlayerPose {
  // Priority order: shooting > jumping > passing > catching > running > idle
  if (gs.shotMeter?.active && gs.shotMeter.playerId === p.id) return 'shooting';
  if (p.isJumping && p.jumpZ > 2) return 'jumping';
  if (p.isSpinning && p.spinTimer > 0) return 'running';
  const speed = Math.sqrt(p.vel.x * p.vel.x + p.vel.y * p.vel.y);
  if (speed > 0.3) return 'running';
  return 'idle';
}

// ============================================================
// COLOR HELPERS
// ============================================================
function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 1 - amount;
  return `rgb(${Math.round(r * f)}, ${Math.round(g * f)}, ${Math.round(b * f)})`;
}

function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * amount))}, ${Math.min(255, Math.round(g + (255 - g) * amount))}, ${Math.min(255, Math.round(b + (255 - b) * amount))})`;
}

// Ensure we get a valid hex color (some team colors might be rgb)
function ensureHex(color: string): string {
  if (color.startsWith('#')) return color;
  return '#888888'; // fallback
}

// ============================================================
// DRAW PLAYER CHARACTER
// ============================================================
/**
 * Draw a single player character at the given canvas position.
 * 
 * @param ctx - Canvas 2D context
 * @param sx - Screen X position (projected)
 * @param sy - Screen Y position (projected, ground level)
 * @param scale - Perspective scale factor
 * @param pose - Current animation pose
 * @param frame - Global animation frame counter
 * @param playerId - Player ID (for animation offset)
 * @param team - Team data with colors
 * @param facingLeft - Whether the player faces left
 * @param jumpOffset - Vertical offset from jumping
 * @param playerNumber - Jersey number
 */
export function drawPlayerCharacter(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  scale: number,
  pose: PlayerPose,
  frame: number,
  playerId: number,
  team: TeamData,
  facingLeft: boolean,
  jumpOffset: number,
  playerNumber: number,
) {
  const s = scale;
  
  // Base dimensions (at scale 1.0)
  const HEAD_R = 7 * s;       // Head/helmet radius
  const BODY_W = 12 * s;      // Torso width
  const BODY_H = 14 * s;      // Torso height
  const ARM_LEN = 10 * s;     // Arm length
  const ARM_W = 3.5 * s;      // Arm thickness
  const LEG_LEN = 11 * s;     // Leg length
  const LEG_W = 4 * s;        // Leg thickness
  const FOOT_LEN = 5 * s;     // Foot length
  
  // Colors
  const jerseyColor = ensureHex(team.secondary);
  const jerseyDark = darken(jerseyColor, 0.2);
  const pantsColor = ensureHex(team.primary);
  const pantsDark = darken(pantsColor, 0.15);
  const helmetColor = ensureHex(team.secondary);
  const helmetDark = darken(helmetColor, 0.25);
  const visorColor = 'rgba(120, 200, 255, 0.7)';
  const skinColor = '#C68642';
  const shoeColor = '#333333';
  const gloveColor = '#555555';
  const stripeColor = ensureHex(team.accent);
  
  // Animation phase (offset per player for variety)
  const t = frame * 0.15 + playerId * 2.1;
  
  // ---- ANIMATION CALCULATIONS ----
  let leftArmAngle = 0;   // radians from vertical (down = 0)
  let rightArmAngle = 0;
  let leftLegAngle = 0;
  let rightLegAngle = 0;
  let leftKnee = 0;       // knee bend
  let rightKnee = 0;
  let bodyTilt = 0;        // forward lean
  let bodyBob = 0;         // vertical bounce
  let armBendL = 0;        // elbow bend
  let armBendR = 0;
  
  switch (pose) {
    case 'idle': {
      // Gentle weight shift and breathing
      const breathe = Math.sin(t * 0.3) * 0.02;
      bodyBob = Math.sin(t * 0.25) * 0.5 * s;
      leftArmAngle = 0.15 + Math.sin(t * 0.2) * 0.05;
      rightArmAngle = -0.15 - Math.sin(t * 0.2) * 0.05;
      armBendL = 0.3;
      armBendR = 0.3;
      leftLegAngle = 0.05;
      rightLegAngle = -0.05;
      bodyTilt = breathe;
      break;
    }
    case 'running': {
      // Full run cycle - legs and arms pump opposite
      const runCycle = Math.sin(t * 1.8);
      const runCycle2 = Math.cos(t * 1.8);
      bodyTilt = 0.15; // lean forward
      bodyBob = Math.abs(Math.sin(t * 1.8)) * 2.5 * s;
      
      leftLegAngle = runCycle * 0.7;
      rightLegAngle = -runCycle * 0.7;
      leftKnee = Math.max(0, -runCycle) * 0.8; // bend when leg swings back
      rightKnee = Math.max(0, runCycle) * 0.8;
      
      // Arms swing opposite to legs
      leftArmAngle = -runCycle * 0.5;
      rightArmAngle = runCycle * 0.5;
      armBendL = 0.7 + runCycle2 * 0.2;
      armBendR = 0.7 - runCycle2 * 0.2;
      break;
    }
    case 'shooting': {
      // Wind-up and release
      const shootPhase = (t * 0.8) % (Math.PI * 2);
      bodyTilt = -0.1; // lean back slightly
      
      // Shooting arm extends up and forward
      rightArmAngle = -1.2 - Math.sin(shootPhase) * 0.5;
      armBendR = 0.2;
      
      // Other arm out for balance
      leftArmAngle = 0.6;
      armBendL = 0.4;
      
      // Legs planted
      leftLegAngle = 0.2;
      rightLegAngle = -0.15;
      leftKnee = 0.2;
      break;
    }
    case 'jumping': {
      // Legs tucked, arms up
      bodyBob = 0;
      leftLegAngle = 0.3;
      rightLegAngle = -0.3;
      leftKnee = 0.9;
      rightKnee = 0.9;
      leftArmAngle = -0.8;
      rightArmAngle = 0.8;
      armBendL = 0.3;
      armBendR = 0.3;
      break;
    }
    case 'passing': {
      // One arm extended forward
      rightArmAngle = -0.9;
      armBendR = 0.1;
      leftArmAngle = 0.4;
      armBendL = 0.5;
      bodyTilt = 0.1;
      leftLegAngle = 0.15;
      rightLegAngle = -0.1;
      break;
    }
    case 'catching': {
      // Both arms forward
      leftArmAngle = -0.5;
      rightArmAngle = 0.5;
      armBendL = 0.2;
      armBendR = 0.2;
      leftLegAngle = 0.1;
      rightLegAngle = -0.1;
      break;
    }
  }
  
  ctx.save();
  
  // Position at ground level, offset by jump
  const baseY = sy - jumpOffset - bodyBob;
  
  // Flip if facing left
  if (facingLeft) {
    ctx.translate(sx, 0);
    ctx.scale(-1, 1);
    ctx.translate(-sx, 0);
  }
  
  // Apply body tilt
  ctx.translate(sx, baseY);
  ctx.rotate(bodyTilt);
  ctx.translate(-sx, -baseY);
  
  // ---- DRAW ORDER: legs (back) -> body -> arms (front) ----
  
  // ======== LEGS ========
  const hipY = baseY - BODY_H * 0.3; // hip joint position
  const hipOffsetX = BODY_W * 0.2;
  
  // Back leg (left)
  drawLeg(ctx, sx - hipOffsetX, hipY, leftLegAngle, leftKnee, LEG_LEN, LEG_W, FOOT_LEN, pantsColor, pantsDark, shoeColor, s);
  
  // Front leg (right)
  drawLeg(ctx, sx + hipOffsetX, hipY, rightLegAngle, rightKnee, LEG_LEN, LEG_W, FOOT_LEN, pantsColor, pantsDark, shoeColor, s);
  
  // ======== TORSO / JERSEY ========
  const torsoTop = baseY - BODY_H - LEG_LEN * 0.5;
  const torsoBot = hipY;
  
  // Jersey body
  ctx.beginPath();
  ctx.moveTo(sx - BODY_W / 2, torsoTop + 2 * s);
  ctx.lineTo(sx + BODY_W / 2, torsoTop + 2 * s);
  ctx.lineTo(sx + BODY_W / 2 + 1 * s, torsoBot);
  ctx.lineTo(sx - BODY_W / 2 - 1 * s, torsoBot);
  ctx.closePath();
  ctx.fillStyle = jerseyColor;
  ctx.fill();
  ctx.strokeStyle = jerseyDark;
  ctx.lineWidth = 0.8 * s;
  ctx.stroke();
  
  // Jersey stripe (horizontal across chest)
  ctx.beginPath();
  const stripeY = torsoTop + BODY_H * 0.35;
  ctx.moveTo(sx - BODY_W / 2, stripeY);
  ctx.lineTo(sx + BODY_W / 2, stripeY);
  ctx.lineTo(sx + BODY_W / 2, stripeY + 2.5 * s);
  ctx.lineTo(sx - BODY_W / 2, stripeY + 2.5 * s);
  ctx.closePath();
  ctx.fillStyle = stripeColor;
  ctx.fill();
  
  // Player number on jersey
  const numSize = Math.max(6, Math.round(7 * s));
  ctx.font = `bold ${numSize}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ensureHex(team.primary);
  // Ensure number is readable against jersey
  const numY = torsoTop + BODY_H * 0.55;
  ctx.fillText(String(playerNumber), sx, numY);
  
  // ======== ARMS ========
  const shoulderY = torsoTop + 3 * s;
  const shoulderOffsetX = BODY_W / 2 + 1 * s;
  
  // Left arm (back)
  drawArm(ctx, sx - shoulderOffsetX, shoulderY, leftArmAngle, armBendL, ARM_LEN, ARM_W, jerseyColor, skinColor, gloveColor, s);
  
  // Right arm (front)
  drawArm(ctx, sx + shoulderOffsetX, shoulderY, rightArmAngle, armBendR, ARM_LEN, ARM_W, jerseyColor, skinColor, gloveColor, s);
  
  // ======== HEAD / HELMET ========
  const headY = torsoTop - HEAD_R * 0.5;
  
  // Helmet
  ctx.beginPath();
  ctx.arc(sx, headY, HEAD_R, 0, Math.PI * 2);
  ctx.fillStyle = helmetColor;
  ctx.fill();
  ctx.strokeStyle = helmetDark;
  ctx.lineWidth = 1 * s;
  ctx.stroke();
  
  // Helmet stripe (top)
  ctx.beginPath();
  ctx.moveTo(sx, headY - HEAD_R);
  ctx.lineTo(sx, headY + HEAD_R * 0.3);
  ctx.strokeStyle = stripeColor;
  ctx.lineWidth = 2 * s;
  ctx.stroke();
  
  // Visor
  ctx.beginPath();
  const visorY = headY + HEAD_R * 0.1;
  ctx.ellipse(sx + HEAD_R * 0.3, visorY, HEAD_R * 0.55, HEAD_R * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = visorColor;
  ctx.fill();
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 0.5 * s;
  ctx.stroke();
  
  // Face cage (3 horizontal bars)
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 0.6 * s;
  for (let i = 0; i < 3; i++) {
    const barY = visorY - HEAD_R * 0.2 + i * HEAD_R * 0.2;
    ctx.beginPath();
    ctx.moveTo(sx + HEAD_R * 0.1, barY);
    ctx.lineTo(sx + HEAD_R * 0.85, barY);
    ctx.stroke();
  }
  
  // Ear hole / chin strap
  ctx.beginPath();
  ctx.arc(sx - HEAD_R * 0.7, headY + HEAD_R * 0.3, 1.5 * s, 0, Math.PI * 2);
  ctx.fillStyle = '#888';
  ctx.fill();
  
  ctx.restore();
}

// ============================================================
// DRAW LEG (upper + lower with knee bend)
// ============================================================
function drawLeg(
  ctx: CanvasRenderingContext2D,
  hipX: number, hipY: number,
  angle: number, kneeBend: number,
  length: number, width: number, footLen: number,
  pantsColor: string, pantsDark: string, shoeColor: string,
  s: number,
) {
  const upperLen = length * 0.55;
  const lowerLen = length * 0.55;
  
  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(angle);
  
  // Upper leg (thigh) — pants
  ctx.beginPath();
  ctx.roundRect(-width / 2, 0, width, upperLen, 2 * s);
  ctx.fillStyle = pantsColor;
  ctx.fill();
  ctx.strokeStyle = pantsDark;
  ctx.lineWidth = 0.5 * s;
  ctx.stroke();
  
  // Knee joint
  ctx.translate(0, upperLen);
  ctx.rotate(kneeBend);
  
  // Lower leg (shin) — pants
  ctx.beginPath();
  ctx.roundRect(-width / 2 + 0.3 * s, 0, width - 0.6 * s, lowerLen, 2 * s);
  ctx.fillStyle = pantsColor;
  ctx.fill();
  ctx.strokeStyle = pantsDark;
  ctx.lineWidth = 0.5 * s;
  ctx.stroke();
  
  // Foot / shoe
  ctx.beginPath();
  ctx.roundRect(-width / 2, lowerLen - 1 * s, footLen, 3.5 * s, 1.5 * s);
  ctx.fillStyle = shoeColor;
  ctx.fill();
  
  ctx.restore();
}

// ============================================================
// DRAW ARM (upper + forearm with elbow bend)
// ============================================================
function drawArm(
  ctx: CanvasRenderingContext2D,
  shoulderX: number, shoulderY: number,
  angle: number, elbowBend: number,
  length: number, width: number,
  jerseyColor: string, skinColor: string, gloveColor: string,
  s: number,
) {
  const upperLen = length * 0.5;
  const forearmLen = length * 0.5;
  
  ctx.save();
  ctx.translate(shoulderX, shoulderY);
  ctx.rotate(angle);
  
  // Upper arm (sleeve)
  ctx.beginPath();
  ctx.roundRect(-width / 2, 0, width, upperLen, 1.5 * s);
  ctx.fillStyle = jerseyColor;
  ctx.fill();
  
  // Elbow
  ctx.translate(0, upperLen);
  ctx.rotate(elbowBend);
  
  // Forearm (skin)
  ctx.beginPath();
  ctx.roundRect(-width / 2 + 0.3 * s, 0, width - 0.6 * s, forearmLen, 1.5 * s);
  ctx.fillStyle = skinColor;
  ctx.fill();
  
  // Glove / hand
  ctx.beginPath();
  ctx.arc(0, forearmLen, width * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = gloveColor;
  ctx.fill();
  
  ctx.restore();
}

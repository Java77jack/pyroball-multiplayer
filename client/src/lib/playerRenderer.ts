/**
 * PlayerRenderer — Canvas-drawn vector characters for Pyroball
 * 
 * Draws stylized 2D players with:
 * - Sleek helmet with visor and face cage
 * - Athletic jersey with player number
 * - Muscular torso and limbs
 * - Animated arms (swing when running, extend for shoot/pass/catch)
 * - Animated legs (run cycle, jump, idle weight shift)
 * - Dynamic team colors from TeamData
 * - Enhanced shading and detail for a polished look
 * 
 * Style: Athletic, modern, polished — inspired by sports games with realistic proportions
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

function ensureHex(color: string): string {
  if (color.startsWith('#')) return color;
  return '#888888';
}

// ============================================================
// DRAW PLAYER CHARACTER — IMPROVED DESIGN
// ============================================================
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
  
  // Improved proportions — more athletic and realistic
  const HEAD_R = 6.5 * s;       // Slightly smaller head for better proportions
  const BODY_W = 14 * s;        // Wider, more muscular torso
  const BODY_H = 16 * s;        // Taller torso
  const SHOULDER_W = 16 * s;    // Wider shoulders
  const ARM_LEN = 11 * s;       // Longer arms
  const ARM_W = 4 * s;          // Thicker arms (more muscular)
  const LEG_LEN = 13 * s;       // Longer legs for athletic look
  const LEG_W = 4.5 * s;        // Thicker legs
  const FOOT_LEN = 6 * s;       // Larger feet
  
  // Colors with better shading
  const jerseyColor = ensureHex(team.secondary);
  const jerseyDark = darken(jerseyColor, 0.25);
  const jerseyLight = lighten(jerseyColor, 0.15);
  const pantsColor = ensureHex(team.primary);
  const pantsDark = darken(pantsColor, 0.2);
  const pantsLight = lighten(pantsColor, 0.1);
  const helmetColor = ensureHex(team.secondary);
  const helmetDark = darken(helmetColor, 0.3);
  const helmetLight = lighten(helmetColor, 0.2);
  const visorColor = 'rgba(100, 180, 255, 0.8)';
  const skinColor = '#D4A574';  // Better skin tone
  const shoeColor = '#222222';
  const shoeDark = '#111111';
  const gloveColor = '#444444';
  const stripeColor = ensureHex(team.accent);
  
  // Animation phase
  const t = frame * 0.15 + playerId * 2.1;
  
  // ---- ANIMATION CALCULATIONS ----
  let leftArmAngle = 0;
  let rightArmAngle = 0;
  let leftLegAngle = 0;
  let rightLegAngle = 0;
  let leftKnee = 0;
  let rightKnee = 0;
  let bodyTilt = 0;
  let bodyBob = 0;
  let armBendL = 0;
  let armBendR = 0;
  
  switch (pose) {
    case 'idle': {
      const breathe = Math.sin(t * 0.3) * 0.02;
      bodyBob = Math.sin(t * 0.25) * 0.3 * s;
      leftArmAngle = 0.1 + Math.sin(t * 0.2) * 0.04;
      rightArmAngle = -0.1 - Math.sin(t * 0.2) * 0.04;
      armBendL = 0.25;
      armBendR = 0.25;
      leftLegAngle = 0.03;
      rightLegAngle = -0.03;
      bodyTilt = breathe;
      break;
    }
    case 'running': {
      const runCycle = Math.sin(t * 1.8);
      const runCycle2 = Math.cos(t * 1.8);
      bodyTilt = 0.12;
      bodyBob = Math.abs(Math.sin(t * 1.8)) * 2.8 * s;
      
      leftLegAngle = runCycle * 0.75;
      rightLegAngle = -runCycle * 0.75;
      leftKnee = Math.max(0, -runCycle) * 0.85;
      rightKnee = Math.max(0, runCycle) * 0.85;
      
      leftArmAngle = -runCycle * 0.55;
      rightArmAngle = runCycle * 0.55;
      armBendL = 0.65 + runCycle2 * 0.25;
      armBendR = 0.65 - runCycle2 * 0.25;
      break;
    }
    case 'shooting': {
      const shootPhase = (t * 0.8) % (Math.PI * 2);
      bodyTilt = -0.08;
      
      rightArmAngle = -1.3 - Math.sin(shootPhase) * 0.4;
      armBendR = 0.15;
      
      leftArmAngle = 0.5;
      armBendL = 0.35;
      
      leftLegAngle = 0.15;
      rightLegAngle = -0.1;
      leftKnee = 0.15;
      break;
    }
    case 'jumping': {
      bodyBob = 0;
      leftLegAngle = 0.25;
      rightLegAngle = -0.25;
      leftKnee = 0.95;
      rightKnee = 0.95;
      leftArmAngle = -0.75;
      rightArmAngle = 0.75;
      armBendL = 0.25;
      armBendR = 0.25;
      break;
    }
    case 'passing': {
      rightArmAngle = -0.85;
      armBendR = 0.1;
      leftArmAngle = 0.35;
      armBendL = 0.45;
      bodyTilt = 0.08;
      leftLegAngle = 0.12;
      rightLegAngle = -0.08;
      break;
    }
    case 'catching': {
      leftArmAngle = -0.45;
      rightArmAngle = 0.45;
      armBendL = 0.15;
      armBendR = 0.15;
      leftLegAngle = 0.08;
      rightLegAngle = -0.08;
      break;
    }
  }
  
  ctx.save();
  
  const baseY = sy - jumpOffset - bodyBob;
  
  if (facingLeft) {
    ctx.translate(sx, 0);
    ctx.scale(-1, 1);
    ctx.translate(-sx, 0);
  }
  
  ctx.translate(sx, baseY);
  ctx.rotate(bodyTilt);
  ctx.translate(-sx, -baseY);
  
  // ---- DRAW ORDER: legs (back) -> body -> arms (front) -> head ----
  
  // ======== LEGS ========
  const hipY = baseY - BODY_H * 0.25;
  const hipOffsetX = BODY_W * 0.25;
  
  drawLeg(ctx, sx - hipOffsetX, hipY, leftLegAngle, leftKnee, LEG_LEN, LEG_W, FOOT_LEN, pantsColor, pantsDark, pantsLight, shoeColor, shoeDark, s);
  drawLeg(ctx, sx + hipOffsetX, hipY, rightLegAngle, rightKnee, LEG_LEN, LEG_W, FOOT_LEN, pantsColor, pantsDark, pantsLight, shoeColor, shoeDark, s);
  
  // ======== TORSO / JERSEY ========
  const torsoTop = baseY - BODY_H - LEG_LEN * 0.4;
  const torsoBot = hipY;
  
  // Jersey body with gradient-like shading
  ctx.beginPath();
  ctx.moveTo(sx - BODY_W / 2, torsoTop + 2 * s);
  ctx.lineTo(sx + BODY_W / 2, torsoTop + 2 * s);
  ctx.lineTo(sx + BODY_W / 2 + 1.5 * s, torsoBot);
  ctx.lineTo(sx - BODY_W / 2 - 1.5 * s, torsoBot);
  ctx.closePath();
  ctx.fillStyle = jerseyColor;
  ctx.fill();
  ctx.strokeStyle = jerseyDark;
  ctx.lineWidth = 1 * s;
  ctx.stroke();
  
  // Jersey highlight (left side for depth)
  ctx.beginPath();
  ctx.moveTo(sx - BODY_W / 2 + 1 * s, torsoTop + 2 * s);
  ctx.lineTo(sx - BODY_W / 2 + 2 * s, torsoTop + BODY_H * 0.4);
  ctx.lineTo(sx - BODY_W / 2 + 1.5 * s, torsoBot);
  ctx.closePath();
  ctx.fillStyle = jerseyLight;
  ctx.globalAlpha = 0.4;
  ctx.fill();
  ctx.globalAlpha = 1;
  
  // Jersey stripe (horizontal across chest)
  ctx.beginPath();
  const stripeY = torsoTop + BODY_H * 0.35;
  ctx.moveTo(sx - BODY_W / 2, stripeY);
  ctx.lineTo(sx + BODY_W / 2, stripeY);
  ctx.lineTo(sx + BODY_W / 2, stripeY + 3 * s);
  ctx.lineTo(sx - BODY_W / 2, stripeY + 3 * s);
  ctx.closePath();
  ctx.fillStyle = stripeColor;
  ctx.fill();
  ctx.strokeStyle = darken(stripeColor, 0.2);
  ctx.lineWidth = 0.5 * s;
  ctx.stroke();
  
  // Player number on jersey
  const numSize = Math.max(8, Math.round(9 * s));
  ctx.font = `bold ${numSize}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ensureHex(team.primary);
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 2;
  const numY = torsoTop + BODY_H * 0.55;
  ctx.fillText(String(playerNumber), sx, numY);
  ctx.shadowBlur = 0;
  
  // ======== ARMS ========
  const shoulderY = torsoTop + 2 * s;
  const shoulderOffsetX = SHOULDER_W / 2;
  
  drawArm(ctx, sx - shoulderOffsetX, shoulderY, leftArmAngle, armBendL, ARM_LEN, ARM_W, jerseyColor, jerseyDark, skinColor, gloveColor, s);
  drawArm(ctx, sx + shoulderOffsetX, shoulderY, rightArmAngle, armBendR, ARM_LEN, ARM_W, jerseyColor, jerseyDark, skinColor, gloveColor, s);
  
  // ======== HEAD / HELMET ========
  const headY = torsoTop - HEAD_R * 0.4;
  
  // Helmet with shading
  ctx.beginPath();
  ctx.arc(sx, headY, HEAD_R, 0, Math.PI * 2);
  ctx.fillStyle = helmetColor;
  ctx.fill();
  
  // Helmet highlight (top-left)
  const helmetGrad = ctx.createRadialGradient(sx - HEAD_R * 0.3, headY - HEAD_R * 0.3, HEAD_R * 0.2, sx, headY, HEAD_R);
  helmetGrad.addColorStop(0, helmetLight);
  helmetGrad.addColorStop(1, helmetColor);
  ctx.fillStyle = helmetGrad;
  ctx.globalAlpha = 0.5;
  ctx.fill();
  ctx.globalAlpha = 1;
  
  ctx.strokeStyle = helmetDark;
  ctx.lineWidth = 1.2 * s;
  ctx.stroke();
  
  // Helmet stripe (top)
  ctx.beginPath();
  ctx.moveTo(sx, headY - HEAD_R);
  ctx.lineTo(sx, headY + HEAD_R * 0.2);
  ctx.strokeStyle = stripeColor;
  ctx.lineWidth = 2.5 * s;
  ctx.stroke();
  
  // Visor with better shading
  ctx.beginPath();
  const visorY = headY + HEAD_R * 0.05;
  ctx.ellipse(sx + HEAD_R * 0.25, visorY, HEAD_R * 0.6, HEAD_R * 0.35, 0, 0, Math.PI * 2);
  ctx.fillStyle = visorColor;
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 0.7 * s;
  ctx.stroke();
  
  // Visor shine
  ctx.beginPath();
  ctx.ellipse(sx + HEAD_R * 0.35, visorY - HEAD_R * 0.15, HEAD_R * 0.25, HEAD_R * 0.15, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fill();
  
  // Face cage (4 vertical bars for more detail)
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 0.7 * s;
  for (let i = 0; i < 4; i++) {
    const barX = sx + HEAD_R * 0.05 + i * HEAD_R * 0.2;
    ctx.beginPath();
    ctx.moveTo(barX, visorY - HEAD_R * 0.25);
    ctx.lineTo(barX, visorY + HEAD_R * 0.25);
    ctx.stroke();
  }
  
  // Chin strap
  ctx.beginPath();
  ctx.arc(sx - HEAD_R * 0.65, headY + HEAD_R * 0.35, 2 * s, 0, Math.PI * 2);
  ctx.fillStyle = '#666';
  ctx.fill();
  
  ctx.restore();
}

// ============================================================
// DRAW LEG — IMPROVED WITH SHADING
// ============================================================
function drawLeg(
  ctx: CanvasRenderingContext2D,
  hipX: number, hipY: number,
  angle: number, kneeBend: number,
  length: number, width: number, footLen: number,
  pantsColor: string, pantsDark: string, pantsLight: string, shoeColor: string, shoeDark: string,
  scale: number,
) {
  const s = scale;
  
  // Upper leg
  const kneeX = hipX + Math.sin(angle) * length * 0.5;
  const kneeY = hipY + Math.cos(angle) * length * 0.5;
  
  // Lower leg (bent knee)
  const footX = kneeX + Math.sin(angle + kneeBend) * length * 0.5;
  const footY = kneeY + Math.cos(angle + kneeBend) * length * 0.5;
  
  // Upper leg (thigh) — thicker
  ctx.beginPath();
  const thighW = width * 1.2;
  const perpX = -Math.cos(angle) * thighW / 2;
  const perpY = Math.sin(angle) * thighW / 2;
  ctx.moveTo(hipX + perpX, hipY + perpY);
  ctx.lineTo(hipX - perpX, hipY - perpY);
  ctx.lineTo(kneeX - perpX, kneeY - perpY);
  ctx.lineTo(kneeX + perpX, kneeY + perpY);
  ctx.closePath();
  ctx.fillStyle = pantsColor;
  ctx.fill();
  ctx.strokeStyle = pantsDark;
  ctx.lineWidth = 0.6 * s;
  ctx.stroke();
  
  // Thigh highlight
  ctx.beginPath();
  ctx.moveTo(hipX + perpX * 0.5, hipY + perpY * 0.5);
  ctx.lineTo(hipX + perpX, hipY + perpY);
  ctx.lineTo(kneeX + perpX, kneeY + perpY);
  ctx.lineTo(kneeX + perpX * 0.5, kneeY + perpY * 0.5);
  ctx.closePath();
  ctx.fillStyle = pantsLight;
  ctx.globalAlpha = 0.3;
  ctx.fill();
  ctx.globalAlpha = 1;
  
  // Lower leg (calf)
  const calfW = width * 0.9;
  const perpX2 = -Math.cos(angle + kneeBend) * calfW / 2;
  const perpY2 = Math.sin(angle + kneeBend) * calfW / 2;
  ctx.beginPath();
  ctx.moveTo(kneeX + perpX2, kneeY + perpY2);
  ctx.lineTo(kneeX - perpX2, kneeY - perpY2);
  ctx.lineTo(footX - perpX2, footY - perpY2);
  ctx.lineTo(footX + perpX2, footY + perpY2);
  ctx.closePath();
  ctx.fillStyle = pantsColor;
  ctx.fill();
  ctx.strokeStyle = pantsDark;
  ctx.lineWidth = 0.6 * s;
  ctx.stroke();
  
  // Shoe
  const shoeW = footLen;
  const shoeH = width * 0.8;
  const shoeAngle = angle + kneeBend;
  ctx.save();
  ctx.translate(footX, footY);
  ctx.rotate(shoeAngle);
  ctx.beginPath();
  ctx.ellipse(0, 0, shoeW, shoeH, 0, 0, Math.PI * 2);
  ctx.fillStyle = shoeColor;
  ctx.fill();
  ctx.strokeStyle = shoeDark;
  ctx.lineWidth = 0.5 * s;
  ctx.stroke();
  ctx.restore();
}

// ============================================================
// DRAW ARM — IMPROVED WITH SHADING
// ============================================================
function drawArm(
  ctx: CanvasRenderingContext2D,
  shoulderX: number, shoulderY: number,
  angle: number, bend: number,
  length: number, width: number,
  jerseyColor: string, jerseyDark: string, skinColor: string, gloveColor: string,
  scale: number,
) {
  const s = scale;
  
  // Elbow position
  const elbowX = shoulderX + Math.sin(angle) * length * 0.5;
  const elbowY = shoulderY + Math.cos(angle) * length * 0.5;
  
  // Hand position (with elbow bend)
  const handX = elbowX + Math.sin(angle + bend) * length * 0.5;
  const handY = elbowY + Math.cos(angle + bend) * length * 0.5;
  
  // Upper arm (shoulder to elbow)
  const upperW = width * 1.1;
  const perpX = -Math.cos(angle) * upperW / 2;
  const perpY = Math.sin(angle) * upperW / 2;
  
  ctx.beginPath();
  ctx.moveTo(shoulderX + perpX, shoulderY + perpY);
  ctx.lineTo(shoulderX - perpX, shoulderY - perpY);
  ctx.lineTo(elbowX - perpX, elbowY - perpY);
  ctx.lineTo(elbowX + perpX, elbowY + perpY);
  ctx.closePath();
  ctx.fillStyle = jerseyColor;
  ctx.fill();
  ctx.strokeStyle = jerseyDark;
  ctx.lineWidth = 0.5 * s;
  ctx.stroke();
  
  // Forearm (elbow to hand) — with skin showing
  const foreW = width * 0.9;
  const perpX2 = -Math.cos(angle + bend) * foreW / 2;
  const perpY2 = Math.sin(angle + bend) * foreW / 2;
  
  ctx.beginPath();
  ctx.moveTo(elbowX + perpX2, elbowY + perpY2);
  ctx.lineTo(elbowX - perpX2, elbowY - perpY2);
  ctx.lineTo(handX - perpX2, handY - perpY2);
  ctx.lineTo(handX + perpX2, handY + perpY2);
  ctx.closePath();
  ctx.fillStyle = skinColor;
  ctx.fill();
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 0.5 * s;
  ctx.stroke();
  
  // Glove/hand
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(angle + bend);
  ctx.beginPath();
  ctx.ellipse(0, 0, width * 0.8, width, 0, 0, Math.PI * 2);
  ctx.fillStyle = gloveColor;
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 0.5 * s;
  ctx.stroke();
  ctx.restore();
}

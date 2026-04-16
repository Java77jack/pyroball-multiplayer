/**
 * PlayerRenderer — Premium Canvas-drawn Vector Characters for Pyroball
 * 
 * Draws highly detailed, visually appealing 2D players with:
 * - Realistic athletic proportions and muscle definition
 * - Premium helmet with detailed visor, face cage, and shading
 * - High-quality jersey with sleeves, stripes, and number
 * - Muscular arms and legs with proper anatomy
 * - Professional shading, gradients, and highlights for 3D depth
 * - Smooth, natural animations across all poses
 * - Dynamic team colors from TeamData with accent details
 * 
 * Style: Premium sports game quality — realistic, polished, professional
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
// DRAW PLAYER CHARACTER — PREMIUM DESIGN
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
  
  // Premium proportions — realistic athletic build
  const HEAD_R = 6.8 * s;           // Proportional head
  const BODY_W = 15 * s;            // Wide, muscular torso
  const BODY_H = 17 * s;            // Tall, athletic torso
  const SHOULDER_W = 17.5 * s;      // Wide shoulders
  const ARM_LEN = 12 * s;           // Long, athletic arms
  const ARM_W = 4.5 * s;            // Thick, muscular arms
  const LEG_LEN = 14 * s;           // Long legs
  const LEG_W = 5 * s;              // Thick, muscular legs
  const FOOT_LEN = 6.5 * s;         // Proportional feet
  
  // Premium color palette with multiple shades
  const jerseyColor = ensureHex(team.secondary);
  const jerseyDark = darken(jerseyColor, 0.3);
  const jerseyLight = lighten(jerseyColor, 0.2);
  const jerseyMid = darken(jerseyColor, 0.15);
  
  const pantsColor = ensureHex(team.primary);
  const pantsDark = darken(pantsColor, 0.25);
  const pantsLight = lighten(pantsColor, 0.12);
  
  const helmetColor = ensureHex(team.secondary);
  const helmetDark = darken(helmetColor, 0.35);
  const helmetLight = lighten(helmetColor, 0.25);
  
  const accentColor = ensureHex(team.accent);
  const accentDark = darken(accentColor, 0.2);
  
  const visorColor = 'rgba(80, 160, 255, 0.85)';
  const skinColor = '#D9A574';
  const shoeColor = '#1a1a1a';
  const shoeDark = '#0d0d0d';
  const gloveColor = '#3a3a3a';
  const gloveDark = '#1a1a1a';
  
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
  let headTilt = 0;
  
  switch (pose) {
    case 'idle': {
      const breathe = Math.sin(t * 0.3) * 0.02;
      bodyBob = Math.sin(t * 0.25) * 0.35 * s;
      leftArmAngle = 0.12 + Math.sin(t * 0.2) * 0.05;
      rightArmAngle = -0.12 - Math.sin(t * 0.2) * 0.05;
      armBendL = 0.3;
      armBendR = 0.3;
      leftLegAngle = 0.04;
      rightLegAngle = -0.04;
      bodyTilt = breathe;
      headTilt = Math.sin(t * 0.25) * 0.03;
      break;
    }
    case 'running': {
      const runCycle = Math.sin(t * 1.8);
      const runCycle2 = Math.cos(t * 1.8);
      bodyTilt = 0.14;
      bodyBob = Math.abs(Math.sin(t * 1.8)) * 3 * s;
      
      leftLegAngle = runCycle * 0.8;
      rightLegAngle = -runCycle * 0.8;
      leftKnee = Math.max(0, -runCycle) * 0.9;
      rightKnee = Math.max(0, runCycle) * 0.9;
      
      leftArmAngle = -runCycle * 0.6;
      rightArmAngle = runCycle * 0.6;
      armBendL = 0.7 + runCycle2 * 0.3;
      armBendR = 0.7 - runCycle2 * 0.3;
      headTilt = runCycle * 0.05;
      break;
    }
    case 'shooting': {
      const shootPhase = (t * 0.8) % (Math.PI * 2);
      bodyTilt = -0.1;
      
      rightArmAngle = -1.4 - Math.sin(shootPhase) * 0.45;
      armBendR = 0.1;
      
      leftArmAngle = 0.55;
      armBendL = 0.4;
      
      leftLegAngle = 0.18;
      rightLegAngle = -0.12;
      leftKnee = 0.2;
      headTilt = -0.08;
      break;
    }
    case 'jumping': {
      bodyBob = 0;
      leftLegAngle = 0.3;
      rightLegAngle = -0.3;
      leftKnee = 1.0;
      rightKnee = 1.0;
      leftArmAngle = -0.8;
      rightArmAngle = 0.8;
      armBendL = 0.2;
      armBendR = 0.2;
      headTilt = -0.1;
      break;
    }
    case 'passing': {
      rightArmAngle = -0.9;
      armBendR = 0.05;
      leftArmAngle = 0.4;
      armBendL = 0.5;
      bodyTilt = 0.1;
      leftLegAngle = 0.15;
      rightLegAngle = -0.1;
      headTilt = 0.05;
      break;
    }
    case 'catching': {
      leftArmAngle = -0.5;
      rightArmAngle = 0.5;
      armBendL = 0.1;
      armBendR = 0.1;
      leftLegAngle = 0.1;
      rightLegAngle = -0.1;
      headTilt = -0.05;
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
  const hipOffsetX = BODY_W * 0.28;
  
  drawLeg(ctx, sx - hipOffsetX, hipY, leftLegAngle, leftKnee, LEG_LEN, LEG_W, FOOT_LEN, pantsColor, pantsDark, pantsLight, shoeColor, shoeDark, accentColor, s);
  drawLeg(ctx, sx + hipOffsetX, hipY, rightLegAngle, rightKnee, LEG_LEN, LEG_W, FOOT_LEN, pantsColor, pantsDark, pantsLight, shoeColor, shoeDark, accentColor, s);
  
  // ======== TORSO / JERSEY ========
  const torsoTop = baseY - BODY_H - LEG_LEN * 0.4;
  const torsoBot = hipY;
  
  // Jersey body with gradient-like shading
  ctx.beginPath();
  ctx.moveTo(sx - BODY_W / 2, torsoTop + 2 * s);
  ctx.lineTo(sx + BODY_W / 2, torsoTop + 2 * s);
  ctx.lineTo(sx + BODY_W / 2 + 2 * s, torsoBot);
  ctx.lineTo(sx - BODY_W / 2 - 2 * s, torsoBot);
  ctx.closePath();
  ctx.fillStyle = jerseyColor;
  ctx.fill();
  ctx.strokeStyle = jerseyDark;
  ctx.lineWidth = 1.2 * s;
  ctx.stroke();
  
  // Jersey left highlight (depth)
  ctx.beginPath();
  ctx.moveTo(sx - BODY_W / 2 + 1.5 * s, torsoTop + 2 * s);
  ctx.lineTo(sx - BODY_W / 2 + 3 * s, torsoTop + BODY_H * 0.35);
  ctx.lineTo(sx - BODY_W / 2 + 2 * s, torsoBot);
  ctx.closePath();
  ctx.fillStyle = jerseyLight;
  ctx.globalAlpha = 0.45;
  ctx.fill();
  ctx.globalAlpha = 1;
  
  // Jersey right shadow (depth)
  ctx.beginPath();
  ctx.moveTo(sx + BODY_W / 2 - 1.5 * s, torsoTop + 2 * s);
  ctx.lineTo(sx + BODY_W / 2 - 3 * s, torsoTop + BODY_H * 0.35);
  ctx.lineTo(sx + BODY_W / 2 - 2 * s, torsoBot);
  ctx.closePath();
  ctx.fillStyle = jerseyDark;
  ctx.globalAlpha = 0.25;
  ctx.fill();
  ctx.globalAlpha = 1;
  
  // Jersey main stripe (horizontal across chest)
  ctx.beginPath();
  const stripeY = torsoTop + BODY_H * 0.35;
  ctx.moveTo(sx - BODY_W / 2, stripeY);
  ctx.lineTo(sx + BODY_W / 2, stripeY);
  ctx.lineTo(sx + BODY_W / 2, stripeY + 3.5 * s);
  ctx.lineTo(sx - BODY_W / 2, stripeY + 3.5 * s);
  ctx.closePath();
  ctx.fillStyle = accentColor;
  ctx.fill();
  ctx.strokeStyle = accentDark;
  ctx.lineWidth = 0.6 * s;
  ctx.stroke();
  
  // Jersey side stripes (sleeves)
  const sleeveY1 = torsoTop + BODY_H * 0.2;
  const sleeveY2 = torsoTop + BODY_H * 0.6;
  
  // Left sleeve stripe
  ctx.beginPath();
  ctx.moveTo(sx - BODY_W / 2 - 1.5 * s, sleeveY1);
  ctx.lineTo(sx - BODY_W / 2 - 1.5 * s, sleeveY2);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2 * s;
  ctx.stroke();
  
  // Right sleeve stripe
  ctx.beginPath();
  ctx.moveTo(sx + BODY_W / 2 + 1.5 * s, sleeveY1);
  ctx.lineTo(sx + BODY_W / 2 + 1.5 * s, sleeveY2);
  ctx.stroke();
  
  // Player number on jersey
  const numSize = Math.max(10, Math.round(11 * s));
  ctx.font = `bold ${numSize}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ensureHex(team.primary);
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 3;
  const numY = torsoTop + BODY_H * 0.55;
  ctx.fillText(String(playerNumber), sx, numY);
  ctx.shadowBlur = 0;
  
  // ======== ARMS ========
  const shoulderY = torsoTop + 2 * s;
  const shoulderOffsetX = SHOULDER_W / 2;
  
  drawArm(ctx, sx - shoulderOffsetX, shoulderY, leftArmAngle, armBendL, ARM_LEN, ARM_W, jerseyColor, jerseyDark, jerseyLight, skinColor, gloveColor, gloveDark, accentColor, s);
  drawArm(ctx, sx + shoulderOffsetX, shoulderY, rightArmAngle, armBendR, ARM_LEN, ARM_W, jerseyColor, jerseyDark, jerseyLight, skinColor, gloveColor, gloveDark, accentColor, s);
  
  // ======== HEAD / HELMET ========
  const headY = torsoTop - HEAD_R * 0.5;
  
  // Helmet base
  ctx.beginPath();
  ctx.arc(sx, headY, HEAD_R, 0, Math.PI * 2);
  ctx.fillStyle = helmetColor;
  ctx.fill();
  ctx.strokeStyle = helmetDark;
  ctx.lineWidth = 1.3 * s;
  ctx.stroke();
  
  // Helmet gradient highlight (top-left for 3D effect)
  const helmetGrad = ctx.createRadialGradient(sx - HEAD_R * 0.35, headY - HEAD_R * 0.35, HEAD_R * 0.15, sx, headY, HEAD_R);
  helmetGrad.addColorStop(0, helmetLight);
  helmetGrad.addColorStop(0.6, helmetColor);
  helmetGrad.addColorStop(1, helmetDark);
  ctx.fillStyle = helmetGrad;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(sx, headY, HEAD_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  
  // Helmet center stripe (accent color)
  ctx.beginPath();
  ctx.moveTo(sx, headY - HEAD_R);
  ctx.lineTo(sx, headY + HEAD_R * 0.25);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3 * s;
  ctx.stroke();
  
  // Helmet stripe shadow
  ctx.beginPath();
  ctx.moveTo(sx + 1.5 * s, headY - HEAD_R);
  ctx.lineTo(sx + 1.5 * s, headY + HEAD_R * 0.25);
  ctx.strokeStyle = accentDark;
  ctx.lineWidth = 1 * s;
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
  
  // Visor with premium shading
  ctx.beginPath();
  const visorY = headY + HEAD_R * 0.08;
  ctx.ellipse(sx + HEAD_R * 0.3, visorY, HEAD_R * 0.65, HEAD_R * 0.38, 0, 0, Math.PI * 2);
  ctx.fillStyle = visorColor;
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 0.8 * s;
  ctx.stroke();
  
  // Visor shine (top highlight)
  ctx.beginPath();
  ctx.ellipse(sx + HEAD_R * 0.4, visorY - HEAD_R * 0.18, HEAD_R * 0.3, HEAD_R * 0.18, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();
  
  // Visor reflection (bottom)
  ctx.beginPath();
  ctx.ellipse(sx + HEAD_R * 0.25, visorY + HEAD_R * 0.15, HEAD_R * 0.2, HEAD_R * 0.1, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fill();
  
  // Face cage (5 vertical bars for premium detail)
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 0.8 * s;
  for (let i = 0; i < 5; i++) {
    const barX = sx + HEAD_R * 0.02 + i * HEAD_R * 0.18;
    ctx.beginPath();
    ctx.moveTo(barX, visorY - HEAD_R * 0.3);
    ctx.lineTo(barX, visorY + HEAD_R * 0.28);
    ctx.stroke();
  }
  
  // Face cage horizontal bar (top)
  ctx.beginPath();
  ctx.moveTo(sx + HEAD_R * 0.02, visorY - HEAD_R * 0.3);
  ctx.lineTo(sx + HEAD_R * 0.82, visorY - HEAD_R * 0.3);
  ctx.stroke();
  
  // Face cage horizontal bar (bottom)
  ctx.beginPath();
  ctx.moveTo(sx + HEAD_R * 0.02, visorY + HEAD_R * 0.28);
  ctx.lineTo(sx + HEAD_R * 0.82, visorY + HEAD_R * 0.28);
  ctx.stroke();
  
  // Chin strap (accent color)
  ctx.beginPath();
  ctx.arc(sx - HEAD_R * 0.7, headY + HEAD_R * 0.4, 2.2 * s, 0, Math.PI * 2);
  ctx.fillStyle = accentColor;
  ctx.fill();
  ctx.strokeStyle = accentDark;
  ctx.lineWidth = 0.5 * s;
  ctx.stroke();
  
  ctx.restore();
}

// ============================================================
// DRAW LEG — PREMIUM WITH ADVANCED SHADING
// ============================================================
function drawLeg(
  ctx: CanvasRenderingContext2D,
  hipX: number, hipY: number,
  angle: number, kneeBend: number,
  length: number, width: number, footLen: number,
  pantsColor: string, pantsDark: string, pantsLight: string, shoeColor: string, shoeDark: string,
  accentColor: string,
  scale: number,
) {
  const s = scale;
  
  // Upper leg
  const kneeX = hipX + Math.sin(angle) * length * 0.5;
  const kneeY = hipY + Math.cos(angle) * length * 0.5;
  
  // Lower leg (bent knee)
  const footX = kneeX + Math.sin(angle + kneeBend) * length * 0.5;
  const footY = kneeY + Math.cos(angle + kneeBend) * length * 0.5;
  
  // Upper leg (thigh) — muscular
  ctx.beginPath();
  const thighW = width * 1.3;
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
  ctx.lineWidth = 0.7 * s;
  ctx.stroke();
  
  // Thigh highlight (muscle definition)
  ctx.beginPath();
  ctx.moveTo(hipX + perpX * 0.6, hipY + perpY * 0.6);
  ctx.lineTo(hipX + perpX, hipY + perpY);
  ctx.lineTo(kneeX + perpX, kneeY + perpY);
  ctx.lineTo(kneeX + perpX * 0.6, kneeY + perpY * 0.6);
  ctx.closePath();
  ctx.fillStyle = pantsLight;
  ctx.globalAlpha = 0.4;
  ctx.fill();
  ctx.globalAlpha = 1;
  
  // Thigh shadow (opposite side)
  ctx.beginPath();
  ctx.moveTo(hipX - perpX * 0.6, hipY - perpY * 0.6);
  ctx.lineTo(hipX - perpX, hipY - perpY);
  ctx.lineTo(kneeX - perpX, kneeY - perpY);
  ctx.lineTo(kneeX - perpX * 0.6, kneeY - perpY * 0.6);
  ctx.closePath();
  ctx.fillStyle = pantsDark;
  ctx.globalAlpha = 0.2;
  ctx.fill();
  ctx.globalAlpha = 1;
  
  // Lower leg (calf) — muscular
  const calfW = width * 0.95;
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
  ctx.lineWidth = 0.7 * s;
  ctx.stroke();
  
  // Calf highlight
  ctx.beginPath();
  ctx.moveTo(kneeX + perpX2 * 0.5, kneeY + perpY2 * 0.5);
  ctx.lineTo(kneeX + perpX2, kneeY + perpY2);
  ctx.lineTo(footX + perpX2, footY + perpY2);
  ctx.lineTo(footX + perpX2 * 0.5, footY + perpY2 * 0.5);
  ctx.closePath();
  ctx.fillStyle = pantsLight;
  ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.globalAlpha = 1;
  
  // Shoe with premium shading
  const shoeW = footLen;
  const shoeH = width * 0.85;
  const shoeAngle = angle + kneeBend;
  ctx.save();
  ctx.translate(footX, footY);
  ctx.rotate(shoeAngle);
  
  // Shoe base
  ctx.beginPath();
  ctx.ellipse(0, 0, shoeW, shoeH, 0, 0, Math.PI * 2);
  ctx.fillStyle = shoeColor;
  ctx.fill();
  ctx.strokeStyle = shoeDark;
  ctx.lineWidth = 0.6 * s;
  ctx.stroke();
  
  // Shoe highlight
  ctx.beginPath();
  ctx.ellipse(-shoeW * 0.3, -shoeH * 0.3, shoeW * 0.5, shoeH * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fill();
  
  // Shoe accent stripe
  ctx.beginPath();
  ctx.moveTo(-shoeW * 0.5, 0);
  ctx.lineTo(shoeW * 0.5, 0);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.2 * s;
  ctx.globalAlpha = 0.7;
  ctx.stroke();
  ctx.globalAlpha = 1;
  
  ctx.restore();
}

// ============================================================
// DRAW ARM — PREMIUM WITH ADVANCED SHADING
// ============================================================
function drawArm(
  ctx: CanvasRenderingContext2D,
  shoulderX: number, shoulderY: number,
  angle: number, bend: number,
  length: number, width: number,
  jerseyColor: string, jerseyDark: string, jerseyLight: string, skinColor: string, gloveColor: string, gloveDark: string,
  accentColor: string,
  scale: number,
) {
  const s = scale;
  
  // Elbow position
  const elbowX = shoulderX + Math.sin(angle) * length * 0.5;
  const elbowY = shoulderY + Math.cos(angle) * length * 0.5;
  
  // Hand position (with elbow bend)
  const handX = elbowX + Math.sin(angle + bend) * length * 0.5;
  const handY = elbowY + Math.cos(angle + bend) * length * 0.5;
  
  // Upper arm (shoulder to elbow) — muscular
  const upperW = width * 1.15;
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
  ctx.lineWidth = 0.6 * s;
  ctx.stroke();
  
  // Upper arm highlight (bicep)
  ctx.beginPath();
  ctx.moveTo(shoulderX + perpX * 0.6, shoulderY + perpY * 0.6);
  ctx.lineTo(shoulderX + perpX, shoulderY + perpY);
  ctx.lineTo(elbowX + perpX, elbowY + perpY);
  ctx.lineTo(elbowX + perpX * 0.6, elbowY + perpY * 0.6);
  ctx.closePath();
  ctx.fillStyle = jerseyLight;
  ctx.globalAlpha = 0.4;
  ctx.fill();
  ctx.globalAlpha = 1;
  
  // Forearm (elbow to hand) — with skin showing
  const foreW = width * 0.95;
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
  ctx.lineWidth = 0.6 * s;
  ctx.stroke();
  
  // Forearm highlight (muscle)
  ctx.beginPath();
  ctx.moveTo(elbowX + perpX2 * 0.6, elbowY + perpY2 * 0.6);
  ctx.lineTo(elbowX + perpX2, elbowY + perpY2);
  ctx.lineTo(handX + perpX2, handY + perpY2);
  ctx.lineTo(handX + perpX2 * 0.6, handY + perpY2 * 0.6);
  ctx.closePath();
  ctx.fillStyle = lighten(skinColor, 0.15);
  ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.globalAlpha = 1;
  
  // Arm band (accent color)
  ctx.beginPath();
  const bandY = elbowY - foreW * 0.3;
  ctx.moveTo(elbowX - perpX2 * 1.1, bandY);
  ctx.lineTo(elbowX + perpX2 * 1.1, bandY);
  ctx.lineTo(elbowX + perpX2 * 1.1, bandY + 2.5 * s);
  ctx.lineTo(elbowX - perpX2 * 1.1, bandY + 2.5 * s);
  ctx.closePath();
  ctx.fillStyle = accentColor;
  ctx.fill();
  ctx.strokeStyle = darken(accentColor, 0.2);
  ctx.lineWidth = 0.5 * s;
  ctx.stroke();
  
  // Glove/hand with premium shading
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(angle + bend);
  
  // Glove base
  ctx.beginPath();
  ctx.ellipse(0, 0, width * 0.85, width * 1.05, 0, 0, Math.PI * 2);
  ctx.fillStyle = gloveColor;
  ctx.fill();
  ctx.strokeStyle = gloveDark;
  ctx.lineWidth = 0.6 * s;
  ctx.stroke();
  
  // Glove highlight
  ctx.beginPath();
  ctx.ellipse(-width * 0.25, -width * 0.25, width * 0.4, width * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fill();
  
  // Glove accent stripe
  ctx.beginPath();
  ctx.moveTo(-width * 0.5, 0);
  ctx.lineTo(width * 0.5, 0);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1 * s;
  ctx.globalAlpha = 0.6;
  ctx.stroke();
  ctx.globalAlpha = 1;
  
  ctx.restore();
}

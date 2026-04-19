/**
 * PlayerRenderer — Premium Professional Player Graphics for Pyroball
 * 
 * Draws highly detailed, visually impressive 2D players with:
 * - Realistic athletic proportions and body structure
 * - Detailed helmet design with visor, face cage, and professional shading
 * - High-quality jersey with team colors, stripes, and player numbers
 * - Muscular limbs with proper joint articulation
 * - Advanced shading, gradients, and lighting for 3D depth
 * - Smooth, natural animations across all poses
 * - Professional accessories (gloves, shoes, arm bands, face cage)
 * 
 * Style: Premium sports game — realistic, athletic, visually impressive
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
// DRAW PLAYER CHARACTER — PREMIUM PROFESSIONAL DESIGN
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
  ctx.save();
  ctx.translate(sx, sy - jumpOffset);
  if (facingLeft) ctx.scale(-1, 1);
  
  // Premium athletic proportions — realistic sports player build
  const HEAD_R = 8.5 * s;
  const NECK_H = 3 * s;
  const SHOULDER_W = 18 * s;
  const BODY_W = 14 * s;
  const BODY_H = 16 * s;
  const CHEST_W = 15 * s;
  const ARM_LEN = 13 * s;
  const ARM_W = 4.5 * s;
  const FOREARM_W = 3.5 * s;
  const LEG_LEN = 15 * s;
  const LEG_W = 5 * s;
  const THIGH_W = 6 * s;
  const CALF_W = 4.5 * s;
  const FOOT_LEN = 6.5 * s;
  
  // Premium color palette with depth
  const jerseyColor = ensureHex(team.secondary);
  const jerseyDark = darken(jerseyColor, 0.5);
  const jerseyLight = lighten(jerseyColor, 0.3);
  
  const pantsColor = ensureHex(team.primary);
  const pantsDark = darken(pantsColor, 0.45);
  const pantsLight = lighten(pantsColor, 0.15);
  
  const skinColor = '#D4A574';
  const skinDark = '#B8956A';
  
  const helmetColor = ensureHex(team.primary);
  const helmetDark = darken(helmetColor, 0.6);
  const helmetLight = lighten(helmetColor, 0.4);
  
  // ============================================================
  // ANIMATION OFFSETS — ENHANCED WITH DYNAMIC MOTION
  // ============================================================
  let legRotL = 0, legRotR = 0, armRotL = 0, armRotR = 0, forearmRotL = 0, forearmRotR = 0;
  let bodyBob = 0, bodyTilt = 0, bodyLean = 0;
  
  if (pose === 'running') {
    // Enhanced running animation with more dynamic arm and leg motion
    const cycle = (frame % 16) / 16; // Slower cycle for more natural feel
    const legSwing = Math.sin(cycle * Math.PI * 2);
    const armSwing = Math.sin((cycle + 0.5) * Math.PI * 2);
    const legAmplitude = 55; // Increased for more dramatic leg motion
    const armAmplitude = 70; // Increased for more arm swing
    const forearmAmplitude = 45; // Increased for more forearm motion
    
    // Legs: opposite phase for realistic running stride
    legRotL = legSwing * legAmplitude;
    legRotR = Math.sin((cycle + 0.5) * Math.PI * 2) * legAmplitude;
    
    // Arms: opposite to legs (when left leg forward, right arm forward)
    armRotL = armSwing * armAmplitude;
    armRotR = Math.sin(cycle * Math.PI * 2) * armAmplitude;
    
    // Forearms: follow arm motion with additional bend
    forearmRotL = armSwing * forearmAmplitude;
    forearmRotR = Math.sin(cycle * Math.PI * 2) * forearmAmplitude;
    
    // Body bobbing: natural up-down motion from running
    bodyBob = Math.abs(Math.sin(cycle * Math.PI)) * 4;
    
    // Body tilt: lean forward slightly during run
    bodyTilt = Math.sin(cycle * Math.PI * 2) * 6;
    
    // Body lean: side-to-side sway
    bodyLean = Math.sin(cycle * Math.PI * 2) * 3;
  } else if (pose === 'jumping') {
    // Enhanced jumping pose with more dynamic arm positioning
    const jumpFrame = (frame % 8) / 8;
    const jumpPhase = Math.sin(jumpFrame * Math.PI);
    
    // Arms up during jump
    armRotL = -70 + jumpPhase * 10;
    armRotR = -70 + jumpPhase * 10;
    forearmRotL = -50 + jumpPhase * 15;
    forearmRotR = -50 + jumpPhase * 15;
    
    // Body positioning
    bodyTilt = -12 + jumpPhase * 4;
    bodyBob = jumpPhase * 2;
  } else if (pose === 'shooting') {
    const shootFrame = (frame % 10) / 10;
    const shootEase = shootFrame < 0.5 ? shootFrame * 2 : 2 - shootFrame * 2;
    armRotR = -100 + shootEase * 50;
    forearmRotR = -80 + shootEase * 60;
    bodyTilt = -18;
    bodyLean = 8;
  } else if (pose === 'passing') {
    const passFrame = (frame % 8) / 8;
    const passSway = Math.sin(passFrame * Math.PI * 2) * 3;
    armRotL = -55 + passSway;
    armRotR = 55 + passSway;
    forearmRotL = -45;
    forearmRotR = 45;
    bodyTilt = 25 + passSway;
  } else if (pose === 'catching') {
    const catchFrame = (frame % 6) / 6;
    const catchBounce = Math.abs(Math.sin(catchFrame * Math.PI)) * 1.5;
    armRotL = -75 + catchBounce;
    armRotR = -75 + catchBounce;
    forearmRotL = -60;
    forearmRotR = -60;
    bodyTilt = 12;
    bodyBob = catchBounce;
  }
  
  // ============================================================
  // DRAW LEGS
  // ============================================================
  // Left leg
  ctx.save();
  ctx.translate(-BODY_W / 2 - 1 * s, BODY_H);
  ctx.rotate((legRotL * Math.PI) / 180);
  
  // Thigh
  ctx.fillStyle = pantsColor;
  ctx.beginPath();
  ctx.ellipse(0, LEG_LEN * 0.35, THIGH_W / 2, LEG_LEN * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pantsDark;
  ctx.beginPath();
  ctx.ellipse(-THIGH_W / 4, LEG_LEN * 0.35, THIGH_W / 4, LEG_LEN * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Calf
  ctx.fillStyle = pantsColor;
  ctx.beginPath();
  ctx.ellipse(0, LEG_LEN * 0.75, CALF_W / 2, LEG_LEN * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pantsDark;
  ctx.beginPath();
  ctx.ellipse(-CALF_W / 4, LEG_LEN * 0.75, CALF_W / 4, LEG_LEN * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Shoe
  ctx.fillStyle = team.primary;
  ctx.beginPath();
  ctx.ellipse(0, LEG_LEN - 1.5 * s, FOOT_LEN / 2, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = darken(team.primary, 0.35);
  ctx.beginPath();
  ctx.ellipse(-FOOT_LEN / 4, LEG_LEN - 0.5 * s, FOOT_LEN / 4, 1.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
  
  // Right leg
  ctx.save();
  ctx.rotate((legRotR * Math.PI) / 180);
  
  // Thigh
  ctx.fillStyle = pantsColor;
  ctx.beginPath();
  ctx.ellipse(0, LEG_LEN * 0.35, THIGH_W / 2, LEG_LEN * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pantsDark;
  ctx.beginPath();
  ctx.ellipse(THIGH_W / 4, LEG_LEN * 0.35, THIGH_W / 4, LEG_LEN * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Calf
  ctx.fillStyle = pantsColor;
  ctx.beginPath();
  ctx.ellipse(0, LEG_LEN * 0.75, CALF_W / 2, LEG_LEN * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pantsDark;
  ctx.beginPath();
  ctx.ellipse(CALF_W / 4, LEG_LEN * 0.75, CALF_W / 4, LEG_LEN * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Shoe
  ctx.fillStyle = team.primary;
  ctx.beginPath();
  ctx.ellipse(0, LEG_LEN - 1.5 * s, FOOT_LEN / 2, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = darken(team.primary, 0.35);
  ctx.beginPath();
  ctx.ellipse(FOOT_LEN / 4, LEG_LEN - 0.5 * s, FOOT_LEN / 4, 1.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
  ctx.restore();
  
  // ============================================================
  // DRAW BODY & JERSEY
  // ============================================================
  ctx.save();
  ctx.translate(bodyLean, bodyBob);
  ctx.rotate((bodyTilt * Math.PI) / 180);
  
  // Jersey base with gradient effect
  ctx.fillStyle = jerseyColor;
  ctx.beginPath();
  ctx.ellipse(0, BODY_H / 2, CHEST_W / 2, BODY_H / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Jersey shading (left side darker for 3D effect)
  ctx.fillStyle = jerseyDark;
  ctx.beginPath();
  ctx.ellipse(-CHEST_W / 3, BODY_H / 2, CHEST_W / 3, BODY_H / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Jersey highlight (right side lighter)
  ctx.fillStyle = jerseyLight;
  ctx.beginPath();
  ctx.ellipse(CHEST_W / 3, BODY_H / 2, CHEST_W / 4, BODY_H / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Chest stripe (prominent team color accent)
  ctx.fillStyle = team.primary;
  ctx.fillRect(-CHEST_W / 10, BODY_H / 4, CHEST_W / 5, BODY_H / 2);
  
  // Sleeve stripes
  ctx.fillStyle = team.primary;
  ctx.fillRect(-CHEST_W / 2 - 1 * s, BODY_H / 3, 2 * s, BODY_H / 3);
  ctx.fillRect(CHEST_W / 2 - 1 * s, BODY_H / 3, 2 * s, BODY_H / 3);
  
  // Player number on jersey
  ctx.fillStyle = 'white';
  ctx.font = `bold ${10 * s}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(playerNumber.toString(), 0, BODY_H / 2);
  
  ctx.restore();
  
  // ============================================================
  // DRAW ARMS WITH FOREARM SEPARATION
  // ============================================================
  // Left arm
  ctx.save();
  ctx.translate(-SHOULDER_W / 2, NECK_H);
  ctx.rotate((armRotL * Math.PI) / 180);
  
  // Upper arm
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.ellipse(0, ARM_LEN * 0.35, ARM_W / 2, ARM_LEN * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skinDark;
  ctx.beginPath();
  ctx.ellipse(-ARM_W / 4, ARM_LEN * 0.35, ARM_W / 4, ARM_LEN * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Forearm
  ctx.save();
  ctx.translate(0, ARM_LEN * 0.7);
  ctx.rotate((forearmRotL * Math.PI) / 180);
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.ellipse(0, ARM_LEN * 0.25, FOREARM_W / 2, ARM_LEN * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skinDark;
  ctx.beginPath();
  ctx.ellipse(-FOREARM_W / 4, ARM_LEN * 0.25, FOREARM_W / 4, ARM_LEN * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Glove
  ctx.fillStyle = team.primary;
  ctx.beginPath();
  ctx.ellipse(0, ARM_LEN * 0.5 - 1 * s, FOREARM_W + 1.5 * s, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = darken(team.primary, 0.3);
  ctx.beginPath();
  ctx.ellipse(-FOREARM_W / 2, ARM_LEN * 0.5 - 0.5 * s, FOREARM_W / 2, 1.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  
  // Arm band
  ctx.fillStyle = team.primary;
  ctx.fillRect(-ARM_W / 2 - 1 * s, ARM_LEN * 0.15, ARM_W + 2 * s, 1.5 * s);
  
  ctx.restore();
  
  // Right arm
  ctx.save();
  ctx.translate(SHOULDER_W / 2, NECK_H);
  ctx.rotate((armRotR * Math.PI) / 180);
  
  // Upper arm
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.ellipse(0, ARM_LEN * 0.35, ARM_W / 2, ARM_LEN * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skinDark;
  ctx.beginPath();
  ctx.ellipse(ARM_W / 4, ARM_LEN * 0.35, ARM_W / 4, ARM_LEN * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Forearm
  ctx.save();
  ctx.translate(0, ARM_LEN * 0.7);
  ctx.rotate((forearmRotR * Math.PI) / 180);
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.ellipse(0, ARM_LEN * 0.25, FOREARM_W / 2, ARM_LEN * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skinDark;
  ctx.beginPath();
  ctx.ellipse(FOREARM_W / 4, ARM_LEN * 0.25, FOREARM_W / 4, ARM_LEN * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Glove
  ctx.fillStyle = team.primary;
  ctx.beginPath();
  ctx.ellipse(0, ARM_LEN * 0.5 - 1 * s, FOREARM_W + 1.5 * s, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = darken(team.primary, 0.3);
  ctx.beginPath();
  ctx.ellipse(FOREARM_W / 2, ARM_LEN * 0.5 - 0.5 * s, FOREARM_W / 2, 1.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  
  // Arm band
  ctx.fillStyle = team.primary;
  ctx.fillRect(-ARM_W / 2 - 1 * s, ARM_LEN * 0.15, ARM_W + 2 * s, 1.5 * s);
  
  ctx.restore();
  
  // ============================================================
  // DRAW HEAD & HELMET
  // ============================================================
  ctx.save();
  ctx.translate(0, -BODY_H / 2 - NECK_H);
  
  // Head base
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(0, -NECK_H - HEAD_R, HEAD_R, 0, Math.PI * 2);
  ctx.fill();
  
  // Head shading
  ctx.fillStyle = skinDark;
  ctx.beginPath();
  ctx.arc(-HEAD_R * 0.4, -NECK_H - HEAD_R, HEAD_R * 0.6, 0, Math.PI * 2);
  ctx.fill();
  
  // Helmet base
  ctx.fillStyle = helmetColor;
  ctx.beginPath();
  ctx.arc(0, -NECK_H - HEAD_R, HEAD_R + 2 * s, 0, Math.PI * 2);
  ctx.fill();
  
  // Helmet shading (left darker)
  ctx.fillStyle = helmetDark;
  ctx.beginPath();
  ctx.arc(-HEAD_R * 0.5, -NECK_H - HEAD_R, HEAD_R * 0.7, 0, Math.PI * 2);
  ctx.fill();
  
  // Helmet highlight (right lighter)
  ctx.fillStyle = helmetLight;
  ctx.beginPath();
  ctx.arc(HEAD_R * 0.4, -NECK_H - HEAD_R - 1.5 * s, HEAD_R * 0.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Visor (dark tinted)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, -NECK_H - HEAD_R + 1 * s, HEAD_R * 1.4, HEAD_R * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Visor shine
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.ellipse(HEAD_R * 0.3, -NECK_H - HEAD_R - 0.5 * s, HEAD_R * 0.6, HEAD_R * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Face cage (6 bars)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 0.8 * s;
  
  // Vertical bars
  for (let i = -2; i <= 2; i++) {
    const x = (i / 2.5) * HEAD_R * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, -NECK_H - HEAD_R - 0.5 * s);
    ctx.lineTo(x, -NECK_H - HEAD_R + 2.5 * s);
    ctx.stroke();
  }
  
  // Horizontal bars
  ctx.beginPath();
  ctx.arc(0, -NECK_H - HEAD_R + 0.5 * s, HEAD_R * 0.8, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(0, -NECK_H - HEAD_R + 1.5 * s, HEAD_R * 0.9, 0, Math.PI * 2);
  ctx.stroke();
  
  // Chin strap
  ctx.strokeStyle = darken(helmetColor, 0.4);
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo(-HEAD_R * 0.6, -NECK_H - HEAD_R + 1.5 * s);
  ctx.lineTo(-HEAD_R * 0.3, -NECK_H);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(HEAD_R * 0.6, -NECK_H - HEAD_R + 1.5 * s);
  ctx.lineTo(HEAD_R * 0.3, -NECK_H);
  ctx.stroke();
  
  ctx.restore();
}

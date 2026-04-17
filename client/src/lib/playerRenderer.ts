/**
 * PlayerRenderer — Premium Vector Player Sprites for Pyroball
 * 
 * Draws highly polished, visually appealing 2D players with:
 * - Clean, modern design with smooth curves and proportions
 * - Professional helmet with gradient shading and visor
 * - High-quality jersey with team colors and player number
 * - Smooth, natural limb proportions with athletic build
 * - Advanced shading and lighting for 3D depth perception
 * - Fluid animations across all poses (idle, run, jump, shoot, pass, catch)
 * - Dynamic team colors with accent details
 * 
 * Style: Modern sports game — clean, polished, professional
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
// DRAW PLAYER CHARACTER — POLISHED DESIGN
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
  
  // Modern proportions — balanced athletic build
  const HEAD_R = 7 * s;
  const NECK_H = 3 * s;
  const BODY_W = 14 * s;
  const BODY_H = 16 * s;
  const SHOULDER_W = 16 * s;
  const ARM_LEN = 11 * s;
  const ARM_W = 4 * s;
  const LEG_LEN = 13 * s;
  const LEG_W = 4.5 * s;
  const FOOT_LEN = 6 * s;
  
  // Premium color palette
  const jerseyColor = ensureHex(team.secondary);
  const jerseyDark = darken(jerseyColor, 0.4);
  const jerseyLight = lighten(jerseyColor, 0.3);
  
  const pantsColor = ensureHex(team.primary);
  const pantsDark = darken(pantsColor, 0.35);
  const pantsLight = lighten(pantsColor, 0.15);
  
  const helmetColor = ensureHex(team.secondary);
  const helmetDark = darken(helmetColor, 0.4);
  const helmetLight = lighten(helmetColor, 0.35);
  
  const accentColor = ensureHex(team.accent);
  const skinColor = '#E8B89F';
  const shoeColor = '#1a1a1a';
  const shoeDark = '#0a0a0a';
  
  // Animation parameters
  let bodyOffsetY = 0;
  let leftArmRotation = 0;
  let rightArmRotation = 0;
  let leftLegRotation = 0;
  let rightLegRotation = 0;
  let bodyRotation = 0;
  
  const animFrame = frame % 8;
  
  // Apply pose-specific animations
  if (pose === 'running') {
    bodyOffsetY = Math.sin(animFrame * Math.PI / 4) * 1.5 * s;
    leftArmRotation = Math.sin(animFrame * Math.PI / 4) * 0.4;
    rightArmRotation = -Math.sin(animFrame * Math.PI / 4) * 0.4;
    leftLegRotation = Math.cos(animFrame * Math.PI / 4) * 0.5;
    rightLegRotation = -Math.cos(animFrame * Math.PI / 4) * 0.5;
  } else if (pose === 'jumping') {
    bodyOffsetY = Math.abs(Math.sin(animFrame * Math.PI / 8)) * 2 * s;
    leftArmRotation = -0.3;
    rightArmRotation = -0.3;
  } else if (pose === 'shooting') {
    rightArmRotation = -0.8;
    bodyRotation = 0.15;
  } else if (pose === 'passing') {
    rightArmRotation = -0.5;
    leftArmRotation = 0.2;
  } else if (pose === 'catching') {
    rightArmRotation = -0.6;
    leftArmRotation = -0.4;
  }
  
  // ============================================================
  // DRAW LEGS
  // ============================================================
  const legStartY = BODY_H / 2;
  
  // Left leg
  ctx.save();
  ctx.translate(-BODY_W / 4, legStartY);
  ctx.rotate(leftLegRotation);
  
  // Thigh
  ctx.fillStyle = pantsColor;
  ctx.fillRect(-LEG_W / 2, 0, LEG_W, LEG_LEN * 0.6);
  
  // Calf
  ctx.fillStyle = pantsDark;
  ctx.fillRect(-LEG_W / 2, LEG_LEN * 0.6, LEG_W, LEG_LEN * 0.4);
  
  // Shoe
  ctx.fillStyle = shoeColor;
  ctx.beginPath();
  ctx.ellipse(0, LEG_LEN + 1.5 * s, FOOT_LEN / 2, 2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
  
  // Right leg
  ctx.save();
  ctx.translate(BODY_W / 4, legStartY);
  ctx.rotate(rightLegRotation);
  
  // Thigh
  ctx.fillStyle = pantsColor;
  ctx.fillRect(-LEG_W / 2, 0, LEG_W, LEG_LEN * 0.6);
  
  // Calf
  ctx.fillStyle = pantsDark;
  ctx.fillRect(-LEG_W / 2, LEG_LEN * 0.6, LEG_W, LEG_LEN * 0.4);
  
  // Shoe
  ctx.fillStyle = shoeColor;
  ctx.beginPath();
  ctx.ellipse(0, LEG_LEN + 1.5 * s, FOOT_LEN / 2, 2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
  
  // ============================================================
  // DRAW BODY & JERSEY
  // ============================================================
  ctx.save();
  ctx.translate(0, bodyOffsetY);
  ctx.rotate(bodyRotation);
  
  // Jersey base
  ctx.fillStyle = jerseyColor;
  ctx.beginPath();
  ctx.moveTo(-BODY_W / 2, -BODY_H / 2);
  ctx.lineTo(BODY_W / 2, -BODY_H / 2);
  ctx.quadraticCurveTo(BODY_W / 2 + 2 * s, 0, BODY_W / 2, BODY_H / 2);
  ctx.lineTo(-BODY_W / 2, BODY_H / 2);
  ctx.quadraticCurveTo(-BODY_W / 2 - 2 * s, 0, -BODY_W / 2, -BODY_H / 2);
  ctx.fill();
  
  // Jersey shading
  const jerseyGrad = ctx.createLinearGradient(-BODY_W / 2, -BODY_H / 2, BODY_W / 2, -BODY_H / 2);
  jerseyGrad.addColorStop(0, 'rgba(0,0,0,0.1)');
  jerseyGrad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  jerseyGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
  ctx.fillStyle = jerseyGrad;
  ctx.fillRect(-BODY_W / 2, -BODY_H / 2, BODY_W, BODY_H);
  
  // Jersey stripe (accent color)
  ctx.fillStyle = accentColor;
  ctx.fillRect(-2 * s, -BODY_H / 2, 4 * s, BODY_H);
  
  // Jersey number
  ctx.fillStyle = jerseyLight;
  ctx.font = `bold ${Math.round(8 * s)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(playerNumber), 0, 2 * s);
  
  ctx.restore();
  
  // ============================================================
  // DRAW ARMS
  // ============================================================
  
  // Left arm
  ctx.save();
  ctx.translate(-SHOULDER_W / 2, -BODY_H / 4 + bodyOffsetY);
  ctx.rotate(leftArmRotation);
  
  // Upper arm
  ctx.fillStyle = skinColor;
  ctx.fillRect(-ARM_W / 2, 0, ARM_W, ARM_LEN * 0.6);
  
  // Forearm
  ctx.fillStyle = darken(skinColor, 0.15);
  ctx.fillRect(-ARM_W / 2, ARM_LEN * 0.6, ARM_W, ARM_LEN * 0.4);
  
  // Glove
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.ellipse(0, ARM_LEN + 1 * s, ARM_W / 1.5, 2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
  
  // Right arm
  ctx.save();
  ctx.translate(SHOULDER_W / 2, -BODY_H / 4 + bodyOffsetY);
  ctx.rotate(rightArmRotation);
  
  // Upper arm
  ctx.fillStyle = skinColor;
  ctx.fillRect(-ARM_W / 2, 0, ARM_W, ARM_LEN * 0.6);
  
  // Forearm
  ctx.fillStyle = darken(skinColor, 0.15);
  ctx.fillRect(-ARM_W / 2, ARM_LEN * 0.6, ARM_W, ARM_LEN * 0.4);
  
  // Glove
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.ellipse(0, ARM_LEN + 1 * s, ARM_W / 1.5, 2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
  
  // ============================================================
  // DRAW HEAD & HELMET
  // ============================================================
  ctx.save();
  ctx.translate(0, -BODY_H / 2 - NECK_H - HEAD_R + bodyOffsetY);
  
  // Helmet base
  ctx.fillStyle = helmetColor;
  ctx.beginPath();
  ctx.arc(0, 0, HEAD_R, 0, Math.PI * 2);
  ctx.fill();
  
  // Helmet shading
  const helmetGrad = ctx.createRadialGradient(-HEAD_R * 0.3, -HEAD_R * 0.3, 0, 0, 0, HEAD_R);
  helmetGrad.addColorStop(0, helmetLight);
  helmetGrad.addColorStop(1, helmetDark);
  ctx.fillStyle = helmetGrad;
  ctx.beginPath();
  ctx.arc(0, 0, HEAD_R, 0, Math.PI * 2);
  ctx.fill();
  
  // Face cage (6 bars)
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 0.8 * s;
  ctx.lineCap = 'round';
  
  // Horizontal bars
  for (let i = -1; i <= 1; i++) {
    const y = i * HEAD_R * 0.4;
    ctx.beginPath();
    ctx.moveTo(-HEAD_R * 0.6, y);
    ctx.lineTo(HEAD_R * 0.6, y);
    ctx.stroke();
  }
  
  // Vertical bars
  for (let i = -1; i <= 1; i++) {
    const x = i * HEAD_R * 0.4;
    ctx.beginPath();
    ctx.moveTo(x, -HEAD_R * 0.7);
    ctx.lineTo(x, HEAD_R * 0.7);
    ctx.stroke();
  }
  
  // Visor
  ctx.fillStyle = 'rgba(100, 180, 255, 0.7)';
  ctx.beginPath();
  ctx.ellipse(0, HEAD_R * 0.2, HEAD_R * 0.8, HEAD_R * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Visor shine
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.ellipse(-HEAD_R * 0.3, HEAD_R * 0.1, HEAD_R * 0.3, HEAD_R * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Chin strap
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.arc(0, 0, HEAD_R * 0.9, Math.PI * 0.3, Math.PI * 0.7);
  ctx.stroke();
  
  ctx.restore();
  
  ctx.restore();
}

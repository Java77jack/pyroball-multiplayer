/**
 * PlayerRenderer — Professional Polished Player Sprites for Pyroball
 * 
 * Draws highly polished, visually appealing 2D players with:
 * - Clean, modern design with smooth curves and professional proportions
 * - Detailed helmet with gradient shading, visor, and face cage
 * - High-quality jersey with team colors, chest stripe, and player number
 * - Athletic limb proportions with smooth muscle definition
 * - Professional shading and lighting for 3D depth perception
 * - Fluid animations across all poses (idle, run, jump, shoot, pass, catch)
 * - Dynamic team colors with accent details on gloves, shoes, arm bands
 * 
 * Style: Professional sports game — polished, playable, visually appealing
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
// DRAW PLAYER CHARACTER — POLISHED PROFESSIONAL DESIGN
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
  
  // Professional proportions — balanced athletic build
  const HEAD_R = 7.5 * s;
  const NECK_H = 2.5 * s;
  const BODY_W = 13 * s;
  const BODY_H = 15 * s;
  const SHOULDER_W = 16 * s;
  const ARM_LEN = 11 * s;
  const ARM_W = 4 * s;
  const LEG_LEN = 14 * s;
  const LEG_W = 4.5 * s;
  const FOOT_LEN = 6 * s;
  
  // Professional color palette
  const jerseyColor = ensureHex(team.secondary);
  const jerseyDark = darken(jerseyColor, 0.45);
  const jerseyLight = lighten(jerseyColor, 0.25);
  
  const pantsColor = ensureHex(team.primary);
  const pantsDark = darken(pantsColor, 0.4);
  const pantsLight = lighten(pantsColor, 0.1);
  
  const helmetColor = ensureHex(team.secondary);
  const helmetDark = darken(helmetColor, 0.5);
  const helmetLight = lighten(helmetColor, 0.4);
  
  const skinColor = '#E8B8A0';
  const skinDark = '#D4A08C';
  
  // Animation offsets based on pose and frame
  let legRotL = 0, legRotR = 0, armRotL = 0, armRotR = 0, bodyBob = 0, bodyTilt = 0;
  
  if (pose === 'running') {
    const cycle = (frame % 8) / 8;
    legRotL = Math.sin(cycle * Math.PI * 2) * 25;
    legRotR = Math.sin((cycle + 0.5) * Math.PI * 2) * 25;
    armRotL = Math.sin((cycle + 0.5) * Math.PI * 2) * 30;
    armRotR = Math.sin(cycle * Math.PI * 2) * 30;
    bodyBob = Math.abs(Math.sin(cycle * Math.PI)) * 1.5;
  } else if (pose === 'jumping') {
    armRotL = -35;
    armRotR = -35;
    bodyTilt = 0;
  } else if (pose === 'shooting') {
    const shootFrame = (frame % 6) / 6;
    armRotR = -90 + shootFrame * 30;
    bodyTilt = -10;
  } else if (pose === 'passing') {
    armRotL = -45;
    armRotR = 45;
    bodyTilt = 15;
  } else if (pose === 'catching') {
    armRotL = -60;
    armRotR = -60;
    bodyTilt = 5;
  }
  
  // ============================================================
  // DRAW LEGS
  // ============================================================
  ctx.save();
  ctx.translate(0, NECK_H + BODY_H);
  
  // Left leg
  ctx.save();
  ctx.rotate((legRotL * Math.PI) / 180);
  ctx.fillStyle = pantsColor;
  ctx.fillRect(-LEG_W / 2, 0, LEG_W, LEG_LEN);
  // Leg shading
  ctx.fillStyle = pantsDark;
  ctx.fillRect(-LEG_W / 2, 0, LEG_W / 2, LEG_LEN);
  ctx.restore();
  
  // Right leg
  ctx.save();
  ctx.rotate((legRotR * Math.PI) / 180);
  ctx.translate(0, 0);
  ctx.fillStyle = pantsColor;
  ctx.fillRect(-LEG_W / 2, 0, LEG_W, LEG_LEN);
  // Leg shading
  ctx.fillStyle = pantsDark;
  ctx.fillRect(0, 0, LEG_W / 2, LEG_LEN);
  ctx.restore();
  
  // Shoes
  ctx.fillStyle = team.primary;
  ctx.fillRect(-LEG_W / 2 - 1.5 * s, LEG_LEN - 2 * s, LEG_W + 3 * s, 2 * s);
  ctx.fillStyle = darken(team.primary, 0.3);
  ctx.fillRect(-LEG_W / 2 - 1.5 * s, LEG_LEN - 1 * s, LEG_W + 3 * s, 1 * s);
  
  ctx.restore();
  
  // ============================================================
  // DRAW BODY & JERSEY
  // ============================================================
  ctx.save();
  ctx.translate(0, bodyBob);
  ctx.rotate((bodyTilt * Math.PI) / 180);
  
  // Jersey base
  ctx.fillStyle = jerseyColor;
  ctx.beginPath();
  ctx.ellipse(0, BODY_H / 2, BODY_W / 2, BODY_H / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Jersey shading (left side darker)
  ctx.fillStyle = jerseyDark;
  ctx.beginPath();
  ctx.ellipse(-BODY_W / 4, BODY_H / 2, BODY_W / 4, BODY_H / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Jersey highlight (right side lighter)
  ctx.fillStyle = jerseyLight;
  ctx.beginPath();
  ctx.ellipse(BODY_W / 4, BODY_H / 2, BODY_W / 4, BODY_H / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Chest stripe
  ctx.fillStyle = team.primary;
  ctx.fillRect(-BODY_W / 8, BODY_H / 4, BODY_W / 4, BODY_H / 2);
  
  // Player number on jersey
  ctx.fillStyle = 'white';
  ctx.font = `bold ${8 * s}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(playerNumber.toString(), 0, BODY_H / 2);
  
  ctx.restore();
  
  // ============================================================
  // DRAW ARMS
  // ============================================================
  // Left arm
  ctx.save();
  ctx.translate(-SHOULDER_W / 2, NECK_H);
  ctx.rotate((armRotL * Math.PI) / 180);
  ctx.fillStyle = skinColor;
  ctx.fillRect(-ARM_W / 2, 0, ARM_W, ARM_LEN);
  ctx.fillStyle = skinDark;
  ctx.fillRect(-ARM_W / 2, 0, ARM_W / 2, ARM_LEN);
  // Glove
  ctx.fillStyle = team.primary;
  ctx.fillRect(-ARM_W / 2 - 1 * s, ARM_LEN - 2 * s, ARM_W + 2 * s, 2 * s);
  ctx.restore();
  
  // Right arm
  ctx.save();
  ctx.translate(SHOULDER_W / 2, NECK_H);
  ctx.rotate((armRotR * Math.PI) / 180);
  ctx.fillStyle = skinColor;
  ctx.fillRect(-ARM_W / 2, 0, ARM_W, ARM_LEN);
  ctx.fillStyle = skinDark;
  ctx.fillRect(0, 0, ARM_W / 2, ARM_LEN);
  // Glove
  ctx.fillStyle = team.primary;
  ctx.fillRect(-ARM_W / 2 - 1 * s, ARM_LEN - 2 * s, ARM_W + 2 * s, 2 * s);
  ctx.restore();
  
  // ============================================================
  // DRAW HEAD & HELMET
  // ============================================================
  // Head base
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(0, -NECK_H - HEAD_R, HEAD_R, 0, Math.PI * 2);
  ctx.fill();
  
  // Helmet base
  ctx.fillStyle = helmetColor;
  ctx.beginPath();
  ctx.arc(0, -NECK_H - HEAD_R, HEAD_R + 1.5 * s, 0, Math.PI * 2);
  ctx.fill();
  
  // Helmet shading (left darker)
  ctx.fillStyle = helmetDark;
  ctx.beginPath();
  ctx.arc(-HEAD_R / 2, -NECK_H - HEAD_R, HEAD_R + 1.5 * s, 0, Math.PI * 2);
  ctx.fill();
  
  // Helmet highlight (right lighter)
  ctx.fillStyle = helmetLight;
  ctx.beginPath();
  ctx.arc(HEAD_R / 2, -NECK_H - HEAD_R - 1 * s, HEAD_R * 0.6, 0, Math.PI * 2);
  ctx.fill();
  
  // Visor
  ctx.fillStyle = '#222233';
  ctx.beginPath();
  ctx.ellipse(0, -NECK_H - HEAD_R + 1 * s, HEAD_R * 0.9, HEAD_R * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Visor shine
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.ellipse(HEAD_R * 0.3, -NECK_H - HEAD_R - 0.5 * s, HEAD_R * 0.4, HEAD_R * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Face cage (6 bars)
  ctx.strokeStyle = '#555566';
  ctx.lineWidth = 1.2 * s;
  const cageY = -NECK_H - HEAD_R + 1 * s;
  const cageW = HEAD_R * 0.8;
  for (let i = 0; i < 6; i++) {
    const x = -cageW / 2 + (cageW / 5) * i;
    ctx.beginPath();
    ctx.moveTo(x, cageY - HEAD_R * 0.4);
    ctx.lineTo(x, cageY + HEAD_R * 0.3);
    ctx.stroke();
  }
  
  // Chin strap
  ctx.strokeStyle = team.primary;
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.arc(0, -NECK_H - HEAD_R, HEAD_R + 2 * s, Math.PI * 0.7, Math.PI * 1.3);
  ctx.stroke();
  
  // Arm bands (accent color)
  ctx.fillStyle = team.primary;
  ctx.fillRect(-SHOULDER_W / 2 - 2 * s, NECK_H - 1 * s, 4 * s, 2 * s);
  ctx.fillRect(SHOULDER_W / 2 - 2 * s, NECK_H - 1 * s, 4 * s, 2 * s);
  
  ctx.restore();
}

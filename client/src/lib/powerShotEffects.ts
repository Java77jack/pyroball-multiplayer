/**
 * Power Shot Visual Effects
 * Renders charging and release effects for power shots
 */

import { COMBO_SYSTEM } from './gameConstants';

export interface PowerShotEffect {
  x: number;
  y: number;
  charge: number; // 0-1
  isReleased: boolean;
  releaseTimer: number;
}

export function drawPowerShotChargeAura(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  charge: number,
  playerRadius: number,
) {
  if (charge <= 0) return;

  // Outer pulsing aura
  const pulseAmount = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
  const auraRadius = playerRadius + 8 + charge * 15;
  
  // Gradient from team color to gold
  const gradient = ctx.createRadialGradient(x, y, playerRadius, x, y, auraRadius);
  gradient.addColorStop(0, `rgba(255, 215, 0, ${charge * 0.6})`);
  gradient.addColorStop(0.5, `rgba(255, 165, 0, ${charge * 0.4 * pulseAmount})`);
  gradient.addColorStop(1, `rgba(255, 100, 0, 0)`);
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, auraRadius, 0, Math.PI * 2);
  ctx.fill();

  // Inner glow ring
  ctx.strokeStyle = `rgba(255, 215, 0, ${charge * 0.8})`;
  ctx.lineWidth = 2 * charge;
  ctx.beginPath();
  ctx.arc(x, y, playerRadius + 5, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawPowerShotRelease(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  releaseTimer: number,
  maxDuration: number = 0.3,
) {
  if (releaseTimer <= 0) return;

  const progress = 1 - releaseTimer / maxDuration;
  const opacity = 1 - progress;
  const scale = 1 + progress * 2;

  // Explosion burst
  const burstRadius = 20 * scale;
  ctx.fillStyle = `rgba(255, 215, 0, ${opacity * 0.8})`;
  ctx.beginPath();
  ctx.arc(x, y, burstRadius, 0, Math.PI * 2);
  ctx.fill();

  // Radial lines
  ctx.strokeStyle = `rgba(255, 165, 0, ${opacity * 0.6})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const startX = x + Math.cos(angle) * 15;
    const startY = y + Math.sin(angle) * 15;
    const endX = x + Math.cos(angle) * (30 + progress * 20);
    const endY = y + Math.sin(angle) * (30 + progress * 20);
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  // Outer ring
  ctx.strokeStyle = `rgba(255, 100, 0, ${opacity * 0.4})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, burstRadius * 1.5, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawComboIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  comboCount: number,
  comboType: 'pass' | 'steal' | 'defensive',
  isActive: boolean,
) {
  if (comboCount <= 0) return;

  const baseY = y - 40;
  const colors = {
    pass: '#4169E1',      // Royal blue
    steal: '#FF6347',     // Tomato red
    defensive: '#32CD32', // Lime green
  };

  const color = colors[comboType];
  const pulse = Math.sin(Date.now() * 0.008) * 0.3 + 0.7;
  const scale = isActive ? pulse : 1;

  // Combo counter background
  ctx.fillStyle = `rgba(0, 0, 0, 0.7)`;
  ctx.beginPath();
  ctx.roundRect(x - 25, baseY - 15, 50, 30, 5);
  ctx.fill();

  // Combo counter border
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.roundRect(x - 25, baseY - 15, 50, 30, 5);
  ctx.stroke();

  // Combo text
  ctx.fillStyle = color;
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${comboType.toUpperCase()} x${comboCount}`, x, baseY);

  // Active indicator
  if (isActive) {
    ctx.fillStyle = color;
    for (let i = 0; i < 3; i++) {
      const angle = (Date.now() * 0.003 + i * (Math.PI * 2 / 3)) % (Math.PI * 2);
      const px = x + Math.cos(angle) * 35;
      const py = baseY + Math.sin(angle) * 35;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawAlleyOopIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  timeRemaining: number,
  maxTime: number,
) {
  if (timeRemaining <= 0) return;

  const progress = timeRemaining / maxTime;
  const baseY = y - 50;

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.beginPath();
  ctx.roundRect(x - 40, baseY - 12, 80, 24, 4);
  ctx.fill();

  // Progress bar
  const barWidth = 76 * progress;
  ctx.fillStyle = `rgba(255, 215, 0, ${progress})`;
  ctx.beginPath();
  ctx.roundRect(x - 38, baseY - 10, barWidth, 20, 3);
  ctx.fill();

  // Border
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - 40, baseY - 12, 80, 24, 4);
  ctx.stroke();

  // Text
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ALLEY-OOP', x, baseY);
}

// Extend CanvasRenderingContext2D with roundRect if not available
declare global {
  interface CanvasRenderingContext2D {
    roundRect(x: number, y: number, w: number, h: number, r: number | number[]): void;
  }
}

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x: number, y: number, w: number, h: number, r: number) {
    const radius = typeof r === 'number' ? r : r[0];
    if (w < 2 * radius) r = w / 2;
    if (h < 2 * radius) r = h / 2;
    this.beginPath();
    this.moveTo(x + radius, y);
    this.arcTo(x + w, y, x + w, y + h, radius);
    this.arcTo(x + w, y + h, x, y + h, radius);
    this.arcTo(x, y + h, x, y, radius);
    this.arcTo(x, y, x + w, y, radius);
    this.closePath();
  };
}

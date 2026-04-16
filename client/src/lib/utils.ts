import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Clamp a value between min and max
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Linear interpolation between two values
 */
export function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

/**
 * Linear interpolation for colors (hex strings)
 */
export function lerpColor(a: string, b: string, t: number): string {
  const parseHex = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
    ] : [0, 0, 0];
  };
  const [r1, g1, b1] = parseHex(a);
  const [r2, g2, b2] = parseHex(b);
  const rr = Math.round(lerp(r1, r2, t));
  const gg = Math.round(lerp(g1, g2, t));
  const bb = Math.round(lerp(b1, b2, t));
  return `#${[rr, gg, bb].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * useGamepad — Gamepad / Controller input hook for Pyroball
 *
 * Supports Xbox, PlayStation, and generic HID gamepads via the browser Gamepad API.
 * Polls at 60fps, maps axes to joystick movement, and maps buttons to game actions.
 *
 * Standard button layout (matches Xbox / PS / generic USB controllers):
 *   0  = A / Cross        → Shoot (hold-to-charge)
 *   1  = B / Circle       → Pass
 *   2  = X / Square       → Steal
 *   3  = Y / Triangle     → Jump
 *   4  = LB / L1          → Spin
 *   5  = RB / R1          → Switch player
 *   8  = Select / Share   → (reserved)
 *   9  = Start / Options  → (reserved)
 *  12  = D-Pad Up         → Move up
 *  13  = D-Pad Down       → Move down
 *  14  = D-Pad Left       → Move left
 *  15  = D-Pad Right      → Move right
 *
 * Axes:
 *   0  = Left Stick X
 *   1  = Left Stick Y
 */

import { useEffect, useRef, useCallback } from 'react';
import type { Vec2 } from '@/lib/gameConstants';

// Dead zone for analog sticks — ignore tiny drift
const DEAD_ZONE = 0.18;

// Analog sensitivity curve — controls how responsive the stick is at different positions
// Linear: 1.0 (raw input), Aggressive: 1.8 (snappy), Smooth: 0.8 (gradual)
const ANALOG_SENSITIVITY = 1.3;

// How long a button must be held before we consider it "held" vs "pressed"
const HOLD_THRESHOLD_MS = 80;

// Logitech F310 specific button mapping (if needed for custom profiles)
const F310_BUTTON_MAP = {
  A: 0,      // Green
  B: 1,      // Red
  X: 2,      // Blue
  Y: 3,      // Yellow
  LB: 4,     // Left bumper
  RB: 5,     // Right bumper
  BACK: 8,   // Back / Select
  START: 9,  // Start
  LEFT_STICK: 10,   // Left stick click
  RIGHT_STICK: 11,  // Right stick click
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
} as const;

interface GamepadHookOptions {
  onMove: (v: Vec2) => void;
  onAction: (action: string) => void;
  enabled: boolean;
  onConnected?: (gamepadId: string) => void;  // Callback when controller connects
  onDisconnected?: () => void;                // Callback when controller disconnects
}

export function useGamepad({ onMove, onAction, enabled, onConnected, onDisconnected }: GamepadHookOptions) {
  const rafRef = useRef<number>(0);
  const prevButtonsRef = useRef<boolean[]>([]);
  const shootHeldRef = useRef(false);
  const shootHoldStartRef = useRef<number>(0);
  const connectedRef = useRef(false);
  const lastGamepadIdRef = useRef<string | null>(null);

  const poll = useCallback(() => {
    if (!enabled) {
      rafRef.current = requestAnimationFrame(poll);
      return;
    }

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp: Gamepad | null = null;

    // Use the first connected gamepad
    for (const g of gamepads) {
      if (g && g.connected) { gp = g; break; }
    }

    if (!gp) {
      rafRef.current = requestAnimationFrame(poll);
      return;
    }

    connectedRef.current = true;
    
    // Notify when a new gamepad connects
    if (lastGamepadIdRef.current !== gp.id) {
      lastGamepadIdRef.current = gp.id;
      console.log(`[Pyroball] Gamepad connected: ${gp.id}`);
      onConnected?.(gp.id);
    }

    // ---- LEFT STICK / D-PAD MOVEMENT ----
    let x = gp.axes[0] ?? 0;
    let y = gp.axes[1] ?? 0;

    // Apply dead zone
    if (Math.abs(x) < DEAD_ZONE) x = 0;
    if (Math.abs(y) < DEAD_ZONE) y = 0;
    
    // Apply analog sensitivity curve for smoother, more responsive control
    // Closer to 0 = more sensitive, closer to 1 = less sensitive
    x = Math.sign(x) * Math.pow(Math.abs(x), 1 / ANALOG_SENSITIVITY);
    y = Math.sign(y) * Math.pow(Math.abs(y), 1 / ANALOG_SENSITIVITY);

    // D-Pad fallback (buttons 12-15)
    const dUp    = gp.buttons[12]?.pressed ?? false;
    const dDown  = gp.buttons[13]?.pressed ?? false;
    const dLeft  = gp.buttons[14]?.pressed ?? false;
    const dRight = gp.buttons[15]?.pressed ?? false;
    if (dUp)    y = -1;
    if (dDown)  y =  1;
    if (dLeft)  x = -1;
    if (dRight) x =  1;

    // Normalize diagonal
    if (x !== 0 && y !== 0) {
      const mag = Math.sqrt(x * x + y * y);
      x = x / mag;
      y = y / mag;
    }

    onMove({ x, y });

    // ---- BUTTONS ----
    const prev = prevButtonsRef.current;
    const now = Date.now();

    const justPressed = (idx: number) =>
      (gp!.buttons[idx]?.pressed ?? false) && !(prev[idx] ?? false);
    const justReleased = (idx: number) =>
      !(gp!.buttons[idx]?.pressed ?? false) && (prev[idx] ?? false);
    const isHeld = (idx: number) =>
      gp!.buttons[idx]?.pressed ?? false;

    // Button 0 — A / Cross → Shoot (hold-to-charge)
    if (justPressed(0) && !shootHeldRef.current) {
      shootHeldRef.current = true;
      shootHoldStartRef.current = now;
      onAction('shootStart');
    }
    if (justReleased(0) && shootHeldRef.current) {
      shootHeldRef.current = false;
      onAction('shootRelease');
    }

    // Button 1 — B / Circle → Pass
    if (justPressed(1)) onAction('pass');

    // Button 2 — X / Square → Steal
    if (justPressed(2)) onAction('steal');

    // Button 3 — Y / Triangle → Jump
    if (justPressed(3)) onAction('jump');

    // Button 4 — LB / L1 → Spin
    if (justPressed(4)) onAction('spin');

    // Button 5 — RB / R1 → Switch player
    if (justPressed(5)) onAction('switch');

    // Store current button state for next frame
    prevButtonsRef.current = Array.from(gp.buttons).map(b => b.pressed);

    rafRef.current = requestAnimationFrame(poll);
  }, [enabled, onMove, onAction]);

  useEffect(() => {
    const handleConnect = (e: GamepadEvent) => {
      console.log(`[Pyroball] Gamepad connected: ${e.gamepad.id}`);
      lastGamepadIdRef.current = e.gamepad.id;
      onConnected?.(e.gamepad.id);
    };
    const handleDisconnect = (e: GamepadEvent) => {
      console.log(`[Pyroball] Gamepad disconnected: ${e.gamepad.id}`);
      connectedRef.current = false;
      lastGamepadIdRef.current = null;
      // Stop movement when controller disconnects
      onMove({ x: 0, y: 0 });
      onDisconnected?.();
    };

    window.addEventListener('gamepadconnected', handleConnect);
    window.addEventListener('gamepaddisconnected', handleDisconnect);

    rafRef.current = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('gamepadconnected', handleConnect);
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
    };
  }, [poll, onMove, onConnected, onDisconnected]);

  return { isConnected: connectedRef.current, gamepadId: lastGamepadIdRef.current };
}

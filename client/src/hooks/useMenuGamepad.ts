import { useEffect, useRef, useCallback } from 'react';

/**
 * useMenuGamepad — Provides gamepad navigation for menu screens.
 *
 * Supports:
 *  - D-pad / Left-stick UP/DOWN/LEFT/RIGHT → navigate between focusable items
 *  - A button (index 0) → confirm / click
 *  - B button (index 1) → back / cancel
 *
 * The hook accepts:
 *  - `itemCount`: total number of selectable items on screen
 *  - `selectedIndex`: currently highlighted item index
 *  - `onSelect(index)`: callback when the user presses A on the highlighted item
 *  - `onNavigate(index)`: callback to update the highlighted item
 *  - `onBack?`: optional callback when B is pressed (e.g., go to previous screen)
 *  - `columns?`: number of columns in a grid layout (default 1 = vertical list)
 */

interface UseMenuGamepadOptions {
  itemCount: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onNavigate: (index: number) => void;
  onBack?: () => void;
  columns?: number;
}

export function useMenuGamepad({
  itemCount,
  selectedIndex,
  onSelect,
  onNavigate,
  onBack,
  columns = 1,
}: UseMenuGamepadOptions) {
  const prevButtons = useRef<boolean[]>([]);
  const prevAxes = useRef<number[]>([]);
  const rafId = useRef<number>(0);

  // Debounce: prevent rapid-fire navigation
  const lastNav = useRef(0);
  const NAV_COOLDOWN = 180; // ms

  const poll = useCallback(() => {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp: Gamepad | null = null;
    for (const g of gamepads) {
      if (g && g.connected) { gp = g; break; }
    }

    if (gp) {
      const buttons = gp.buttons.map(b => b.pressed);
      const axes = gp.axes.slice(0, 4);
      const prev = prevButtons.current;
      const now = performance.now();

      // --- Button presses (edge-triggered) ---
      const justPressed = (idx: number) => buttons[idx] && (!prev[idx]);

      // A button = confirm
      if (justPressed(0)) {
        onSelect(selectedIndex);
      }

      // B button = back
      if (justPressed(1) && onBack) {
        onBack();
      }

      // --- Navigation (D-pad + left stick) ---
      const canNav = now - lastNav.current > NAV_COOLDOWN;

      if (canNav) {
        // D-pad: up=12, down=13, left=14, right=15
        const dUp = buttons[12];
        const dDown = buttons[13];
        const dLeft = buttons[14];
        const dRight = buttons[15];

        // Left stick (with dead zone)
        const DEAD = 0.4;
        const lx = axes[0] ?? 0;
        const ly = axes[1] ?? 0;
        const stickUp = ly < -DEAD;
        const stickDown = ly > DEAD;
        const stickLeft = lx < -DEAD;
        const stickRight = lx > DEAD;

        const up = dUp || stickUp;
        const down = dDown || stickDown;
        const left = dLeft || stickLeft;
        const right = dRight || stickRight;

        // Check if this is a new navigation input (edge detection for stick)
        const prevLx = prevAxes.current[0] ?? 0;
        const prevLy = prevAxes.current[1] ?? 0;
        const prevStickUp = prevLy < -DEAD;
        const prevStickDown = prevLy > DEAD;
        const prevStickLeft = prevLx < -DEAD;
        const prevStickRight = prevLx > DEAD;
        const prevDUp = prev[12];
        const prevDDown = prev[13];
        const prevDLeft = prev[14];
        const prevDRight = prev[15];

        const newUp = (dUp && !prevDUp) || (stickUp && !prevStickUp);
        const newDown = (dDown && !prevDDown) || (stickDown && !prevStickDown);
        const newLeft = (dLeft && !prevDLeft) || (stickLeft && !prevStickLeft);
        const newRight = (dRight && !prevDRight) || (stickRight && !prevStickRight);

        let newIndex = selectedIndex;

        if (columns === 1) {
          // Vertical list
          if (newUp || (up && canNav && now - lastNav.current > NAV_COOLDOWN * 2)) {
            newIndex = (selectedIndex - 1 + itemCount) % itemCount;
          } else if (newDown || (down && canNav && now - lastNav.current > NAV_COOLDOWN * 2)) {
            newIndex = (selectedIndex + 1) % itemCount;
          }
        } else {
          // Grid layout
          if (newUp) {
            newIndex = selectedIndex - columns;
            if (newIndex < 0) newIndex = selectedIndex; // stay
          } else if (newDown) {
            newIndex = selectedIndex + columns;
            if (newIndex >= itemCount) newIndex = selectedIndex; // stay
          } else if (newLeft) {
            newIndex = selectedIndex - 1;
            if (newIndex < 0) newIndex = 0;
          } else if (newRight) {
            newIndex = selectedIndex + 1;
            if (newIndex >= itemCount) newIndex = itemCount - 1;
          }
        }

        if (newIndex !== selectedIndex) {
          lastNav.current = now;
          onNavigate(newIndex);
        }
      }

      prevButtons.current = buttons;
      prevAxes.current = axes;
    }

    rafId.current = requestAnimationFrame(poll);
  }, [itemCount, selectedIndex, onSelect, onNavigate, onBack, columns]);

  useEffect(() => {
    rafId.current = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId.current);
  }, [poll]);
}

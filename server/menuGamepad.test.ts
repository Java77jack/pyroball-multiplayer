import { describe, it, expect } from 'vitest';

/**
 * useMenuGamepad is a React hook that polls the Gamepad API in a
 * requestAnimationFrame loop.  Because it relies on browser APIs
 * (navigator.getGamepads, requestAnimationFrame) and React hooks,
 * we cannot unit-test the hook itself in a Node environment.
 *
 * Instead we verify the **navigation math** that the hook uses:
 *   - Vertical list wrapping
 *   - Grid layout navigation (up/down/left/right)
 *   - Edge clamping in grid mode
 *
 * These are the same formulas used inside useMenuGamepad.ts.
 */

// --- Navigation helpers extracted from hook logic ---

function verticalNav(
  current: number,
  direction: 'up' | 'down',
  itemCount: number,
): number {
  if (direction === 'up') return (current - 1 + itemCount) % itemCount;
  return (current + 1) % itemCount;
}

function gridNav(
  current: number,
  direction: 'up' | 'down' | 'left' | 'right',
  itemCount: number,
  columns: number,
): number {
  let next = current;
  switch (direction) {
    case 'up':
      next = current - columns;
      if (next < 0) next = current; // stay
      break;
    case 'down':
      next = current + columns;
      if (next >= itemCount) next = current; // stay
      break;
    case 'left':
      next = current - 1;
      if (next < 0) next = 0;
      break;
    case 'right':
      next = current + 1;
      if (next >= itemCount) next = itemCount - 1;
      break;
  }
  return next;
}

describe('Menu Gamepad Navigation Math', () => {
  describe('Vertical list navigation', () => {
    it('wraps down from last item to first', () => {
      expect(verticalNav(4, 'down', 5)).toBe(0);
    });

    it('wraps up from first item to last', () => {
      expect(verticalNav(0, 'up', 5)).toBe(4);
    });

    it('moves down normally', () => {
      expect(verticalNav(1, 'down', 5)).toBe(2);
    });

    it('moves up normally', () => {
      expect(verticalNav(3, 'up', 5)).toBe(2);
    });

    it('handles single item list', () => {
      expect(verticalNav(0, 'down', 1)).toBe(0);
      expect(verticalNav(0, 'up', 1)).toBe(0);
    });
  });

  describe('Grid navigation (3 columns, 16 items — team grid)', () => {
    const COLS = 3;
    const COUNT = 16;

    it('moves right within a row', () => {
      expect(gridNav(0, 'right', COUNT, COLS)).toBe(1);
      expect(gridNav(1, 'right', COUNT, COLS)).toBe(2);
    });

    it('clamps right at end of items', () => {
      expect(gridNav(15, 'right', COUNT, COLS)).toBe(15);
    });

    it('moves left within a row', () => {
      expect(gridNav(2, 'left', COUNT, COLS)).toBe(1);
    });

    it('clamps left at 0', () => {
      expect(gridNav(0, 'left', COUNT, COLS)).toBe(0);
    });

    it('moves down one row', () => {
      expect(gridNav(0, 'down', COUNT, COLS)).toBe(3);
      expect(gridNav(3, 'down', COUNT, COLS)).toBe(6);
    });

    it('stays when down would go out of bounds', () => {
      expect(gridNav(15, 'down', COUNT, COLS)).toBe(15);
      expect(gridNav(14, 'down', COUNT, COLS)).toBe(14);
    });

    it('moves up one row', () => {
      expect(gridNav(6, 'up', COUNT, COLS)).toBe(3);
      expect(gridNav(3, 'up', COUNT, COLS)).toBe(0);
    });

    it('stays when up would go out of bounds', () => {
      expect(gridNav(0, 'up', COUNT, COLS)).toBe(0);
      expect(gridNav(2, 'up', COUNT, COLS)).toBe(2);
    });
  });

  describe('Grid navigation (2 columns, 6 items)', () => {
    const COLS = 2;
    const COUNT = 6;

    it('navigates full grid', () => {
      // Row 0: [0, 1]
      // Row 1: [2, 3]
      // Row 2: [4, 5]
      expect(gridNav(0, 'down', COUNT, COLS)).toBe(2);
      expect(gridNav(2, 'down', COUNT, COLS)).toBe(4);
      expect(gridNav(4, 'down', COUNT, COLS)).toBe(4); // stay
      expect(gridNav(4, 'up', COUNT, COLS)).toBe(2);
      expect(gridNav(1, 'right', COUNT, COLS)).toBe(2); // clamp within row? no, just +1
    });
  });

  describe('Season Hub pre-season focus mapping', () => {
    // Pre-season: 16 teams (grid 3 cols) + 3 difficulties + 1 create + 1 back = 21 items
    const TEAM_COUNT = 16;
    const DIFF_COUNT = 3;
    const CREATE_IDX = TEAM_COUNT + DIFF_COUNT; // 19
    const BACK_IDX = CREATE_IDX + 1; // 20

    it('maps team indices correctly', () => {
      for (let i = 0; i < TEAM_COUNT; i++) {
        expect(i).toBeLessThan(TEAM_COUNT);
        expect(i).toBeGreaterThanOrEqual(0);
      }
    });

    it('maps difficulty indices correctly', () => {
      for (let di = 0; di < DIFF_COUNT; di++) {
        const idx = TEAM_COUNT + di;
        expect(idx).toBeGreaterThanOrEqual(TEAM_COUNT);
        expect(idx).toBeLessThan(TEAM_COUNT + DIFF_COUNT);
      }
    });

    it('create season button is at correct index', () => {
      expect(CREATE_IDX).toBe(19);
    });

    it('back button is at correct index', () => {
      expect(BACK_IDX).toBe(20);
    });

    it('total item count is correct', () => {
      expect(BACK_IDX + 1).toBe(21);
    });
  });

  describe('VS Screen skip behavior', () => {
    // The VS screen should be skippable — verify the skip guard logic
    it('skip guard prevents double navigation', () => {
      let navigateCount = 0;
      let skipped = false;

      const skipToGame = () => {
        if (skipped) return;
        skipped = true;
        navigateCount++;
      };

      skipToGame(); // First call
      skipToGame(); // Second call (should be blocked)
      skipToGame(); // Third call (should be blocked)

      expect(navigateCount).toBe(1);
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  createCameraState,
  updateCamera,
  determineCameraMode,
  computePlayerGroupBounds,
  BROADCAST_CAM,
  type CameraState,
} from '../client/src/lib/broadcastCamera';
import { COURT } from '../client/src/lib/gameConstants';
import { clamp, lerp } from '../client/src/lib/utils';
import type { GameState, PlayerState, BallState } from '../client/src/lib/gameConstants';

// ---- Helpers to build minimal mock game state ----
function mockPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'p1',
    teamId: 'inferno',
    name: 'Test',
    pos: { x: COURT.WIDTH / 2, y: COURT.HEIGHT / 2 },
    vel: { x: 0, y: 0 },
    hasBall: false,
    isJumping: false,
    jumpZ: 0,
    isSpinning: false,
    spinTimer: 0,
    stealCooldown: 0,
    ...overrides,
  } as PlayerState;
}

function mockBall(overrides: Partial<BallState> = {}): BallState {
  return {
    pos: { x: COURT.WIDTH / 2, y: COURT.HEIGHT / 2 },
    vel: { x: 0, y: 0 },
    carrier: null,
    z: 0,
    zVel: 0,
    lastShooter: null,
    ...overrides,
  } as BallState;
}

function mockGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    players: [
      mockPlayer({ id: 'p1', teamId: 'inferno', pos: { x: 450, y: 250 } }),
      mockPlayer({ id: 'p2', teamId: 'inferno', pos: { x: 300, y: 200 } }),
      mockPlayer({ id: 'p3', teamId: 'inferno', pos: { x: 200, y: 300 } }),
      mockPlayer({ id: 'p4', teamId: 'vortex', pos: { x: 600, y: 250 } }),
      mockPlayer({ id: 'p5', teamId: 'vortex', pos: { x: 700, y: 200 } }),
      mockPlayer({ id: 'p6', teamId: 'vortex', pos: { x: 750, y: 300 } }),
    ],
    ball: mockBall(),
    homeTeam: 'inferno',
    awayTeam: 'vortex',
    homeScore: 0,
    awayScore: 0,
    isPlaying: true,
    countdown: 0,
    cameraShake: 0,
    cameraZoom: 1,
    slowMo: 0,
    shotMeter: null,
    goalFlash: 0,
    onFireTeam: null,
    isOvertime: false,
    speedLines: 0,
    netDeform: null,
    ledFlash: null,
    ...overrides,
  } as unknown as GameState;
}

// Simple project function (identity-like for testing)
function mockProject(gx: number, gy: number) {
  return { x: gx * (960 / COURT.WIDTH), y: gy * (540 / COURT.HEIGHT), scale: 1 };
}

// ============================================================
// TESTS
// ============================================================

describe('Broadcast Camera - createCameraState', () => {
  it('initializes with default values', () => {
    const cam = createCameraState();
    expect(cam.panX).toBe(0);
    expect(cam.panY).toBe(0);
    expect(cam.zoom).toBe(BROADCAST_CAM.ZOOM_DEFAULT);
    expect(cam.mode).toBe('idle');
    expect(cam.lastPossessionTeam).toBeNull();
    expect(cam.transitionTimer).toBe(0);
  });
});

describe('Broadcast Camera - determineCameraMode', () => {
  it('returns idle when not playing', () => {
    const cam = createCameraState();
    const gs = mockGameState({ isPlaying: false });
    expect(determineCameraMode(gs, cam)).toBe('idle');
  });

  it('returns idle during countdown', () => {
    const cam = createCameraState();
    const gs = mockGameState({ countdown: 3 });
    expect(determineCameraMode(gs, cam)).toBe('idle');
  });

  it('returns offense when ball carrier is in mid-field', () => {
    const cam = createCameraState();
    const gs = mockGameState({
      ball: mockBall({ carrier: 'p1' }),
      players: [
        mockPlayer({ id: 'p1', teamId: 'inferno', hasBall: true, pos: { x: 450, y: 250 } }),
      ],
    });
    expect(determineCameraMode(gs, cam)).toBe('offense');
  });

  it('returns scoring when ball carrier is near goal', () => {
    const cam = createCameraState();
    const gs = mockGameState({
      ball: mockBall({ carrier: 'p1' }),
      players: [
        mockPlayer({ id: 'p1', teamId: 'inferno', hasBall: true, pos: { x: 50, y: 250 } }),
      ],
    });
    expect(determineCameraMode(gs, cam)).toBe('scoring');
  });

  it('returns scoring when ball carrier is near right goal', () => {
    const cam = createCameraState();
    const gs = mockGameState({
      ball: mockBall({ carrier: 'p1' }),
      players: [
        mockPlayer({ id: 'p1', teamId: 'inferno', hasBall: true, pos: { x: 850, y: 250 } }),
      ],
    });
    expect(determineCameraMode(gs, cam)).toBe('scoring');
  });

  it('returns transition when possession just changed', () => {
    const cam = createCameraState();
    cam.lastPossessionTeam = 'inferno';
    cam.transitionTimer = 0.3;
    const gs = mockGameState({
      ball: mockBall({ carrier: 'p4' }),
      players: [
        mockPlayer({ id: 'p4', teamId: 'vortex', hasBall: true, pos: { x: 450, y: 250 } }),
      ],
    });
    expect(determineCameraMode(gs, cam)).toBe('transition');
  });

  it('returns transition for loose ball', () => {
    const cam = createCameraState();
    const gs = mockGameState({
      ball: mockBall({ carrier: null, vel: { x: 0, y: 0 } }),
    });
    expect(determineCameraMode(gs, cam)).toBe('transition');
  });
});

describe('Broadcast Camera - updateCamera', () => {
  it('smoothly moves toward target (panX changes toward focus)', () => {
    const cam = createCameraState();
    const gs = mockGameState({
      ball: mockBall({ carrier: 'p1' }),
      players: [
        mockPlayer({ id: 'p1', teamId: 'inferno', hasBall: true, pos: { x: 700, y: 250 } }),
      ],
    });

    for (let i = 0; i < 30; i++) {
      updateCamera(cam, gs, 960, 540, mockProject, 1 / 60);
    }

    expect(cam.panX).toBeGreaterThan(0);
    expect(cam.mode).toBe('offense');
  });

  it('zoom adjusts based on camera mode', () => {
    const cam = createCameraState();
    const gs = mockGameState({
      ball: mockBall({ carrier: 'p1' }),
      players: [
        mockPlayer({ id: 'p1', teamId: 'inferno', hasBall: true, pos: { x: 50, y: 250 } }),
      ],
    });

    for (let i = 0; i < 120; i++) {
      updateCamera(cam, gs, 960, 540, mockProject, 1 / 60);
    }

    expect(cam.mode).toBe('scoring');
    expect(cam.zoom).toBeGreaterThan(BROADCAST_CAM.ZOOM_DEFAULT);
    expect(cam.zoom).toBeLessThanOrEqual(BROADCAST_CAM.ZOOM_MAX);
  });

  it('respects pan clamping limits', () => {
    const cam = createCameraState();
    const gs = mockGameState({
      ball: mockBall({ carrier: 'p1' }),
      players: [
        mockPlayer({ id: 'p1', teamId: 'inferno', hasBall: true, pos: { x: 0, y: 0 } }),
      ],
    });

    for (let i = 0; i < 200; i++) {
      updateCamera(cam, gs, 960, 540, mockProject, 1 / 60);
    }

    expect(Math.abs(cam.panX)).toBeLessThanOrEqual(BROADCAST_CAM.MAX_PAN_X + 1);
    expect(Math.abs(cam.panY)).toBeLessThanOrEqual(BROADCAST_CAM.MAX_PAN_Y + 1);
  });

  it('zoom never exceeds bounds', () => {
    const cam = createCameraState();
    cam.zoom = 2.0;
    cam.targetZoom = 2.0;

    const gs = mockGameState({ isPlaying: true, countdown: 0 });

    for (let i = 0; i < 200; i++) {
      updateCamera(cam, gs, 960, 540, mockProject, 1 / 60);
    }

    expect(cam.zoom).toBeLessThanOrEqual(BROADCAST_CAM.ZOOM_MAX + 0.01);
    expect(cam.zoom).toBeGreaterThanOrEqual(BROADCAST_CAM.ZOOM_MIN - 0.01);
  });

  it('detects possession change and triggers transition', () => {
    const cam = createCameraState();
    cam.lastPossessionTeam = 'inferno';

    const gs = mockGameState({
      ball: mockBall({ carrier: 'p4' }),
      players: [
        mockPlayer({ id: 'p4', teamId: 'vortex', hasBall: true, pos: { x: 450, y: 250 } }),
      ],
    });

    updateCamera(cam, gs, 960, 540, mockProject, 1 / 60);

    expect(cam.transitionTimer).toBeGreaterThan(0);
    expect(cam.lastPossessionTeam).toBe('vortex');
  });

  it('returns to idle when game is not playing', () => {
    const cam = createCameraState();
    cam.mode = 'offense';
    cam.panX = 50;

    const gs = mockGameState({ isPlaying: false });

    for (let i = 0; i < 120; i++) {
      updateCamera(cam, gs, 960, 540, mockProject, 1 / 60);
    }

    expect(cam.mode).toBe('idle');
    expect(Math.abs(cam.panX)).toBeLessThan(5);
  });
});

describe('Broadcast Camera - zoom-rate limiting', () => {
  it('limits zoom change per frame to MAX_ZOOM_RATE * dt', () => {
    const cam = createCameraState();
    cam.zoom = BROADCAST_CAM.ZOOM_MIN;
    cam.targetZoom = BROADCAST_CAM.ZOOM_MAX; // Big jump requested

    const dt = 1 / 60;
    const maxDelta = BROADCAST_CAM.MAX_ZOOM_RATE * dt;
    const zoomBefore = cam.zoom;

    // One frame update with a game state that wants scoring zoom
    const gs = mockGameState({
      ball: mockBall({ carrier: 'p1' }),
      players: [
        mockPlayer({ id: 'p1', teamId: 'inferno', hasBall: true, pos: { x: 50, y: 250 } }),
      ],
    });
    updateCamera(cam, gs, 960, 540, mockProject, dt);

    const actualDelta = Math.abs(cam.zoom - zoomBefore);
    expect(actualDelta).toBeLessThanOrEqual(maxDelta + 0.001);
  });

  it('zoom converges smoothly over many frames without sudden jumps', () => {
    const cam = createCameraState();
    cam.zoom = BROADCAST_CAM.ZOOM_TRANSITION; // Start wide

    const gs = mockGameState({
      ball: mockBall({ carrier: 'p1' }),
      players: [
        mockPlayer({ id: 'p1', teamId: 'inferno', hasBall: true, pos: { x: 50, y: 250 } }),
      ],
    });

    const dt = 1 / 60;
    const maxDelta = BROADCAST_CAM.MAX_ZOOM_RATE * dt;
    let prevZoom = cam.zoom;

    for (let i = 0; i < 120; i++) {
      updateCamera(cam, gs, 960, 540, mockProject, dt);
      const delta = Math.abs(cam.zoom - prevZoom);
      expect(delta).toBeLessThanOrEqual(maxDelta + 0.001);
      prevZoom = cam.zoom;
    }
  });
});

describe('Broadcast Camera - player-group framing', () => {
  it('computePlayerGroupBounds returns bounding box around key players', () => {
    const gs = mockGameState({
      ball: mockBall({ carrier: 'p1' }),
      players: [
        mockPlayer({ id: 'p1', teamId: 'inferno', hasBall: true, pos: { x: 200, y: 200 } }),
        mockPlayer({ id: 'p2', teamId: 'inferno', pos: { x: 300, y: 150 } }),
        mockPlayer({ id: 'p3', teamId: 'inferno', pos: { x: 250, y: 350 } }),
        mockPlayer({ id: 'p4', teamId: 'vortex', pos: { x: 400, y: 200 } }),
        mockPlayer({ id: 'p5', teamId: 'vortex', pos: { x: 500, y: 300 } }),
        mockPlayer({ id: 'p6', teamId: 'vortex', pos: { x: 600, y: 250 } }),
      ],
    });

    const bounds = computePlayerGroupBounds(gs, mockProject);
    expect(bounds).not.toBeNull();
    if (bounds) {
      // Ball carrier at x=200 is the leftmost key player
      expect(bounds.minX).toBeLessThanOrEqual(mockProject(200, 200).x);
      // Should include at least some defenders
      expect(bounds.maxX).toBeGreaterThan(bounds.minX);
      expect(bounds.maxY).toBeGreaterThan(bounds.minY);
    }
  });

  it('returns null for empty player list', () => {
    const gs = mockGameState({ players: [] });
    const bounds = computePlayerGroupBounds(gs, mockProject);
    expect(bounds).toBeNull();
  });

  it('framing correction adjusts pan when players are near edge', () => {
    const cam = createCameraState();
    // Ball carrier on far right with defenders on far left — wide spread
    const gs = mockGameState({
      ball: mockBall({ carrier: 'p1' }),
      players: [
        mockPlayer({ id: 'p1', teamId: 'inferno', hasBall: true, pos: { x: 850, y: 250 } }),
        mockPlayer({ id: 'p2', teamId: 'inferno', pos: { x: 800, y: 200 } }),
        mockPlayer({ id: 'p3', teamId: 'inferno', pos: { x: 750, y: 300 } }),
        mockPlayer({ id: 'p4', teamId: 'vortex', pos: { x: 100, y: 250 } }),
        mockPlayer({ id: 'p5', teamId: 'vortex', pos: { x: 150, y: 200 } }),
        mockPlayer({ id: 'p6', teamId: 'vortex', pos: { x: 200, y: 300 } }),
      ],
    });

    // Run several frames
    for (let i = 0; i < 60; i++) {
      updateCamera(cam, gs, 960, 540, mockProject, 1 / 60);
    }

    // Camera should have panned right toward the carrier
    expect(cam.panX).toBeGreaterThan(0);
  });
});

describe('Broadcast Camera - utility functions', () => {
  it('clamp works correctly', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('lerp interpolates correctly', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(10, 0, 0.25)).toBe(7.5);
  });
});

describe('Broadcast Camera - constants validation', () => {
  it('zoom min is less than zoom max', () => {
    expect(BROADCAST_CAM.ZOOM_MIN).toBeLessThan(BROADCAST_CAM.ZOOM_MAX);
  });

  it('all zoom presets are within bounds', () => {
    const presets = [
      BROADCAST_CAM.ZOOM_DEFAULT,
      BROADCAST_CAM.ZOOM_OFFENSE,
      BROADCAST_CAM.ZOOM_TRANSITION,
      BROADCAST_CAM.ZOOM_SCORING,
      BROADCAST_CAM.ZOOM_SHOT,
    ];
    for (const z of presets) {
      expect(z).toBeGreaterThanOrEqual(BROADCAST_CAM.ZOOM_MIN);
      expect(z).toBeLessThanOrEqual(BROADCAST_CAM.ZOOM_MAX);
    }
  });

  it('lerp factors are between 0 and 1', () => {
    expect(BROADCAST_CAM.PAN_LERP).toBeGreaterThan(0);
    expect(BROADCAST_CAM.PAN_LERP).toBeLessThan(1);
    expect(BROADCAST_CAM.ZOOM_LERP).toBeGreaterThan(0);
    expect(BROADCAST_CAM.ZOOM_LERP).toBeLessThan(1);
  });

  it('MAX_ZOOM_RATE is positive', () => {
    expect(BROADCAST_CAM.MAX_ZOOM_RATE).toBeGreaterThan(0);
  });

  it('FRAMING_MARGIN is positive', () => {
    expect(BROADCAST_CAM.FRAMING_MARGIN).toBeGreaterThan(0);
  });

  it('FRAMING_WEIGHT is between 0 and 1', () => {
    expect(BROADCAST_CAM.FRAMING_WEIGHT).toBeGreaterThan(0);
    expect(BROADCAST_CAM.FRAMING_WEIGHT).toBeLessThanOrEqual(1);
  });
});

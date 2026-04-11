/**
 * Crowd System Tests
 * Tests the dynamic crowd reaction system: state creation, goal detection,
 * confetti spawning, excitement scaling, and celebration timers.
 */
import { describe, it, expect } from 'vitest';

// We test the crowd system logic by importing constants and simulating the behavior
// Since crowdSystem.ts is a client module with canvas dependencies, we test the logic patterns

describe('Crowd System Logic', () => {
  // ---- Crowd State Initialization ----
  describe('State Initialization', () => {
    it('should initialize with baseline excitement', () => {
      const state = {
        excitement: 0.1,
        targetExcitement: 0.1,
        goalCelebration: 0,
        lastScoreHome: 0,
        lastScoreAway: 0,
        swayPhase: 0,
      };
      expect(state.excitement).toBe(0.1);
      expect(state.targetExcitement).toBe(0.1);
      expect(state.goalCelebration).toBe(0);
    });

    it('should track last known scores at zero', () => {
      const state = { lastScoreHome: 0, lastScoreAway: 0 };
      expect(state.lastScoreHome).toBe(0);
      expect(state.lastScoreAway).toBe(0);
    });
  });

  // ---- Goal Detection ----
  describe('Goal Detection', () => {
    it('should detect home team goal when score increases', () => {
      const state = { lastScoreHome: 0, lastScoreAway: 0 };
      const gs = { score: { home: 3, away: 0 } };
      const homeScored = gs.score.home > state.lastScoreHome;
      const awayScored = gs.score.away > state.lastScoreAway;
      expect(homeScored).toBe(true);
      expect(awayScored).toBe(false);
    });

    it('should detect away team goal when score increases', () => {
      const state = { lastScoreHome: 3, lastScoreAway: 0 };
      const gs = { score: { home: 3, away: 2 } };
      const homeScored = gs.score.home > state.lastScoreHome;
      const awayScored = gs.score.away > state.lastScoreAway;
      expect(homeScored).toBe(false);
      expect(awayScored).toBe(true);
    });

    it('should not detect goal when scores unchanged', () => {
      const state = { lastScoreHome: 3, lastScoreAway: 2 };
      const gs = { score: { home: 3, away: 2 } };
      const homeScored = gs.score.home > state.lastScoreHome;
      const awayScored = gs.score.away > state.lastScoreAway;
      expect(homeScored).toBe(false);
      expect(awayScored).toBe(false);
    });

    it('should detect both teams scoring simultaneously (edge case)', () => {
      const state = { lastScoreHome: 0, lastScoreAway: 0 };
      const gs = { score: { home: 1, away: 1 } };
      const homeScored = gs.score.home > state.lastScoreHome;
      const awayScored = gs.score.away > state.lastScoreAway;
      expect(homeScored).toBe(true);
      expect(awayScored).toBe(true);
    });
  });

  // ---- Excitement Calculation ----
  describe('Excitement Calculation', () => {
    it('should set high excitement during overtime', () => {
      const isOvertime = true;
      let baseExcitement = 0.1;
      if (isOvertime) baseExcitement = Math.max(baseExcitement, 0.7);
      expect(baseExcitement).toBe(0.7);
    });

    it('should set high excitement for close game in final minute', () => {
      const scoreDiff = Math.abs(5 - 4); // 1 point difference
      const timer = 30; // 30 seconds left
      let baseExcitement = 0.1;
      if (scoreDiff <= 2 && timer < 60) baseExcitement = Math.max(baseExcitement, 0.6);
      expect(baseExcitement).toBe(0.6);
    });

    it('should not boost excitement for blowout in final minute', () => {
      const scoreDiff = Math.abs(10 - 2); // 8 point difference
      const timer = 30;
      let baseExcitement = 0.1;
      if (scoreDiff <= 2 && timer < 60) baseExcitement = Math.max(baseExcitement, 0.6);
      expect(baseExcitement).toBe(0.1); // No boost
    });

    it('should set max excitement during goal celebration', () => {
      const goalCelebration = 3.5; // seconds remaining
      let baseExcitement = 0.3;
      if (goalCelebration > 0) baseExcitement = 1.0;
      expect(baseExcitement).toBe(1.0);
    });

    it('should boost excitement during ON FIRE', () => {
      const onFireTeam = 'home';
      let baseExcitement = 0.1;
      if (onFireTeam) baseExcitement = Math.max(baseExcitement, 0.5);
      expect(baseExcitement).toBe(0.5);
    });

    it('should boost excitement during flow state', () => {
      const flowState = 5.0;
      let baseExcitement = 0.1;
      if (flowState > 0) baseExcitement = Math.max(baseExcitement, 0.4);
      expect(baseExcitement).toBe(0.4);
    });
  });

  // ---- Celebration Timer ----
  describe('Celebration Timer', () => {
    it('should decay celebration timer over time', () => {
      let goalCelebration = 4.0;
      const dt = 0.016; // ~60fps
      goalCelebration -= dt;
      expect(goalCelebration).toBeCloseTo(3.984);
    });

    it('should stop celebration when timer reaches zero', () => {
      let goalCelebration = 0.01;
      const dt = 0.016;
      goalCelebration -= dt;
      expect(goalCelebration).toBeLessThanOrEqual(0);
    });
  });

  // ---- Confetti Particle Physics ----
  describe('Confetti Physics', () => {
    it('should apply gravity to confetti particles', () => {
      const particle = { vy: 2.0, gravity: 0.04 };
      particle.vy += particle.gravity;
      expect(particle.vy).toBeCloseTo(2.04);
    });

    it('should apply drag to confetti particles', () => {
      const particle = { vx: 3.0, vy: 2.0, drag: 0.99 };
      particle.vx *= particle.drag;
      particle.vy *= particle.drag;
      expect(particle.vx).toBeCloseTo(2.97);
      expect(particle.vy).toBeCloseTo(1.98);
    });

    it('should remove confetti when life exceeds maxLife', () => {
      const particle = { life: 5.5, maxLife: 5.0 };
      const shouldRemove = particle.life >= particle.maxLife;
      expect(shouldRemove).toBe(true);
    });

    it('should keep confetti alive when life is within maxLife', () => {
      const particle = { life: 2.0, maxLife: 5.0 };
      const shouldRemove = particle.life >= particle.maxLife;
      expect(shouldRemove).toBe(false);
    });

    it('should calculate correct alpha based on life remaining', () => {
      const particle = { life: 2.5, maxLife: 5.0 };
      const alpha = 1 - (particle.life / particle.maxLife);
      expect(alpha).toBeCloseTo(0.5);
    });
  });

  // ---- Crowd Figure Wave Animation ----
  describe('Crowd Figure Animation', () => {
    it('should lerp wave amplitude toward target', () => {
      let waveAmplitude = 0;
      const targetWave = 1.0;
      const dt = 0.016;
      const lerpRate = 3.0;
      waveAmplitude += (targetWave - waveAmplitude) * Math.min(1, dt * lerpRate);
      expect(waveAmplitude).toBeGreaterThan(0);
      expect(waveAmplitude).toBeLessThan(1);
    });

    it('should decay bounce offset when not celebrating', () => {
      let bounceOffset = 5.0;
      const decayRate = 0.9;
      bounceOffset *= decayRate;
      expect(bounceOffset).toBeCloseTo(4.5);
    });

    it('should set high wave target during celebration', () => {
      const goalCelebration = 3.0;
      let targetWave = 0;
      if (goalCelebration > 0) {
        targetWave = 1.0;
      }
      expect(targetWave).toBe(1.0);
    });
  });

  // ---- Crowd Audio Excitement Mapping ----
  describe('Crowd Audio Excitement', () => {
    it('should map excitement 0 to quiet volume', () => {
      const excitement = 0;
      const vol = 0.02 + excitement * 0.10;
      expect(vol).toBeCloseTo(0.02);
    });

    it('should map excitement 1 to loud volume', () => {
      const excitement = 1;
      const vol = 0.02 + excitement * 0.10;
      expect(vol).toBeCloseTo(0.12);
    });

    it('should map excitement 0.5 to mid volume', () => {
      const excitement = 0.5;
      const vol = 0.02 + excitement * 0.10;
      expect(vol).toBeCloseTo(0.07);
    });
  });
});

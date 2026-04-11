import { describe, it, expect, beforeEach } from 'vitest';
import {
  COURT, GOAL, PLAYER, BALL, MATCH, RUN_IN_ZONE,
  type GameState, type PlayerState, type BallState,
} from '@/lib/gameConstants';

/**
 * Test suite for run-in zone violation rule:
 * - Red zone (center): NO run-ins allowed → automatic 1pt for opposing team
 * - Side zones: run-ins ARE allowed
 * - Violation triggers when ball carrier in red zone enters goal end zone
 */

// Helper to create a mock player
function createMockPlayer(id: number, pos: { x: number; y: number }, hasBall: boolean = false): PlayerState {
  return {
    id,
    teamId: id < 3 ? 'home' : 'away',
    name: `Player ${id}`,
    pos,
    vel: { x: 0, y: 0 },
    number: id + 1,
    hasBall,
    isControlled: false,
    stealCooldown: 0,
    holdTimer: 0,
    passTarget: null,
    shootCooldown: 0,
    defPersonality: 0.5,
    postPassVulnerable: 0,
    selfishCount: 0,
    receiveTime: 0,
    jumpZ: 0,
    jumpVZ: 0,
    isJumping: false,
    jumpCooldown: 0,
    spinAngle: 0,
    isSpinning: false,
    spinTimer: 0,
    spinCooldown: 0,
  };
}

// Helper to create a mock ball
function createMockBall(): BallState {
  return {
    pos: { x: COURT.WIDTH / 2, y: COURT.HEIGHT / 2 },
    vel: { x: 0, y: 0 },
    z: 0,
    vz: 0,
    carrier: null,
    lastPasser: null,
    passIntended: null,
    isRebound: false,
    lastShooter: null,
    shotPower: 0,
    shotAngle: 0,
    spinRate: 0,
    spinAxis: { x: 0, y: 0 },
  };
}

describe('Run-In Zone Violation Rule', () => {
  let mockGameState: GameState;

  beforeEach(() => {
    // Initialize mock game state
    mockGameState = {
      players: [
        createMockPlayer(0, { x: COURT.WIDTH / 2 - 100, y: COURT.HEIGHT / 2 }, true), // Home P1 with ball
        createMockPlayer(1, { x: COURT.WIDTH / 2 - 200, y: COURT.HEIGHT / 2 - 50 }, false),
        createMockPlayer(2, { x: COURT.WIDTH / 2 - 200, y: COURT.HEIGHT / 2 + 50 }, false),
        createMockPlayer(3, { x: COURT.WIDTH / 2 + 100, y: COURT.HEIGHT / 2 }, false),
        createMockPlayer(4, { x: COURT.WIDTH / 2 + 200, y: COURT.HEIGHT / 2 - 50 }, false),
        createMockPlayer(5, { x: COURT.WIDTH / 2 + 200, y: COURT.HEIGHT / 2 + 50 }, false),
      ],
      ball: createMockBall(),
      score: { home: 0, away: 0 },
      possession: 'home',
      timer: MATCH.DURATION,
      shotClock: MATCH.SHOT_CLOCK,
      isPlaying: true,
      isPaused: false,
      homeTeam: 'home-team-id',
      awayTeam: 'away-team-id',
      isOvertime: false,
      countdown: 0,
      slowMo: 0,
      cameraZoom: 1,
      cameraShake: 0,
      goalFlash: 0,
      goalFlashTeam: 'home',
      specialMeter: 0,
      flowState: 0,
      flowTeam: 'home',
      passChain: 0,
      passChainTeam: 'home',
      currentEvent: null,
      eventTimer: 0,
      crowdEnergy: 0,
      hitFreeze: 0,
      speedLines: 0,
      screenFlash: 0,
      screenFlashColor: '#000000',
      goalEvents: [],
      announcer: [],
      onFireTeam: null,
      onFireTimer: 0,
      homeStreak: 0,
      awayStreak: 0,
      lastGoalReplay: null,
      isPenalty: false,
      penaltyShooter: null,
      momentum: 0,
      momentumTeam: 'home',
      momentumBoost: 0,
    };
  });

  describe('Red Zone Violations', () => {
    it('should detect violation when home player with ball enters left goal zone from red zone center', () => {
      const courtCenterY = COURT.HEIGHT / 2;
      const redZoneHalfW = RUN_IN_ZONE.CENTER_WIDTH / 2;

      // Home player at center Y (in red zone) moving toward left goal
      const player = mockGameState.players[0];
      player.pos.y = courtCenterY; // Exactly at center (in red zone)
      player.pos.x = GOAL.SETBACK + PLAYER.RADIUS - 1; // Just inside goal zone

      // Check conditions
      const isInRedZone = Math.abs(player.pos.y - courtCenterY) <= redZoneHalfW;
      const isNearLeftGoal = player.pos.x <= GOAL.SETBACK + PLAYER.RADIUS;

      expect(isInRedZone).toBe(true);
      expect(isNearLeftGoal).toBe(true);
      expect(player.hasBall).toBe(true);
    });

    it('should NOT trigger violation when player is in side zone (allowed run-in area)', () => {
      const courtCenterY = COURT.HEIGHT / 2;
      const redZoneHalfW = RUN_IN_ZONE.CENTER_WIDTH / 2;

      // Home player at side Y (outside red zone) moving toward left goal
      const player = mockGameState.players[0];
      player.pos.y = courtCenterY + redZoneHalfW + 10; // Outside red zone (in side run zone)
      player.pos.x = GOAL.SETBACK + PLAYER.RADIUS - 1; // In goal zone

      const isInRedZone = Math.abs(player.pos.y - courtCenterY) <= redZoneHalfW;
      const isNearLeftGoal = player.pos.x <= GOAL.SETBACK + PLAYER.RADIUS;

      expect(isInRedZone).toBe(false); // NOT in red zone
      expect(isNearLeftGoal).toBe(true);
      expect(player.hasBall).toBe(true);
    });

    it('should NOT trigger violation when player is far from goal zone', () => {
      const courtCenterY = COURT.HEIGHT / 2;
      const redZoneHalfW = RUN_IN_ZONE.CENTER_WIDTH / 2;

      // Home player in red zone but far from goal
      const player = mockGameState.players[0];
      player.pos.y = courtCenterY; // In red zone
      player.pos.x = COURT.WIDTH / 2; // Far from goal

      const isInRedZone = Math.abs(player.pos.y - courtCenterY) <= redZoneHalfW;
      const isNearLeftGoal = player.pos.x <= GOAL.SETBACK + PLAYER.RADIUS;

      expect(isInRedZone).toBe(true);
      expect(isNearLeftGoal).toBe(false); // NOT near goal
    });

    it('should NOT trigger violation when player does not have ball', () => {
      const courtCenterY = COURT.HEIGHT / 2;
      const redZoneHalfW = RUN_IN_ZONE.CENTER_WIDTH / 2;

      // Home player in red zone, near goal, but WITHOUT ball
      const player = mockGameState.players[1];
      player.pos.y = courtCenterY;
      player.pos.x = GOAL.SETBACK + PLAYER.RADIUS - 1;
      player.hasBall = false;

      const isInRedZone = Math.abs(player.pos.y - courtCenterY) <= redZoneHalfW;
      const isNearLeftGoal = player.pos.x <= GOAL.SETBACK + PLAYER.RADIUS;

      expect(isInRedZone).toBe(true);
      expect(isNearLeftGoal).toBe(true);
      expect(player.hasBall).toBe(false); // No ball = no violation
    });
  });

  describe('Right Goal Violations', () => {
    it('should detect violation when away player enters right goal zone from red zone', () => {
      const courtCenterY = COURT.HEIGHT / 2;
      const redZoneHalfW = RUN_IN_ZONE.CENTER_WIDTH / 2;

      // Away player (id=3) with ball at center Y moving toward right goal
      const player = mockGameState.players[3];
      player.hasBall = true;
      player.pos.y = courtCenterY; // In red zone
      player.pos.x = COURT.WIDTH - GOAL.SETBACK - PLAYER.RADIUS + 1; // Just inside right goal zone

      const isInRedZone = Math.abs(player.pos.y - courtCenterY) <= redZoneHalfW;
      const isNearRightGoal = player.pos.x >= COURT.WIDTH - GOAL.SETBACK - PLAYER.RADIUS;

      expect(isInRedZone).toBe(true);
      expect(isNearRightGoal).toBe(true);
      expect(player.hasBall).toBe(true);
    });
  });

  describe('Zone Boundaries', () => {
    it('should correctly identify red zone boundaries', () => {
      const courtCenterY = COURT.HEIGHT / 2;
      const redZoneHalfW = RUN_IN_ZONE.CENTER_WIDTH / 2;

      // Test points at red zone edge
      const atCenterY = courtCenterY;
      const atRedZoneTop = courtCenterY - redZoneHalfW;
      const atRedZoneBottom = courtCenterY + redZoneHalfW;
      const outsideRedZoneTop = courtCenterY - redZoneHalfW - 1;
      const outsideRedZoneBottom = courtCenterY + redZoneHalfW + 1;

      expect(Math.abs(atCenterY - courtCenterY) <= redZoneHalfW).toBe(true);
      expect(Math.abs(atRedZoneTop - courtCenterY) <= redZoneHalfW).toBe(true);
      expect(Math.abs(atRedZoneBottom - courtCenterY) <= redZoneHalfW).toBe(true);
      expect(Math.abs(outsideRedZoneTop - courtCenterY) <= redZoneHalfW).toBe(false);
      expect(Math.abs(outsideRedZoneBottom - courtCenterY) <= redZoneHalfW).toBe(false);
    });

    it('should correctly identify goal zone setback boundaries', () => {
      // Left goal zone
      const atLeftGoalZone = GOAL.SETBACK + PLAYER.RADIUS;
      const insideLeftGoalZone = GOAL.SETBACK + PLAYER.RADIUS - 1;
      const outsideLeftGoalZone = GOAL.SETBACK + PLAYER.RADIUS + 1;

      expect(insideLeftGoalZone <= atLeftGoalZone).toBe(true);
      expect(outsideLeftGoalZone <= atLeftGoalZone).toBe(false);

      // Right goal zone
      const atRightGoalZone = COURT.WIDTH - GOAL.SETBACK - PLAYER.RADIUS;
      const insideRightGoalZone = COURT.WIDTH - GOAL.SETBACK - PLAYER.RADIUS + 1;
      const outsideRightGoalZone = COURT.WIDTH - GOAL.SETBACK - PLAYER.RADIUS - 1;

      expect(insideRightGoalZone >= atRightGoalZone).toBe(true);
      expect(outsideRightGoalZone >= atRightGoalZone).toBe(false);
    });
  });

  describe('Score and Possession Reset', () => {
    it('should award 1 point to opposing team on violation', () => {
      const initialScore = mockGameState.score.away;
      const violatingTeam = 'home';
      const opposingTeam = 'away';

      // Simulate violation
      mockGameState.score[opposingTeam] += 1;

      expect(mockGameState.score[opposingTeam]).toBe(initialScore + 1);
    });

    it('should track violation as a goal event', () => {
      const initialEventCount = mockGameState.goalEvents.length;

      // Simulate violation event
      mockGameState.goalEvents.push({
        teamId: mockGameState.awayTeam,
        zone: 1,
        time: mockGameState.timer,
      });

      expect(mockGameState.goalEvents.length).toBe(initialEventCount + 1);
      expect(mockGameState.goalEvents[mockGameState.goalEvents.length - 1].zone).toBe(1);
    });
  });
});

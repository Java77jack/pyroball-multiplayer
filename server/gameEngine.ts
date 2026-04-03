/**
 * Server-Authoritative Game Engine
 * 
 * This engine runs on the server and maintains the single source of truth for all game state.
 * All client actions are validated here before being applied to prevent cheating.
 * The server broadcasts the authoritative state to all clients for reconciliation.
 */

import { COURT, GOAL, ZONES, PLAYER_NAMES } from "../shared/gameConstants";

export interface ServerGameState {
  roomCode: string;
  status: "waiting" | "playing" | "finished";
  homeScore: number;
  awayScore: number;
  period: number;
  timeRemaining: number;
  ballPos: { x: number; y: number };
  ballVel: { x: number; y: number };
  players: Record<string, ServerPlayerState>;
  lastActionTime: number;
  gameStartTime: number;
  onFireTeam: "home" | "away" | null;
  onFireTimeRemaining: number;
}

export interface ServerPlayerState {
  id: number;
  team: "home" | "away";
  x: number;
  y: number;
  vx: number;
  vy: number;
  hasBall: boolean;
  isJumping: boolean;
  jumpZ: number;
  isSpinning: boolean;
  spinAngle: number;
  holdTime: number;
  lastActionTime: number;
  goalsScored: number;
  assists: number;
  steals: number;
  blocks: number;
}

export interface ValidatedAction {
  valid: boolean;
  reason?: string;
  stateDelta?: Partial<ServerPlayerState>;
}

const COURT_WIDTH = COURT.width;
const COURT_HEIGHT = COURT.height;
const PLAYER_SPEED = 0.8;
const MAX_HOLD_TIME = 5000; // 5 seconds
const ON_FIRE_THRESHOLD = 3; // 3 unanswered goals
const ON_FIRE_DURATION = 15000; // 15 seconds

export class GameEngine {
  private state: ServerGameState;
  private gameLoopInterval: NodeJS.Timeout | null = null;
  private readonly TICK_RATE = 60; // 60 FPS
  private readonly TICK_INTERVAL = 1000 / this.TICK_RATE;

  constructor(roomCode: string) {
    this.state = {
      roomCode,
      status: "waiting",
      homeScore: 0,
      awayScore: 0,
      period: 1,
      timeRemaining: 5 * 60 * 1000, // 5 minutes
      ballPos: { x: 0, y: 0 },
      ballVel: { x: 0, y: 0 },
      players: {},
      lastActionTime: Date.now(),
      gameStartTime: 0,
      onFireTeam: null,
      onFireTimeRemaining: 0,
    };
  }

  /**
   * Initialize players in the game
   */
  initializePlayers(homePlayerIds: number[], awayPlayerIds: number[]) {
    const initPlayer = (id: number, team: "home" | "away", index: number): ServerPlayerState => {
      const isHome = team === "home";
      const startX = isHome ? -COURT_WIDTH / 4 : COURT_WIDTH / 4;
      const offsetX = (index % 2) * 60 - 30;
      const offsetY = Math.floor(index / 2) * 60 - 30;

      return {
        id,
        team,
        x: startX + offsetX,
        y: COURT_HEIGHT / 2 + offsetY,
        vx: 0,
        vy: 0,
        hasBall: false,
        isJumping: false,
        jumpZ: 0,
        isSpinning: false,
        spinAngle: 0,
        holdTime: 0,
        lastActionTime: Date.now(),
        goalsScored: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
      };
    };

    homePlayerIds.forEach((id, i) => {
      this.state.players[`home-${id}`] = initPlayer(id, "home", i);
    });

    awayPlayerIds.forEach((id, i) => {
      this.state.players[`away-${id}`] = initPlayer(id, "away", i);
    });

    // Give ball to center player
    const firstHomePlayer = Object.values(this.state.players).find((p) => p.team === "home");
    if (firstHomePlayer) {
      firstHomePlayer.hasBall = true;
    }
  }

  /**
   * Start the game and begin the game loop
   */
  startGame() {
    this.state.status = "playing";
    this.state.gameStartTime = Date.now();
    this.state.timeRemaining = 5 * 60 * 1000;

    this.gameLoopInterval = setInterval(() => {
      this.tick();
    }, this.TICK_INTERVAL);
  }

  /**
   * Stop the game and clean up
   */
  stopGame() {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
    this.state.status = "finished";
  }

  /**
   * Main game loop tick
   */
  private tick() {
    if (this.state.status !== "playing") return;

    const deltaTime = this.TICK_INTERVAL / 1000; // Convert to seconds

    // Update time
    this.state.timeRemaining -= this.TICK_INTERVAL;
    if (this.state.timeRemaining <= 0) {
      this.state.timeRemaining = 0;
      this.state.status = "finished";
      return;
    }

    // Update ON FIRE timer
    if (this.state.onFireTeam) {
      this.state.onFireTimeRemaining -= this.TICK_INTERVAL;
      if (this.state.onFireTimeRemaining <= 0) {
        this.state.onFireTeam = null;
        this.state.onFireTimeRemaining = 0;
      }
    }

    // Update player physics
    Object.values(this.state.players).forEach((player) => {
      // Apply friction
      player.vx *= 0.95;
      player.vy *= 0.95;

      // Update position
      player.x += player.vx * deltaTime;
      player.y += player.vy * deltaTime;

      // Clamp to court bounds
      player.x = Math.max(-COURT_WIDTH / 2, Math.min(COURT_WIDTH / 2, player.x));
      player.y = Math.max(-COURT_HEIGHT / 2, Math.min(COURT_HEIGHT / 2, player.y));

      // Update jump
      if (player.isJumping) {
        player.jumpZ = Math.max(0, player.jumpZ - 9.8 * deltaTime);
        if (player.jumpZ <= 0) {
          player.isJumping = false;
          player.jumpZ = 0;
        }
      }

      // Update spin
      if (player.isSpinning) {
        player.spinAngle += 360 * deltaTime;
      }

      // Update hold time
      if (player.hasBall) {
        player.holdTime += this.TICK_INTERVAL;
        if (player.holdTime > MAX_HOLD_TIME) {
          // Turnover after holding too long
          this.forceTurnover(player);
        }
      }
    });

    // Update ball physics (simplified)
    this.updateBallPhysics(deltaTime);

    // Check for goals
    this.checkGoals();
  }

  /**
   * Update ball physics
   */
  private updateBallPhysics(deltaTime: number) {
    // Apply friction
    this.state.ballVel.x *= 0.98;
    this.state.ballVel.y *= 0.98;

    // Update position
    this.state.ballPos.x += this.state.ballVel.x * deltaTime;
    this.state.ballPos.y += this.state.ballVel.y * deltaTime;

    // Bounce off court walls
    if (Math.abs(this.state.ballPos.x) > COURT_WIDTH / 2) {
      this.state.ballVel.x *= -0.8;
      this.state.ballPos.x = Math.max(-COURT_WIDTH / 2, Math.min(COURT_WIDTH / 2, this.state.ballPos.x));
    }

    if (Math.abs(this.state.ballPos.y) > COURT_HEIGHT / 2) {
      this.state.ballVel.y *= -0.8;
      this.state.ballPos.y = Math.max(-COURT_HEIGHT / 2, Math.min(COURT_HEIGHT / 2, this.state.ballPos.y));
    }
  }

  /**
   * Validate and apply a player action
   */
  validateAction(playerId: number, team: "home" | "away", action: string, data?: any): ValidatedAction {
    const playerKey = `${team}-${playerId}`;
    const player = this.state.players[playerKey];

    if (!player) {
      return { valid: false, reason: "Player not found" };
    }

    // Check if player is on the correct team
    if (player.team !== team) {
      return { valid: false, reason: "Team mismatch" };
    }

    switch (action) {
      case "move":
        return this.validateMove(player, data);
      case "shoot":
        return this.validateShoot(player, data);
      case "pass":
        return this.validatePass(player, data);
      case "steal":
        return this.validateSteal(player, data);
      case "jump":
        return this.validateJump(player);
      case "spin":
        return this.validateSpin(player);
      default:
        return { valid: false, reason: "Unknown action" };
    }
  }

  /**
   * Validate move action
   */
  private validateMove(player: ServerPlayerState, data: any): ValidatedAction {
    if (!data || typeof data.vx !== "number" || typeof data.vy !== "number") {
      return { valid: false, reason: "Invalid move data" };
    }

    const maxSpeed = this.state.onFireTeam === player.team ? PLAYER_SPEED * 1.2 : PLAYER_SPEED;
    const speed = Math.sqrt(data.vx ** 2 + data.vy ** 2);

    if (speed > maxSpeed * 2) {
      // Possible speedhack
      return { valid: false, reason: "Speed exceeds maximum" };
    }

    return {
      valid: true,
      stateDelta: {
        vx: data.vx,
        vy: data.vy,
      },
    };
  }

  /**
   * Validate shoot action
   */
  private validateShoot(player: ServerPlayerState, data: any): ValidatedAction {
    if (!player.hasBall) {
      return { valid: false, reason: "Player does not have ball" };
    }

    if (!data || typeof data.power !== "number" || typeof data.angle !== "number") {
      return { valid: false, reason: "Invalid shoot data" };
    }

    if (data.power < 0 || data.power > 1) {
      return { valid: false, reason: "Power out of range" };
    }

    // Apply ON FIRE boost if active
    const power = this.state.onFireTeam === player.team ? data.power * 1.2 : data.power;

    return {
      valid: true,
      stateDelta: {
        hasBall: false,
        holdTime: 0,
      },
    };
  }

  /**
   * Validate pass action
   */
  private validatePass(player: ServerPlayerState, data: any): ValidatedAction {
    if (!player.hasBall) {
      return { valid: false, reason: "Player does not have ball" };
    }

    if (!data || typeof data.targetId !== "number") {
      return { valid: false, reason: "Invalid pass data" };
    }

    const targetKey = `${player.team}-${data.targetId}`;
    const target = this.state.players[targetKey];

    if (!target) {
      return { valid: false, reason: "Target player not found" };
    }

    if (target.team !== player.team) {
      return { valid: false, reason: "Cannot pass to opponent" };
    }

    return {
      valid: true,
      stateDelta: {
        hasBall: false,
        holdTime: 0,
      },
    };
  }

  /**
   * Validate steal action
   */
  private validateSteal(player: ServerPlayerState, data: any): ValidatedAction {
    // Find player with ball on opposing team
    const ballCarrier = Object.values(this.state.players).find(
      (p) => p.hasBall && p.team !== player.team
    );

    if (!ballCarrier) {
      return { valid: false, reason: "No opponent has ball" };
    }

    // Check distance (must be close)
    const dx = player.x - ballCarrier.x;
    const dy = player.y - ballCarrier.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 100) {
      return { valid: false, reason: "Target too far away" };
    }

    return { valid: true };
  }

  /**
   * Validate jump action
   */
  private validateJump(player: ServerPlayerState): ValidatedAction {
    if (player.isJumping) {
      return { valid: false, reason: "Already jumping" };
    }

    return {
      valid: true,
      stateDelta: {
        isJumping: true,
        jumpZ: 5,
      },
    };
  }

  /**
   * Validate spin action
   */
  private validateSpin(player: ServerPlayerState): ValidatedAction {
    if (player.isSpinning) {
      return { valid: false, reason: "Already spinning" };
    }

    return {
      valid: true,
      stateDelta: {
        isSpinning: true,
        spinAngle: 0,
      },
    };
  }

  /**
   * Check for goals and update score
   */
  private checkGoals() {
    // Check if ball is in goal zones
    const inHomeGoal = this.state.ballPos.x < -COURT_WIDTH / 2 + 50 && Math.abs(this.state.ballPos.y) < GOAL.height / 2;
    const inAwayGoal = this.state.ballPos.x > COURT_WIDTH / 2 - 50 && Math.abs(this.state.ballPos.y) < GOAL.height / 2;

    if (inHomeGoal) {
      this.scoreGoal("away");
    } else if (inAwayGoal) {
      this.scoreGoal("home");
    }
  }

  /**
   * Score a goal
   */
  private scoreGoal(team: "home" | "away") {
    if (team === "home") {
      this.state.homeScore++;
    } else {
      this.state.awayScore++;
    }

    // Check for ON FIRE activation
    this.checkOnFire();

    // Reset ball and players
    this.resetAfterGoal();
  }

  /**
   * Check if a team should go ON FIRE
   */
  private checkOnFire() {
    const homeScored = this.state.homeScore;
    const awayScored = this.state.awayScore;

    // Check for 3 unanswered goals
    if (homeScored >= ON_FIRE_THRESHOLD && homeScored - awayScored >= ON_FIRE_THRESHOLD) {
      this.state.onFireTeam = "home";
      this.state.onFireTimeRemaining = ON_FIRE_DURATION;
    } else if (awayScored >= ON_FIRE_THRESHOLD && awayScored - homeScored >= ON_FIRE_THRESHOLD) {
      this.state.onFireTeam = "away";
      this.state.onFireTimeRemaining = ON_FIRE_DURATION;
    }
  }

  /**
   * Reset game state after a goal
   */
  private resetAfterGoal() {
    // Reset ball
    this.state.ballPos = { x: 0, y: 0 };
    this.state.ballVel = { x: 0, y: 0 };

    // Reset players
    Object.values(this.state.players).forEach((player) => {
      player.hasBall = false;
      player.holdTime = 0;
      player.vx = 0;
      player.vy = 0;
      player.isJumping = false;
      player.jumpZ = 0;
      player.isSpinning = false;
      player.spinAngle = 0;
    });

    // Give ball to center player of scoring team
    const scoringTeam = this.state.homeScore > this.state.awayScore ? "home" : "away";
    const centerPlayer = Object.values(this.state.players).find((p) => p.team === scoringTeam);
    if (centerPlayer) {
      centerPlayer.hasBall = true;
    }
  }

  /**
   * Force a turnover (ball drops)
   */
  private forceTurnover(player: ServerPlayerState) {
    player.hasBall = false;
    player.holdTime = 0;
    this.state.ballPos = { x: player.x, y: player.y };
    this.state.ballVel = { x: 0, y: 0 };
  }

  /**
   * Get the current game state
   */
  getState(): ServerGameState {
    return { ...this.state };
  }

  /**
   * Get player state
   */
  getPlayerState(playerId: number, team: "home" | "away"): ServerPlayerState | null {
    const playerKey = `${team}-${playerId}`;
    return this.state.players[playerKey] || null;
  }

  /**
   * Apply a validated action to the game state
   */
  applyAction(playerId: number, team: "home" | "away", action: string, data?: any) {
    const validation = this.validateAction(playerId, team, action, data);
    if (!validation.valid) {
      console.warn(`[GameEngine] Invalid action: ${validation.reason}`);
      return false;
    }

    const playerKey = `${team}-${playerId}`;
    const player = this.state.players[playerKey];
    if (!player || validation.stateDelta) {
      Object.assign(player, validation.stateDelta);
    }

    player.lastActionTime = Date.now();
    return true;
  }
}

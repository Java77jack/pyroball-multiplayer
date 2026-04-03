/**
 * Client-Side Network Engine
 * 
 * Handles client-side prediction, interpolation, and state reconciliation
 * to provide smooth gameplay despite network latency.
 */

export interface ClientGameState {
  homeScore: number;
  awayScore: number;
  period: number;
  timeRemaining: number;
  ballPos: { x: number; y: number };
  ballVel: { x: number; y: number };
  players: Record<string, ClientPlayerState>;
}

export interface ClientPlayerState {
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
  // Prediction/interpolation fields
  predictedX?: number;
  predictedY?: number;
  interpolationAlpha?: number;
  lastUpdateTime?: number;
}

export class NetworkEngine {
  private localState: ClientGameState;
  private serverState: ClientGameState;
  private inputBuffer: Array<{ action: string; data?: any; timestamp: number }> = [];
  private lastServerUpdateTime = 0;
  private readonly INTERPOLATION_DELAY = 100; // 100ms interpolation window
  private readonly PREDICTION_ENABLED = true;

  constructor(initialState: ClientGameState) {
    this.localState = JSON.parse(JSON.stringify(initialState));
    this.serverState = JSON.parse(JSON.stringify(initialState));
    this.lastServerUpdateTime = Date.now();
  }

  /**
   * Apply local input prediction
   * This runs immediately on the client for responsiveness
   */
  predictInput(playerId: number, team: "home" | "away", action: string, data?: any) {
    if (!this.PREDICTION_ENABLED) return;

    const playerKey = `${team}-${playerId}`;
    const player = this.localState.players[playerKey];

    if (!player) return;

    const timestamp = Date.now();

    switch (action) {
      case "move":
        if (data && typeof data.vx === "number" && typeof data.vy === "number") {
          player.vx = data.vx;
          player.vy = data.vy;
        }
        break;

      case "jump":
        if (!player.isJumping) {
          player.isJumping = true;
          player.jumpZ = 5;
        }
        break;

      case "spin":
        if (!player.isSpinning) {
          player.isSpinning = true;
          player.spinAngle = 0;
        }
        break;

      case "shoot":
        if (player.hasBall && data) {
          player.hasBall = false;
          // Predict ball trajectory
          const power = data.power || 0.5;
          const angle = data.angle || 0;
          this.localState.ballVel.x = Math.cos(angle) * power * 10;
          this.localState.ballVel.y = Math.sin(angle) * power * 10;
        }
        break;

      case "pass":
        if (player.hasBall && data && typeof data.targetId === "number") {
          player.hasBall = false;
          const targetKey = `${team}-${data.targetId}`;
          const target = this.localState.players[targetKey];
          if (target) {
            target.hasBall = true;
          }
        }
        break;

      case "steal":
        // Predict ball acquisition
        const ballCarrier = Object.values(this.localState.players).find(
          (p) => p.hasBall && p.team !== team
        );
        if (ballCarrier) {
          ballCarrier.hasBall = false;
          player.hasBall = true;
        }
        break;
    }

    // Buffer the input for server confirmation
    this.inputBuffer.push({ action, data, timestamp });
  }

  /**
   * Receive authoritative server state update
   * Reconcile with local predictions
   */
  reconcileServerState(serverState: ClientGameState) {
    this.serverState = JSON.parse(JSON.stringify(serverState));
    this.lastServerUpdateTime = Date.now();

    // Check for prediction errors and correct them
    this.reconcilePlayerStates();
  }

  /**
   * Reconcile player states between predicted and server states
   */
  private reconcilePlayerStates() {
    const now = Date.now();
    const timeSinceUpdate = now - this.lastServerUpdateTime;

    Object.keys(this.serverState.players).forEach((playerKey) => {
      const serverPlayer = this.serverState.players[playerKey];
      const localPlayer = this.localState.players[playerKey];

      if (!serverPlayer || !localPlayer) return;

      // Calculate position error
      const posError = Math.sqrt(
        Math.pow(localPlayer.x - serverPlayer.x, 2) +
        Math.pow(localPlayer.y - serverPlayer.y, 2)
      );

      // If error is large, snap to server state (possible cheat attempt or major desync)
      if (posError > 200) {
        localPlayer.x = serverPlayer.x;
        localPlayer.y = serverPlayer.y;
        localPlayer.vx = serverPlayer.vx;
        localPlayer.vy = serverPlayer.vy;
      } else if (posError > 50) {
        // Gradually correct smaller errors
        const correctionFactor = 0.1;
        localPlayer.x += (serverPlayer.x - localPlayer.x) * correctionFactor;
        localPlayer.y += (serverPlayer.y - localPlayer.y) * correctionFactor;
      }

      // Sync non-position state
      localPlayer.hasBall = serverPlayer.hasBall;
      localPlayer.isJumping = serverPlayer.isJumping;
      localPlayer.jumpZ = serverPlayer.jumpZ;
      localPlayer.isSpinning = serverPlayer.isSpinning;
      localPlayer.spinAngle = serverPlayer.spinAngle;
    });

    // Sync score
    this.localState.homeScore = this.serverState.homeScore;
    this.localState.awayScore = this.serverState.awayScore;
    this.localState.timeRemaining = this.serverState.timeRemaining;
  }

  /**
   * Interpolate between server states for smooth rendering
   * Called every frame
   */
  getInterpolatedState(deltaTime: number): ClientGameState {
    const now = Date.now();
    const timeSinceUpdate = now - this.lastServerUpdateTime;
    const alpha = Math.min(1, timeSinceUpdate / this.INTERPOLATION_DELAY);

    const interpolatedState: ClientGameState = {
      ...this.localState,
      players: {},
    };

    Object.keys(this.localState.players).forEach((playerKey) => {
      const localPlayer = this.localState.players[playerKey];
      const serverPlayer = this.serverState.players[playerKey];

      if (!localPlayer || !serverPlayer) {
        interpolatedState.players[playerKey] = localPlayer;
        return;
      }

      // Interpolate position
      const interpolatedPlayer: ClientPlayerState = {
        ...localPlayer,
        x: localPlayer.x + (serverPlayer.x - localPlayer.x) * alpha,
        y: localPlayer.y + (serverPlayer.y - localPlayer.y) * alpha,
        interpolationAlpha: alpha,
        lastUpdateTime: this.lastServerUpdateTime,
      };

      interpolatedState.players[playerKey] = interpolatedPlayer;
    });

    // Interpolate ball position
    interpolatedState.ballPos = {
      x: this.localState.ballPos.x + (this.serverState.ballPos.x - this.localState.ballPos.x) * alpha,
      y: this.localState.ballPos.y + (this.serverState.ballPos.y - this.localState.ballPos.y) * alpha,
    };

    return interpolatedState;
  }

  /**
   * Update local state for rendering
   * Called every frame
   */
  updateLocalState(deltaTime: number) {
    // Update player physics
    Object.values(this.localState.players).forEach((player) => {
      // Apply velocity
      player.x += player.vx * deltaTime;
      player.y += player.vy * deltaTime;

      // Apply friction
      player.vx *= 0.95;
      player.vy *= 0.95;

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
    });

    // Update ball physics
    this.localState.ballVel.x *= 0.98;
    this.localState.ballVel.y *= 0.98;
    this.localState.ballPos.x += this.localState.ballVel.x * deltaTime;
    this.localState.ballPos.y += this.localState.ballVel.y * deltaTime;
  }

  /**
   * Get the current local state
   */
  getLocalState(): ClientGameState {
    return { ...this.localState };
  }

  /**
   * Get the server state
   */
  getServerState(): ClientGameState {
    return { ...this.serverState };
  }

  /**
   * Get buffered inputs for debugging/replay
   */
  getInputBuffer() {
    return [...this.inputBuffer];
  }

  /**
   * Clear input buffer after server confirmation
   */
  clearInputBuffer() {
    this.inputBuffer = [];
  }

  /**
   * Calculate network latency estimate
   */
  getEstimatedLatency(): number {
    const now = Date.now();
    return Math.max(0, now - this.lastServerUpdateTime);
  }
}

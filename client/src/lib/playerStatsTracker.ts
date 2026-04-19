/**
 * Player Stats Tracker
 * Tracks individual player statistics during a match
 */

export interface PlayerMatchStats {
  playerId: number;
  goalsScored: number;
  assists: number;
  steals: number;
  blocks: number;
  shotAttempts: number;
  shotsMade: number;
}

export class PlayerStatsTracker {
  private stats: Map<number, PlayerMatchStats> = new Map();

  constructor(playerIds: number[]) {
    playerIds.forEach(id => {
      this.stats.set(id, {
        playerId: id,
        goalsScored: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        shotAttempts: 0,
        shotsMade: 0,
      });
    });
  }

  recordGoal(playerId: number): void {
    const stats = this.stats.get(playerId);
    if (stats) {
      stats.goalsScored += 1;
    }
  }

  recordAssist(playerId: number): void {
    const stats = this.stats.get(playerId);
    if (stats) {
      stats.assists += 1;
    }
  }

  recordSteal(playerId: number): void {
    const stats = this.stats.get(playerId);
    if (stats) {
      stats.steals += 1;
    }
  }

  recordBlock(playerId: number): void {
    const stats = this.stats.get(playerId);
    if (stats) {
      stats.blocks += 1;
    }
  }

  recordShotAttempt(playerId: number, made: boolean): void {
    const stats = this.stats.get(playerId);
    if (stats) {
      stats.shotAttempts += 1;
      if (made) {
        stats.shotsMade += 1;
      }
    }
  }

  getShotAccuracy(playerId: number): number {
    const stats = this.stats.get(playerId);
    if (!stats || stats.shotAttempts === 0) return 0;
    return Math.round((stats.shotsMade / stats.shotAttempts) * 100);
  }

  getPlayerStats(playerId: number): PlayerMatchStats | undefined {
    return this.stats.get(playerId);
  }

  getAllStats(): PlayerMatchStats[] {
    return Array.from(this.stats.values());
  }

  reset(): void {
    this.stats.forEach(stats => {
      stats.goalsScored = 0;
      stats.assists = 0;
      stats.steals = 0;
      stats.blocks = 0;
      stats.shotAttempts = 0;
      stats.shotsMade = 0;
    });
  }
}

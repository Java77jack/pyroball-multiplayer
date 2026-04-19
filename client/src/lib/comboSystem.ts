/**
 * Combo System Tracker
 * Tracks player combos and special moves for enhanced gameplay
 */

import { COMBO_SYSTEM } from './gameConstants';

export interface ComboState {
  passCombo: number;           // Current pass combo count
  passComboActive: boolean;    // Is pass combo active?
  passComboTimer: number;      // Time remaining for pass combo
  
  stealCombo: number;          // Current steal combo count
  stealComboActive: boolean;   // Is steal combo active?
  stealComboTimer: number;     // Time remaining for steal combo
  
  defensiveCombo: number;      // Current defensive combo count
  defensiveComboActive: boolean;
  defensiveComboTimer: number;
  
  powerShotCharge: number;     // 0-1, charge level for power shot
  isPowerShotReady: boolean;   // Is power shot fully charged?
  
  lastPassTime: number;        // Timestamp of last pass
  lastStealTime: number;       // Timestamp of last steal
  lastBlockTime: number;       // Timestamp of last block
  
  alleyOopWindow: number;      // Time remaining to complete alley-oop
  isInAlleyOopWindow: boolean; // Can complete alley-oop?
}

export class ComboTracker {
  private state: ComboState;
  private teamId: number;

  constructor(teamId: number) {
    this.teamId = teamId;
    this.state = {
      passCombo: 0,
      passComboActive: false,
      passComboTimer: 0,
      stealCombo: 0,
      stealComboActive: false,
      stealComboTimer: 0,
      defensiveCombo: 0,
      defensiveComboActive: false,
      defensiveComboTimer: 0,
      powerShotCharge: 0,
      isPowerShotReady: false,
      lastPassTime: 0,
      lastStealTime: 0,
      lastBlockTime: 0,
      alleyOopWindow: 0,
      isInAlleyOopWindow: false,
    };
  }

  recordPass(): void {
    this.state.lastPassTime = Date.now();
    this.state.passCombo += 1;
    
    if (this.state.passCombo >= COMBO_SYSTEM.PASS_COMBO_THRESHOLD) {
      this.state.passComboActive = true;
      this.state.passComboTimer = COMBO_SYSTEM.PASS_COMBO_DURATION;
    }
  }

  recordSteal(): void {
    this.state.lastStealTime = Date.now();
    this.state.stealCombo += 1;
    
    if (this.state.stealCombo >= COMBO_SYSTEM.STEAL_COMBO_THRESHOLD) {
      this.state.stealComboActive = true;
      this.state.stealComboTimer = COMBO_SYSTEM.STEAL_COMBO_DURATION;
    }
  }

  recordBlock(): void {
    this.state.lastBlockTime = Date.now();
    this.state.defensiveCombo += 1;
    
    if (this.state.defensiveCombo >= COMBO_SYSTEM.DEFENSIVE_COMBO_THRESHOLD) {
      this.state.defensiveComboActive = true;
      this.state.defensiveComboTimer = COMBO_SYSTEM.DEFENSIVE_COMBO_DURATION;
    }
  }

  recordPass_Received(): void {
    // Open alley-oop window when receiving pass
    this.state.alleyOopWindow = COMBO_SYSTEM.ALLEY_OOP_WINDOW;
    this.state.isInAlleyOopWindow = true;
  }

  recordGoal(isAlleyOop: boolean = false): number {
    let pointsBonus = 0;
    
    if (isAlleyOop && this.state.isInAlleyOopWindow) {
      pointsBonus = COMBO_SYSTEM.ALLEY_OOP_POINTS_BONUS;
      this.state.isInAlleyOopWindow = false;
      this.state.alleyOopWindow = 0;
    }
    
    // Reset combos on goal
    this.resetCombos();
    
    return pointsBonus;
  }

  startPowerShotCharge(): void {
    this.state.powerShotCharge = 0;
    this.state.isPowerShotReady = false;
  }

  updatePowerShotCharge(deltaTime: number): void {
    if (this.state.powerShotCharge < 1) {
      this.state.powerShotCharge += deltaTime / COMBO_SYSTEM.POWER_SHOT_CHARGE_TIME;
      
      if (this.state.powerShotCharge >= 1) {
        this.state.powerShotCharge = 1;
        this.state.isPowerShotReady = true;
      }
    }
  }

  getPowerShotMultipliers(): { power: number; accuracy: number; points: number } {
    if (!this.state.isPowerShotReady) {
      return { power: 1, accuracy: 1, points: 1 };
    }
    
    return {
      power: COMBO_SYSTEM.POWER_SHOT_POWER_MULT,
      accuracy: COMBO_SYSTEM.POWER_SHOT_ACCURACY_MULT,
      points: COMBO_SYSTEM.POWER_SHOT_POINTS_MULT,
    };
  }

  getPassComboMultipliers(): { speed: number; passSpeed: number } {
    if (!this.state.passComboActive) {
      return { speed: 1, passSpeed: 1 };
    }
    
    return {
      speed: COMBO_SYSTEM.PASS_COMBO_SPEED_BOOST,
      passSpeed: COMBO_SYSTEM.PASS_COMBO_PASS_SPEED,
    };
  }

  getStealComboMultipliers(): { range: number; success: number } {
    if (!this.state.stealComboActive) {
      return { range: 1, success: 1 };
    }
    
    return {
      range: COMBO_SYSTEM.STEAL_COMBO_RANGE_MULT,
      success: COMBO_SYSTEM.STEAL_COMBO_SUCCESS_MULT,
    };
  }

  getDefensiveComboMultipliers(): { steal: number; block: number } {
    if (!this.state.defensiveComboActive) {
      return { steal: 1, block: 1 };
    }
    
    return {
      steal: COMBO_SYSTEM.DEFENSIVE_COMBO_STEAL_BOOST,
      block: COMBO_SYSTEM.DEFENSIVE_COMBO_BLOCK_BOOST,
    };
  }

  update(deltaTime: number): void {
    // Update pass combo timer
    if (this.state.passComboActive) {
      this.state.passComboTimer -= deltaTime;
      if (this.state.passComboTimer <= 0) {
        this.state.passComboActive = false;
        this.state.passCombo = 0;
      }
    }

    // Update steal combo timer
    if (this.state.stealComboActive) {
      this.state.stealComboTimer -= deltaTime;
      if (this.state.stealComboTimer <= 0) {
        this.state.stealComboActive = false;
        this.state.stealCombo = 0;
      }
    }

    // Update defensive combo timer
    if (this.state.defensiveComboActive) {
      this.state.defensiveComboTimer -= deltaTime;
      if (this.state.defensiveComboTimer <= 0) {
        this.state.defensiveComboActive = false;
        this.state.defensiveCombo = 0;
      }
    }

    // Update alley-oop window
    if (this.state.isInAlleyOopWindow) {
      this.state.alleyOopWindow -= deltaTime;
      if (this.state.alleyOopWindow <= 0) {
        this.state.isInAlleyOopWindow = false;
      }
    }
  }

  getState(): ComboState {
    return { ...this.state };
  }

  resetCombos(): void {
    this.state.passCombo = 0;
    this.state.passComboActive = false;
    this.state.passComboTimer = 0;
    this.state.stealCombo = 0;
    this.state.stealComboActive = false;
    this.state.stealComboTimer = 0;
    this.state.defensiveCombo = 0;
    this.state.defensiveComboActive = false;
    this.state.defensiveComboTimer = 0;
  }

  reset(): void {
    this.state = {
      passCombo: 0,
      passComboActive: false,
      passComboTimer: 0,
      stealCombo: 0,
      stealComboActive: false,
      stealComboTimer: 0,
      defensiveCombo: 0,
      defensiveComboActive: false,
      defensiveComboTimer: 0,
      powerShotCharge: 0,
      isPowerShotReady: false,
      lastPassTime: 0,
      lastStealTime: 0,
      lastBlockTime: 0,
      alleyOopWindow: 0,
      isInAlleyOopWindow: false,
    };
  }
}

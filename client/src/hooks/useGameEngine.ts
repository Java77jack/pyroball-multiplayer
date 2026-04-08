import { useRef, useCallback, useEffect, useState } from 'react';
import {
  COURT, GOAL, PLAYER, BALL, MATCH, ZONES, AI, RUNOFF, DASHER_BOARDS,
  PRESSURE, PASS_CHAIN, SELFISH, STEAL_WINDOWS, SHOT_QUALITY,
  MOMENTUM, INTENSITY, DEF_PERSONALITY, CAMERA, PLAYER_NAMES,
  BACKBOARD, JUMP, SPIN, SHOT_METER, ON_FIRE, ANNOUNCER,
  type Vec2, type PlayerState, type BallState, type GameState, type GameEvent, type ShotMeterState,
  type AnnouncerCallout,
} from '@/lib/gameConstants';
import type { Difficulty } from '@/contexts/GameContext';

// Difficulty multipliers: [aiSpeed, aiShotAccuracy, shotMeterFillSpeed, greenZoneWidth]
const DIFFICULTY_MODS: Record<Difficulty, { aiSpeed: number; aiShotAcc: number; fillSpeed: number; greenWidth: number }> = {
  rookie:  { aiSpeed: 0.75, aiShotAcc: 0.65, fillSpeed: 0.85, greenWidth: 1.35 },
  pro:     { aiSpeed: 1.0,  aiShotAcc: 1.0,  fillSpeed: 1.0,  greenWidth: 1.0  },
  allstar: { aiSpeed: 1.2,  aiShotAcc: 1.3,  fillSpeed: 1.25, greenWidth: 0.7  },
};
import {
  playGoalHorn, playBallKick, playPass, playStealBuzzer, playCrowdRoar,
  playShotClockWarning, playShotClockViolation, playWhistle, playSwitchPlayer,
  playCountdownBeep, playHalftimeHorn, playFlowState, playTurnover,
  playPerfectRelease, playPowerShot, playOnFire, playFireExpired,
  playSuddenDeath, playAnnouncerStinger, playBigImpact,
} from '@/lib/soundEngine';

// ========== ANNOUNCER CALLOUT HELPERS ==========
const CALLOUT_POOL = {
  goal3pt: [
    'FROM DOWNTOWN!', 'NOTHING BUT NET!', 'DEEP RANGE!', 'CORE ZONE DAGGER!',
    'LIGHTS OUT!', 'SPLASH!', 'BANG! BANG!', 'ARE YOU KIDDING ME?!',
  ],
  goal1pt: [
    'SCORES!', 'PUT IT IN!', 'GOOD FINISH!', 'MONEY!', 'THAT\'S CASH!',
  ],
  steal: [
    'PICKED CLEAN!', 'TURNOVER!', 'STRIPPED!', 'WHAT A STEAL!',
  ],
  combo: [
    'SHOWTIME!', 'UNBELIEVABLE!', 'DID YOU SEE THAT?!', 'HIGHLIGHT REEL!',
  ],
  onFire: [
    'THEY\'RE ON FIRE!', 'UNSTOPPABLE!', 'CAN\'T BE STOPPED!', 'FEELING THE HEAT!',
  ],
  overtime: [
    'SUDDEN DEATH!', 'NEXT GOAL WINS!', 'WIN OR GO HOME!', 'DO OR DIE!',
  ],
  bigLead: [
    'RUNNING AWAY WITH IT!', 'DOMINANT!', 'TOTAL CONTROL!',
  ],
  comeback: [
    'CLOSING THE GAP!', 'COMEBACK TRAIL!', 'NOT OVER YET!',
  ],
  clutch: [
    'CLUTCH!', 'ICE IN THEIR VEINS!', 'NERVES OF STEEL!',
  ],
  denied: [
    'DENIED!', 'GET THAT OUT OF HERE!', 'NOT IN MY HOUSE!',
  ],
};

function randomCallout(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

function makeCallout(
  text: string,
  size: 'small' | 'medium' | 'large' = 'medium',
  color = '#FFB800',
  glow = 'rgba(255,184,0,0.6)',
  subtext?: string,
): AnnouncerCallout {
  return { text, subtext, color, glow, timer: ANNOUNCER.DISPLAY_DURATION, size };
}

function pushCallout(s: GameState, callout: AnnouncerCallout) {
  s.announcer.push(callout);
  if (s.announcer.length > ANNOUNCER.MAX_QUEUE) s.announcer.shift();
}

// ========== UTILITY FUNCTIONS ==========
function dist(a: Vec2, b: Vec2) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}
function clamp(val: number, min: number, max: number) { return Math.max(min, Math.min(max, val)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function dot(a: Vec2, b: Vec2) { return a.x * b.x + a.y * b.y; }

// ========== FACTORY FUNCTIONS ==========
function makePlayer(id: number, teamId: string, pos: Vec2, number: number, hasBall: boolean, isControlled: boolean): PlayerState {
  const personalities = [DEF_PERSONALITY.TIGHT, DEF_PERSONALITY.AGGRESSIVE, DEF_PERSONALITY.ZONE];
  const names = PLAYER_NAMES[teamId] || ['P1', 'P2', 'P3'];
  const nameIdx = id < 3 ? id : id - 3;
  return {
    id, teamId, name: names[nameIdx] || `P${nameIdx + 1}`,
    pos: { ...pos }, vel: { x: 0, y: 0 }, number,
    hasBall, isControlled, stealCooldown: 0, holdTimer: 0,
    passTarget: null, shootCooldown: 0,
    defPersonality: personalities[id % 3],
    postPassVulnerable: 0,
    selfishCount: 0,
    receiveTime: 0,
    // Jump & Spin
    jumpZ: 0, jumpVZ: 0, isJumping: false, jumpCooldown: 0,
    spinAngle: 0, isSpinning: false, spinTimer: 0, spinCooldown: 0,
  };
}

function createPlayers(homeTeam: string, awayTeam: string): PlayerState[] {
  const cx = COURT.WIDTH / 2;
  const cy = COURT.HEIGHT / 2;
  return [
    makePlayer(0, homeTeam, { x: cx - 120, y: cy }, 7, true, true),
    makePlayer(1, homeTeam, { x: cx - 240, y: cy - 100 }, 11, false, false),
    makePlayer(2, homeTeam, { x: cx - 240, y: cy + 100 }, 23, false, false),
    makePlayer(3, awayTeam, { x: cx + 120, y: cy }, 1, false, false),
    makePlayer(4, awayTeam, { x: cx + 240, y: cy - 100 }, 5, false, false),
    makePlayer(5, awayTeam, { x: cx + 240, y: cy + 100 }, 88, false, false),
  ];
}

function createBall(carrier: PlayerState): BallState {
  return {
    pos: { ...carrier.pos }, vel: { x: 0, y: 0 },
    z: 0, vz: 0,
    carrier: carrier.id, lastPasser: null, passIntended: null,
    isRebound: false, lastShooter: null,
  };
}

// ========== GOAL & ZONE HELPERS ==========
function getGoalCenter(side: 'left' | 'right'): Vec2 {
  // Goal centers: left goal at x=0, right goal at x=900, both at court center y
  return { x: side === 'left' ? GOAL.WIDTH / 2 : COURT.WIDTH - GOAL.WIDTH / 2, y: COURT.HEIGHT / 2 };
}

function isInGoal(ballPos: Vec2, side: 'left' | 'right'): boolean {
  const goalHalfW = GOAL.WIDTH / 2;
  const goalTop = COURT.HEIGHT / 2 - goalHalfW;
  const goalBot = COURT.HEIGHT / 2 + goalHalfW;
  if (side === 'left') {
    return ballPos.x <= BALL.RADIUS + 3 && ballPos.y >= goalTop && ballPos.y <= goalBot;
  }
  return ballPos.x >= COURT.WIDTH - BALL.RADIUS - 3 && ballPos.y >= goalTop && ballPos.y <= goalBot;
}

function getZonePoints(shooterPos: Vec2, targetGoalSide: 'left' | 'right'): number {
  const goalCenter = getGoalCenter(targetGoalSide);
  const d = dist(shooterPos, goalCenter);
  // APA Blueprint: Core zone (center) = 3pts, Mid (rest) = 1pt
  // Also check core shaft corridors (narrow path from core to goals)
  const courtCenter = { x: COURT.WIDTH / 2, y: COURT.HEIGHT / 2 };
  const distFromCenter = dist(shooterPos, courtCenter);
  // Core zone: within core radius of center court
  if (distFromCenter <= ZONES.CORE.radius) return ZONES.CORE.points;
  // Core shaft: narrow corridor from core to goals (within shaft width of center Y)
  const shaftHalfW = ZONES.CORE_SHAFT.width / 2;
  if (Math.abs(shooterPos.y - COURT.HEIGHT / 2) <= shaftHalfW) return ZONES.CORE_SHAFT.points;
  // Everything else is Mid zone = 1pt
  return ZONES.MID.points;
}

// ========== PASSING INTELLIGENCE ==========
function findBestPassTarget(passer: PlayerState, teammates: PlayerState[], enemies: PlayerState[], targetGoal: Vec2): PlayerState | null {
  if (teammates.length === 0) return null;
  let bestScore = -Infinity;
  let bestTarget: PlayerState | null = null;

  for (const t of teammates) {
    if (t.id === passer.id) continue;
    const d = dist(passer.pos, t.pos);
    if (d < 20) continue;

    const distScore = d < 60 ? 0.5 : d < 180 ? 1.0 : 0.3;

    let minEnemyDist = Infinity;
    for (const e of enemies) {
      const ed = dist(t.pos, e.pos);
      if (ed < minEnemyDist) minEnemyDist = ed;
    }
    const openScore = minEnemyDist > 60 ? 1.0 : minEnemyDist > 35 ? 0.6 : 0.2;

    const tDistToGoal = dist(t.pos, targetGoal);
    const pDistToGoal = dist(passer.pos, targetGoal);
    const progressScore = tDistToGoal < pDistToGoal ? 1.2 : 0.7;

    const passDir = normalize({ x: t.pos.x - passer.pos.x, y: t.pos.y - passer.pos.y });
    let laneSafe = 1.0;
    for (const e of enemies) {
      const toEnemy = { x: e.pos.x - passer.pos.x, y: e.pos.y - passer.pos.y };
      const proj = dot(toEnemy, passDir);
      if (proj > 0 && proj < d) {
        const perpDist = Math.abs(toEnemy.x * (-passDir.y) + toEnemy.y * passDir.x);
        if (perpDist < 25) { laneSafe = 0.15; break; }
        else if (perpDist < 45) laneSafe = Math.min(laneSafe, 0.5);
      }
    }

    const totalScore = distScore * openScore * progressScore * laneSafe;
    if (totalScore > bestScore) { bestScore = totalScore; bestTarget = t; }
  }
  return bestTarget;
}

// Execute a pass with lead targeting
function executePass(s: GameState, passer: PlayerState, target: PlayerState) {
  const leadX = target.pos.x + target.vel.x * PLAYER.PASS_LEAD * 10;
  const leadY = target.pos.y + target.vel.y * PLAYER.PASS_LEAD * 10;
  const dir = normalize({ x: leadX - passer.pos.x, y: leadY - passer.pos.y });

  const d = dist(passer.pos, target.pos);
  const accuracyPenalty = d > 200 ? 0.08 : d > 120 ? 0.04 : 0.01;
  const spread = (Math.random() - 0.5) * accuracyPenalty * 2;

  // Flow state boosts pass speed
  let passSpeed = PLAYER.PASS_POWER;
  if (s.flowState > 0 && s.flowTeam === (passer.id < 3 ? 'home' : 'away')) {
    passSpeed *= PASS_CHAIN.FLOW_PASS_SPEED_MULT;
  }

  s.ball.vel = { x: dir.x * passSpeed + spread, y: dir.y * passSpeed + spread };
  s.ball.carrier = null;
  s.ball.pos = { x: passer.pos.x + dir.x * 8, y: passer.pos.y + dir.y * 8 };
  s.ball.lastPasser = passer.id;
  s.ball.passIntended = target.id;
  passer.hasBall = false;
  passer.holdTimer = 0;

  // Track pass chain
  const passerTeam: 'home' | 'away' = passer.id < 3 ? 'home' : 'away';
  if (s.passChainTeam === passerTeam) {
    s.passChain++;
  } else {
    s.passChain = 1;
    s.passChainTeam = passerTeam;
  }

  // Trigger flow state at threshold
  if (s.passChain >= PASS_CHAIN.FLOW_STATE_AT && s.flowTeam !== passerTeam) {
    s.flowState = PASS_CHAIN.FLOW_DURATION;
    s.flowTeam = passerTeam;
    s.currentEvent = { type: 'FLOW_STATE', team: passer.teamId };
    s.eventTimer = 1.0;
    playFlowState();
  }
}

// Execute a shot toward goal with shot quality system
function executeShot(s: GameState, shooter: PlayerState, targetGoal: Vec2) {
  const goalHalfW = GOAL.WIDTH / 2;
  // Aim at goal center with slight random variation for realism
  const aimY = targetGoal.y + (Math.random() - 0.5) * goalHalfW * 0.3;
  const aimPos = { x: targetGoal.x, y: aimY };
  const dir = normalize({ x: aimPos.x - shooter.pos.x, y: aimPos.y - shooter.pos.y });

  const d = dist(shooter.pos, targetGoal);
  // Scaled thresholds for 900x500 court — tight spread for playable shots
  let accuracyMod = d > 500 ? 0.05 : d > 350 ? 0.025 : 0.01;

  // Shot quality modifiers
  const timeSinceReceive = shooter.holdTimer;
  if (timeSinceReceive < SHOT_QUALITY.QUICK_SHOT_THRESHOLD) {
    accuracyMod *= (1 / SHOT_QUALITY.QUICK_SHOT_ACCURACY); // Better accuracy
  }
  if (s.shotClock <= SHOT_QUALITY.PANIC_SHOT_CLOCK) {
    accuracyMod *= (1 / SHOT_QUALITY.PANIC_SHOT_ACCURACY); // Worse accuracy
  }
  // Chain shot bonus
  const shooterTeam: 'home' | 'away' = shooter.id < 3 ? 'home' : 'away';
  if (s.passChainTeam === shooterTeam && s.passChain >= 2) {
    accuracyMod *= (1 - SHOT_QUALITY.CHAIN_SHOT_BONUS * Math.min(s.passChain, 4));
  }
  // Flow state bonus
  if (s.flowState > 0 && s.flowTeam === shooterTeam) {
    accuracyMod *= 0.7;
  }

  const spread = (Math.random() - 0.5) * accuracyMod;

  // Aerial shot boost if jumping
  const shootPower = shooter.isJumping
    ? PLAYER.SHOOT_POWER * JUMP.AERIAL_SHOT_BOOST
    : PLAYER.SHOOT_POWER;

  // Apply spread as angular deviation for more natural shot direction
  const shotAngle = Math.atan2(dir.y, dir.x) + spread;
  s.ball.vel = {
    x: Math.cos(shotAngle) * shootPower,
    y: Math.sin(shotAngle) * shootPower,
  };
  s.ball.carrier = null;
  s.ball.pos = { x: shooter.pos.x + dir.x * 8, y: shooter.pos.y + dir.y * 8 };
  s.ball.lastPasser = null;
  s.ball.passIntended = null;
  s.ball.lastShooter = shooter.id;
  s.ball.isRebound = false;

  // Give ball upward arc for shots (higher arc from further away)
  const distToGoal = dist(shooter.pos, targetGoal);
  const arcHeight = Math.min(7.0, 2.5 + distToGoal * 0.008);
  s.ball.vz = arcHeight + (shooter.isJumping ? 2.5 : 0); // Extra height if jumping
  s.ball.z = shooter.isJumping ? shooter.jumpZ : 0;

  shooter.hasBall = false;
  shooter.holdTimer = 0;
  shooter.shootCooldown = 0.3;

  // Reset pass chain on shot
  s.passChain = 0;
}

// Execute a shot with power/accuracy multipliers from the shot meter
function executeMeterShot(s: GameState, shooter: PlayerState, targetGoal: Vec2, powerMult: number, accuracyMult: number) {
  const goalHalfW = GOAL.WIDTH / 2;
  // Aim at goal center with accuracy multiplier affecting spread
  const aimY = targetGoal.y + (Math.random() - 0.5) * goalHalfW * 0.4 * (1 - accuracyMult * 0.5);
  const aimPos = { x: targetGoal.x, y: aimY };
  const dir = normalize({ x: aimPos.x - shooter.pos.x, y: aimPos.y - shooter.pos.y });

  const d = dist(shooter.pos, targetGoal);
  // Scaled thresholds for 900x500 court
  let accuracyMod = d > 400 ? 0.12 : d > 250 ? 0.06 : 0.02;

  // Apply meter accuracy multiplier (higher = tighter spread)
  accuracyMod /= accuracyMult;

  // Shot quality modifiers still apply on top
  const timeSinceReceive = shooter.holdTimer;
  if (timeSinceReceive < SHOT_QUALITY.QUICK_SHOT_THRESHOLD) {
    accuracyMod *= (1 / SHOT_QUALITY.QUICK_SHOT_ACCURACY);
  }
  if (s.shotClock <= SHOT_QUALITY.PANIC_SHOT_CLOCK) {
    accuracyMod *= (1 / SHOT_QUALITY.PANIC_SHOT_ACCURACY);
  }
  const shooterTeam: 'home' | 'away' = shooter.id < 3 ? 'home' : 'away';
  if (s.passChainTeam === shooterTeam && s.passChain >= 2) {
    accuracyMod *= (1 - SHOT_QUALITY.CHAIN_SHOT_BONUS * Math.min(s.passChain, 4));
  }
  if (s.flowState > 0 && s.flowTeam === shooterTeam) {
    accuracyMod *= 0.7;
  }

  const spread = (Math.random() - 0.5) * accuracyMod;

  // Apply meter power multiplier + aerial boost
  let shootPower = PLAYER.SHOOT_POWER * powerMult;
  if (shooter.isJumping) shootPower *= JUMP.AERIAL_SHOT_BOOST;

  // Apply spread as angular deviation for more natural shot direction
  const meterShotAngle = Math.atan2(dir.y, dir.x) + spread;
  s.ball.vel = {
    x: Math.cos(meterShotAngle) * shootPower,
    y: Math.sin(meterShotAngle) * shootPower,
  };
  s.ball.carrier = null;
  s.ball.pos = { x: shooter.pos.x + dir.x * 8, y: shooter.pos.y + dir.y * 8 };
  s.ball.lastPasser = null;
  s.ball.passIntended = null;
  s.ball.lastShooter = shooter.id;
  s.ball.isRebound = false;

  const distToGoal = dist(shooter.pos, targetGoal);
  const arcHeight = Math.min(7.0, 2.5 + distToGoal * 0.008);
  s.ball.vz = arcHeight + (shooter.isJumping ? 2.5 : 0);
  s.ball.z = shooter.isJumping ? shooter.jumpZ : 0;

  shooter.hasBall = false;
  shooter.holdTimer = 0;
  shooter.shootCooldown = 0.3;
  s.passChain = 0;
}

// Execute a FIRE power shot — guaranteed perfect accuracy, high power, dramatic arc
function executePowerShot(s: GameState, shooter: PlayerState, targetGoal: Vec2) {
  const dir = normalize({ x: targetGoal.x - shooter.pos.x, y: targetGoal.y - shooter.pos.y });

  // Power shot: no spread, extra power, high arc
  const shootPower = PLAYER.SHOOT_POWER * 1.6;
  s.ball.vel = {
    x: dir.x * shootPower,
    y: dir.y * shootPower,
  };
  s.ball.carrier = null;
  s.ball.pos = { x: shooter.pos.x + dir.x * 8, y: shooter.pos.y + dir.y * 8 };
  s.ball.lastPasser = null;
  s.ball.passIntended = null;
  s.ball.lastShooter = shooter.id;
  s.ball.isRebound = false;

  // High arc for dramatic effect
  const distToGoal = dist(shooter.pos, targetGoal);
  s.ball.vz = Math.min(9.0, 4.0 + distToGoal * 0.015);
  s.ball.z = shooter.isJumping ? shooter.jumpZ : 0;

  shooter.hasBall = false;
  shooter.holdTimer = 0;
  shooter.shootCooldown = 0.5;
  s.passChain = 0;

  // Drain the fire meter
  s.specialMeter = 0;
  // Camera + crowd effects
  s.cameraShake = 1.2;
  s.crowdEnergy = 1.0;
}

// Track where the last shot was taken from
let lastShooterPos: Vec2 = { x: 0, y: 0 };
let lastShooterGoalSide: 'left' | 'right' = 'right';

// ========== MAIN GAME ENGINE ==========
export function useGameEngine(homeTeam: string, awayTeam: string, difficulty: Difficulty = 'pro') {
  const diffMod = DIFFICULTY_MODS[difficulty];
  const [gameState, setGameState] = useState<GameState | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const timerAccRef = useRef<number>(0);
  const joystickRef = useRef<Vec2>({ x: 0, y: 0 });
  const actionQueueRef = useRef<string[]>([]);
  const runningRef = useRef(false);
  const lastRenderRef = useRef<number>(0);
  const RENDER_INTERVAL = 33;

  const initGame = useCallback(() => {
    const players = createPlayers(homeTeam, awayTeam);
    const state: GameState = {
      players,
      ball: createBall(players[0]),
      score: { home: 0, away: 0 },
      homeTeam, awayTeam,
      timer: MATCH.DURATION,
      shotClock: MATCH.SHOT_CLOCK,
      half: 1,
      isPlaying: false,
      isPaused: false,
      possession: 'home',
      specialMeter: 0,
      goalEvents: [],
      goalFlash: 0,
      goalFlashTeam: null,
      countdown: 3,
      currentEvent: null,
      eventTimer: 0,
      isOvertime: false,
      isPenalty: false,
      penaltyShooter: null,
      cameraShake: 0,
      // Fun-first state
      passChain: 0,
      passChainTeam: null,
      flowState: 0,
      flowTeam: null,
      momentumBoost: 0,
      momentumTeam: null,
      slowMo: 0,
      cameraZoom: CAMERA.DEFAULT_ZOOM,
      vignette: 0,
      crowdEnergy: 0.3,
      lastGoalReplay: null,
      shotMeter: {
        active: false,
        charge: 0,
        playerId: null,
        fillSpeed: SHOT_METER.FILL_SPEED,
        greenStart: SHOT_METER.GREEN_START,
        greenEnd: SHOT_METER.GREEN_END,
        underPressure: false,
        isOpen: false,
        result: 'none',
        resultTimer: 0,
      },
      // Combo system
      lastCombo: null,
      lastComboTimer: 0,
      comboCount: 0,
      // ON FIRE streak system
      onFireTeam: null,
      onFireTimer: 0,
      homeStreak: 0,
      awayStreak: 0,
      // Announcer callouts
      announcer: [],
      // Juice effects
      hitFreeze: 0,
      speedLines: 0,
      screenFlash: 0,
      screenFlashColor: '#FFFFFF',
    };
    stateRef.current = state;
    setGameState({ ...state });
  }, [homeTeam, awayTeam]);

  const setJoystick = useCallback((v: Vec2) => { joystickRef.current = v; }, []);
  const triggerAction = useCallback((action: string) => { actionQueueRef.current.push(action); }, []);

  const resetPositions = useCallback((s: GameState, receivingTeam: 'home' | 'away') => {
    const cx = COURT.WIDTH / 2;
    const cy = COURT.HEIGHT / 2;
    const homePos = [{ x: cx - 120, y: cy }, { x: cx - 240, y: cy - 100 }, { x: cx - 240, y: cy + 100 }];
    const awayPos = [{ x: cx + 120, y: cy }, { x: cx + 240, y: cy - 100 }, { x: cx + 240, y: cy + 100 }];

    s.players.forEach(p => {
      const isHome = p.id < 3;
      const idx = isHome ? p.id : p.id - 3;
      p.pos = { ...(isHome ? homePos[idx] : awayPos[idx]) };
      p.vel = { x: 0, y: 0 };
      p.hasBall = false;
      p.stealCooldown = 0;
      p.holdTimer = 0;
      p.passTarget = null;
      p.shootCooldown = 0;
      p.postPassVulnerable = 0;
      p.receiveTime = 0;
      // Reset jump & spin
      p.jumpZ = 0; p.jumpVZ = 0; p.isJumping = false; p.jumpCooldown = 0;
      p.spinAngle = 0; p.isSpinning = false; p.spinTimer = 0; p.spinCooldown = 0;
    });

    const receiverIdx = receivingTeam === 'home' ? 0 : 3;
    s.players[receiverIdx].hasBall = true;
    s.players.forEach(p => { if (p.id < 3) p.isControlled = p.id === 0; });
    s.ball = createBall(s.players[receiverIdx]);
    s.possession = receivingTeam;
    s.shotClock = MATCH.SHOT_CLOCK;
    s.isPenalty = false;
    s.penaltyShooter = null;
    s.passChain = 0;
  }, []);

  const fireEvent = useCallback((s: GameState, evt: GameEvent) => {
    s.currentEvent = evt;
    s.eventTimer = 1.2;
  }, []);

  // ========== GAME LOOP ==========
  const gameLoop = useCallback((timestamp: number) => {
    if (!runningRef.current) return;
    const s = stateRef.current;
    if (!s) { animFrameRef.current = requestAnimationFrame(gameLoop); return; }

    if (!s.isPlaying && s.countdown <= 0) {
      setGameState({ ...s });
      runningRef.current = false;
      return;
    }
    if (!s.isPlaying || s.isPaused) {
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const rawDt = (timestamp - lastTimeRef.current) / 1000;
    let dt = Math.min(rawDt, 0.033);
    lastTimeRef.current = timestamp;

    // Slow-mo effect
    if (s.slowMo > 0) {
      dt *= CAMERA.SLOW_MO_FACTOR;
      s.slowMo -= rawDt; // Decrement with real time
      if (s.slowMo <= 0) {
        s.slowMo = 0;
        s.cameraZoom = lerp(s.cameraZoom, CAMERA.DEFAULT_ZOOM, 0.1);
      }
    }

    // ---- COUNTDOWN ----
    if (s.countdown > 0) {
      timerAccRef.current += rawDt; // Use real dt for countdown
      if (timerAccRef.current >= 1) {
        s.countdown--;
        timerAccRef.current = 0;
        if (s.countdown > 0) playCountdownBeep();
        else playWhistle(); // Game start whistle
      }
      stateRef.current = s;
      if (timestamp - lastRenderRef.current >= RENDER_INTERVAL) {
        lastRenderRef.current = timestamp;
        setGameState({ ...s });
      }
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // ---- HIT FREEZE (juice) — skip game logic for freeze frames ----
    if (s.hitFreeze > 0) {
      s.hitFreeze -= 1;
      stateRef.current = s;
      if (timestamp - lastRenderRef.current >= RENDER_INTERVAL) {
        lastRenderRef.current = timestamp;
        setGameState({ ...s });
      }
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // ---- DECAY TIMERS ----
    if (s.eventTimer > 0) {
      s.eventTimer -= dt;
      if (s.eventTimer <= 0) { s.currentEvent = null; s.eventTimer = 0; }
    }
    if (s.goalFlash > 0) s.goalFlash = Math.max(0, s.goalFlash - dt * 3);
    if (s.cameraShake > 0) s.cameraShake = Math.max(0, s.cameraShake - dt * 8);
    if (s.flowState > 0) s.flowState = Math.max(0, s.flowState - dt);
    if (s.momentumBoost > 0) s.momentumBoost = Math.max(0, s.momentumBoost - dt);
    // Combo label display timer
    if (s.lastComboTimer > 0) {
      s.lastComboTimer = Math.max(0, s.lastComboTimer - dt);
      if (s.lastComboTimer <= 0) s.lastCombo = null;
    }

    // ---- ON FIRE TIMER ----
    if (s.onFireTimer > 0) {
      s.onFireTimer -= dt;
      if (s.onFireTimer <= 0) {
        const expiredTeam = s.onFireTeam;
        s.onFireTeam = null;
        s.onFireTimer = 0;
        if (expiredTeam) {
          fireEvent(s, { type: 'FIRE_EXPIRED', team: expiredTeam === 'home' ? s.homeTeam : s.awayTeam });
          playFireExpired();
          pushCallout(s, makeCallout('FIRE EXPIRED', 'medium', '#888888', 'rgba(128,128,128,0.5)'));
        }
      }
    }

    // ---- ANNOUNCER CALLOUT TIMERS ----
    s.announcer = s.announcer.filter(c => {
      c.timer -= dt;
      return c.timer > 0;
    });

    // ---- JUICE DECAY ----
    if (s.speedLines > 0) s.speedLines = Math.max(0, s.speedLines - dt * 3);
    if (s.screenFlash > 0) s.screenFlash = Math.max(0, s.screenFlash - dt * 5);

    // ========== SHOT METER UPDATE ==========
    if (s.shotMeter.active) {
      s.shotMeter.charge = Math.min(1.0, s.shotMeter.charge + s.shotMeter.fillSpeed * dt);
      // Auto-release at max charge (overcharged)
      if (s.shotMeter.charge >= 1.0) {
        const shooter = s.players.find(p => p.id === s.shotMeter.playerId);
        if (shooter && shooter.hasBall) {
          s.shotMeter.result = 'red';
          s.shotMeter.resultTimer = 0.8;
          s.shotMeter.active = false;
          const targetGoal = shooter.id < 3 ? getGoalCenter('right') : getGoalCenter('left');
          lastShooterPos = { x: shooter.pos.x, y: shooter.pos.y };
          lastShooterGoalSide = shooter.id < 3 ? 'right' : 'left';
          executeMeterShot(s, shooter, targetGoal, SHOT_METER.RED_POWER, SHOT_METER.RED_ACCURACY);
          playBallKick();
        } else {
          // Lost ball while charging — cancel meter
          s.shotMeter.active = false;
          s.shotMeter.charge = 0;
        }
      }
      // Cancel meter if player lost the ball
      const meterPlayer = s.players.find(p => p.id === s.shotMeter.playerId);
      if (meterPlayer && !meterPlayer.hasBall) {
        s.shotMeter.active = false;
        s.shotMeter.charge = 0;
      }
    }
    if (s.shotMeter.resultTimer > 0) {
      s.shotMeter.resultTimer = Math.max(0, s.shotMeter.resultTimer - dt);
      if (s.shotMeter.resultTimer <= 0) s.shotMeter.result = 'none';
    }
    if (s.vignette > 0) s.vignette = Math.max(0, s.vignette - dt * 2);

    // Camera zoom lerp back to default
    if (s.slowMo <= 0) {
      s.cameraZoom = lerp(s.cameraZoom, CAMERA.DEFAULT_ZOOM, dt * 3);
    }

    // Crowd energy decay
    s.crowdEnergy = lerp(s.crowdEnergy, 0.3, dt * 0.5);

    // Decay per-player cooldowns + jump/spin physics
    s.players.forEach(p => {
      if (p.stealCooldown > 0) p.stealCooldown -= dt * 1000;
      if (p.shootCooldown > 0) p.shootCooldown -= dt;
      if (p.postPassVulnerable > 0) p.postPassVulnerable -= dt * 1000;
      if (p.jumpCooldown > 0) p.jumpCooldown -= dt * 1000;
      if (p.spinCooldown > 0) p.spinCooldown -= dt * 1000;

      // Jump physics: gravity pulls player back down
      if (p.isJumping) {
        p.jumpZ += p.jumpVZ;
        p.jumpVZ -= JUMP.GRAVITY;
        if (p.jumpZ <= 0) {
          p.jumpZ = 0;
          p.jumpVZ = 0;
          p.isJumping = false;
        }
      }

      // Spin animation: rotate through 360 degrees
      if (p.isSpinning) {
        p.spinTimer -= dt * 1000;
        p.spinAngle = 360 * (1 - p.spinTimer / SPIN.DURATION);
        if (p.spinTimer <= 0) {
          p.isSpinning = false;
          p.spinAngle = 0;
          p.spinTimer = 0;
        }
      }
    });

    // ---- GAME TIMER ----
    timerAccRef.current += dt;
    if (timerAccRef.current >= 1) {
      s.timer = Math.max(0, s.timer - 1);
      s.shotClock = Math.max(0, s.shotClock - 1);
      timerAccRef.current -= 1;

      if (s.timer === MATCH.HALF_DURATION && s.half === 1 && !s.isOvertime) {
        s.half = 2;
        s.countdown = 3;
        playHalftimeHorn();
        resetPositions(s, 'away');
        stateRef.current = s;
        setGameState({ ...s });
        animFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      if (s.timer <= 0) {
        if (s.score.home === s.score.away && !s.isOvertime) {
          s.isOvertime = true;
          s.timer = MATCH.OVERTIME_DURATION;
          s.countdown = 3;
          playSuddenDeath();
          fireEvent(s, { type: 'SUDDEN_DEATH' });
          pushCallout(s, makeCallout(randomCallout(CALLOUT_POOL.overtime), 'large', '#FF4500', 'rgba(255,69,0,0.8)', 'NEXT GOAL WINS'));
          s.screenFlash = 1.0;
          s.screenFlashColor = '#FF0000';
          s.hitFreeze = 8;
          resetPositions(s, 'home');
          stateRef.current = s;
          setGameState({ ...s });
          animFrameRef.current = requestAnimationFrame(gameLoop);
          return;
        }
        playHalftimeHorn();
        s.isPlaying = false;
        stateRef.current = s;
        setGameState({ ...s });
        runningRef.current = false;
        return;
      }

      if (s.shotClock <= 0 && !s.isPenalty) {
        const newPoss: 'home' | 'away' = s.possession === 'home' ? 'away' : 'home';
        playShotClockViolation();
        fireEvent(s, { type: 'TURNOVER', reason: 'SHOT_CLOCK', team: s.possession === 'home' ? s.homeTeam : s.awayTeam });
        resetPositions(s, newPoss);
      }
      // Shot clock warning beep at 3 seconds
      if (s.shotClock === 3 && !s.isPenalty) {
        playShotClockWarning();
      }
    }

    // ---- POSSESSION TIMER (3-second rule) ----
    s.players.forEach(p => {
      if (p.hasBall) {
        p.holdTimer += dt;

        // Possession pressure vignette
        if (p.holdTimer >= PRESSURE.PULSE_TIME) {
          s.vignette = Math.min(1, (p.holdTimer - PRESSURE.PULSE_TIME) / (PRESSURE.TURNOVER_TIME - PRESSURE.PULSE_TIME));
        }

        // Auto turnover at 3s
        if (p.holdTimer >= PRESSURE.TURNOVER_TIME && !s.isPenalty) {
          const isHome = p.id < 3;
          const newPoss: 'home' | 'away' = isHome ? 'away' : 'home';
          p.selfishCount++;
          fireEvent(s, { type: 'TURNOVER', reason: 'POSSESSION', team: p.teamId });
          playTurnover();
          p.hasBall = false;
          p.holdTimer = 0;
          resetPositions(s, newPoss);
          s.vignette = 0;
        }
      } else {
        p.holdTimer = 0;
      }
    });

    // ========== SPEED MODIFIERS ==========
    const getSpeedMod = (p: PlayerState): number => {
      let mod = 1.0;
      const isHome = p.id < 3;
      const team: 'home' | 'away' = isHome ? 'home' : 'away';

      // Difficulty modifier for AI opponents (away team)
      if (!isHome) {
        mod *= diffMod.aiSpeed;
      }

      // Momentum boost for scoring team
      if (s.momentumBoost > 0 && s.momentumTeam === team) {
        mod *= MOMENTUM.SCORING_TEAM_SPEED_BOOST;
      }
      // Momentum sluggishness for opponent
      if (s.momentumBoost > 0 && s.momentumTeam !== team && s.momentumBoost > MOMENTUM.POST_GOAL_BOOST_DURATION - MOMENTUM.OPPONENT_REACTION_DELAY) {
        mod *= 0.85;
      }

      // Pass chain speed boost
      if (s.passChain >= PASS_CHAIN.SPEED_BOOST_AT && s.passChainTeam === team) {
        mod *= PASS_CHAIN.SPEED_BOOST_MULT;
      }

      // Selfish play penalty
      if (p.hasBall && p.holdTimer >= SELFISH.HOLD_PENALTY_THRESHOLD) {
        mod *= SELFISH.SPEED_REDUCTION;
      }
      if (!p.hasBall && p.selfishCount >= SELFISH.REPEAT_THRESHOLD) {
        mod *= SELFISH.TEAMMATE_SLOWDOWN;
      }

      // Spin speed boost
      if (p.isSpinning) {
        mod *= SPIN.SPEED_BOOST;
      }

      // Urgency speed boost near 3s
      if (p.hasBall && p.holdTimer >= PRESSURE.URGENCY_TIME) {
        mod *= PRESSURE.URGENCY_SPEED_BOOST;
      }

      // End-of-half intensity
      if (s.timer <= INTENSITY.FINAL_SECONDS) {
        mod *= INTENSITY.SPEED_BOOST;
      }

      // ON FIRE speed boost
      if (s.onFireTeam === team) {
        mod *= ON_FIRE.SPEED_BOOST;
      }

      return mod;
    };

    // ========== PLAYER CONTROLLED INPUT ==========
    const controlled = s.players.find(p => p.isControlled && p.id < 3);
    if (controlled) {
      const joy = joystickRef.current;
      const mag = Math.sqrt(joy.x * joy.x + joy.y * joy.y);
      if (mag > 0.1) {
        const speed = PLAYER.SPEED * getSpeedMod(controlled);
        controlled.vel = { x: joy.x * speed, y: joy.y * speed };
      } else {
        controlled.vel = { x: controlled.vel.x * 0.7, y: controlled.vel.y * 0.7 };
      }
    }

    // ========== PROCESS ACTION QUEUE ==========
    const homePlayers = s.players.filter(p => p.id < 3);
    const awayPlayers = s.players.filter(p => p.id >= 3);

    while (actionQueueRef.current.length > 0) {
      const action = actionQueueRef.current.shift()!;
      if (!controlled) break;

      if (action === 'shootStart' && controlled.hasBall && controlled.shootCooldown <= 0) {
        // ---- COMBO: JUMP + SPIN + SHOOT (ultimate combo) ----
        if (controlled.isJumping && controlled.isSpinning) {
          const targetGoal = getGoalCenter('right');
          lastShooterPos = { x: controlled.pos.x, y: controlled.pos.y };
          lastShooterGoalSide = 'right';
          // Ultimate combo: max power, zero spread, massive arc, slow-mo, fire meter boost
          const dir = normalize({ x: targetGoal.x - controlled.pos.x, y: targetGoal.y - controlled.pos.y });
          const shootPower = PLAYER.SHOOT_POWER * 2.0;
          s.ball.vel = { x: dir.x * shootPower, y: dir.y * shootPower };
          s.ball.carrier = null;
          s.ball.pos = { x: controlled.pos.x + dir.x * 8, y: controlled.pos.y + dir.y * 8 };
          s.ball.lastPasser = null;
          s.ball.passIntended = null;
          s.ball.lastShooter = controlled.id;
          s.ball.isRebound = false;
          s.ball.vz = 10.0;
          s.ball.z = controlled.jumpZ;
          controlled.hasBall = false;
          controlled.holdTimer = 0;
          controlled.shootCooldown = 0.5;
          s.passChain = 0;
          // Dramatic effects
          s.cameraShake = 1.8;
          s.crowdEnergy = 1.0;
          s.slowMo = CAMERA.SLOW_MO_DURATION;
          s.cameraZoom = CAMERA.GOAL_ZOOM;
          s.specialMeter = Math.min(1, s.specialMeter + 0.5);
          s.shotMeter.result = 'green';
          s.shotMeter.resultTimer = 1.2;
          s.shotMeter.playerId = controlled.id;
          // Combo label
          s.lastCombo = 'AERIAL TORNADO!';
          s.lastComboTimer = 2.0;
          s.comboCount++;
          fireEvent(s, { type: 'COMBO', name: 'AERIAL TORNADO', player: controlled.id });
          pushCallout(s, makeCallout(randomCallout(CALLOUT_POOL.combo), 'large', '#FF4500', 'rgba(255,69,0,0.8)', 'AERIAL TORNADO'));
          playPowerShot();
          playBigImpact();
          // Extra juice for ultimate combo
          s.hitFreeze = 4;
          s.speedLines = 1.0;
          s.screenFlash = 0.8;
          s.screenFlashColor = '#FF6600';
          break;
        }

        // ---- COMBO: JUMP + SHOOT (aerial shot) ----
        if (controlled.isJumping && !controlled.isSpinning) {
          const targetGoal = getGoalCenter('right');
          lastShooterPos = { x: controlled.pos.x, y: controlled.pos.y };
          lastShooterGoalSide = 'right';
          // Aerial shot: +30% power, high arc, better accuracy
          const dir = normalize({ x: targetGoal.x - controlled.pos.x, y: targetGoal.y - controlled.pos.y });
          const shootPower = PLAYER.SHOOT_POWER * JUMP.AERIAL_SHOT_BOOST * 1.15;
          const spread = (Math.random() - 0.5) * 0.015; // Very tight spread
          const comboAngle = Math.atan2(dir.y, dir.x) + spread;
          s.ball.vel = { x: Math.cos(comboAngle) * shootPower, y: Math.sin(comboAngle) * shootPower };
          s.ball.carrier = null;
          s.ball.pos = { x: controlled.pos.x + dir.x * 8, y: controlled.pos.y + dir.y * 8 };
          s.ball.lastPasser = null;
          s.ball.passIntended = null;
          s.ball.lastShooter = controlled.id;
          s.ball.isRebound = false;
          s.ball.vz = Math.min(8.0, 3.5 + dist(controlled.pos, targetGoal) * 0.012);
          s.ball.z = controlled.jumpZ;
          controlled.hasBall = false;
          controlled.holdTimer = 0;
          controlled.shootCooldown = 0.3;
          s.passChain = 0;
          s.cameraShake = Math.max(s.cameraShake, 0.6);
          s.crowdEnergy = Math.min(1, s.crowdEnergy + 0.3);
          s.specialMeter = Math.min(1, s.specialMeter + 0.2);
          s.shotMeter.result = 'green';
          s.shotMeter.resultTimer = 0.9;
          s.shotMeter.playerId = controlled.id;
          // Combo label
          s.lastCombo = 'AERIAL SHOT!';
          s.lastComboTimer = 1.5;
          s.comboCount++;
          fireEvent(s, { type: 'COMBO', name: 'AERIAL SHOT', player: controlled.id });
          pushCallout(s, makeCallout(randomCallout(CALLOUT_POOL.combo), 'medium', '#FF8800', 'rgba(255,136,0,0.6)'));
          playBallKick();
          playPerfectRelease();
          s.speedLines = 0.6;
          break;
        }

        // ---- COMBO: SPIN + SHOOT (spin shot) ----
        if (controlled.isSpinning && !controlled.isJumping) {
          const targetGoal = getGoalCenter('right');
          lastShooterPos = { x: controlled.pos.x, y: controlled.pos.y };
          lastShooterGoalSide = 'right';
          // Spin shot: +20% power, zero spread (unstoppable), fire meter boost
          const dir = normalize({ x: targetGoal.x - controlled.pos.x, y: targetGoal.y - controlled.pos.y });
          const shootPower = PLAYER.SHOOT_POWER * 1.4;
          s.ball.vel = { x: dir.x * shootPower, y: dir.y * shootPower }; // no spread
          s.ball.carrier = null;
          s.ball.pos = { x: controlled.pos.x + dir.x * 8, y: controlled.pos.y + dir.y * 8 };
          s.ball.lastPasser = null;
          s.ball.passIntended = null;
          s.ball.lastShooter = controlled.id;
          s.ball.isRebound = false;
          s.ball.vz = Math.min(7.0, 3.0 + dist(controlled.pos, targetGoal) * 0.012);
          s.ball.z = 0;
          controlled.hasBall = false;
          controlled.holdTimer = 0;
          controlled.shootCooldown = 0.3;
          s.passChain = 0;
          s.cameraShake = Math.max(s.cameraShake, 0.5);
          s.crowdEnergy = Math.min(1, s.crowdEnergy + 0.25);
          s.specialMeter = Math.min(1, s.specialMeter + 0.2);
          s.shotMeter.result = 'green';
          s.shotMeter.resultTimer = 0.9;
          s.shotMeter.playerId = controlled.id;
          // Combo label
          s.lastCombo = 'SPIN SHOT!';
          s.lastComboTimer = 1.5;
          s.comboCount++;
          fireEvent(s, { type: 'COMBO', name: 'SPIN SHOT', player: controlled.id });
          pushCallout(s, makeCallout(randomCallout(CALLOUT_POOL.combo), 'medium', '#FF8800', 'rgba(255,136,0,0.6)'));
          playBallKick();
          playPerfectRelease();
          s.speedLines = 0.5;
          break;
        }

        // Check if FIRE meter is full — trigger power shot immediately
        if (s.specialMeter >= 1.0) {
          const targetGoal = getGoalCenter('right');
          lastShooterPos = { x: controlled.pos.x, y: controlled.pos.y };
          lastShooterGoalSide = 'right';
          executePowerShot(s, controlled, targetGoal);
          playPowerShot();
          playBigImpact();
          s.shotMeter.result = 'green';
          s.shotMeter.resultTimer = 0.8;
          s.shotMeter.playerId = controlled.id;
          // Juice effects for power shot
          s.hitFreeze = 3;
          s.speedLines = 0.8;
          s.screenFlash = 0.6;
          s.screenFlashColor = '#FF4500';
          pushCallout(s, makeCallout('FIRE SHOT!', 'large', '#FF4500', 'rgba(255,69,0,0.8)'));
          break;
        }

        // Begin charging the shot meter
        if (!s.shotMeter.active) {
          // Detect defensive pressure context
          const enemies = s.players.filter(p => p.id >= 3);
          const nearestDef = Math.min(...enemies.map(e => dist(controlled.pos, e.pos)));
          const underPressure = nearestDef < SHOT_METER.PRESSURE_RANGE;
          const isOpen = nearestDef > SHOT_METER.OPEN_RANGE;

          // Calculate context-adjusted fill speed (difficulty affects meter speed)
          let fillSpeed = SHOT_METER.FILL_SPEED * diffMod.fillSpeed;
          if (underPressure) fillSpeed *= SHOT_METER.PRESSURE_FILL_MULT;
          if (isOpen) fillSpeed *= SHOT_METER.OPEN_FILL_MULT;

          // Calculate context-adjusted green zone (difficulty affects green zone size)
          let greenWidth = (SHOT_METER.GREEN_END - SHOT_METER.GREEN_START) * diffMod.greenWidth;
          if (underPressure) greenWidth *= SHOT_METER.PRESSURE_GREEN_SHRINK;
          const shooterTeam: 'home' | 'away' = controlled.id < 3 ? 'home' : 'away';
          if (s.passChainTeam === shooterTeam && s.passChain >= 2) {
            greenWidth *= SHOT_METER.CHAIN_GREEN_EXPAND;
          }
          if (isOpen) greenWidth *= SHOT_METER.OPEN_GREEN_EXPAND;

          const greenCenter = (SHOT_METER.GREEN_START + SHOT_METER.GREEN_END) / 2;
          const greenStart = Math.max(0.3, greenCenter - greenWidth / 2);
          const greenEnd = Math.min(0.85, greenCenter + greenWidth / 2);

          s.shotMeter = {
            active: true,
            charge: 0,
            playerId: controlled.id,
            fillSpeed,
            greenStart,
            greenEnd,
            underPressure,
            isOpen,
            result: 'none',
            resultTimer: 0,
          };
        }

      } else if (action === 'shootRelease' && s.shotMeter.active && s.shotMeter.playerId === controlled.id) {
        // Release the shot at current meter level
        const charge = s.shotMeter.charge;
        const { greenStart, greenEnd } = s.shotMeter;
        const yellowEnd = greenEnd + (SHOT_METER.YELLOW_END - SHOT_METER.GREEN_END);

        // Determine which zone the release landed in
        let zone: 'weak' | 'green' | 'yellow' | 'red';
        let powerMult: number;
        let accuracyMult: number;
        if (charge < SHOT_METER.WEAK_END) {
          zone = 'weak';
          powerMult = SHOT_METER.WEAK_POWER;
          accuracyMult = SHOT_METER.WEAK_ACCURACY;
        } else if (charge >= greenStart && charge <= greenEnd) {
          zone = 'green';
          powerMult = SHOT_METER.GREEN_POWER;
          accuracyMult = SHOT_METER.GREEN_ACCURACY;
        } else if (charge > greenEnd && charge <= yellowEnd) {
          zone = 'yellow';
          powerMult = SHOT_METER.YELLOW_POWER;
          accuracyMult = SHOT_METER.YELLOW_ACCURACY;
        } else {
          zone = 'red';
          powerMult = SHOT_METER.RED_POWER;
          accuracyMult = SHOT_METER.RED_ACCURACY;
        }

        // Store result for visual feedback
        s.shotMeter.result = zone;
        s.shotMeter.resultTimer = 0.8; // show result for 0.8s
        s.shotMeter.active = false;

        // Execute the shot with meter modifiers
        const targetGoal = getGoalCenter('right');
        lastShooterPos = { x: controlled.pos.x, y: controlled.pos.y };
        lastShooterGoalSide = 'right';
        executeMeterShot(s, controlled, targetGoal, powerMult, accuracyMult);
        playBallKick();
        if (zone === 'green') playPerfectRelease();
        if (zone === 'red') playPowerShot();
        s.crowdEnergy = Math.min(1, s.crowdEnergy + (zone === 'green' ? 0.25 : 0.1));
        if (zone === 'green') s.cameraShake = Math.max(s.cameraShake, 0.3);

        // Build FIRE meter on good shots
        if (zone === 'green') s.specialMeter = Math.min(1, s.specialMeter + 0.25);
        else if (zone === 'yellow') s.specialMeter = Math.min(1, s.specialMeter + 0.1);

      } else if (action === 'pass' && controlled.hasBall) {
        const teammates = homePlayers.filter(t => t.id !== controlled.id);
        const targetGoal = getGoalCenter('right');
        const bestTarget = findBestPassTarget(controlled, teammates, awayPlayers, targetGoal);
        const passTarget = bestTarget ?? (teammates.length > 0 ? (() => {
          let nearest = teammates[0];
          let nearestD = dist(controlled.pos, teammates[0].pos);
          for (const t of teammates) {
            const d2 = dist(controlled.pos, t.pos);
            if (d2 < nearestD) { nearestD = d2; nearest = t; }
          }
          return nearest;
        })() : null);

        if (passTarget) {
          // ---- COMBO: SPIN + PASS (no-look pass) ----
          if (controlled.isSpinning) {
            // No-look pass: faster ball, receiver gets a speed burst
            const leadX = passTarget.pos.x + passTarget.vel.x * PLAYER.PASS_LEAD * 15;
            const leadY = passTarget.pos.y + passTarget.vel.y * PLAYER.PASS_LEAD * 15;
            const dir = normalize({ x: leadX - controlled.pos.x, y: leadY - controlled.pos.y });
            const passSpeed = PLAYER.PASS_POWER * 1.35; // faster pass
            s.ball.vel = { x: dir.x * passSpeed, y: dir.y * passSpeed };
            s.ball.carrier = null;
            s.ball.pos = { x: controlled.pos.x + dir.x * 8, y: controlled.pos.y + dir.y * 8 };
            s.ball.lastPasser = controlled.id;
            s.ball.passIntended = passTarget.id;
            controlled.hasBall = false;
            controlled.holdTimer = 0;
            // Receiver speed burst
            const toTarget = normalize({ x: targetGoal.x - passTarget.pos.x, y: targetGoal.y - passTarget.pos.y });
            passTarget.vel = { x: toTarget.x * PLAYER.SPEED * 1.5, y: toTarget.y * PLAYER.SPEED * 1.5 };
            // Track pass chain
            const passerTeam: 'home' | 'away' = 'home';
            if (s.passChainTeam === passerTeam) s.passChain++;
            else { s.passChain = 1; s.passChainTeam = passerTeam; }
            s.specialMeter = Math.min(1, s.specialMeter + 0.15);
            // Combo label
            s.lastCombo = 'NO-LOOK PASS!';
            s.lastComboTimer = 1.5;
            s.comboCount++;
            fireEvent(s, { type: 'COMBO', name: 'NO-LOOK PASS', player: controlled.id });
            playPass();
          } else {
            executePass(s, controlled, passTarget);
            playPass();
            if (bestTarget) fireEvent(s, { type: 'PASS', from: controlled.id, to: passTarget.id });
          }
        }

      } else if (action === 'steal' && !controlled.hasBall) {
        if (controlled.stealCooldown <= 0) {
          const enemyCarrier = s.players.find(p => p.hasBall && p.id >= 3);
          if (enemyCarrier && dist(controlled.pos, enemyCarrier.pos) < PLAYER.STEAL_RANGE) {
            // Spin immunity: can't steal from a spinning player
            if (enemyCarrier.isSpinning && SPIN.STEAL_IMMUNITY) {
              const pushDir = normalize({ x: controlled.pos.x - enemyCarrier.pos.x, y: controlled.pos.y - enemyCarrier.pos.y });
              controlled.vel = { x: pushDir.x * 3, y: pushDir.y * 3 };
              controlled.stealCooldown = PLAYER.STEAL_COOLDOWN;
            } else {
            const carrierSpeed = Math.sqrt(enemyCarrier.vel.x ** 2 + enemyCarrier.vel.y ** 2);
            let shieldMod = carrierSpeed > 1 ? PLAYER.DRIBBLE_SHIELD_FACTOR : 1.0;

            // Steal window: post-pass vulnerability
            if (enemyCarrier.postPassVulnerable > 0) {
              shieldMod *= STEAL_WINDOWS.POST_PASS_STEAL_BOOST;
            }
            // Steal window: long possession vulnerability
            if (enemyCarrier.holdTimer >= STEAL_WINDOWS.POSSESSION_VULNERABLE_TIME) {
              shieldMod *= STEAL_WINDOWS.POSSESSION_STEAL_BOOST;
            }

            const stealChance = PLAYER.STEAL_SUCCESS_PLAYER * shieldMod;

            if (Math.random() < stealChance) {
              enemyCarrier.hasBall = false;
              enemyCarrier.holdTimer = 0;
              controlled.hasBall = true;
              controlled.holdTimer = 0;
              controlled.receiveTime = 0;
              s.ball.carrier = controlled.id;
              s.ball.pos = { ...controlled.pos };
              s.ball.vel = { x: 0, y: 0 };
              s.ball.lastPasser = null;
              s.ball.passIntended = null;
              s.possession = 'home';
              s.shotClock = MATCH.SHOT_CLOCK;
              s.passChain = 0;
              s.passChainTeam = null;
              fireEvent(s, { type: 'STEAL', by: s.homeTeam });
              playStealBuzzer();
              s.crowdEnergy = Math.min(1, s.crowdEnergy + 0.2);
              // Build FIRE meter on steals
              s.specialMeter = Math.min(1, s.specialMeter + 0.15);
              // Announcer callout
              pushCallout(s, makeCallout(randomCallout(CALLOUT_POOL.steal), 'medium', '#22C55E', 'rgba(34,197,94,0.6)'));
              playAnnouncerStinger();
            } else {
              const pushDir = normalize({ x: controlled.pos.x - enemyCarrier.pos.x, y: controlled.pos.y - enemyCarrier.pos.y });
              controlled.vel = { x: pushDir.x * 2, y: pushDir.y * 2 };
            }
            } // end spin immunity else
          }
          controlled.stealCooldown = PLAYER.STEAL_COOLDOWN;
        }

      } else if (action === 'jump') {
        // Jump action — launch player into the air
        if (!controlled.isJumping && controlled.jumpCooldown <= 0) {
          controlled.isJumping = true;
          controlled.jumpZ = 0;
          controlled.jumpVZ = JUMP.POWER;
          controlled.jumpCooldown = JUMP.COOLDOWN;
        }

      } else if (action === 'spin') {
        // Spin move — evasive maneuver with brief steal immunity
        if (!controlled.isSpinning && controlled.spinCooldown <= 0) {
          controlled.isSpinning = true;
          controlled.spinTimer = SPIN.DURATION;
          controlled.spinAngle = 0;
          controlled.spinCooldown = SPIN.COOLDOWN;
        }

      } else if (action === 'switch') {
        const curIdx = homePlayers.findIndex(p => p.isControlled);
        homePlayers.forEach(p => p.isControlled = false);
        homePlayers[(curIdx + 1) % 3].isControlled = true;
        playSwitchPlayer();
      }
    }

    // ========== AI: AWAY TEAM (attacks LEFT goal) ==========
    const awayTargetGoal = getGoalCenter('left');
    // Grace period: AI ramps up quickly after reset
    const timePlayed = MATCH.DURATION - s.timer;
    const timeSinceReset = s.shotClock !== undefined ? (10 - s.shotClock) : timePlayed;
    const kickoffGrace = timeSinceReset < 1.5 ? 0.3 : timeSinceReset < 3 ? 0.7 : 1.0;
    const intensityMult = (s.timer <= INTENSITY.FINAL_SECONDS ? INTENSITY.AI_AGGRESSION_MULT : 1.0) * kickoffGrace;

    awayPlayers.forEach(p => {
      const speedMod = getSpeedMod(p);

      if (p.hasBall) {
        const distToGoal = dist(p.pos, awayTargetGoal);
        const holdLeft = PRESSURE.TURNOVER_TIME - p.holdTimer;
        const holdTime = p.holdTimer; // how long this player has held the ball

        const nearestDefender = homePlayers.reduce((closest, hp) => {
          const d2 = dist(p.pos, hp.pos);
          return d2 < closest.d ? { p: hp, d: d2 } : closest;
        }, { p: homePlayers[0], d: Infinity });
        const underPressure = nearestDefender.d < AI.PRESSURE_RANGE;

        // AI SETUP PHASE: reduced requirements for faster play
        // Only requires 0.8s hold time OR being close to goal
        const canShoot = holdTime > 0.8 || distToGoal < AI.SHOOT_RANGE * 0.5;

        if (holdLeft < 0.6) {
          // Panic: about to lose possession, must act
          if (distToGoal < AI.SHOOT_RANGE && canShoot) {
            lastShooterPos = { x: p.pos.x, y: p.pos.y };
            lastShooterGoalSide = 'left';
            executeShot(s, p, awayTargetGoal);
            playBallKick();
          } else {
            const teammates = awayPlayers.filter(t => t.id !== p.id);
            const target = findBestPassTarget(p, teammates, homePlayers, awayTargetGoal);
            if (target) { executePass(s, p, target); playPass(); }
            else if (teammates.length > 0) { executePass(s, p, teammates[Math.floor(Math.random() * teammates.length)]); playPass(); }
          }
        } else if (underPressure && Math.random() < AI.PASS_PRESSURE_CHANCE * intensityMult) {
          // Under pressure: pass to relieve
          const teammates = awayPlayers.filter(t => t.id !== p.id);
          const target = findBestPassTarget(p, teammates, homePlayers, awayTargetGoal);
          if (target) { executePass(s, p, target); playPass(); }
        } else if (canShoot && distToGoal < AI.SHOOT_RANGE && Math.random() < AI.SHOOT_CHANCE_CLOSE * intensityMult && p.shootCooldown <= 0) {
          // Shoot when in range
          if (!p.isJumping && p.jumpCooldown <= 0 && Math.random() < 0.25) {
            p.isJumping = true;
            p.jumpVZ = JUMP.POWER;
            p.jumpZ = 0.1;
            p.jumpCooldown = JUMP.COOLDOWN;
          }
          lastShooterPos = { x: p.pos.x, y: p.pos.y };
          lastShooterGoalSide = 'left';
          executeShot(s, p, awayTargetGoal);
          playBallKick();
          s.crowdEnergy = Math.min(1, s.crowdEnergy + 0.1);
        } else if (Math.random() < AI.PASS_CHANCE * intensityMult && holdTime > 0.3) {
          // Pass to teammates
          const teammates = awayPlayers.filter(t => t.id !== p.id);
          const target = findBestPassTarget(p, teammates, homePlayers, awayTargetGoal);
          if (target) { executePass(s, p, target); playPass(); }
        } else {
          // Move toward goal aggressively
          const approachSpeed = PLAYER.AI_SPEED_OFFENSE * (canShoot ? 1.0 : 0.8);
          const toGoal = normalize({ x: awayTargetGoal.x - p.pos.x, y: awayTargetGoal.y - p.pos.y });
          let dodgeY = 0;
          if (underPressure) dodgeY = nearestDefender.p.pos.y > p.pos.y ? -1.5 : 1.5;

          // AI SPIN: spin to evade when under heavy pressure while driving
          if (underPressure && nearestDefender.d < PLAYER.STEAL_RANGE * 1.8
              && !p.isSpinning && p.spinCooldown <= 0 && Math.random() < 0.04 * intensityMult) {
            p.isSpinning = true;
            p.spinTimer = SPIN.DURATION;
            p.spinAngle = 0;
            p.spinCooldown = SPIN.COOLDOWN;
          }

          p.vel = {
            x: toGoal.x * approachSpeed * speedMod,
            y: toGoal.y * approachSpeed * speedMod + dodgeY,
          };
        }

      } else if (s.ball.carrier === null) {
        const toBall = normalize({ x: s.ball.pos.x - p.pos.x, y: s.ball.pos.y - p.pos.y });
        p.vel = { x: toBall.x * PLAYER.AI_SPEED * speedMod, y: toBall.y * PLAYER.AI_SPEED * speedMod };

        // AI JUMP for rebounds: jump when near a high rebound ball
        if (s.ball.isRebound && s.ball.z > JUMP.REBOUND_GRAB_HEIGHT * 0.6
            && dist(p.pos, s.ball.pos) < JUMP.REBOUND_GRAB_RANGE * 2
            && !p.isJumping && p.jumpCooldown <= 0 && Math.random() < 0.12) {
          p.isJumping = true;
          p.jumpVZ = JUMP.POWER;
          p.jumpZ = 0.1;
          p.jumpCooldown = JUMP.COOLDOWN;
        }

      } else if (s.ball.carrier !== null && s.ball.carrier < 3) {
        // DEFENSE based on personality
        const carrier = s.players[s.ball.carrier];
        const dToCarrier = dist(p.pos, carrier.pos);

        const closestDefender = awayPlayers.reduce((closest, ap) => {
          const d2 = dist(ap.pos, carrier.pos);
          return d2 < closest.d ? { p: ap, d: d2 } : closest;
        }, { p: awayPlayers[0], d: Infinity });

        if (p.defPersonality === DEF_PERSONALITY.AGGRESSIVE || closestDefender.p.id === p.id) {
          // Aggressive / primary defender — chase carrier
          const toCarrier = normalize({ x: carrier.pos.x - p.pos.x, y: carrier.pos.y - p.pos.y });
          p.vel = { x: toCarrier.x * PLAYER.AI_SPEED_DEFENSE * speedMod, y: toCarrier.y * PLAYER.AI_SPEED_DEFENSE * speedMod };

          if (dToCarrier < PLAYER.STEAL_RANGE && p.stealCooldown <= 0 && !carrier.isSpinning && Math.random() < PLAYER.STEAL_ATTEMPT_RATE_AI * intensityMult) {
            const carrierSpeed = Math.sqrt(carrier.vel.x ** 2 + carrier.vel.y ** 2);
            let shieldMod = carrierSpeed > 1 ? PLAYER.DRIBBLE_SHIELD_FACTOR : 1.0;
            if (carrier.holdTimer >= STEAL_WINDOWS.POSSESSION_VULNERABLE_TIME) {
              shieldMod *= STEAL_WINDOWS.POSSESSION_STEAL_BOOST;
            }
            const stealChance = PLAYER.STEAL_SUCCESS_AI * shieldMod;

            if (Math.random() < stealChance) {
              carrier.hasBall = false;
              carrier.holdTimer = 0;
              p.hasBall = true;
              p.holdTimer = 0;
              p.receiveTime = 0;
              s.ball.carrier = p.id;
              s.ball.pos = { ...p.pos };
              s.ball.vel = { x: 0, y: 0 };
              s.ball.lastPasser = null;
              s.ball.passIntended = null;
              s.possession = 'away';
              s.shotClock = MATCH.SHOT_CLOCK;
              s.passChain = 0;
              s.passChainTeam = null;
            }
            p.stealCooldown = PLAYER.STEAL_COOLDOWN * 1.5;
          }

        } else if (p.defPersonality === DEF_PERSONALITY.ZONE) {
          // Zone defender — guard scoring zone
          const defX = COURT.WIDTH * 0.7;
          const defY = COURT.HEIGHT / 2 + (p.id === 4 ? -80 : 80);
          const toPos = normalize({ x: defX - p.pos.x, y: defY - p.pos.y });
          if (dist(p.pos, { x: defX, y: defY }) > AI.REPOSITION_THRESHOLD) {
            p.vel = { x: toPos.x * PLAYER.AI_SPEED * 0.7 * speedMod, y: toPos.y * PLAYER.AI_SPEED * 0.7 * speedMod };
          } else {
            p.vel = { x: 0, y: 0 };
          }

        } else {
          // Tight defender — stay between carrier and goal with better spacing
          const defGoal = getGoalCenter('right');
          // Improved defensive positioning: stay slightly further back to prevent crowding
          const midX = lerp(carrier.pos.x, defGoal.x, 0.45);
          // Spread out vertically to cover more ground
          const spreadY = (p.id === 4 ? -100 : 100);
          const midY = lerp(carrier.pos.y, defGoal.y, 0.3) + spreadY;
          const toMid = normalize({ x: midX - p.pos.x, y: midY - p.pos.y });
          const dToTarget = dist(p.pos, { x: midX, y: midY });
          if (dToTarget > 10) {
            const approachSpeed = Math.min(1, dToTarget / 40);
            p.vel = { x: toMid.x * PLAYER.AI_SPEED * 0.8 * speedMod * approachSpeed, y: toMid.y * PLAYER.AI_SPEED * 0.8 * speedMod * approachSpeed };
          } else {
            p.vel = { x: 0, y: 0 };
          }
        }

      } else {
        // Teammate has ball — get open with improved "Passing Lane" logic
        const carrier = s.players[s.ball.carrier];
        const myIdx = p.id - 3;
        // Move to a position that is both away from the carrier and has a clear line to the goal
        const targetGoal = getGoalCenter('left');
        const angle = (myIdx * 2.2) + timestamp * AI.CUT_SPEED * 0.8;
        const offDist = AI.SPREAD_DISTANCE * 1.4 + Math.sin(timestamp * AI.CUT_SPEED + myIdx) * 40;
        
        // Base offensive position
        let offX = carrier.pos.x + Math.cos(angle) * offDist;
        let offY = carrier.pos.y + Math.sin(angle) * offDist;
        
        // Bias toward the opponent's goal
        offX = lerp(offX, targetGoal.x, 0.4);
        offY = lerp(offY, targetGoal.y, 0.2);

        const clampedX = clamp(offX, 60, COURT.WIDTH - 60);
        const clampedY = clamp(offY, 40, COURT.HEIGHT - 40);
        const toOff = normalize({ x: clampedX - p.pos.x, y: clampedY - p.pos.y });
        const dToTarget = dist(p.pos, { x: clampedX, y: clampedY });
        if (dToTarget > AI.REPOSITION_THRESHOLD) {
          const moveSpeed = Math.min(1, dToTarget / 50);
          p.vel = { x: toOff.x * PLAYER.AI_SPEED * 0.7 * speedMod * moveSpeed, y: toOff.y * PLAYER.AI_SPEED * 0.7 * speedMod * moveSpeed };
        } else {
          p.vel = { x: Math.sin(timestamp * 0.001) * 0.2, y: Math.cos(timestamp * 0.001) * 0.2 };
        }
      }
    });

    // ========== HOME AI (non-controlled teammates) ==========
    homePlayers.filter(p => !p.isControlled).forEach(p => {
      const homeTargetGoal = getGoalCenter('right');
      const speedMod = getSpeedMod(p);

      if (p.hasBall) {
        const distToGoal = dist(p.pos, homeTargetGoal);
        const holdLeft = PRESSURE.TURNOVER_TIME - p.holdTimer;

        const nearestEnemy = awayPlayers.reduce((closest, ap) => {
          const d2 = dist(p.pos, ap.pos);
          return d2 < closest.d ? { p: ap, d: d2 } : closest;
        }, { p: awayPlayers[0], d: Infinity });
        const underPressure = nearestEnemy.d < AI.PRESSURE_RANGE;

        if (holdLeft < 0.8 || (underPressure && Math.random() < 0.04)) {
          const teammates = homePlayers.filter(t => t.id !== p.id);
          const target = findBestPassTarget(p, teammates, awayPlayers, homeTargetGoal);
          if (target) executePass(s, p, target);
          else if (teammates.length > 0) executePass(s, p, teammates[Math.floor(Math.random() * teammates.length)]);
        } else if (distToGoal < 350 && Math.random() < 0.02 && p.shootCooldown <= 0) {
          // Home AI JUMP-SHOT
          if (!p.isJumping && p.jumpCooldown <= 0 && Math.random() < 0.3) {
            p.isJumping = true;
            p.jumpVZ = JUMP.POWER;
            p.jumpZ = 0.1;
            p.jumpCooldown = JUMP.COOLDOWN;
          }
          lastShooterPos = { x: p.pos.x, y: p.pos.y };
          lastShooterGoalSide = 'right';
          executeShot(s, p, homeTargetGoal);
        } else {
          const dir = normalize({ x: homeTargetGoal.x - p.pos.x, y: homeTargetGoal.y - p.pos.y });

          // Home AI SPIN: spin when under pressure while driving
          if (underPressure && nearestEnemy.d < PLAYER.STEAL_RANGE * 1.8
              && !p.isSpinning && p.spinCooldown <= 0 && Math.random() < 0.05) {
            p.isSpinning = true;
            p.spinTimer = SPIN.DURATION;
            p.spinAngle = 0;
            p.spinCooldown = SPIN.COOLDOWN;
          }

          p.vel = { x: dir.x * PLAYER.AI_SPEED * 0.85 * speedMod, y: dir.y * PLAYER.AI_SPEED * 0.85 * speedMod };
        }

      } else if (s.ball.carrier === null) {
        const toBall = normalize({ x: s.ball.pos.x - p.pos.x, y: s.ball.pos.y - p.pos.y });
        p.vel = { x: toBall.x * PLAYER.AI_SPEED * 0.8 * speedMod, y: toBall.y * PLAYER.AI_SPEED * 0.8 * speedMod };

        // Home AI JUMP for rebounds
        if (s.ball.isRebound && s.ball.z > JUMP.REBOUND_GRAB_HEIGHT * 0.6
            && dist(p.pos, s.ball.pos) < JUMP.REBOUND_GRAB_RANGE * 2
            && !p.isJumping && p.jumpCooldown <= 0 && Math.random() < 0.1) {
          p.isJumping = true;
          p.jumpVZ = JUMP.POWER;
          p.jumpZ = 0.1;
          p.jumpCooldown = JUMP.COOLDOWN;
        }

      } else if (s.ball.carrier !== null && s.ball.carrier >= 3) {
        const carrier = s.players[s.ball.carrier];
        const defGoal = getGoalCenter('left');
        const midX = lerp(carrier.pos.x, defGoal.x, 0.4);
        const midY = lerp(carrier.pos.y, defGoal.y, 0.3) + (p.id === 1 ? -60 : 60);
        const toMid = normalize({ x: midX - p.pos.x, y: midY - p.pos.y });
        if (dist(p.pos, { x: midX, y: midY }) > 15) {
          p.vel = { x: toMid.x * PLAYER.AI_SPEED * 0.75 * speedMod, y: toMid.y * PLAYER.AI_SPEED * 0.75 * speedMod };
        } else {
          p.vel = { x: 0, y: 0 };
        }

      } else {
        // Get open for controlled player's pass with improved spacing
        const carrier = s.players[s.ball.carrier];
        const myIdx = p.id;
        const homeTargetGoal = getGoalCenter('right');
        const angle = (myIdx * 2.5) + timestamp * AI.CUT_SPEED * 0.9;
        const offDist = AI.SPREAD_DISTANCE * 1.3 + Math.sin(timestamp * AI.CUT_SPEED * 1.5 + myIdx * 2) * 35;
        
        let offX = carrier.pos.x + Math.cos(angle) * offDist;
        let offY = carrier.pos.y + Math.sin(angle) * offDist;
        
        // Bias toward the goal we're attacking
        offX = lerp(offX, homeTargetGoal.x, 0.45);
        offY = lerp(offY, homeTargetGoal.y, 0.25);

        const clampedX = clamp(offX, 60, COURT.WIDTH - 60);
        const clampedY = clamp(offY, 40, COURT.HEIGHT - 40);
        const toOff = normalize({ x: clampedX - p.pos.x, y: clampedY - p.pos.y });
        const dToTarget = dist(p.pos, { x: clampedX, y: clampedY });
        if (dToTarget > AI.REPOSITION_THRESHOLD) {
          const moveSpeed = Math.min(1, dToTarget / 60);
          p.vel = { x: toOff.x * PLAYER.AI_SPEED * 0.7 * speedMod * moveSpeed, y: toOff.y * PLAYER.AI_SPEED * 0.7 * speedMod * moveSpeed };
        } else {
          p.vel = { x: Math.sin(timestamp * 0.0015 + p.id) * 0.2, y: Math.cos(timestamp * 0.002 + p.id) * 0.2 };
        }
      }
    });

    // ========== MOVE ALL PLAYERS ==========
    s.players.forEach(p => {
      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;
      p.pos.x = clamp(p.pos.x, PLAYER.RADIUS, COURT.WIDTH - PLAYER.RADIUS);
      p.pos.y = clamp(p.pos.y, PLAYER.RADIUS, COURT.HEIGHT - PLAYER.RADIUS);

      s.players.forEach(other => {
        if (other.id === p.id) return;
        const d2 = dist(p.pos, other.pos);
        // Increased separation distance to reduce clutter
        const minDist = PLAYER.RADIUS * 2.8;
        if (d2 < minDist && d2 > 0) {
          const overlap = minDist - d2;
          const dir = normalize({ x: p.pos.x - other.pos.x, y: p.pos.y - other.pos.y });
          // Soft repulsion force that gets stronger as they get closer
          const force = (overlap / minDist) * 0.65;
          p.pos.x += dir.x * overlap * force;
          p.pos.y += dir.y * overlap * force;
        }
      });

      // ---- WALL / GLASS BOARD COLLISION ----
      const WALL_MARGIN_Y = PLAYER.RADIUS + 5;
      const WALL_MARGIN_X = PLAYER.RADIUS + 8;
      const BOUNCE_FACTOR = -0.6;
      const FRICTION = 0.65;

      const prevX = p.pos.x;
      const prevY = p.pos.y;
      p.pos.x = clamp(p.pos.x, WALL_MARGIN_X, COURT.WIDTH - WALL_MARGIN_X);
      p.pos.y = clamp(p.pos.y, WALL_MARGIN_Y, COURT.HEIGHT - WALL_MARGIN_Y);

      if (prevX !== p.pos.x) {
        p.vel.x *= BOUNCE_FACTOR;
        p.vel.y *= FRICTION;
      }
      if (prevY !== p.pos.y) {
        p.vel.y *= BOUNCE_FACTOR;
        p.vel.x *= FRICTION;
      }
    });

    // ========== BALL PHYSICS ==========
    if (s.ball.carrier !== null) {
      const carrier = s.players[s.ball.carrier];
      if (carrier) {
        s.ball.pos = { x: carrier.pos.x, y: carrier.pos.y };
        s.ball.vel = { x: 0, y: 0 };
        s.ball.z = carrier.isJumping ? carrier.jumpZ * 0.5 : 0;
        s.ball.vz = 0;
      }
    } else {
      // Horizontal movement
      s.ball.pos.x += s.ball.vel.x;
      s.ball.pos.y += s.ball.vel.y;
      s.ball.vel.x *= BALL.FRICTION;
      s.ball.vel.y *= BALL.FRICTION;

      // Vertical (z-axis) movement — ball arc / gravity
      s.ball.z += s.ball.vz;
      s.ball.vz -= 0.25; // gravity
      if (s.ball.z <= 0) {
        s.ball.z = 0;
        s.ball.vz = Math.abs(s.ball.vz) > 1 ? Math.abs(s.ball.vz) * 0.3 : 0; // small bounce on ground
        if (s.ball.isRebound) {
          // Rebound ball hit the ground — now it's a loose ball anyone can grab
          s.ball.isRebound = false;
        }
      }

      const spd = Math.sqrt(s.ball.vel.x ** 2 + s.ball.vel.y ** 2);
      if (spd > BALL.MAX_SPEED) {
        s.ball.vel.x = (s.ball.vel.x / spd) * BALL.MAX_SPEED;
        s.ball.vel.y = (s.ball.vel.y / spd) * BALL.MAX_SPEED;
      }

      // Wall bounces (sidelines)
      if (s.ball.pos.y <= BALL.RADIUS) { s.ball.vel.y = Math.abs(s.ball.vel.y) * 0.7; s.ball.pos.y = BALL.RADIUS; }
      if (s.ball.pos.y >= COURT.HEIGHT - BALL.RADIUS) { s.ball.vel.y = -Math.abs(s.ball.vel.y) * 0.7; s.ball.pos.y = COURT.HEIGHT - BALL.RADIUS; }

      const goalHalfW = GOAL.WIDTH / 2;
      const goalTop = COURT.HEIGHT / 2 - goalHalfW;
      const goalBot = COURT.HEIGHT / 2 + goalHalfW;
      const inGoalLane = s.ball.pos.y >= goalTop && s.ball.pos.y <= goalBot;

      // ---- BACKBOARD & POST COLLISION ----
      const checkBackboard = (goalX: number, side: 'left' | 'right') => {
        const atGoalX = side === 'left'
          ? s.ball.pos.x <= BALL.RADIUS + 5
          : s.ball.pos.x >= COURT.WIDTH - BALL.RADIUS - 5;

        if (atGoalX && inGoalLane) {
          if (s.ball.z >= BACKBOARD.HEIGHT_BOTTOM && s.ball.z <= BACKBOARD.HEIGHT_TOP) {
            // HIT THE BACKBOARD — ball bounces back!
            s.ball.vel.x *= -BACKBOARD.REBOUND_SPEED;
            s.ball.vel.y += (Math.random() - 0.5) * 3;
            s.ball.vz = Math.abs(s.ball.vz) * 0.4 + 1;
            s.ball.pos.x = side === 'left' ? BALL.RADIUS + 8 : COURT.WIDTH - BALL.RADIUS - 8;
            s.ball.isRebound = true;
            s.cameraShake = 0.5;
            fireEvent(s, { type: 'BACKBOARD_HIT', side });
            pushCallout(s, makeCallout(randomCallout(CALLOUT_POOL.denied), 'medium', '#EF4444', 'rgba(239,68,68,0.6)'));
            playBigImpact();
            return true;
          } else if (s.ball.z >= BACKBOARD.HEIGHT_TOP) {
            // Ball went OVER the backboard — out of bounds, reset
            s.ball.vel.x *= -0.3;
            s.ball.vz = -2;
            s.ball.pos.x = side === 'left' ? BALL.RADIUS + 15 : COURT.WIDTH - BALL.RADIUS - 15;
            s.ball.isRebound = true;
            return true;
          }
        }

        // Post/crossbar hit: ball near goal edge but outside goal lane, or at crossbar height
        if (atGoalX && !inGoalLane && s.ball.z < BACKBOARD.HEIGHT_BOTTOM) {
          s.ball.vel.x *= -BACKBOARD.POST_REBOUND_SPEED;
          s.ball.vel.y *= -0.5;
          s.ball.pos.x = side === 'left' ? BALL.RADIUS + 5 : COURT.WIDTH - BALL.RADIUS - 5;
          s.ball.isRebound = true;
          s.cameraShake = 0.3;
          return true;
        }

        return false;
      };

      const hitBackboardLeft = checkBackboard(0, 'left');
      const hitBackboardRight = checkBackboard(COURT.WIDTH, 'right');

      // Standard wall bounces (only if no backboard hit)
      if (!hitBackboardLeft && s.ball.pos.x <= BALL.RADIUS && !inGoalLane) {
        s.ball.vel.x = Math.abs(s.ball.vel.x) * 0.7; s.ball.pos.x = BALL.RADIUS;
      }
      if (!hitBackboardRight && s.ball.pos.x >= COURT.WIDTH - BALL.RADIUS && !inGoalLane) {
        s.ball.vel.x = -Math.abs(s.ball.vel.x) * 0.7; s.ball.pos.x = COURT.WIDTH - BALL.RADIUS;
      }

      // ---- GOAL DETECTION (only if ball is below crossbar height) ----
      if (isInGoal(s.ball.pos, 'right') && s.ball.z < BACKBOARD.HEIGHT_BOTTOM) {
        const pts = getZonePoints(lastShooterPos, 'right');
        s.score.home += pts;
        s.goalFlash = 1;
        s.goalFlashTeam = s.homeTeam;
        s.cameraShake = 1;
        s.specialMeter = Math.min(1, s.specialMeter + 0.15);
        s.goalEvents.push({ teamId: s.homeTeam, zone: pts, time: s.timer });
        fireEvent(s, { type: 'GOAL', team: s.homeTeam, points: pts });
        playGoalHorn();
        playCrowdRoar();
        s.crowdEnergy = 1.0;

        // ON FIRE streak tracking
        s.homeStreak++;
        s.awayStreak = 0;
        if (s.homeStreak >= ON_FIRE.STREAK_THRESHOLD && s.onFireTeam !== 'home') {
          s.onFireTeam = 'home';
          s.onFireTimer = ON_FIRE.DURATION;
          fireEvent(s, { type: 'ON_FIRE', team: s.homeTeam });
          playOnFire();
          pushCallout(s, makeCallout(randomCallout(CALLOUT_POOL.onFire), 'large', '#FF4500', 'rgba(255,69,0,0.8)', `${s.homeStreak} GOAL STREAK`));
          s.screenFlash = 1.0;
          s.screenFlashColor = '#FF4500';
          s.hitFreeze = 6;
        }

        // Announcer callout for goal
        if (pts >= 3) {
          pushCallout(s, makeCallout(randomCallout(CALLOUT_POOL.goal3pt), 'large', '#FFD700', 'rgba(255,215,0,0.8)', `+${pts} POINTS`));
        } else {
          pushCallout(s, makeCallout(randomCallout(CALLOUT_POOL.goal1pt), 'medium', '#FFB800', 'rgba(255,184,0,0.6)', `+${pts} POINT`));
        }
        // Clutch goal callout in final seconds
        if (s.timer <= INTENSITY.FINAL_SECONDS) {
          pushCallout(s, makeCallout(randomCallout(CALLOUT_POOL.clutch), 'small', '#FF6B6B', 'rgba(255,107,107,0.5)'));
        }
        playAnnouncerStinger();

        // Juice effects for goals
        s.hitFreeze = Math.max(s.hitFreeze, pts >= 3 ? 5 : 3);
        s.screenFlash = Math.max(s.screenFlash, 0.7);
        s.screenFlashColor = '#FFD700';
        s.speedLines = 0.5;

        // Momentum boost
        s.momentumBoost = MOMENTUM.POST_GOAL_BOOST_DURATION;
        s.momentumTeam = 'home';

        // Slow-mo + camera zoom for goal celebration
        s.slowMo = CAMERA.SLOW_MO_DURATION;
        s.cameraZoom = CAMERA.GOAL_ZOOM;
        s.lastGoalReplay = { shooterPos: { ...lastShooterPos }, goalSide: 'right' };

        if (s.isOvertime) {
          pushCallout(s, makeCallout('GAME OVER!', 'large', '#FFD700', 'rgba(255,215,0,0.8)', 'SUDDEN DEATH WINNER'));
          s.hitFreeze = 8;
          s.isPlaying = false;
          stateRef.current = s;
          setGameState({ ...s });
          runningRef.current = false;
          return;
        }
        resetPositions(s, 'away');

      } else if (isInGoal(s.ball.pos, 'left') && s.ball.z < BACKBOARD.HEIGHT_BOTTOM) {
        const pts = getZonePoints(lastShooterPos, 'left');
        s.score.away += pts;
        s.goalFlash = 1;
        s.goalFlashTeam = s.awayTeam;
        s.cameraShake = 1;
        s.specialMeter = Math.max(0, s.specialMeter - 0.1);
        s.goalEvents.push({ teamId: s.awayTeam, zone: pts, time: s.timer });
        fireEvent(s, { type: 'GOAL', team: s.awayTeam, points: pts });
        playGoalHorn();
        playCrowdRoar();
        s.crowdEnergy = 1.0;

        // ON FIRE streak tracking
        s.awayStreak++;
        s.homeStreak = 0;
        if (s.awayStreak >= ON_FIRE.STREAK_THRESHOLD && s.onFireTeam !== 'away') {
          s.onFireTeam = 'away';
          s.onFireTimer = ON_FIRE.DURATION;
          fireEvent(s, { type: 'ON_FIRE', team: s.awayTeam });
          playOnFire();
          pushCallout(s, makeCallout(randomCallout(CALLOUT_POOL.onFire), 'large', '#FF4500', 'rgba(255,69,0,0.8)', `${s.awayStreak} GOAL STREAK`));
          s.screenFlash = 1.0;
          s.screenFlashColor = '#FF4500';
          s.hitFreeze = 6;
        }

        // Announcer callout for away goal
        if (pts >= 3) {
          pushCallout(s, makeCallout(randomCallout(CALLOUT_POOL.goal3pt), 'large', '#FFD700', 'rgba(255,215,0,0.8)', `+${pts} POINTS`));
        } else {
          pushCallout(s, makeCallout(randomCallout(CALLOUT_POOL.goal1pt), 'medium', '#FFB800', 'rgba(255,184,0,0.6)', `+${pts} POINT`));
        }
        playAnnouncerStinger();

        // Juice effects
        s.hitFreeze = Math.max(s.hitFreeze, pts >= 3 ? 5 : 3);
        s.screenFlash = Math.max(s.screenFlash, 0.7);
        s.screenFlashColor = '#FFD700';

        s.momentumBoost = MOMENTUM.POST_GOAL_BOOST_DURATION;
        s.momentumTeam = 'away';

        s.slowMo = CAMERA.SLOW_MO_DURATION;
        s.cameraZoom = CAMERA.GOAL_ZOOM;
        s.lastGoalReplay = { shooterPos: { ...lastShooterPos }, goalSide: 'left' };

        if (s.isOvertime) {
          pushCallout(s, makeCallout('GAME OVER!', 'large', '#FFD700', 'rgba(255,215,0,0.8)', 'SUDDEN DEATH WINNER'));
          s.hitFreeze = 8;
          s.isPlaying = false;
          stateRef.current = s;
          setGameState({ ...s });
          runningRef.current = false;
          return;
        }
        resetPositions(s, 'home');
      }

      // Runoff Zone — ball entering the 10ft zone behind goals resets to center
      if (s.ball.pos.x < -RUNOFF.DEPTH) {
        fireEvent(s, { type: 'RUNOFF_RESET', side: 'left' });
        resetPositions(s, s.possession === 'home' ? 'away' : 'home');
      } else if (s.ball.pos.x > COURT.WIDTH + RUNOFF.DEPTH) {
        fireEvent(s, { type: 'RUNOFF_RESET', side: 'right' });
        resetPositions(s, s.possession === 'home' ? 'away' : 'home');
      }
      // Standard out of bounds (sidelines)
      if (s.ball.pos.y < -10 || s.ball.pos.y > COURT.HEIGHT + 10) {
        resetPositions(s, s.possession === 'home' ? 'away' : 'home');
      }

      // ---- REBOUND GRAB (jumping players can grab high rebounds) ----
      if (s.ball.carrier === null && s.ball.isRebound && s.ball.z > JUMP.REBOUND_GRAB_HEIGHT) {
        let reboundGrabber: PlayerState | null = null;
        let reboundDist = Infinity;
        for (const pl of s.players) {
          if (pl.isJumping && pl.jumpZ > JUMP.REBOUND_GRAB_HEIGHT * 0.5) {
            const d2 = dist(pl.pos, s.ball.pos);
            if (d2 < JUMP.REBOUND_GRAB_RANGE && d2 < reboundDist) {
              reboundDist = d2;
              reboundGrabber = pl;
            }
          }
        }
        if (reboundGrabber) {
          reboundGrabber.hasBall = true;
          reboundGrabber.holdTimer = 0;
          reboundGrabber.receiveTime = 0;
          s.ball.carrier = reboundGrabber.id;
          s.ball.vel = { x: 0, y: 0 };
          s.ball.z = reboundGrabber.jumpZ * 0.5;
          s.ball.vz = 0;
          s.ball.isRebound = false;
          s.ball.lastPasser = null;
          s.ball.passIntended = null;
          const isHome = reboundGrabber.id < 3;
          const newPoss: 'home' | 'away' = isHome ? 'home' : 'away';
          if (s.possession !== newPoss) {
            s.possession = newPoss;
            s.shotClock = MATCH.SHOT_CLOCK;
          }
          fireEvent(s, { type: 'REBOUND', by: reboundGrabber.teamId });
          s.crowdEnergy = Math.min(1, s.crowdEnergy + 0.15);
        }
      }

      // ---- BALL PICKUP (with pass priority) — only when ball is near ground ----
      if (s.ball.carrier === null && s.ball.z < 15) {
        if (s.ball.passIntended !== null) {
          const intended = s.players[s.ball.passIntended];
          if (intended && dist(intended.pos, s.ball.pos) < BALL.PASS_RECEIVE_RADIUS) {
            intended.hasBall = true;
            intended.holdTimer = 0;
            intended.receiveTime = 0;
            intended.postPassVulnerable = STEAL_WINDOWS.POST_PASS_VULNERABLE_MS;
            s.ball.carrier = intended.id;
            s.ball.vel = { x: 0, y: 0 };
            s.ball.lastPasser = null;
            s.ball.passIntended = null;
            const isHome = intended.id < 3;
            const newPoss: 'home' | 'away' = isHome ? 'home' : 'away';
            if (s.possession !== newPoss) {
              s.possession = newPoss;
              s.shotClock = MATCH.SHOT_CLOCK;
            }
          }
        }

        if (s.ball.carrier === null) {
          let pickupPlayer: PlayerState | null = null;
          let pickupDist = Infinity;
          for (const pl of s.players) {
            const d2 = dist(pl.pos, s.ball.pos);
            if (d2 < pickupDist) { pickupDist = d2; pickupPlayer = pl; }
          }
          if (pickupPlayer && pickupDist < BALL.LOOSE_BALL_PICKUP) {
            if (s.ball.passIntended !== null && pickupPlayer.id !== s.ball.passIntended) {
              const intended = s.players[s.ball.passIntended];
              if (intended && dist(intended.pos, s.ball.pos) < BALL.PASS_RECEIVE_RADIUS * 1.5) {
                pickupPlayer = intended;
              }
            }

            pickupPlayer.hasBall = true;
            pickupPlayer.holdTimer = 0;
            pickupPlayer.receiveTime = 0;
            pickupPlayer.postPassVulnerable = STEAL_WINDOWS.POST_PASS_VULNERABLE_MS;
            s.ball.carrier = pickupPlayer.id;
            s.ball.vel = { x: 0, y: 0 };
            s.ball.lastPasser = null;
            s.ball.passIntended = null;
            const isHome = pickupPlayer.id < 3;
            const newPoss: 'home' | 'away' = isHome ? 'home' : 'away';
            if (s.possession !== newPoss) {
              s.possession = newPoss;
              s.shotClock = MATCH.SHOT_CLOCK;
            }
          }
        }
      }
    }

    // ---- RENDER ----
    stateRef.current = s;
    if (timestamp - lastRenderRef.current >= RENDER_INTERVAL) {
      lastRenderRef.current = timestamp;
      setGameState({ ...s });
    }
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [resetPositions, fireEvent]);

  // ========== PUBLIC API ==========
  const startGame = useCallback(() => {
    const s = stateRef.current;
    if (s) {
      s.isPlaying = true;
      s.countdown = 3;
      timerAccRef.current = 0;
      lastTimeRef.current = 0;
      lastRenderRef.current = 0;
      runningRef.current = true;
      actionQueueRef.current = [];
      animFrameRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameLoop]);

  const stopGame = useCallback(() => {
    runningRef.current = false;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    };
  }, []);

  return { gameState, initGame, startGame, stopGame, setJoystick, triggerAction };
}

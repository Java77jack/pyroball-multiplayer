/**
 * Practice Mode Game Engine
 * A simplified version of the main game engine focused on drill training.
 * - Only 1 team (home) + optional dummy defenders
 * - Tracks drill-specific objectives (combos, goals, passes)
 * - Provides real-time feedback and progress
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  COURT, GOAL, PLAYER, BALL, ZONES, RUNOFF, DASHER_BOARDS,
  BACKBOARD, JUMP, SPIN, SHOT_METER, ON_FIRE, ANNOUNCER, CAMERA,
  PLAYER_NAMES,
  type Vec2, type PlayerState, type BallState, type GameState, type GameEvent,
  type AnnouncerCallout,
} from '@/lib/gameConstants';
import {
  playGoalHorn, playBallKick, playPass, playStealBuzzer,
  playWhistle, playSwitchPlayer, playCountdownBeep,
  playPerfectRelease, playPowerShot, playOnFire,
  playAnnouncerStinger, playBigImpact,
} from '@/lib/soundEngine';
import type { DrillDef } from '@/pages/Practice';

// ========== DRILL PROGRESS STATE ==========
export interface DrillProgress {
  drillId: string;
  completed: number;    // How many objectives completed
  target: number;       // How many needed
  attempts: number;     // Total attempts
  timeRemaining: number;
  isComplete: boolean;
  isFailed: boolean;
  feedback: string;     // Current feedback message
  feedbackTimer: number;
  feedbackColor: string;
  grade: 'S' | 'A' | 'B' | 'C' | 'F' | null;
  // Chain combo tracking
  chainPhase: number;   // 0=none, 1=no-look pass done, 2=switched to receiver, 3=scored
}

// ========== HELPERS ==========
function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}
function clamp(val: number, min: number, max: number) { return Math.max(min, Math.min(max, val)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function dist(a: Vec2, b: Vec2) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }

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

// ========== FACTORY ==========
function makePlayer(id: number, teamId: string, pos: Vec2, number: number, hasBall: boolean, isControlled: boolean): PlayerState {
  const names = PLAYER_NAMES[teamId] || ['P1', 'P2', 'P3'];
  const nameIdx = id < 3 ? id : id - 3;
  return {
    id, teamId, name: names[nameIdx] || `P${nameIdx + 1}`,
    pos: { ...pos }, vel: { x: 0, y: 0 }, number,
    hasBall, isControlled, stealCooldown: 0, holdTimer: 0,
    passTarget: null, shootCooldown: 0,
    defPersonality: 0,
    postPassVulnerable: 0,
    selfishCount: 0,
    receiveTime: 0,
    jumpZ: 0, jumpVZ: 0, isJumping: false, jumpCooldown: 0,
    spinAngle: 0, isSpinning: false, spinTimer: 0, spinCooldown: 0,
  };
}

function createPracticePlayers(teamId: string, drillId: string): PlayerState[] {
  const cx = COURT.WIDTH / 2;
  const cy = COURT.HEIGHT / 2;

  // Home team (player's team) — always 3 players
  const homePlayers = [
    makePlayer(0, teamId, { x: cx - 80, y: cy }, 7, true, true),
    makePlayer(1, teamId, { x: cx - 200, y: cy - 100 }, 11, false, false),
    makePlayer(2, teamId, { x: cx - 200, y: cy + 100 }, 23, false, false),
  ];

  // Dummy defenders for certain drills
  const dummyTeam = teamId === 'inferno' ? 'vortex' : 'inferno';
  let awayPlayers: PlayerState[];

  if (drillId === 'on_fire_sprint') {
    // Full away team for ON FIRE drill
    awayPlayers = [
      makePlayer(3, dummyTeam, { x: cx + 120, y: cy }, 1, false, false),
      makePlayer(4, dummyTeam, { x: cx + 200, y: cy - 100 }, 5, false, false),
      makePlayer(5, dummyTeam, { x: cx + 200, y: cy + 100 }, 88, false, false),
    ];
  } else if (drillId === 'spin_shot' || drillId === 'aerial_tornado') {
    // Stationary defenders to practice against
    awayPlayers = [
      makePlayer(3, dummyTeam, { x: cx + 150, y: cy }, 1, false, false),
      makePlayer(4, dummyTeam, { x: cx + 250, y: cy - 80 }, 5, false, false),
      makePlayer(5, dummyTeam, { x: cx + 250, y: cy + 80 }, 88, false, false),
    ];
  } else {
    // Minimal defenders — stand near goal
    awayPlayers = [
      makePlayer(3, dummyTeam, { x: COURT.WIDTH - 80, y: cy }, 1, false, false),
      makePlayer(4, dummyTeam, { x: COURT.WIDTH - 60, y: cy - 70 }, 5, false, false),
      makePlayer(5, dummyTeam, { x: COURT.WIDTH - 60, y: cy + 70 }, 88, false, false),
    ];
  }

  return [...homePlayers, ...awayPlayers];
}

function createBall(carrier: PlayerState): BallState {
  return {
    pos: { ...carrier.pos }, vel: { x: 0, y: 0 },
    z: 0, vz: 0,
    carrier: carrier.id, lastPasser: null, passIntended: null,
    isRebound: false, lastShooter: null,
  };
}

function getGoalCenter(side: 'left' | 'right'): Vec2 {
  return { x: side === 'left' ? 0 : COURT.WIDTH, y: COURT.HEIGHT / 2 };
}

function isInGoal(ballPos: Vec2, side: 'left' | 'right'): boolean {
  const goalHalfW = GOAL.WIDTH / 2;
  const goalTop = COURT.HEIGHT / 2 - goalHalfW;
  const goalBot = COURT.HEIGHT / 2 + goalHalfW;
  if (side === 'right') {
    return ballPos.x >= COURT.WIDTH - GOAL.NET_DEPTH && ballPos.y >= goalTop && ballPos.y <= goalBot;
  }
  return ballPos.x <= GOAL.NET_DEPTH && ballPos.y >= goalTop && ballPos.y <= goalBot;
}

function getZone(pos: Vec2): number {
  const cx = COURT.WIDTH / 2;
  const cy = COURT.HEIGHT / 2;
  const dx = pos.x - cx;
  const dy = pos.y - cy;
  if (Math.sqrt(dx * dx + dy * dy) <= ZONES.CORE.radius) return ZONES.CORE.points;
  const shaftHalf = ZONES.CORE_SHAFT.width / 2;
  if (pos.y >= cy - shaftHalf && pos.y <= cy + shaftHalf) return ZONES.CORE_SHAFT.points;
  return ZONES.MID.points;
}

// ========== PRACTICE ENGINE HOOK ==========
export function usePracticeEngine(teamId: string, drill: DrillDef) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [drillProgress, setDrillProgress] = useState<DrillProgress>({
    drillId: drill.id,
    completed: 0,
    target: drill.targetCount,
    attempts: 0,
    timeRemaining: drill.timeLimit,
    isComplete: false,
    isFailed: false,
    feedback: '',
    feedbackTimer: 0,
    feedbackColor: '#FFFFFF',
    grade: null,
    chainPhase: 0,
  });

  const stateRef = useRef<GameState | null>(null);
  const progressRef = useRef<DrillProgress>(drillProgress);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const timerAccRef = useRef<number>(0);
  const joystickRef = useRef<Vec2>({ x: 0, y: 0 });
  const actionQueueRef = useRef<string[]>([]);
  const runningRef = useRef(false);
  const lastRenderRef = useRef<number>(0);
  const RENDER_INTERVAL = 33;

  // Track combo state for drill detection
  const lastComboRef = useRef<string | null>(null);
  const lastPassWasNoLook = useRef(false);
  const passReceiverRef = useRef<number | null>(null);

  const initGame = useCallback(() => {
    const players = createPracticePlayers(teamId, drill.id);
    const dummyTeam = teamId === 'inferno' ? 'vortex' : 'inferno';
    const state: GameState = {
      players,
      ball: createBall(players[0]),
      score: { home: 0, away: 0 },
      homeTeam: teamId,
      awayTeam: dummyTeam,
      timer: drill.timeLimit > 0 ? drill.timeLimit : 9999,
      shotClock: 999, // No shot clock in practice
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
        active: false, charge: 0, playerId: null,
        fillSpeed: SHOT_METER.FILL_SPEED * 0.85, // Slightly slower for practice
        greenStart: SHOT_METER.GREEN_START,
        greenEnd: SHOT_METER.GREEN_END,
        underPressure: false, isOpen: true,
        result: 'none', resultTimer: 0,
      },
      lastCombo: null, lastComboTimer: 0, comboCount: 0,
      onFireTeam: null, onFireTimer: 0, homeStreak: 0, awayStreak: 0,
      announcer: [],
      hitFreeze: 0, speedLines: 0, screenFlash: 0, screenFlashColor: '#FFFFFF',
    };
    stateRef.current = state;
    progressRef.current = {
      drillId: drill.id,
      completed: 0,
      target: drill.targetCount,
      attempts: 0,
      timeRemaining: drill.timeLimit,
      isComplete: false,
      isFailed: false,
      feedback: '',
      feedbackTimer: 0,
      feedbackColor: '#FFFFFF',
      grade: null,
      chainPhase: 0,
    };
    setGameState({ ...state });
    setDrillProgress({ ...progressRef.current });
  }, [teamId, drill]);

  const setJoystick = useCallback((v: Vec2) => { joystickRef.current = v; }, []);
  const triggerAction = useCallback((action: string) => { actionQueueRef.current.push(action); }, []);

  const fireEvent = useCallback((s: GameState, evt: GameEvent) => {
    s.currentEvent = evt;
    s.eventTimer = 1.2;
  }, []);

  const setFeedback = useCallback((text: string, color: string = '#FFFFFF') => {
    progressRef.current.feedback = text;
    progressRef.current.feedbackTimer = 2.0;
    progressRef.current.feedbackColor = color;
  }, []);

  const resetPositions = useCallback((s: GameState) => {
    const cx = COURT.WIDTH / 2;
    const cy = COURT.HEIGHT / 2;
    const homePos = [{ x: cx - 80, y: cy }, { x: cx - 200, y: cy - 100 }, { x: cx - 200, y: cy + 100 }];

    // Reset home players
    for (let i = 0; i < 3; i++) {
      s.players[i].pos = { ...homePos[i] };
      s.players[i].vel = { x: 0, y: 0 };
      s.players[i].hasBall = i === 0;
      s.players[i].isControlled = i === 0;
      s.players[i].stealCooldown = 0;
      s.players[i].holdTimer = 0;
      s.players[i].passTarget = null;
      s.players[i].shootCooldown = 0;
      s.players[i].jumpZ = 0; s.players[i].jumpVZ = 0;
      s.players[i].isJumping = false; s.players[i].jumpCooldown = 0;
      s.players[i].spinAngle = 0; s.players[i].isSpinning = false;
      s.players[i].spinTimer = 0; s.players[i].spinCooldown = 0;
    }

    // Reset away players to their starting positions
    if (drill.id === 'on_fire_sprint') {
      const awayPos = [{ x: cx + 120, y: cy }, { x: cx + 200, y: cy - 100 }, { x: cx + 200, y: cy + 100 }];
      for (let i = 3; i < 6; i++) {
        s.players[i].pos = { ...awayPos[i - 3] };
        s.players[i].vel = { x: 0, y: 0 };
        s.players[i].hasBall = false;
      }
    }

    s.ball = createBall(s.players[0]);
    s.possession = 'home';
    s.passChain = 0;
    lastPassWasNoLook.current = false;
    passReceiverRef.current = null;
  }, [drill.id]);

  // ========== GAME LOOP ==========
  const gameLoop = useCallback((timestamp: number) => {
    if (!runningRef.current) return;
    const s = stateRef.current;
    const p = progressRef.current;
    if (!s) { animFrameRef.current = requestAnimationFrame(gameLoop); return; }

    // Check if drill is complete or failed
    if (p.isComplete || p.isFailed) {
      setGameState({ ...s });
      setDrillProgress({ ...p });
      runningRef.current = false;
      return;
    }

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

    // Slow-mo
    if (s.slowMo > 0) {
      dt *= CAMERA.SLOW_MO_FACTOR;
      s.slowMo -= rawDt;
      if (s.slowMo <= 0) { s.slowMo = 0; s.cameraZoom = lerp(s.cameraZoom, CAMERA.DEFAULT_ZOOM, 0.1); }
    }

    // ---- COUNTDOWN ----
    if (s.countdown > 0) {
      timerAccRef.current += rawDt;
      if (timerAccRef.current >= 1) {
        s.countdown--;
        timerAccRef.current = 0;
        if (s.countdown > 0) playCountdownBeep();
        else playWhistle();
      }
      stateRef.current = s;
      if (timestamp - lastRenderRef.current >= RENDER_INTERVAL) {
        lastRenderRef.current = timestamp;
        setGameState({ ...s });
      }
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // ---- HIT FREEZE ----
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
    if (s.lastComboTimer > 0) {
      s.lastComboTimer = Math.max(0, s.lastComboTimer - dt);
      if (s.lastComboTimer <= 0) s.lastCombo = null;
    }
    if (s.speedLines > 0) s.speedLines = Math.max(0, s.speedLines - dt * 3);
    if (s.screenFlash > 0) s.screenFlash = Math.max(0, s.screenFlash - dt * 5);

    // ON FIRE timer
    if (s.onFireTimer > 0) {
      s.onFireTimer -= dt;
      if (s.onFireTimer <= 0) { s.onFireTeam = null; s.onFireTimer = 0; }
    }

    // Announcer decay
    s.announcer = s.announcer.filter(c => {
      c.timer -= dt;
      return c.timer > 0;
    });

    // Feedback timer
    if (p.feedbackTimer > 0) {
      p.feedbackTimer -= dt;
      if (p.feedbackTimer <= 0) { p.feedback = ''; }
    }

    // ---- MATCH TIMER ----
    if (drill.timeLimit > 0) {
      p.timeRemaining -= dt;
      if (p.timeRemaining <= 0) {
        p.timeRemaining = 0;
        p.isFailed = true;
        p.grade = 'F';
        pushCallout(s, makeCallout('TIME\'S UP!', 'large', '#FF0000', 'rgba(255,0,0,0.6)'));
        setDrillProgress({ ...p });
        setGameState({ ...s });
        runningRef.current = false;
        return;
      }
      s.timer = p.timeRemaining;
    }

    // ---- PROCESS ACTIONS ----
    const actions = actionQueueRef.current.splice(0);
    const joy = joystickRef.current;

    // Find controlled player
    const controlled = s.players.find(pl => pl.isControlled && pl.id < 3);
    if (!controlled) {
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    for (const action of actions) {
      if (action === 'switch') {
        // Switch to next home player
        const homeP = s.players.filter(pl => pl.id < 3);
        const curIdx = homeP.findIndex(pl => pl.isControlled);
        homeP.forEach(pl => pl.isControlled = false);
        const nextIdx = (curIdx + 1) % homeP.length;
        homeP[nextIdx].isControlled = true;
        playSwitchPlayer();

        // Chain combo tracking: if we just did a no-look pass, check if we switched to receiver
        if (p.chainPhase === 1 && passReceiverRef.current !== null) {
          if (homeP[nextIdx].id === passReceiverRef.current) {
            p.chainPhase = 2;
            setFeedback('SWITCHED! Now score!', '#FFB800');
          }
        }
      }

      if (action === 'jump' && !controlled.isJumping && controlled.jumpCooldown <= 0) {
        controlled.isJumping = true;
        controlled.jumpVZ = JUMP.POWER;
        controlled.jumpCooldown = JUMP.COOLDOWN;
      }

      if (action === 'spin' && !controlled.isSpinning && controlled.spinCooldown <= 0) {
        controlled.isSpinning = true;
        controlled.spinTimer = SPIN.DURATION;
        controlled.spinCooldown = SPIN.COOLDOWN;
      }

      if (action === 'pass' && controlled.hasBall) {
        // Find best pass target (home team only)
        const teammates = s.players.filter(pl => pl.id < 3 && pl.id !== controlled.id);
        if (teammates.length > 0) {
          // Pick closest teammate in front
          let best = teammates[0];
          let bestScore = -Infinity;
          for (const tm of teammates) {
            const dx = tm.pos.x - controlled.pos.x;
            const d = dist(controlled.pos, tm.pos);
            const score = dx / (d + 1) * 100 - d;
            if (score > bestScore) { bestScore = score; best = tm; }
          }

          // Check if this is a no-look pass (spinning)
          const isNoLook = controlled.isSpinning;

          controlled.hasBall = false;
          const dir = normalize({ x: best.pos.x - controlled.pos.x, y: best.pos.y - controlled.pos.y });
          const passSpeed = PLAYER.PASS_POWER * (isNoLook ? 1.3 : 1.0);
          s.ball.carrier = null;
          s.ball.vel = { x: dir.x * passSpeed, y: dir.y * passSpeed };
          // Ball released from hand (higher up) with forward offset
          s.ball.pos = { x: controlled.pos.x + dir.x * 12, y: controlled.pos.y + dir.y * 12 - 8 };
          s.ball.passIntended = best.id;
          s.ball.lastPasser = controlled.id;
          playPass();

          if (isNoLook) {
            lastPassWasNoLook.current = true;
            passReceiverRef.current = best.id;
            s.lastCombo = 'NO-LOOK PASS';
            s.lastComboTimer = 2.0;
            s.comboCount++;
            pushCallout(s, makeCallout('NO-LOOK PASS!', 'medium', '#9B59B6', 'rgba(155,89,182,0.6)'));
            playAnnouncerStinger();

            // Track for no_look_pass drill
            if (drill.id === 'no_look_pass') {
              p.completed++;
              p.attempts++;
              setFeedback(`NO-LOOK PASS! (${p.completed}/${p.target})`, '#9B59B6');
              if (p.completed >= p.target) {
                p.isComplete = true;
                p.grade = p.attempts <= p.target + 2 ? 'S' : p.attempts <= p.target + 5 ? 'A' : 'B';
                pushCallout(s, makeCallout('DRILL COMPLETE!', 'large', '#00FF00', 'rgba(0,255,0,0.6)'));
              }
            }

            // Chain combo tracking
            if (drill.id === 'chain_combo') {
              p.chainPhase = 1;
              setFeedback('NO-LOOK PASS! Switch to receiver!', '#9B59B6');
            }
          }
        }
      }

      // ---- SHOOTING ----
      if (action === 'shootStart' && controlled.hasBall && !s.shotMeter.active) {
        s.shotMeter.active = true;
        s.shotMeter.charge = 0;
        s.shotMeter.playerId = controlled.id;
        s.shotMeter.result = 'none';
        s.shotMeter.resultTimer = 0;
        s.shotMeter.isOpen = true;
        s.shotMeter.underPressure = false;

        // Check if any defender is nearby
        const defenders = s.players.filter(pl => pl.id >= 3);
        const closestDef = defenders.reduce((best, d) => {
          const dd = dist(controlled.pos, d.pos);
          return dd < best ? dd : best;
        }, Infinity);
        if (closestDef < SHOT_METER.PRESSURE_RANGE) {
          s.shotMeter.underPressure = true;
        }
      }

      if (action === 'shootRelease' && s.shotMeter.active && controlled.hasBall) {
        const charge = s.shotMeter.charge;
        let result: 'weak' | 'green' | 'yellow' | 'red' = 'weak';
        const gs = s.shotMeter.greenStart;
        const ge = s.shotMeter.greenEnd;
        if (charge < SHOT_METER.WEAK_END) result = 'weak';
        else if (charge >= gs && charge <= ge) result = 'green';
        else if (charge < gs || charge <= SHOT_METER.YELLOW_END) result = 'yellow';
        else result = 'red';

        s.shotMeter.result = result;
        s.shotMeter.resultTimer = 0.8;
        s.shotMeter.active = false;

        // Detect combo type
        let comboName: string | null = null;
        if (controlled.isJumping && controlled.isSpinning) {
          comboName = 'AERIAL TORNADO';
        } else if (controlled.isJumping) {
          comboName = 'AERIAL SHOT';
        } else if (controlled.isSpinning) {
          comboName = 'SPIN SHOT';
        }

        if (comboName) {
          s.lastCombo = comboName;
          s.lastComboTimer = 2.5;
          s.comboCount++;
          lastComboRef.current = comboName;
        }

        // Calculate shot
        let power = PLAYER.SHOOT_POWER;
        let accuracy = 1.0;

        if (result === 'green') { power *= SHOT_METER.GREEN_POWER; accuracy *= SHOT_METER.GREEN_ACCURACY; playPerfectRelease(); }
        else if (result === 'yellow') { power *= SHOT_METER.YELLOW_POWER; accuracy *= SHOT_METER.YELLOW_ACCURACY; }
        else if (result === 'red') { power *= SHOT_METER.RED_POWER; accuracy *= SHOT_METER.RED_ACCURACY; }
        else { power *= SHOT_METER.WEAK_POWER; accuracy *= SHOT_METER.WEAK_ACCURACY; }

        // Combo bonuses
        if (comboName === 'AERIAL TORNADO') {
          power *= 2.0;
          accuracy *= 1.5;
          s.slowMo = CAMERA.SLOW_MO_DURATION;
          s.cameraZoom = CAMERA.GOAL_ZOOM;
          s.hitFreeze = 5;
          s.speedLines = 1.0;
          pushCallout(s, makeCallout('AERIAL TORNADO!', 'large', '#FF4500', 'rgba(255,69,0,0.6)'));
          playBigImpact();
        } else if (comboName === 'AERIAL SHOT') {
          power *= 1.3;
          accuracy *= 1.2;
          pushCallout(s, makeCallout('AERIAL SHOT!', 'medium', '#00B4D8', 'rgba(0,180,216,0.6)'));
          playAnnouncerStinger();
        } else if (comboName === 'SPIN SHOT') {
          power *= 1.4;
          accuracy *= 1.3;
          pushCallout(s, makeCallout('SPIN SHOT!', 'medium', '#FF6B00', 'rgba(255,107,0,0.6)'));
          playAnnouncerStinger();
        }

        // Fire toward right goal
        const goalCenter = getGoalCenter('right');
        const dx = goalCenter.x - controlled.pos.x;
        const dy = goalCenter.y - controlled.pos.y;
        const spread = (1.0 - accuracy) * 80;
        const aimY = dy + (Math.random() - 0.5) * spread;
        const dir = normalize({ x: dx, y: aimY });

        controlled.hasBall = false;
        s.ball.carrier = null;
        s.ball.vel = { x: dir.x * power, y: dir.y * power };
        // Ball released from hand (higher up) with forward offset
        s.ball.pos = { x: controlled.pos.x + dir.x * 12, y: controlled.pos.y + dir.y * 12 - 10 };
        s.ball.z = controlled.jumpZ || 0;
        s.ball.vz = controlled.isJumping ? 3 : 2;
        s.ball.lastShooter = controlled.id;
        controlled.shootCooldown = 0.5;
        playBallKick();

        p.attempts++;
      }

      if (action === 'steal') {
        // In practice, steal does nothing meaningful
      }
    }

    // ---- SHOT METER FILL ----
    if (s.shotMeter.active) {
      const fillMult = s.shotMeter.underPressure ? SHOT_METER.PRESSURE_FILL_MULT : (s.shotMeter.isOpen ? SHOT_METER.OPEN_FILL_MULT : 1.0);
      s.shotMeter.charge = Math.min(1.0, s.shotMeter.charge + s.shotMeter.fillSpeed * fillMult * dt);
    }
    if (s.shotMeter.resultTimer > 0) {
      s.shotMeter.resultTimer -= dt;
      if (s.shotMeter.resultTimer <= 0) { s.shotMeter.result = 'none'; }
    }

    // ---- PLAYER MOVEMENT ----
    // Controlled player follows joystick with smooth acceleration
    if (controlled && !s.shotMeter.active) {
      const speed = PLAYER.SPEED;
      const mag = Math.sqrt(joy.x * joy.x + joy.y * joy.y);
      const acceleration = 0.15;
      const deceleration = 0.12;
      
      if (mag > 0.1) {
        const targetVel = { x: joy.x * speed, y: joy.y * speed };
        controlled.vel.x += (targetVel.x - controlled.vel.x) * acceleration;
        controlled.vel.y += (targetVel.y - controlled.vel.y) * acceleration;
      } else {
        controlled.vel.x *= (1 - deceleration);
        controlled.vel.y *= (1 - deceleration);
      }
    } else if (controlled && s.shotMeter.active) {
      controlled.vel.x = 0;
      controlled.vel.y = 0;
    }

    // Move all home players
    for (let i = 0; i < 3; i++) {
      const pl = s.players[i];

      // AI teammates follow loosely
      if (!pl.isControlled && !pl.hasBall) {
        // Teammates spread out and move toward goal
        const targetX = Math.min(COURT.WIDTH - 100, controlled.pos.x + 120 + (i - 1) * 50);
        const targetY = COURT.HEIGHT / 2 + (i === 1 ? -120 : i === 2 ? 120 : 0);
        const dx = targetX - pl.pos.x;
        const dy = targetY - pl.pos.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 20) {
          const spd = PLAYER.AI_SPEED * 0.8;
          pl.vel.x = (dx / d) * spd;
          pl.vel.y = (dy / d) * spd;
        } else {
          pl.vel.x = 0;
          pl.vel.y = 0;
        }
      }

      // Apply velocity
      pl.pos.x += pl.vel.x;
      pl.pos.y += pl.vel.y;

      // Clamp to court
      pl.pos.x = clamp(pl.pos.x, PLAYER.RADIUS, COURT.WIDTH - PLAYER.RADIUS);
      pl.pos.y = clamp(pl.pos.y, PLAYER.RADIUS, COURT.HEIGHT - PLAYER.RADIUS);

      // Jump physics
      if (pl.isJumping) {
        pl.jumpVZ -= JUMP.GRAVITY;
        pl.jumpZ += pl.jumpVZ;
        if (pl.jumpZ <= 0) {
          pl.jumpZ = 0;
          pl.jumpVZ = 0;
          pl.isJumping = false;
        }
      }
      if (pl.jumpCooldown > 0) pl.jumpCooldown -= dt;

      // Spin physics
      if (pl.isSpinning) {
        pl.spinTimer -= dt;
        pl.spinAngle += SPIN.ROTATION_SPEED * dt;
        if (pl.spinTimer <= 0) {
          pl.isSpinning = false;
          pl.spinAngle = 0;
        }
      }
      if (pl.spinCooldown > 0) pl.spinCooldown -= dt;

      // Cooldowns
      if (pl.shootCooldown > 0) pl.shootCooldown -= dt;
    }

    // ---- DUMMY DEFENDER AI (minimal) ----
    if (drill.id === 'on_fire_sprint') {
      for (let i = 3; i < 6; i++) {
        const def = s.players[i];
        const ballCarrier = s.players.find(pl => pl.hasBall && pl.id < 3);
        if (ballCarrier) {
          const dx = ballCarrier.pos.x - def.pos.x;
          const dy = ballCarrier.pos.y - def.pos.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > 40) {
            const spd = PLAYER.AI_SPEED * 0.5; // Slow defenders for practice
            def.vel.x = (dx / d) * spd;
            def.vel.y = (dy / d) * spd;
          } else {
            def.vel.x = 0;
            def.vel.y = 0;
          }
        }
        def.pos.x += def.vel.x;
        def.pos.y += def.vel.y;
        def.pos.x = clamp(def.pos.x, PLAYER.RADIUS, COURT.WIDTH - PLAYER.RADIUS);
        def.pos.y = clamp(def.pos.y, PLAYER.RADIUS, COURT.HEIGHT - PLAYER.RADIUS);
      }
    }

    // ---- BALL PHYSICS ----
    if (s.ball.carrier !== null) {
      const carrier = s.players[s.ball.carrier];
      s.ball.pos = { ...carrier.pos };
      s.ball.z = carrier.jumpZ;
    } else {
      s.ball.pos.x += s.ball.vel.x;
      s.ball.pos.y += s.ball.vel.y;
      s.ball.vel.x *= BALL.FRICTION;
      s.ball.vel.y *= BALL.FRICTION;

      // Ball Z (arc)
      if (s.ball.z > 0 || s.ball.vz > 0) {
        s.ball.vz -= 0.2;
        s.ball.z += s.ball.vz;
        if (s.ball.z <= 0) { s.ball.z = 0; s.ball.vz = 0; }
      }

      // Ball boundary bounce
      if (s.ball.pos.y < BALL.RADIUS || s.ball.pos.y > COURT.HEIGHT - BALL.RADIUS) {
        s.ball.vel.y *= -0.6;
        s.ball.pos.y = clamp(s.ball.pos.y, BALL.RADIUS, COURT.HEIGHT - BALL.RADIUS);
      }

      // ---- GOAL CHECK (right goal only in practice) ----
      if (isInGoal(s.ball.pos, 'right') && s.ball.z < BACKBOARD.HEIGHT_BOTTOM) {
        // GOAL!
        const zone = s.ball.lastShooter !== null ? getZone(s.players[s.ball.lastShooter].pos) : 1;
        s.score.home += zone;
        s.goalFlash = 1;
        s.goalFlashTeam = s.homeTeam;
        s.cameraShake = 1.0;
        s.screenFlash = 1.0;
        s.screenFlashColor = '#FFB800';
        s.hitFreeze = 5;
        playGoalHorn();

        const comboUsed = lastComboRef.current;
        lastComboRef.current = null;

        // Drill-specific goal tracking
        if (drill.id === 'aerial_shot' && comboUsed === 'AERIAL SHOT') {
          p.completed++;
          setFeedback(`AERIAL SHOT GOAL! (${p.completed}/${p.target})`, '#00B4D8');
          pushCallout(s, makeCallout('NICE!', 'medium', '#00FF00', 'rgba(0,255,0,0.6)', `Aerial Shot ${p.completed}/${p.target}`));
        } else if (drill.id === 'aerial_shot' && comboUsed === 'AERIAL TORNADO') {
          // Aerial tornado counts as aerial shot too
          p.completed++;
          setFeedback(`AERIAL TORNADO GOAL! (${p.completed}/${p.target})`, '#FF4500');
          pushCallout(s, makeCallout('BONUS!', 'medium', '#FF4500', 'rgba(255,69,0,0.6)', `Counts as Aerial! ${p.completed}/${p.target}`));
        } else if (drill.id === 'spin_shot' && comboUsed === 'SPIN SHOT') {
          p.completed++;
          setFeedback(`SPIN SHOT GOAL! (${p.completed}/${p.target})`, '#FF6B00');
          pushCallout(s, makeCallout('NICE!', 'medium', '#00FF00', 'rgba(0,255,0,0.6)', `Spin Shot ${p.completed}/${p.target}`));
        } else if (drill.id === 'aerial_tornado' && comboUsed === 'AERIAL TORNADO') {
          p.completed++;
          setFeedback(`AERIAL TORNADO! (${p.completed}/${p.target})`, '#FF4500');
          pushCallout(s, makeCallout('INCREDIBLE!', 'large', '#FF4500', 'rgba(255,69,0,0.6)', `Tornado ${p.completed}/${p.target}`));
        } else if (drill.id === 'chain_combo' && p.chainPhase === 2) {
          p.completed++;
          p.chainPhase = 0;
          setFeedback(`CHAIN COMBO! (${p.completed}/${p.target})`, '#FFB800');
          pushCallout(s, makeCallout('CHAIN COMBO!', 'large', '#FFB800', 'rgba(255,184,0,0.6)', `${p.completed}/${p.target}`));
          s.speedLines = 1.0;
        } else if (drill.id === 'on_fire_sprint') {
          s.homeStreak++;
          if (s.homeStreak >= ON_FIRE.STREAK_THRESHOLD && !s.onFireTeam) {
            s.onFireTeam = 'home';
            s.onFireTimer = ON_FIRE.DURATION;
            p.completed = 1;
            p.isComplete = true;
            p.grade = 'S';
            pushCallout(s, makeCallout('ON FIRE!', 'large', '#FF0000', 'rgba(255,0,0,0.6)', 'DRILL COMPLETE!'));
            playOnFire();
            s.screenFlash = 1.0;
            s.screenFlashColor = '#FF4500';
            s.hitFreeze = 8;
            s.speedLines = 1.0;
          } else {
            setFeedback(`GOAL! Streak: ${s.homeStreak}/${ON_FIRE.STREAK_THRESHOLD}`, '#FFB800');
            pushCallout(s, makeCallout('SCORES!', 'medium', '#FFB800', 'rgba(255,184,0,0.6)', `Streak: ${s.homeStreak}`));
          }
        } else if (drill.id === 'aerial_shot' || drill.id === 'spin_shot' || drill.id === 'aerial_tornado') {
          // Goal without the required combo
          setFeedback('GOAL! But use the required combo...', '#FF8800');
        } else if (drill.id === 'chain_combo') {
          if (p.chainPhase < 2) {
            setFeedback('GOAL! But complete the chain first: Pass→Switch→Score', '#FF8800');
            p.chainPhase = 0;
          }
        }

        // Check drill completion
        if (p.completed >= p.target && !p.isComplete) {
          p.isComplete = true;
          const ratio = p.target / Math.max(1, p.attempts);
          if (ratio >= 0.7) p.grade = 'S';
          else if (ratio >= 0.5) p.grade = 'A';
          else if (ratio >= 0.3) p.grade = 'B';
          else p.grade = 'C';
          pushCallout(s, makeCallout('DRILL COMPLETE!', 'large', '#00FF00', 'rgba(0,255,0,0.6)', `Grade: ${p.grade}`));
          s.screenFlash = 1.0;
          s.screenFlashColor = '#00FF00';
          s.hitFreeze = 8;
        }

        // Reset positions after goal (with delay)
        setTimeout(() => {
          if (stateRef.current && !progressRef.current.isComplete) {
            resetPositions(stateRef.current);
          }
        }, 1500);
      }

      // Backboard hit
      if (s.ball.pos.x >= COURT.WIDTH - 5 && s.ball.z >= BACKBOARD.HEIGHT_BOTTOM && s.ball.z <= BACKBOARD.HEIGHT_TOP) {
        const goalTop = COURT.HEIGHT / 2 - GOAL.WIDTH / 2;
        const goalBot = COURT.HEIGHT / 2 + GOAL.WIDTH / 2;
        if (s.ball.pos.y >= goalTop && s.ball.pos.y <= goalBot) {
          s.ball.vel.x *= -BACKBOARD.REBOUND_SPEED;
          s.ball.vel.y *= 0.5;
          s.ball.vz *= -0.3;
          s.cameraShake = 0.5;
          pushCallout(s, makeCallout('OFF THE BACKBOARD!', 'small', '#FF6600', 'rgba(255,102,0,0.4)'));
        }
      }

      // Ball out of bounds — reset
      if (s.ball.pos.x < -RUNOFF.DEPTH || s.ball.pos.x > COURT.WIDTH + RUNOFF.DEPTH) {
        resetPositions(s);
      }

      // ---- PASS RECEPTION ----
      if (s.ball.carrier === null && s.ball.passIntended !== null) {
        const target = s.players[s.ball.passIntended];
        if (target && dist(s.ball.pos, target.pos) < BALL.PASS_RECEIVE_RADIUS) {
          target.hasBall = true;
          s.ball.carrier = target.id;
          s.ball.vel = { x: 0, y: 0 };
          s.ball.passIntended = null;
          s.passChain++;
        }
      }

      // Loose ball pickup by home team
      if (s.ball.carrier === null) {
        for (let i = 0; i < 3; i++) {
          if (dist(s.ball.pos, s.players[i].pos) < BALL.LOOSE_BALL_PICKUP && s.ball.z < 10) {
            s.players[i].hasBall = true;
            s.ball.carrier = s.players[i].id;
            s.ball.vel = { x: 0, y: 0 };
            break;
          }
        }
      }
    }

    // ---- RENDER ----
    stateRef.current = s;
    if (timestamp - lastRenderRef.current >= RENDER_INTERVAL) {
      lastRenderRef.current = timestamp;
      setGameState({ ...s });
      setDrillProgress({ ...p });
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [drill, fireEvent, resetPositions, setFeedback]);

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

  return { gameState, drillProgress, initGame, startGame, stopGame, setJoystick, triggerAction };
}

/**
 * Pyroball Sound Engine
 * Procedural sound effects using Web Audio API — no external audio files needed.
 * All sounds are synthesized in real-time.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let _muted = false;
let _volume = 0.6;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = _muted ? 0 : _volume;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function getMaster(): GainNode {
  getCtx();
  return masterGain!;
}

// ========== PUBLIC CONTROLS ==========

export function setVolume(v: number) {
  _volume = Math.max(0, Math.min(1, v));
  if (masterGain) masterGain.gain.value = _muted ? 0 : _volume;
}

export function setMuted(m: boolean) {
  _muted = m;
  if (masterGain) masterGain.gain.value = _muted ? 0 : _volume;
}

export function isMuted(): boolean { return _muted; }
export function getVolume(): number { return _volume; }

export function initAudio() {
  getCtx();
}

// ========== UTILITY ==========

function createOsc(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  gain: number,
  startTime: number,
  endTime: number,
  dest: AudioNode,
  freqEnd?: number,
): OscillatorNode {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  if (freqEnd !== undefined) {
    osc.frequency.linearRampToValueAtTime(freqEnd, endTime);
  }
  g.gain.setValueAtTime(gain, startTime);
  g.gain.exponentialRampToValueAtTime(0.001, endTime);
  osc.connect(g);
  g.connect(dest);
  osc.start(startTime);
  osc.stop(endTime + 0.05);
  return osc;
}

function createNoise(
  ctx: AudioContext,
  gain: number,
  startTime: number,
  endTime: number,
  dest: AudioNode,
  filterFreq?: number,
): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * (endTime - startTime + 0.1);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, startTime);
  g.gain.exponentialRampToValueAtTime(0.001, endTime);

  if (filterFreq) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    src.connect(filter);
    filter.connect(g);
  } else {
    src.connect(g);
  }
  g.connect(dest);
  src.start(startTime);
  src.stop(endTime + 0.1);
  return src;
}

// ========== SOUND EFFECTS ==========

/**
 * GOAL HORN — Deep, triumphant air horn blast with reverb tail
 */
export function playGoalHorn() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  // Main horn tone (low brass)
  createOsc(ctx, 'sawtooth', 180, 0.25, t, t + 1.2, master);
  createOsc(ctx, 'sawtooth', 182, 0.2, t, t + 1.2, master); // slight detune for richness
  createOsc(ctx, 'square', 360, 0.08, t, t + 1.0, master); // harmonic

  // Sub bass
  createOsc(ctx, 'sine', 90, 0.15, t, t + 1.0, master);

  // Second blast (slightly higher)
  createOsc(ctx, 'sawtooth', 220, 0.2, t + 0.15, t + 1.3, master);
  createOsc(ctx, 'sawtooth', 222, 0.15, t + 0.15, t + 1.3, master);

  // Crowd roar layered in
  createNoise(ctx, 0.12, t + 0.2, t + 2.0, master, 2000);
}

/**
 * BALL KICK — Short punchy thud with a snap
 */
export function playBallKick() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  // Impact thud (low frequency sweep)
  createOsc(ctx, 'sine', 200, 0.35, t, t + 0.12, master, 60);

  // Snap/click (high frequency)
  createOsc(ctx, 'square', 1200, 0.1, t, t + 0.04, master, 400);

  // Tiny noise burst for texture
  createNoise(ctx, 0.08, t, t + 0.06, master, 3000);
}

/**
 * PASS SOUND — Quick whoosh with a lighter kick
 */
export function playPass() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  // Whoosh (filtered noise sweep)
  const bufferSize = ctx.sampleRate * 0.2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, t);
  filter.frequency.linearRampToValueAtTime(2500, t + 0.1);
  filter.frequency.linearRampToValueAtTime(600, t + 0.2);
  filter.Q.value = 2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.15, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t);
  src.stop(t + 0.25);

  // Light tap
  createOsc(ctx, 'sine', 300, 0.12, t, t + 0.06, master, 150);
}

/**
 * STEAL BUZZER — Sharp electronic buzz
 */
export function playStealBuzzer() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  // Harsh buzz
  createOsc(ctx, 'square', 150, 0.18, t, t + 0.25, master);
  createOsc(ctx, 'sawtooth', 153, 0.12, t, t + 0.25, master);

  // High alert tone
  createOsc(ctx, 'square', 600, 0.06, t, t + 0.15, master, 300);

  // Noise burst
  createNoise(ctx, 0.06, t, t + 0.1, master, 1500);
}

/**
 * CROWD ROAR — Ambient crowd surge (for goals, big plays)
 */
export function playCrowdRoar() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  // Layered noise at different filter bands for crowd texture
  createNoise(ctx, 0.1, t, t + 2.5, master, 1200);
  createNoise(ctx, 0.06, t + 0.1, t + 2.0, master, 2500);
  createNoise(ctx, 0.04, t + 0.2, t + 1.8, master, 4000);

  // Low rumble
  createOsc(ctx, 'sine', 80, 0.06, t, t + 2.0, master, 60);
}

/**
 * SHOT CLOCK WARNING — Rapid beeping that gets faster
 */
export function playShotClockWarning() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  // Three rapid beeps
  for (let i = 0; i < 3; i++) {
    const offset = i * 0.15;
    createOsc(ctx, 'square', 880, 0.12, t + offset, t + offset + 0.08, master);
  }
}

/**
 * SHOT CLOCK VIOLATION — Long harsh buzzer
 */
export function playShotClockViolation() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  // Long buzz
  createOsc(ctx, 'sawtooth', 200, 0.2, t, t + 0.8, master);
  createOsc(ctx, 'square', 203, 0.15, t, t + 0.8, master);
  createOsc(ctx, 'sawtooth', 100, 0.1, t, t + 0.6, master);
}

/**
 * WHISTLE — Referee whistle for violations and game start/end
 */
export function playWhistle() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  // Main whistle tone (high sine with vibrato)
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(2800, t);
  osc.frequency.setValueAtTime(3200, t + 0.05);
  osc.frequency.setValueAtTime(2800, t + 0.15);
  osc.frequency.setValueAtTime(3200, t + 0.2);
  osc.frequency.linearRampToValueAtTime(2600, t + 0.4);
  g.gain.setValueAtTime(0.12, t);
  g.gain.setValueAtTime(0.15, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  osc.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + 0.5);

  // Breathy noise layer
  createNoise(ctx, 0.04, t, t + 0.35, master, 5000);
}

/**
 * SWITCH PLAYER — Quick UI blip
 */
export function playSwitchPlayer() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  createOsc(ctx, 'sine', 600, 0.1, t, t + 0.06, master, 900);
  createOsc(ctx, 'sine', 900, 0.08, t + 0.06, t + 0.12, master, 1200);
}

/**
 * COUNTDOWN BEEP — Single beep for timer countdown
 */
export function playCountdownBeep() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  createOsc(ctx, 'sine', 1000, 0.15, t, t + 0.1, master);
}

/**
 * HALFTIME HORN — Deeper, shorter horn blast
 */
export function playHalftimeHorn() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  createOsc(ctx, 'sawtooth', 140, 0.2, t, t + 0.8, master);
  createOsc(ctx, 'sawtooth', 142, 0.15, t, t + 0.8, master);
  createOsc(ctx, 'sine', 70, 0.12, t, t + 0.7, master);
  createOsc(ctx, 'square', 280, 0.05, t, t + 0.6, master);
}

/**
 * FLOW STATE ACTIVATE — Ascending chime with shimmer
 */
export function playFlowState() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  // Ascending chime notes
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const offset = i * 0.08;
    createOsc(ctx, 'sine', freq, 0.1, t + offset, t + offset + 0.3, master);
    createOsc(ctx, 'triangle', freq * 2, 0.03, t + offset, t + offset + 0.2, master);
  });

  // Shimmer noise
  createNoise(ctx, 0.03, t, t + 0.5, master, 8000);
}

/**
 * POSSESSION TURNOVER — Quick descending tone
 */
export function playTurnover() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  createOsc(ctx, 'square', 500, 0.12, t, t + 0.15, master, 200);
  createOsc(ctx, 'sawtooth', 300, 0.08, t + 0.05, t + 0.2, master, 100);
}

/**
 * MENU SELECT — UI click for menus
 */
export function playMenuSelect() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  createOsc(ctx, 'sine', 800, 0.08, t, t + 0.05, master, 1200);
}

/**
 * MENU HOVER — Subtle UI hover
 */
export function playMenuHover() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  createOsc(ctx, 'sine', 600, 0.04, t, t + 0.03, master, 700);
}

// ========== SHOT METER SOUNDS ==========

/** Perfect release — bright ascending chime */
export function playPerfectRelease() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  // Bright ascending two-note chime
  createOsc(ctx, 'sine', 880, 0.12, t, t + 0.08, master, 1100);
  createOsc(ctx, 'sine', 1320, 0.1, t + 0.06, t + 0.15, master, 1500);
  // Shimmer
  createOsc(ctx, 'triangle', 2200, 0.04, t + 0.05, t + 0.2, master, 2600);
}

/** Power shot (overcharged red zone) — heavy thud */
export function playPowerShot() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  createOsc(ctx, 'sine', 120, 0.15, t, t + 0.12, master, 60);
  createOsc(ctx, 'square', 200, 0.06, t, t + 0.06, master, 100);
  createNoise(ctx, 0.08, t, t + 0.08, master);
}

/** Shot meter charging tick — subtle click each frame */
export function playShotChargeTick() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  createOsc(ctx, 'sine', 1200, 0.02, t, t + 0.015, master, 1400);
}

// ========== ON FIRE & EXCITEMENT SOUNDS ==========

/** ON FIRE activation — dramatic ascending power chord */
export function playOnFire() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  // Deep power chord
  createOsc(ctx, 'sawtooth', 110, 0.12, t, t + 0.6, master, 220);
  createOsc(ctx, 'sawtooth', 165, 0.1, t + 0.05, t + 0.55, master, 330);
  createOsc(ctx, 'sawtooth', 220, 0.08, t + 0.1, t + 0.5, master, 440);
  // High shimmer
  createOsc(ctx, 'sine', 880, 0.06, t + 0.15, t + 0.7, master, 1760);
  createOsc(ctx, 'triangle', 1320, 0.04, t + 0.2, t + 0.8, master, 2640);
  // Impact noise
  createNoise(ctx, 0.1, t, t + 0.15, master, 800);
}

/** ON FIRE expired — descending deflation */
export function playFireExpired() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  createOsc(ctx, 'sine', 440, 0.08, t, t + 0.3, master, 110);
  createOsc(ctx, 'triangle', 330, 0.05, t + 0.05, t + 0.35, master, 80);
}

/** Sudden Death activation — ominous low rumble + high tension sting */
export function playSuddenDeath() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  // Deep rumble
  createOsc(ctx, 'sine', 55, 0.15, t, t + 1.0, master, 40);
  createNoise(ctx, 0.08, t, t + 0.5, master, 200);
  // Tension sting
  createOsc(ctx, 'sawtooth', 220, 0.06, t + 0.3, t + 0.8, master, 440);
  createOsc(ctx, 'sine', 660, 0.04, t + 0.5, t + 1.0, master, 880);
  // Impact
  createOsc(ctx, 'square', 80, 0.1, t + 0.2, t + 0.4, master, 40);
}

/** Announcer stinger — quick attention-grabbing hit */
export function playAnnouncerStinger() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  createOsc(ctx, 'sine', 600, 0.06, t, t + 0.04, master, 900);
  createOsc(ctx, 'triangle', 1200, 0.03, t + 0.02, t + 0.06, master, 1500);
}

// ========== DYNAMIC CROWD AUDIO ==========

let crowdAmbientSource: AudioBufferSourceNode | null = null;
let crowdAmbientGain: GainNode | null = null;
let crowdAmbientRunning = false;

/**
 * Start ambient crowd murmur loop — continuous low-level crowd noise
 * Volume scales with excitement parameter (0-1)
 */
export function startCrowdAmbient() {
  if (crowdAmbientRunning) return;
  const ctx = getCtx();
  const master = getMaster();

  // Create a long noise buffer for looping crowd bed
  const duration = 4; // 4 second loop
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

  // Generate stereo crowd noise with varying texture
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let prev = 0;
    for (let i = 0; i < bufferSize; i++) {
      // Brownian noise (smoother, more crowd-like)
      prev = prev * 0.997 + (Math.random() * 2 - 1) * 0.003;
      // Add some random chatter bursts
      const chatter = Math.random() < 0.001 ? (Math.random() - 0.5) * 0.3 : 0;
      data[i] = prev * 15 + chatter;
    }
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;

  // Bandpass filter for crowd-like frequency range
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 600;
  filter.Q.value = 0.5;

  // Second filter for warmth
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 2000;

  const gain = ctx.createGain();
  gain.gain.value = 0.03; // Start quiet

  src.connect(filter);
  filter.connect(lpf);
  lpf.connect(gain);
  gain.connect(master);
  src.start();

  crowdAmbientSource = src;
  crowdAmbientGain = gain;
  crowdAmbientRunning = true;
}

/**
 * Update crowd ambient volume based on excitement (0-1)
 */
export function setCrowdExcitement(excitement: number) {
  if (!crowdAmbientGain) return;
  const ctx = getCtx();
  // Map excitement to volume: 0.02 (quiet) to 0.12 (loud)
  const vol = 0.02 + excitement * 0.10;
  crowdAmbientGain.gain.linearRampToValueAtTime(
    _muted ? 0 : vol,
    ctx.currentTime + 0.1
  );
}

/**
 * Stop crowd ambient loop
 */
export function stopCrowdAmbient() {
  if (crowdAmbientSource) {
    try { crowdAmbientSource.stop(); } catch (_) {}
    crowdAmbientSource = null;
  }
  crowdAmbientGain = null;
  crowdAmbientRunning = false;
}

/**
 * CROWD SURGE — Enhanced crowd roar for goal celebrations
 * Layered noise with rising pitch and longer sustain
 */
export function playCrowdSurge(intensity: number = 1.0) {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;
  const vol = 0.08 * intensity;

  // Multi-band crowd noise (richer than basic roar)
  createNoise(ctx, vol * 1.2, t, t + 3.0, master, 800);   // low rumble
  createNoise(ctx, vol * 0.8, t + 0.05, t + 2.5, master, 1500); // mid cheer
  createNoise(ctx, vol * 0.5, t + 0.1, t + 2.0, master, 3000);  // high excitement
  createNoise(ctx, vol * 0.3, t + 0.15, t + 1.5, master, 5000); // bright top

  // Crowd "ohhh" — resonant tone that sweeps up
  createOsc(ctx, 'sine', 200, vol * 0.4, t, t + 1.5, master, 350);
  createOsc(ctx, 'sine', 300, vol * 0.3, t + 0.1, t + 1.2, master, 500);

  // Sub bass impact
  createOsc(ctx, 'sine', 60, vol * 0.5, t, t + 1.0, master, 40);
}

/**
 * CROWD GASP — Short sharp intake for near-misses and big saves
 */
export function playCrowdGasp() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  // Quick noise burst (inhale sound)
  createNoise(ctx, 0.08, t, t + 0.4, master, 3000);
  createNoise(ctx, 0.04, t + 0.05, t + 0.3, master, 6000);

  // Brief silence then murmur
  createNoise(ctx, 0.03, t + 0.5, t + 1.2, master, 1200);
}

/**
 * CROWD CHANT — Rhythmic crowd chanting (for momentum/flow state)
 */
export function playCrowdChant() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  // Rhythmic "hey" pattern — 4 beats
  for (let i = 0; i < 4; i++) {
    const offset = i * 0.4;
    createNoise(ctx, 0.06, t + offset, t + offset + 0.15, master, 1800);
    createOsc(ctx, 'sine', 250, 0.03, t + offset, t + offset + 0.12, master, 200);
  }
}

/** Big impact — for screen shake moments */
export function playBigImpact() {
  const ctx = getCtx();
  const master = getMaster();
  const t = ctx.currentTime;

  createOsc(ctx, 'sine', 80, 0.15, t, t + 0.15, master, 30);
  createNoise(ctx, 0.12, t, t + 0.1, master, 400);
  createOsc(ctx, 'square', 150, 0.06, t, t + 0.08, master, 60);
}

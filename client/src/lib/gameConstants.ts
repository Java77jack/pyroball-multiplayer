// Pyroball: American Pyroball Alliance — Hub Arena Blueprint
// Field: 90ft x 50ft → 900px x 500px (9:5 ratio)
// Goals on SHORT ends (50ft sides), 20ft wide
// Scoring: Core=3pts (center), Mid=1pt (field area)

export const COURT = {
  WIDTH: 900,
  HEIGHT: 500,
  COLOR: '#0033AA',              // Royal blue turf
  BORDER_COLOR: '#FF6600',       // Neon orange boundary
  LINE_COLOR: 'rgba(255,102,0,0.8)', // Neon orange lines
} as const;

export const GOAL = {
  WIDTH: 200,      // 20ft on 50ft side: 20/50*500 = 200 game units
  HEIGHT: 60,      // 6ft tall goal opening (was 8ft)
  NET_DEPTH: 15,
  SETBACK: 20,     // 2ft from field end line (2/90*900 = 20 game units)
  TOTAL_HEIGHT: 100,
} as const;

// Backboard: 20ft wide, 4ft tall LED panel above 6ft goal (10ft total)
export const BACKBOARD = {
  WIDTH: GOAL.WIDTH,
  HEIGHT_BOTTOM: 60,         // Crossbar height (6ft in z-units)
  HEIGHT_TOP: 100,           // Top of backboard (10ft in z-units)
  LED_HEIGHT: 40,            // 4ft LED panel
  REBOUND_SPEED: 0.55,
  POST_REBOUND_SPEED: 0.4,
  CROSSBAR_HEIGHT: 60,
} as const;

// Run-in zones: side areas where run-ins are allowed
// Red zone (center): NO run-ins allowed
export const RUN_IN_ZONE = {
  CENTER_WIDTH: 100,  // Center red zone width (10ft on 50ft side)
  SIDE_WIDTH: (GOAL.WIDTH - 100) / 2,  // Side run zones (5ft each side)
} as const;


// Dasher Boards — 6ft high surrounding the field
export const DASHER_BOARDS = {
  HEIGHT: 60,                // 6ft in game units
  GLASS_HEIGHT: 30,          // Glass panels above boards
  COLOR: '#1a1a2e',          // Dark board color
  GLASS_COLOR: 'rgba(180,220,255,0.15)', // Subtle glass reflection
  LED_COLOR: '#FF6600',      // Neon orange LED strip
} as const;

// Runoff Zones — 10ft behind each goal
export const RUNOFF = {
  DEPTH: 75,                 // 10ft = ~75px behind each goal line (scaled to new court)
  RESET_TO_CENTER: true,     // Ball resets to center if it enters runoff
} as const;

// Jump & Spin mechanics
export const JUMP = {
  POWER: 8.0,
  GRAVITY: 0.35,
  COOLDOWN: 1200,
  AERIAL_SHOT_BOOST: 1.3,
  REBOUND_GRAB_RANGE: 25,
  REBOUND_GRAB_HEIGHT: 40,
} as const;

export const SPIN = {
  DURATION: 400,
  COOLDOWN: 1500,
  SPEED_BOOST: 1.6,
  STEAL_IMMUNITY: true,
  ROTATION_SPEED: 2.5,
} as const;

export const PLAYER = {
  RADIUS: 12,                // Slightly larger for bigger court
  SPEED: 4.2,                // Faster to cover more ground
  SPRINT_SPEED: 5.4,
  AI_SPEED: 2.5,             // Slowed: AI moves more deliberately
  AI_SPEED_OFFENSE: 2.0,      // Very slow: AI approaches goal slowly, giving player time to defend
  AI_SPEED_DEFENSE: 2.8,      // Slowed: AI defenders less overwhelming
  SHOOT_POWER: 12,           // More power for longer shots
  PASS_POWER: 10,            // Stronger passes across bigger field
  PASS_ACCURACY: 0.92,
  PASS_LEAD: 0.35,
  STEAL_RANGE: 22,           // Tighter steal range to reduce AI dominance
  STEAL_COOLDOWN: 1000,       // Longer cooldown between steal attempts
  STEAL_SUCCESS_PLAYER: 0.55,
  STEAL_SUCCESS_AI: 0.04,     // Reduced further — AI steals much less often
  STEAL_ATTEMPT_RATE_AI: 0.003, // Reduced further — AI attempts steals rarely
  BALL_PROTECTION_RADIUS: 10,  // Larger protection zone for ball carrier
  DRIBBLE_SHIELD_FACTOR: 0.5,  // Better dribble protection
} as const;

export const BALL = {
  RADIUS: 6,
  FRICTION: 0.968,
  MAX_SPEED: 15,             // Higher max speed for bigger field
  PASS_RECEIVE_RADIUS: 22,   // Larger receive radius
  LOOSE_BALL_PICKUP: 15,
} as const;

export const MATCH = {
  DURATION: 180,
  HALF_DURATION: 90,
  SHOT_CLOCK: 10,
  POSSESSION_TIMER: 3,
  OVERTIME_DURATION: 30,
} as const;

// APA Blueprint Scoring Zones
// Core = center circle area → 3 points
// Mid = rest of the field → 1 point
// Core Shafts = corridors from core to goals (part of core zone)
export const ZONES = {
  CORE: {
    radius: 120,             // Core circle radius (scaled for 900x500)
    points: 3,
    color: 'rgba(220,38,38,0.35)',        // Red/orange glow
    borderColor: '#FF4400',
    label: 'CORE 3PTS',
  },
  CORE_SHAFT: {
    width: 90,               // Width of shaft corridors (scaled)
    points: 3,
    color: 'rgba(220,80,20,0.25)',
    borderColor: '#FF6600',
  },
  MID: {
    points: 1,
    color: 'rgba(255,165,0,0.12)',        // Subtle orange tint
    borderColor: '#FF8800',
    label: 'MID 1PT',
  },
} as const;

// Center circle radius (matches Core zone)
export const CENTER_CIRCLE_RADIUS = 120;

// AI behavior (scaled for 900x500 court)
export const AI = {
  SHOOT_RANGE: 300,          // AI can shoot from much further out
  SHOOT_CHANCE_CLOSE: 0.025, // 2.5% per frame when close — shoots often
  SHOOT_CHANCE_FAR: 0.006,   // 0.6% per frame from far — occasional long shots
  PASS_CHANCE: 0.02,         // Balanced: still passes but doesn't over-pass
  PASS_PRESSURE_CHANCE: 0.05,
  PRESSURE_RANGE: 55,        // Moderate pressure range
  MARK_DISTANCE: 50,         // Moderate marking distance
  HELP_DEFENSE_RANGE: 110,   // Moderate help defense
  INTERCEPT_ANTICIPATION: 0.25, // Moderate anticipation
  SPREAD_DISTANCE: 140,      // Tighter spacing for faster plays
  CUT_SPEED: 0.004,          // Faster cutting
  REPOSITION_THRESHOLD: 18,
} as const;

// ========== FUN-FIRST SYSTEMS ==========

export const PRESSURE = {
  PULSE_TIME: 2.0,
  URGENCY_TIME: 2.5,
  URGENCY_SPEED_BOOST: 1.3,
  TURNOVER_TIME: 3.0,
} as const;

export const PASS_CHAIN = {
  SPEED_BOOST_AT: 2,
  BALL_GLOW_AT: 3,
  FLOW_STATE_AT: 4,
  SPEED_BOOST_MULT: 1.15,
  FLOW_PASS_SPEED_MULT: 1.3,
  FLOW_SHOOT_BOOST: 0.15,
  FLOW_DURATION: 0.5,
} as const;

export const SELFISH = {
  HOLD_PENALTY_THRESHOLD: 2.5,
  SPEED_REDUCTION: 0.85,
  TEAMMATE_SLOWDOWN: 0.8,
  REPEAT_THRESHOLD: 3,
} as const;

export const STEAL_WINDOWS = {
  POSSESSION_VULNERABLE_TIME: 2.5,
  POSSESSION_STEAL_BOOST: 1.6,
  POST_PASS_VULNERABLE_MS: 300,
  POST_PASS_STEAL_BOOST: 1.4,
} as const;

export const SHOT_METER = {
  FILL_SPEED: 1.8,
  PRESSURE_FILL_MULT: 1.5,
  OPEN_FILL_MULT: 0.8,
  WEAK_END: 0.2,
  GREEN_START: 0.55,
  GREEN_END: 0.75,
  YELLOW_END: 0.88,
  RED_END: 1.0,
  PRESSURE_GREEN_SHRINK: 0.6,
  CHAIN_GREEN_EXPAND: 1.25,
  OPEN_GREEN_EXPAND: 1.15,
  WEAK_POWER: 0.5,
  WEAK_ACCURACY: 0.4,
  GREEN_POWER: 1.0,
  GREEN_ACCURACY: 1.5,
  YELLOW_POWER: 0.85,
  YELLOW_ACCURACY: 0.8,
  RED_POWER: 1.3,
  RED_ACCURACY: 0.35,
  PRESSURE_RANGE: 65,       // Scaled for bigger court
  OPEN_RANGE: 120,           // Scaled for bigger court
} as const;

export const SHOT_QUALITY = {
  QUICK_SHOT_THRESHOLD: 1.0,
  QUICK_SHOT_ACCURACY: 1.3,
  PANIC_SHOT_CLOCK: 2,
  PANIC_SHOT_ACCURACY: 0.6,
  CHAIN_SHOT_BONUS: 0.2,
} as const;

export const MOMENTUM = {
  POST_GOAL_BOOST_DURATION: 2.0,
  SCORING_TEAM_SPEED_BOOST: 1.12,
  OPPONENT_REACTION_DELAY: 0.3,
} as const;

export const INTENSITY = {
  FINAL_SECONDS: 20,
  SPEED_BOOST: 1.08,
  AI_AGGRESSION_MULT: 1.5,
} as const;

export const DEF_PERSONALITY = {
  TIGHT: 0,
  AGGRESSIVE: 1,
  ZONE: 2,
} as const;

export const CAMERA = {
  DEFAULT_ZOOM: 1.0,
  FAST_BREAK_ZOOM: 0.92,
  GOAL_ZOOM: 1.15,
  GOAL_ZOOM_DURATION: 0.6,
  SHAKE_INTENSITY: 8,
  SLOW_MO_DURATION: 1.5,
  SLOW_MO_FACTOR: 0.25,
} as const;

// ON FIRE streak system — 3 unanswered goals triggers ON FIRE mode
export const ON_FIRE = {
  STREAK_THRESHOLD: 3,       // Goals needed to trigger ON FIRE
  DURATION: 15,              // Seconds the ON FIRE mode lasts
  SPEED_BOOST: 1.25,         // 25% speed boost for the ON FIRE team
  SHOT_ACCURACY_BOOST: 2.0,  // Double shot accuracy
  SHOT_POWER_BOOST: 1.3,     // 30% more shot power
  STEAL_RESIST: 0.3,         // 70% harder to steal from ON FIRE team
  METER_FILL_BOOST: 2.0,     // FIRE meter fills 2x faster
} as const;

// Announcer callout system
export const ANNOUNCER = {
  DISPLAY_DURATION: 2.0,     // How long callouts stay on screen
  FADE_SPEED: 3.0,           // Fade-out speed
  MAX_QUEUE: 3,              // Max queued callouts
} as const;

export const CROWD = {
  BASE_VOLUME: 0.3,
  GOAL_VOLUME: 1.0,
  STEAL_VOLUME: 0.6,
  CLOSE_SHOT_VOLUME: 0.5,
} as const;

// APA Visual Style Constants
export const APA_STYLE = {
  TURF_COLOR: '#0033AA',           // Royal blue
  NEON_ORANGE: '#FF6600',          // Primary accent
  NEON_ORANGE_GLOW: '#FF8800',     // Lighter orange glow
  CORE_RED: '#CC2200',             // Core zone red
  CORE_ORANGE: '#FF4400',          // Core zone orange
  MID_ORANGE: '#FF8800',           // Mid zone orange
  SPOTLIGHT_COLOR: 'rgba(255,240,200,0.15)', // Warm spotlight pools
  SHADOW_COLOR: 'rgba(0,0,20,0.6)',          // Deep shadows in runoff
  LED_BLUE: '#00AAFF',             // LED accent blue
  LED_ORANGE: '#FF6600',           // LED accent orange
  GLASS_REFLECT: 'rgba(180,220,255,0.12)',   // Glass panel reflection
} as const;

export interface TeamData {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  glow: string;
  accent: string;
  logo: string;
  spriteSheet: string;
}

export const TEAMS: Record<string, TeamData> = {
  inferno:   { id: 'inferno',   name: 'Inferno',    primary: '#1a1a1a', secondary: '#FF6B00', glow: '#FF4500', accent: '#FFB800', logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663476839256/L959pTVNCfBxbsJyQ7g7yz/logo_inferno_transparent_5b2bf189.png', spriteSheet: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/sprites_inferno_c22c885b.png' },
  vortex:    { id: 'vortex',    name: 'Vortex',     primary: '#0a2463', secondary: '#3E92CC', glow: '#00B4D8', accent: '#90E0EF', logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663476839256/L959pTVNCfBxbsJyQ7g7yz/logo_vortex_transparent_68e2cef4.png', spriteSheet: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/sprites_vortex_0871eeaf.png' },
  empire:    { id: 'empire',    name: 'Empire',     primary: '#f0f0f0', secondary: '#FFB800', glow: '#FFD700', accent: '#1a1a1a', logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663476839256/L959pTVNCfBxbsJyQ7g7yz/logo_empires_transparent_cc5483fd.png', spriteSheet: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/sprites_empire_62ecaefa.png' },
  sledge:    { id: 'sledge',    name: 'Sledge',     primary: '#4a4a5a', secondary: '#C0C0C0', glow: '#FFB800', accent: '#2a2a3a', logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663476839256/L959pTVNCfBxbsJyQ7g7yz/logo_sledge_transparent_772d4485.png', spriteSheet: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/sprites_sledge_14db7467.png' },
  glaciers:  { id: 'glaciers',  name: 'Glaciers',   primary: '#E0F0FF', secondary: '#4FC3F7', glow: '#00B0FF', accent: '#B3E5FC', logo: '', spriteSheet: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/sprites_glaciers_a58b4f7d.png' },
  blueclaws: { id: 'blueclaws', name: 'Blue Claws', primary: '#0D47A1', secondary: '#1565C0', glow: '#2196F3', accent: '#64B5F6', logo: '', spriteSheet: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/sprites_blueclaws_92191e34.png' },
  nightraid: { id: 'nightraid', name: 'Night Raid', primary: '#1A0033', secondary: '#7B1FA2', glow: '#CE93D8', accent: '#4A148C', logo: '', spriteSheet: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/sprites_nightraid_3494c7e4.png' },
  seawolves: { id: 'seawolves', name: 'Seawolves',  primary: '#004D40', secondary: '#26A69A', glow: '#00BFA5', accent: '#80CBC4', logo: '', spriteSheet: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/sprites_seawolves_f264a8a2.png' },
  rebellion: { id: 'rebellion', name: 'Rebellion',  primary: '#4A0000', secondary: '#D32F2F', glow: '#FF1744', accent: '#B71C1C', logo: '', spriteSheet: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/sprites_rebellion_3a0d21be.png' },
  railers:   { id: 'railers',   name: 'Railers',    primary: '#37474F', secondary: '#90A4AE', glow: '#CFD8DC', accent: '#263238', logo: '', spriteSheet: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/sprites_railers_542bcd8e.png' },
  havoc:     { id: 'havoc',     name: 'Havoc',      primary: '#1a1a1a', secondary: '#FFD600', glow: '#FFEA00', accent: '#FFC107', logo: '', spriteSheet: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/sprites_havoc_b97e02d0.png' },
  wrath:     { id: 'wrath',     name: 'Wrath',      primary: '#3E2723', secondary: '#8B0000', glow: '#D50000', accent: '#4E342E', logo: '', spriteSheet: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/sprites_wrath_4cc01f76.png' },
  sizzle:    { id: 'sizzle',    name: 'Sizzle',     primary: '#880E4F', secondary: '#E91E63', glow: '#FF4081', accent: '#F48FB1', logo: '', spriteSheet: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/sprites_sizzle_b776a61f.png' },
  hoppers:   { id: 'hoppers',   name: 'Hoppers',    primary: '#1B5E20', secondary: '#76FF03', glow: '#64DD17', accent: '#CCFF90', logo: '', spriteSheet: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/sprites_hoppers_5d589a7a.png' },
  gauchos:   { id: 'gauchos',   name: 'Gauchos',    primary: '#4E342E', secondary: '#D4A574', glow: '#FFB74D', accent: '#8D6E63', logo: '', spriteSheet: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/sprites_gauchos_83fa74a7.png' },
  engineers: { id: 'engineers', name: 'Engineers',  primary: '#BF360C', secondary: '#FF6D00', glow: '#FF9100', accent: '#E65100', logo: '', spriteSheet: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/sprites_engineers_e7f80c7a.png' },
};

export interface Vec2 { x: number; y: number; }

export const PLAYER_NAMES: Record<string, string[]> = {
  inferno:   ['BLAZE', 'TORCH', 'EMBER'],
  vortex:    ['STORM', 'SURGE', 'DRIFT'],
  empire:    ['CROWN', 'REIGN', 'NOBLE'],
  sledge:    ['STEEL', 'IRON', 'BOLT'],
  glaciers:  ['FROST', 'CHILL', 'SLEET'],
  blueclaws: ['TIDE', 'REEF', 'CORAL'],
  nightraid: ['SHADE', 'PHANTOM', 'DUSK'],
  seawolves: ['WAVE', 'ANCHOR', 'DEPTH'],
  rebellion: ['RIOT', 'FURY', 'ROGUE'],
  railers:   ['SPIKE', 'RAIL', 'GAUGE'],
  havoc:     ['CHAOS', 'WRECK', 'BLAST'],
  wrath:     ['RAGE', 'SCORN', 'DOOM'],
  sizzle:    ['FLASH', 'SPARK', 'FLARE'],
  hoppers:   ['LEAP', 'SPRING', 'BOUNCE'],
  gauchos:   ['LASSO', 'BRONCO', 'RIDER'],
  engineers: ['FORGE', 'WELD', 'RIVET'],
};

export interface PlayerState {
  id: number;
  teamId: string;
  name: string;
  pos: Vec2;
  vel: Vec2;
  number: number;
  hasBall: boolean;
  isControlled: boolean;
  stealCooldown: number;
  holdTimer: number;
  passTarget: number | null;
  shootCooldown: number;
  defPersonality: number;
  postPassVulnerable: number;
  selfishCount: number;
  receiveTime: number;
  jumpZ: number;
  jumpVZ: number;
  isJumping: boolean;
  jumpCooldown: number;
  spinAngle: number;
  isSpinning: boolean;
  spinTimer: number;
  spinCooldown: number;
}

export interface BallState {
  pos: Vec2;
  vel: Vec2;
  z: number;
  vz: number;
  carrier: number | null;
  lastPasser: number | null;
  passIntended: number | null;
  isRebound: boolean;
  lastShooter: number | null;
}

export interface GoalEvent {
  teamId: string;
  zone: number;
  time: number;
}

export type GameEvent =
  | { type: 'TURNOVER'; reason: 'SHOT_CLOCK' | 'POSSESSION'; team: string }
  | { type: 'PENALTY'; team: string }
  | { type: 'GOAL'; team: string; points: number }
  | { type: 'OVERTIME' }
  | { type: 'PASS'; from: number; to: number }
  | { type: 'STEAL'; by: string }
  | { type: 'FLOW_STATE'; team: string }
  | { type: 'BACKBOARD_HIT'; side: 'left' | 'right' }
  | { type: 'REBOUND'; by: string }
  | { type: 'RUNOFF_RESET'; side: 'left' | 'right' }
  | { type: 'COMBO'; name: string; player: number }
  | { type: 'ON_FIRE'; team: string }
  | { type: 'FIRE_EXPIRED'; team: string }
  | { type: 'SUDDEN_DEATH' }
  | null;

// Announcer callout definition
export interface AnnouncerCallout {
  text: string;
  subtext?: string;
  color: string;
  glow: string;
  timer: number;
  size: 'small' | 'medium' | 'large';
}

export interface ShotMeterState {
  active: boolean;
  charge: number;
  playerId: number | null;
  fillSpeed: number;
  greenStart: number;
  greenEnd: number;
  underPressure: boolean;
  isOpen: boolean;
  result: 'none' | 'weak' | 'green' | 'yellow' | 'red';
  resultTimer: number;
}

export interface GameState {
  players: PlayerState[];
  ball: BallState;
  score: { home: number; away: number };
  homeTeam: string;
  awayTeam: string;
  timer: number;
  shotClock: number;
  half: 1 | 2;
  isPlaying: boolean;
  isPaused: boolean;
  possession: 'home' | 'away';
  specialMeter: number;
  goalEvents: GoalEvent[];
  goalFlash: number;
  goalFlashTeam: string | null;
  countdown: number;
  currentEvent: GameEvent;
  eventTimer: number;
  isOvertime: boolean;
  isPenalty: boolean;
  penaltyShooter: number | null;
  cameraShake: number;
  passChain: number;
  passChainTeam: 'home' | 'away' | null;
  flowState: number;
  flowTeam: 'home' | 'away' | null;
  momentumBoost: number;
  momentumTeam: 'home' | 'away' | null;
  slowMo: number;
  cameraZoom: number;
  vignette: number;
  crowdEnergy: number;
  lastGoalReplay: { shooterPos: Vec2; goalSide: 'left' | 'right' } | null;
  shotMeter: ShotMeterState;
  // Combo system
  lastCombo: string | null;
  lastComboTimer: number;
  comboCount: number;
  // ON FIRE streak system
  onFireTeam: 'home' | 'away' | null;
  onFireTimer: number;
  homeStreak: number;
  awayStreak: number;
  // Announcer callouts
  announcer: AnnouncerCallout[];
  // Juice effects
  hitFreeze: number;
  speedLines: number;
  screenFlash: number;
  screenFlashColor: string;
  // Net physics & LED backboard
  netDeform: { side: 'left' | 'right'; intensity: number; timer: number } | null;
  ledFlash: { side: 'left' | 'right'; color: string; intensity: number; timer: number } | null;
}

export const ASSET_URLS = {
  menuBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663476839256/L959pTVNCfBxbsJyQ7g7yz/pyroball_menu_bg-a9ADXr7JLSw9S3yYRQALrW.webp',
  arenaBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/pyroball_arena_v2-eKgNHPvNfDWDF6TdKjF75M.webp',
  fireball: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663476839256/L959pTVNCfBxbsJyQ7g7yz/pyroball_fireball-E9tvDuBzFBX857r47XAGv2.webp',
  courtTexture: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663476839256/L959pTVNCfBxbsJyQ7g7yz/pyroball_court_texture-gK5TRuoWCeFughgBycJaaZ.webp',
  arenaHQ: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/pyroball_arena_v2-eKgNHPvNfDWDF6TdKjF75M.webp',
} as const;

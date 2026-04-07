/**
 * Pyroball Music Engine
 * Manages background music tracks with crossfading between screens.
 * Uses HTML5 Audio for music playback (separate from Web Audio SFX).
 */

// Track definitions mapped to screens
export type MusicTrack = 'menu' | 'teamSelect' | 'inGame' | 'results' | 'howToPlay';

const TRACK_URLS: Record<MusicTrack, string> = {
  menu: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/RunWithThePack_e1942383.mp3',
  teamSelect: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/RiseLikeThunder_bbf682c9.mp3',
  inGame: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/Champion(1)_a0331136.mp3',
  results: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/AllInThisTogether_effe4a99.mp3',
  howToPlay: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663489271487/bLh3StKHGXUj5K9umHEgwQ/GameTimeGlory_6e5ad8cd.mp3',
};

const CROSSFADE_MS = 800;       // Crossfade duration in ms
const DEFAULT_VOLUME = 0.35;    // Music is quieter than SFX

// State
let _musicVolume = DEFAULT_VOLUME;
let _musicMuted = false;
let _currentTrack: MusicTrack | null = null;
let _currentAudio: HTMLAudioElement | null = null;
let _fadingOut: HTMLAudioElement | null = null;
let _fadeOutTimer: number | null = null;
let _fadeInTimer: number | null = null;
let _userInteracted = false;
let _pendingTrack: MusicTrack | null = null;

// Cache audio elements to avoid re-downloading
const _audioCache: Partial<Record<MusicTrack, HTMLAudioElement>> = {};

function getOrCreateAudio(track: MusicTrack): HTMLAudioElement {
  if (_audioCache[track]) {
    return _audioCache[track]!;
  }
  const audio = new Audio(TRACK_URLS[track]);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0;
  _audioCache[track] = audio;
  return audio;
}

// Preload all tracks
export function preloadMusic() {
  (Object.keys(TRACK_URLS) as MusicTrack[]).forEach(track => {
    getOrCreateAudio(track);
  });
}

// Mark that user has interacted (needed for autoplay policy)
export function markUserInteraction() {
  const wasInteracted = _userInteracted;
  _userInteracted = true;
  // If there's a pending track, play it now
  if (!wasInteracted && _pendingTrack) {
    const track = _pendingTrack;
    _pendingTrack = null;
    playMusic(track);
  }
}

// ========== VOLUME CONTROLS ==========

export function setMusicVolume(v: number) {
  _musicVolume = Math.max(0, Math.min(1, v));
  if (_currentAudio && !_musicMuted) {
    _currentAudio.volume = _musicVolume;
  }
}

export function setMusicMuted(m: boolean) {
  _musicMuted = m;
  if (_currentAudio) {
    _currentAudio.volume = _musicMuted ? 0 : _musicVolume;
  }
}

export function isMusicMuted(): boolean { return _musicMuted; }
export function getMusicVolume(): number { return _musicVolume; }

// ========== PLAYBACK ==========

/**
 * Play a music track with crossfade from the current track.
 * If the same track is already playing, does nothing.
 */
export function playMusic(track: MusicTrack) {
  // Same track already playing — skip
  if (track === _currentTrack && _currentAudio && !_currentAudio.paused) {
    return;
  }

  // If user hasn't interacted yet, queue it
  if (!_userInteracted) {
    _pendingTrack = track;
    return;
  }

  // Clear any ongoing fades
  if (_fadeOutTimer !== null) {
    clearInterval(_fadeOutTimer);
    _fadeOutTimer = null;
  }
  if (_fadeInTimer !== null) {
    clearInterval(_fadeInTimer);
    _fadeInTimer = null;
  }

  // Fade out current track
  if (_currentAudio && !_currentAudio.paused) {
    const oldAudio = _currentAudio;
    // Stop any previous fading-out audio
    if (_fadingOut) {
      _fadingOut.pause();
      _fadingOut.currentTime = 0;
    }
    _fadingOut = oldAudio;

    const fadeOutSteps = 20;
    const fadeOutInterval = CROSSFADE_MS / fadeOutSteps;
    const fadeOutDecrement = oldAudio.volume / fadeOutSteps;
    let fadeOutCount = 0;

    _fadeOutTimer = window.setInterval(() => {
      fadeOutCount++;
      oldAudio.volume = Math.max(0, oldAudio.volume - fadeOutDecrement);
      if (fadeOutCount >= fadeOutSteps) {
        if (_fadeOutTimer !== null) clearInterval(_fadeOutTimer);
        _fadeOutTimer = null;
        oldAudio.pause();
        oldAudio.currentTime = 0;
        oldAudio.volume = 0;
        if (_fadingOut === oldAudio) _fadingOut = null;
      }
    }, fadeOutInterval);
  }

  // Start new track with fade in
  const newAudio = getOrCreateAudio(track);
  newAudio.currentTime = 0;
  newAudio.volume = 0;
  _currentAudio = newAudio;
  _currentTrack = track;

  const targetVolume = _musicMuted ? 0 : _musicVolume;

  // Try to play (may fail due to autoplay policy)
  const playPromise = newAudio.play();
  if (playPromise) {
    playPromise.catch(() => {
      // Autoplay blocked — queue for later
      _pendingTrack = track;
      _userInteracted = false;
    });
  }

  if (targetVolume > 0) {
    const fadeInSteps = 20;
    const fadeInInterval = CROSSFADE_MS / fadeInSteps;
    const fadeInIncrement = targetVolume / fadeInSteps;
    let fadeInCount = 0;

    _fadeInTimer = window.setInterval(() => {
      fadeInCount++;
      newAudio.volume = Math.min(targetVolume, newAudio.volume + fadeInIncrement);
      if (fadeInCount >= fadeInSteps) {
        if (_fadeInTimer !== null) clearInterval(_fadeInTimer);
        _fadeInTimer = null;
        newAudio.volume = targetVolume;
      }
    }, fadeInInterval);
  }
}

/**
 * Stop all music with a fade out.
 */
export function stopMusic() {
  if (_currentAudio && !_currentAudio.paused) {
    const audio = _currentAudio;
    const fadeOutSteps = 15;
    const fadeOutInterval = CROSSFADE_MS / fadeOutSteps;
    const fadeOutDecrement = audio.volume / fadeOutSteps;
    let count = 0;

    const timer = window.setInterval(() => {
      count++;
      audio.volume = Math.max(0, audio.volume - fadeOutDecrement);
      if (count >= fadeOutSteps) {
        clearInterval(timer);
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 0;
      }
    }, fadeOutInterval);
  }
  _currentTrack = null;
  _currentAudio = null;
  _pendingTrack = null;
}

/**
 * Pause current music (for tab switching, etc.)
 */
export function pauseMusic() {
  if (_currentAudio && !_currentAudio.paused) {
    _currentAudio.pause();
  }
}

/**
 * Resume paused music.
 */
export function resumeMusic() {
  if (_currentAudio && _currentAudio.paused && _currentTrack) {
    _currentAudio.play().catch(() => {});
  }
}

"use client";

import { Howl, Howler } from "howler";

// ─── Sound file paths (place MP3s in /public/sounds/) ────────────
const SOUND_FILES = {
  whistle: "/sounds/whistle.mp3",
  kick: "/sounds/kick.mp3",
  pass: "/sounds/pass.mp3",
  correctRanked: "/sounds/correct_ranked.mp3",
  dailyCorrect: "/sounds/correct_answer.mp3",
  // Shared wrong-answer buzzer for daily challenges and ranked gameplay.
  wrongAnswer: "/sounds/wrong_answer.mp3",
  imposterReveal: "/sounds/imposter.wav",
  auctionClue: "/sounds/auction/mixkit-free/stat-player-select.mp3",
  auctionBid: "/sounds/auction/mixkit-free/bid-coins-handling.mp3",
  auctionFold: "/sounds/auction/mixkit-free/fold-paper-slide.mp3",
  auctionReveal: "/sounds/auction/mixkit-free/sold-service-bell.mp3",
  auctionWon: "/sounds/auction/mixkit-free/won-casino-bling.mp3",
  auctionWarning: "/sounds/auction/mixkit-free/warning-racing-countdown.mp3",
  auctionFinished: "/sounds/auction/mixkit-free/finish-crowd-ovation.mp3",
} as const;

const BGM_FILES = {
  ranked: "/sounds/ranked_demo.mp3",
  // Auction deliberately shares ranked's stadium loop so both competitive
  // modes feel like part of the same QuizBall match family.
  auction: "/sounds/ranked_demo.mp3",
  kickoff: "/sounds/gameplay_soundtrack.m4a",
  search: "/sounds/quizball-search.mp3",
} as const;

export type SoundName = keyof typeof SOUND_FILES;
export type BgmName = keyof typeof BGM_FILES;

// ─── Volume defaults ─────────────────────────────────────────────
export const GAME_SOUND_VOLUME = {
  sfx: 0.3,
  rankedBgm: 0.025,
  auctionBgm: 0.025,
  // The kickoff track is mastered ~8 dB louder than the search loop
  // (-9.7 vs -17.8 LUFS), so it's played quieter to match search's
  // perceived level. 0.025 * 10^(-8/20) ≈ 0.01.
  kickoffBgm: 0.01,
  searchBgm: 0.025,
} as const;
// Flip to true to re-enable the ranked BGM loop. Wiring stays in place
// so this is a one-liner to revive whenever we want music back.
const BGM_ENABLED = false;
const MUTE_STORAGE_KEY = 'quizball_audio_muted';
const MUTE_CHANGED_EVENT = 'quizball:audio-muted-changed';

// ─── Howl instances (lazy-loaded) ────────────────────────────────
const sounds: Partial<Record<SoundName, Howl>> = {};

// Per-sound volume overrides (default is GAME_SOUND_VOLUME.sfx).
const SOUND_VOLUME: Partial<Record<SoundName, number>> = {
  correctRanked: 0.45,
  dailyCorrect: 0.55,
  wrongAnswer: 0.5,
  imposterReveal: 0.7,
  auctionClue: 0.3,
  auctionBid: 0.34,
  auctionFold: 0.32,
  auctionReveal: 0.34,
  auctionWon: 0.3,
  auctionWarning: 0.28,
  auctionFinished: 0.22,
};

function getSound(name: SoundName): Howl {
  if (!sounds[name]) {
    sounds[name] = new Howl({
      src: [SOUND_FILES[name]],
      volume: SOUND_VOLUME[name] ?? GAME_SOUND_VOLUME.sfx,
      preload: true,
      ...(SOUND_FILES[name].endsWith(".wav") ? { html5: true } : {}),
    });
  }
  return sounds[name]!;
}

// ─── Public API ──────────────────────────────────────────────────

/** Play a one-shot sound effect */
export function playSfx(name: SoundName) {
  try {
    ensureMutePreferenceLoaded();
    if (_muted || isDocumentHidden()) return;
    const sound = getSound(name);
    sound.play();
  } catch {
    // Silently fail — sound files might not exist yet
  }
}

/** Set master volume (0-1) */
export function setMasterVolume(vol: number) {
  Howler.volume(vol);
}

let _muted = false;
let mutePreferenceLoaded = false;

interface SetMutedOptions {
  /** Keep an active music track paused while unmuting sound effects. */
  resumeBgm?: boolean;
}

/** Mute / unmute all sounds. Active music resumes by default for legacy callers. */
export function setMuted(muted: boolean, { resumeBgm = true }: SetMutedOptions = {}) {
  ensureMutePreferenceLoaded();
  if (!muted) {
    bgmAutoResumeEnabled = resumeBgm;
    if (!resumeBgm) pauseActiveBgmForPageHide();
  }
  _muted = muted;
  Howler.mute(muted);
  persistMutePreference(muted);
  setFallbackMuted(muted);
  if (!muted && resumeBgm) resumeActiveBgm();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(MUTE_CHANGED_EVENT));
}

/** Check if currently muted */
export function isMuted(): boolean {
  ensureMutePreferenceLoaded();
  return _muted;
}

export function toggleMute(): boolean {
  ensureMutePreferenceLoaded();
  setMuted(!_muted);
  return _muted;
}

export function subscribeMuted(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(MUTE_CHANGED_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(MUTE_CHANGED_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

/** Preload all sounds (call on game start) */
export function preloadAll() {
  ensureMutePreferenceLoaded();
  if (_muted) return;
  (Object.keys(SOUND_FILES) as SoundName[]).forEach(getSound);
}

/** Unload all sounds (cleanup) */
export function unloadAll() {
  stopBgm(0);
  Object.values(sounds).forEach((s) => s?.unload());
  Object.keys(sounds).forEach((k) => delete sounds[k as SoundName]);
  Object.values(bgmInstances).forEach((s) => s?.unload());
  Object.keys(bgmInstances).forEach((k) => delete bgmInstances[k as BgmName]);
  kickoffAudioFallback?.pause();
  kickoffAudioFallback = null;
}

// ─── Background music (looping) ──────────────────────────────────

const bgmInstances: Partial<Record<BgmName, Howl>> = {};
let activeBgm: BgmName | null = null;
let bgmAutoResumeEnabled = true;
let kickoffAudioFallback: HTMLAudioElement | null = null;
let lifecycleHandlersInstalled = false;

function readStoredMutePreference(): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MUTE_STORAGE_KEY);
    if (raw === null) return null;
    return raw === 'true';
  } catch {
    return null;
  }
}

function persistMutePreference(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? 'true' : 'false');
  } catch {
    // Storage can be unavailable in private browsing; audio still works in memory.
  }
}

function ensureMutePreferenceLoaded(): void {
  if (mutePreferenceLoaded) return;
  mutePreferenceLoaded = true;
  const stored = readStoredMutePreference();
  if (stored !== null) _muted = stored;
  Howler.mute(_muted);
  setFallbackMuted(_muted);
}

function getBgmVolume(name: BgmName): number {
  if (name === 'kickoff') return GAME_SOUND_VOLUME.kickoffBgm;
  if (name === 'search') return GAME_SOUND_VOLUME.searchBgm;
  if (name === 'auction') return GAME_SOUND_VOLUME.auctionBgm;
  return GAME_SOUND_VOLUME.rankedBgm;
}

function getBgm(name: BgmName): Howl {
  if (!bgmInstances[name]) {
    bgmInstances[name] = new Howl({
      src: [BGM_FILES[name]],
      volume: getBgmVolume(name),
      loop: true,
      preload: true,
      ...(name === 'kickoff' ? { format: ['m4a'] } : {}),
    });
  }
  return bgmInstances[name]!;
}

function isDocumentHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

function setFallbackMuted(muted: boolean): void {
  if (kickoffAudioFallback) kickoffAudioFallback.muted = muted;
}

function pauseActiveBgmForPageHide(): void {
  if (!activeBgm) return;
  if (activeBgm === 'kickoff' && kickoffAudioFallback) {
    kickoffAudioFallback.pause();
    return;
  }

  const sound = bgmInstances[activeBgm];
  if (!sound?.playing()) return;
  sound.pause();
}

/** Resume the selected track after unmute or page restore, loading it if deferred. */
function resumeActiveBgm(): void {
  if (!activeBgm || !bgmAutoResumeEnabled || _muted || isDocumentHidden()) return;
  if (activeBgm === 'kickoff' && kickoffAudioFallback) {
    void kickoffAudioFallback.play().catch(() => {});
    return;
  }

  const sound = bgmInstances[activeBgm];
  if (!sound) {
    // Reuse the normal first-play path, including its best-effort fallback.
    const deferredTrack = activeBgm;
    activeBgm = null;
    playBgm(deferredTrack);
    return;
  }
  if (sound.playing()) return;
  // If Howler is still loading, let the existing play request finish rather
  // than queueing another loop instance. This is the common duplicate-audio
  // path on mobile when the page is backgrounded during startup.
  if (sound.state() === 'loading') return;
  sound.off('fade');
  sound.volume(getBgmVolume(activeBgm));
  sound.play();
}

function ensureBgmLifecycleHandlers(): void {
  if (lifecycleHandlersInstalled || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  lifecycleHandlersInstalled = true;

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      pauseActiveBgmForPageHide();
      return;
    }
    resumeActiveBgm();
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', pauseActiveBgmForPageHide);
  window.addEventListener('pageshow', resumeActiveBgm);
  window.addEventListener('focus', resumeActiveBgm);
}

/** Prepare a background track without starting playback. */
export function preloadBgm(name: BgmName) {
  try {
    ensureMutePreferenceLoaded();
    if (_muted) return;
    ensureBgmLifecycleHandlers();
    getBgm(name);
  } catch {
    // Keep audio best-effort. Missing/blocked audio should never break UI.
  }
}

/**
 * Start a looping background track at the default low volume.
 * Idempotent: calling with the currently-playing track is a no-op.
 */
export function playBgm(name: BgmName) {
  if (!BGM_ENABLED && name !== 'auction' && name !== 'kickoff' && name !== 'search') return;
  try {
    ensureMutePreferenceLoaded();
    ensureBgmLifecycleHandlers();
    const wasAutoResumeEnabled = bgmAutoResumeEnabled;
    bgmAutoResumeEnabled = true;
    if (activeBgm === name && (bgmInstances[name] || (name === 'kickoff' && kickoffAudioFallback))) {
      const current = bgmInstances[name];
      current?.off('fade');
      current?.volume(getBgmVolume(name));
      if (!wasAutoResumeEnabled) resumeActiveBgm();
      return;
    }
    if (name !== 'kickoff' && kickoffAudioFallback) {
      kickoffAudioFallback.pause();
      kickoffAudioFallback.currentTime = 0;
      kickoffAudioFallback = null;
    }
    for (const [key, instance] of Object.entries(bgmInstances)) {
      if (key !== name) instance?.stop();
    }
    activeBgm = name;
    if (_muted) return;
    const sound = getBgm(name);
    // Drop any pending fade-then-stop callback armed by a prior stopBgm —
    // otherwise the lingering fade event will fire on the new playback and
    // silence the track mid-loop.
    sound.off('fade');
    sound.volume(getBgmVolume(name));
    if (!isDocumentHidden() && !_muted && !sound.playing()) sound.play();
  } catch {
    if (name !== 'kickoff' || typeof Audio === 'undefined') return;
    kickoffAudioFallback ??= new Audio(BGM_FILES.kickoff);
    kickoffAudioFallback.loop = true;
    kickoffAudioFallback.muted = _muted;
    kickoffAudioFallback.volume = getBgmVolume(name);
    activeBgm = name;
    if (!isDocumentHidden() && !_muted) void kickoffAudioFallback.play().catch(() => {});
  }
}

/** Stop the active BGM. Optionally fade out over `fadeMs` first. */
export function stopBgm(fadeMs = 0) {
  if (!activeBgm) return;
  if (activeBgm === 'kickoff' && kickoffAudioFallback) {
    kickoffAudioFallback.pause();
    kickoffAudioFallback.currentTime = 0;
  }
  const sound = bgmInstances[activeBgm];
  if (!sound) {
    activeBgm = null;
    return;
  }
  // Clear any prior fade listener so repeated stopBgm calls don't stack
  // callbacks that fire on later fades.
  sound.off('fade');
  if (fadeMs > 0 && sound.playing()) {
    const current = sound.volume();
    sound.once('fade', () => sound.stop());
    sound.fade(typeof current === 'number' ? current : getBgmVolume(activeBgm), 0, fadeMs);
  } else {
    sound.stop();
  }
  activeBgm = null;
}

/** Adjust the active BGM volume (0..1). */
export function setBgmVolume(vol: number) {
  if (!activeBgm) return;
  bgmInstances[activeBgm]?.volume(Math.max(0, Math.min(1, vol)));
}

"use client";

import { Howl, Howler } from "howler";

// ─── Sound file paths (place MP3s in /public/sounds/) ────────────
const SOUND_FILES = {
  whistle: "/sounds/whistle.mp3",
  kick: "/sounds/kick.mp3",
  pass: "/sounds/pass.mp3",
  correctRanked: "/sounds/correct_ranked.mp3",
  dailyCorrect: "/sounds/mixkit-unlock-game-notification-253.wav",
  imposterReveal: "/sounds/imposter.wav",
} as const;

const BGM_FILES = {
  ranked: "/sounds/ranked_demo.wav",
  kickoff: "/sounds/gameplay_soundtrack.m4a",
  search: "/sounds/quizball-search.mp3",
} as const;

type SoundName = keyof typeof SOUND_FILES;
type BgmName = keyof typeof BGM_FILES;

// ─── Volume defaults ─────────────────────────────────────────────
export const GAME_SOUND_VOLUME = {
  sfx: 0.3,
  rankedBgm: 0.025,
  kickoffBgm: 0.025,
  searchBgm: 0.025,
} as const;
// Flip to true to re-enable the ranked BGM loop. Wiring stays in place
// so this is a one-liner to revive whenever we want music back.
const BGM_ENABLED = false;

// ─── Howl instances (lazy-loaded) ────────────────────────────────
const sounds: Partial<Record<SoundName, Howl>> = {};

// Per-sound volume overrides (default is GAME_SOUND_VOLUME.sfx).
const SOUND_VOLUME: Partial<Record<SoundName, number>> = {
  correctRanked: 0.45,
  dailyCorrect: 0.55,
  imposterReveal: 0.7,
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

/** Mute / unmute all sounds */
export function setMuted(muted: boolean) {
  _muted = muted;
  Howler.mute(muted);
}

/** Check if currently muted */
export function isMuted(): boolean {
  return _muted;
}

export function toggleMute(): boolean {
  _muted = !_muted;
  Howler.mute(_muted);
  return _muted;
}

/** Preload all sounds (call on game start) */
export function preloadAll() {
  (Object.keys(SOUND_FILES) as SoundName[]).forEach(getSound);
}

/** Unload all sounds (cleanup) */
export function unloadAll() {
  Object.values(sounds).forEach((s) => s?.unload());
  Object.keys(sounds).forEach((k) => delete sounds[k as SoundName]);
}

// ─── Background music (looping) ──────────────────────────────────

const bgmInstances: Partial<Record<BgmName, Howl>> = {};
let activeBgm: BgmName | null = null;
let kickoffAudioFallback: HTMLAudioElement | null = null;

function getBgmVolume(name: BgmName): number {
  if (name === 'kickoff') return GAME_SOUND_VOLUME.kickoffBgm;
  if (name === 'search') return GAME_SOUND_VOLUME.searchBgm;
  return GAME_SOUND_VOLUME.rankedBgm;
}

function getBgm(name: BgmName): Howl {
  if (!bgmInstances[name]) {
    bgmInstances[name] = new Howl({
      src: [BGM_FILES[name]],
      volume: getBgmVolume(name),
      loop: true,
      preload: true,
      ...(name === 'kickoff' ? { format: ['m4a'], html5: true } : {}),
      ...(name === 'search' ? { html5: true } : {}),
    });
  }
  return bgmInstances[name]!;
}

/** Prepare a background track without starting playback. */
export function preloadBgm(name: BgmName) {
  try {
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
  if (!BGM_ENABLED && name !== 'kickoff' && name !== 'search') return;
  try {
    if (activeBgm === name && bgmInstances[name]?.playing()) return;
    for (const [key, instance] of Object.entries(bgmInstances)) {
      if (key !== name) instance?.stop();
    }
    const sound = getBgm(name);
    // Drop any pending fade-then-stop callback armed by a prior stopBgm —
    // otherwise the lingering fade event will fire on the new playback and
    // silence the track mid-loop.
    sound.off('fade');
    sound.volume(getBgmVolume(name));
    if (!sound.playing()) sound.play();
    activeBgm = name;
  } catch {
    if (name !== 'kickoff' || typeof Audio === 'undefined') return;
    kickoffAudioFallback ??= new Audio(BGM_FILES.kickoff);
    kickoffAudioFallback.loop = true;
    kickoffAudioFallback.volume = getBgmVolume(name);
    void kickoffAudioFallback.play().catch(() => {});
    activeBgm = name;
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

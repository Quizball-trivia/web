'use client';

import { Howl, Howler } from 'howler';

// ─── Sound file paths (place MP3s in /public/sounds/) ────────────
const SOUND_FILES = {
  whistle: '/sounds/whistle.mp3',
  kick: '/sounds/kick.mp3',
  pass: '/sounds/pass.mp3',
} as const;

type SoundName = keyof typeof SOUND_FILES;

// ─── Volume defaults ─────────────────────────────────────────────
const SFX_VOLUME = 0.6;

// ─── Howl instances (lazy-loaded) ────────────────────────────────
const sounds: Partial<Record<SoundName, Howl>> = {};

function getSound(name: SoundName): Howl {
  if (!sounds[name]) {
    sounds[name] = new Howl({
      src: [SOUND_FILES[name]],
      volume: SFX_VOLUME,
      preload: true,
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

/** Mute / unmute all sounds */
export function setMuted(muted: boolean) {
  Howler.mute(muted);
}

/** Check if currently muted */
export function isMuted(): boolean {
  // Howler doesn't expose mute state directly, track it ourselves
  return _muted;
}

let _muted = false;
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
  Object.values(sounds).forEach(s => s?.unload());
  Object.keys(sounds).forEach(k => delete sounds[k as SoundName]);
}

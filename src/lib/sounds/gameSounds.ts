"use client";

import { Howl, Howler } from "howler";

// ─── Sound file paths (place MP3s in /public/sounds/) ────────────
const SOUND_FILES = {
  whistle: "/sounds/whistle.mp3",
  kick: "/sounds/kick.mp3",
  pass: "/sounds/pass.mp3",
} as const;

const BGM_FILES = {
  ranked: "/sounds/ranked_demo.wav",
  kickoff: "/sounds/gameplay_soundtrack.m4a",
} as const;

type SoundName = keyof typeof SOUND_FILES;
type BgmName = keyof typeof BGM_FILES;

// ─── Volume defaults ─────────────────────────────────────────────
const SFX_VOLUME = 0.4;
// BGM sits below SFX so whistle/kick/pass stay audible over it.
const BGM_VOLUME = 0.12;
const KICKOFF_BGM_VOLUME = 0.5;
// Flip to true to re-enable the ranked BGM loop. Wiring stays in place
// so this is a one-liner to revive whenever we want music back.
const BGM_ENABLED = false;

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

function getBgm(name: BgmName): Howl {
  if (!bgmInstances[name]) {
    bgmInstances[name] = new Howl({
      src: [BGM_FILES[name]],
      volume: name === 'kickoff' ? KICKOFF_BGM_VOLUME : BGM_VOLUME,
      loop: true,
      preload: true,
      ...(name === 'kickoff' ? { format: ['m4a'], html5: true } : {}),
    });
  }
  return bgmInstances[name]!;
}

/**
 * Start a looping background track at the default low volume.
 * Idempotent: calling with the currently-playing track is a no-op.
 */
export function playBgm(name: BgmName) {
  if (!BGM_ENABLED && name !== 'kickoff') return;
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
    sound.volume(name === 'kickoff' ? KICKOFF_BGM_VOLUME : BGM_VOLUME);
    if (!sound.playing()) sound.play();
    activeBgm = name;
  } catch {
    if (name !== 'kickoff' || typeof Audio === 'undefined') return;
    kickoffAudioFallback ??= new Audio(BGM_FILES.kickoff);
    kickoffAudioFallback.loop = true;
    kickoffAudioFallback.volume = KICKOFF_BGM_VOLUME;
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
    sound.fade(typeof current === 'number' ? current : BGM_VOLUME, 0, fadeMs);
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

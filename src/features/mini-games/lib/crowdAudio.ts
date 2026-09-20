'use client';

import { Howl, Howler } from 'howler';
import { isMuted, stopBgm } from '@/lib/sounds/gameSounds';

/**
 * Free Kicks stadium audio.
 * Assets (public/sounds/final-third/):
 *   ambience.mp3 / goal-cheer.mp3 — "Free Crowd Cheering Sounds" by Gregor
 *     Quendel (opengameart.org/content/free-crowd-cheering-sounds, CC-BY)
 *   cash.ogg — "Coins Sounds" by jalastram
 *     (opengameart.org/content/coins-sounds, CC-BY 3.0)
 *   kick.wav — ball kick one-shot
 */

export type CrowdMood = 'idle' | 'build' | 'cheer' | 'miss';

type HowlWithSrc = Howl & { _src?: string | string[] };

const AMB_IDLE = 0.028;
const AMB_BUILD = 0.042;
const AMB_DUCK = 0.008;
const AMB_CHEER = 0.05;
const CHEER_VOL = 0.2;
const KICK_VOL = 0.62;
const CASH_VOL = 0.65;

let kick: Howl | null = null;
let ambience: Howl | null = null;
let cheer: Howl | null = null;
let cash: Howl | null = null;
let mood: CrowdMood = 'idle';
let started = false;
const timers: number[] = [];

/** User volume scales (0..1), persisted. Crowd covers ambience + cheers,
 *  sfx covers kick + cash. */
let crowdScale = 1;
let sfxScale = 1;
let ambTarget = AMB_IDLE;

function loadLevels() {
  if (typeof window === 'undefined') return;
  const crowd = Number(window.localStorage.getItem('ft-vol-crowd'));
  const sfx = Number(window.localStorage.getItem('ft-vol-sfx'));
  if (Number.isFinite(crowd) && crowd >= 0 && crowd <= 1) crowdScale = crowd;
  if (Number.isFinite(sfx) && sfx >= 0 && sfx <= 1) sfxScale = sfx;
}

const ambVol = (target: number) => target * crowdScale;

export function getSoundLevels(): { crowd: number; sfx: number } {
  return { crowd: crowdScale, sfx: sfxScale };
}

export function setCrowdLevel(value: number) {
  crowdScale = Math.min(1, Math.max(0, value));
  if (typeof window !== 'undefined') window.localStorage.setItem('ft-vol-crowd', String(crowdScale));
  if (ambience?.playing()) ambience.volume(ambVol(ambTarget));
  if (crowdScale === 0) cheer?.stop();
}

export function setSfxLevel(value: number) {
  sfxScale = Math.min(1, Math.max(0, value));
  if (typeof window !== 'undefined') window.localStorage.setItem('ft-vol-sfx', String(sfxScale));
}

function srcOf(sound: HowlWithSrc) {
  const src = sound._src;
  return (Array.isArray(src) ? src : [src ?? '']).join(' ');
}

/** Kill leftover crowd loops / BGM from earlier revisions of this page. */
function killStrayAudio() {
  stopBgm(0);
  Howler.stop();
  const howls = (Howler as unknown as { _howls?: HowlWithSrc[] })._howls?.slice() ?? [];
  for (const sound of howls) {
    const src = srcOf(sound);
    if (/crowd-loop|cheer\.wav|groan\.wav|ranked_demo|quizball-search|gameplay_soundtrack|World Cup|Quizup/i.test(src)) {
      sound.stop();
      sound.unload();
    }
  }
  if (typeof document !== 'undefined') {
    document.querySelectorAll('audio').forEach((el) => {
      el.pause();
      el.removeAttribute('src');
      el.load();
    });
  }
  kick = null;
}

function ensureKick() {
  kick ??= new Howl({ src: ['/sounds/final-third/kick.wav'], volume: 0.62, preload: true, loop: false });
}

function ensureCrowd() {
  ambience ??= new Howl({ src: ['/sounds/final-third/ambience.mp3'], volume: 0, preload: true, loop: true });
  cheer ??= new Howl({ src: ['/sounds/final-third/goal-cheer.mp3'], volume: CHEER_VOL, preload: true, loop: false });
  cash ??= new Howl({ src: ['/sounds/final-third/cash.ogg'], volume: 0.65, preload: true, loop: false });
}

function later(fn: () => void, ms: number) {
  timers.push(window.setTimeout(fn, ms));
}

export function startCrowd() {
  if (typeof window === 'undefined') return;
  if (!started) {
    killStrayAudio();
    started = true;
  }
  if (isMuted()) return;
  ensureCrowd();
  if (ambience && !ambience.playing()) {
    ambTarget = AMB_IDLE;
    ambience.volume(0);
    ambience.play();
    ambience.fade(0, ambVol(AMB_IDLE), 900);
  }
}

export function setCrowdMood(next: CrowdMood) {
  if (typeof window === 'undefined' || next === mood) return;
  mood = next;
  if (isMuted()) return;
  ensureCrowd();
  const amb = ambience!;
  switch (next) {
    case 'cheer': {
      cheer!.stop();
      if (crowdScale > 0) {
        const id = cheer!.play();
        cheer!.fade(0, CHEER_VOL * crowdScale, 200, id);
        // The sample runs 14s — let it roar, then fade the tail out.
        later(() => {
          if (cheer?.playing(id)) {
            cheer.fade(CHEER_VOL * crowdScale, 0, 2000, id);
            later(() => cheer?.stop(id), 2100);
          }
        }, 4500);
      }
      ambTarget = AMB_CHEER;
      amb.fade(amb.volume() as number, ambVol(AMB_CHEER), 300);
      break;
    }
    case 'miss': {
      // No groan asset — a hush reads just as well: duck the crowd, then breathe back.
      cheer?.stop();
      ambTarget = AMB_DUCK;
      amb.fade(amb.volume() as number, ambVol(AMB_DUCK), 180);
      later(() => {
        if (mood === 'miss') {
          ambTarget = AMB_IDLE;
          amb.fade(amb.volume() as number, ambVol(AMB_IDLE), 1400);
        }
      }, 1500);
      break;
    }
    case 'build':
      ambTarget = AMB_BUILD;
      amb.fade(amb.volume() as number, ambVol(AMB_BUILD), 500);
      break;
    default:
      ambTarget = AMB_IDLE;
      amb.fade(amb.volume() as number, ambVol(AMB_IDLE), 700);
  }
}

export function playKick() {
  if (typeof window === 'undefined' || isMuted() || sfxScale === 0) return;
  ensureKick();
  kick?.stop();
  kick?.volume(KICK_VOL * sfxScale);
  kick?.play();
}

export function playCash() {
  if (typeof window === 'undefined' || isMuted() || sfxScale === 0) return;
  ensureCrowd();
  cash?.stop();
  cash?.volume(CASH_VOL * sfxScale);
  cash?.play();
}

export function stopCrowd() {
  timers.forEach((id) => window.clearTimeout(id));
  timers.length = 0;
  mood = 'idle';
  kick?.stop();
  cheer?.stop();
  cash?.stop();
  if (ambience?.playing()) {
    ambience.fade(ambience.volume() as number, 0, 350);
    const amb = ambience;
    window.setTimeout(() => amb.stop(), 400);
  }
}

if (typeof window !== 'undefined') {
  loadLevels();
  killStrayAudio();
}

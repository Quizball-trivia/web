/**
 * Directs the ორშაბათობა studio behind the host screen: which shot the camera holds and what Tato and Kala do, worked
 * out from where the show is. Pure, so the same moment always gives the same cue (gesture keys included).
 */

import { SMASH_IMPACT_S, type HostAct } from '@/features/orshabatoba/studio/acting';
import type { HostId, StudioShot } from '@/features/orshabatoba/studio/studioLayout';
import type { ShowScreen } from './useShowSim';

/** How the crowd did on the question just revealed. */
export type CrowdMood = 'great' | 'ok' | 'bad' | 'disaster';

export interface StudioLine {
  host: HostId;
  tone: 'ask' | 'angry' | 'happy';
  line: 'join' | 'great' | 'bad' | 'disaster';
}

export interface StudioCue {
  shot: StudioShot;
  acts: Record<HostId, HostAct>;
  /**
   * Non-zero while Tato plays the smash this key started. The screen breaks his laptop and jolts the camera
   * SMASH_IMPACT_S real seconds after it first sees the key, on the same clock the gesture plays on.
   */
  impact: number;
  mood: CrowdMood | null;
  say: StudioLine | null;
}

export function crowdMood(correctShare: number): CrowdMood {
  if (correctShare >= 0.6) return 'great';
  if (correctShare >= 0.4) return 'ok';
  if (correctShare >= 0.22) return 'bad';
  return 'disaster';
}

/** A gesture key that is unique to one moment of the show and never 0. */
const cueKey = (stage: number, q: number, phase: number) => (stage + 1) * 10_000 + (q + 1) * 10 + phase;

const TO_CAMERA: HostAct = { look: 'camera' };
/** One reaction when the champion appears. */
const CHAMPION_GESTURE_KEY = 1_000_000;

export interface DirectorInput {
  screen: ShowScreen;
  /** Show clock (ms). */
  now: number;
  /** Show-clock speed multiplier. */
  speed: number;
  /** Share of answers that were right, on a reveal. */
  correctShare: number | null;
  /** Dev: force the reaction on every reveal. */
  moodOverride?: CrowdMood | null;
}

export function directStudio({ screen, correctShare, moodOverride }: DirectorInput): StudioCue {
  const cue: StudioCue = { shot: 'show', acts: { tato: {}, kala: {} }, impact: 0, mood: null, say: null };
  switch (screen.kind) {
    case 'creator':
      cue.acts = { tato: TO_CAMERA, kala: TO_CAMERA };
      return cue;
    case 'lobby': {
      const key = cueKey(-1, 0, 1);
      cue.acts = {
        tato: { look: 'other', gesture: { name: 'nod', key, delaySeconds: 0.35 } },
        kala: { look: 'camera', gesture: { name: 'welcome', key } },
      };
      cue.say = { host: 'kala', tone: 'ask', line: 'join' };
      return cue;
    }
    case 'stage_intro': {
      // The hosts take turns announcing a round.
      const host: HostId = screen.stage % 2 === 0 ? 'tato' : 'kala';
      const listener = host === 'tato' ? 'kala' : 'tato';
      const key = cueKey(screen.stage, 0, 1);
      cue.shot = host;
      cue.acts[host] = { look: 'camera', gesture: { name: screen.stage % 3 === 0 ? 'present' : 'leanToMic', key } };
      cue.acts[listener] = { look: 'other', gesture: { name: 'nod', key, delaySeconds: 0.65 } };
      return cue;
    }
    case 'question': {
      const reader: HostId = (screen.stage + screen.q) % 2 === 0 ? 'tato' : 'kala';
      cue.acts[reader] = { gesture: { name: 'readLaptop', key: cueKey(screen.stage, screen.q, 6) } };
      return cue;
    }
    case 'reveal': {
      const mood = moodOverride ?? crowdMood(correctShare ?? 0.5);
      // The mood is part of the key, so forcing another reaction mid-reveal restarts the gesture.
      const key = cueKey(screen.stage, screen.q, 2 + ['great', 'ok', 'bad', 'disaster'].indexOf(mood));
      cue.mood = mood;
      if (mood === 'great') {
        cue.acts = { tato: { gesture: { name: 'approve', key, delaySeconds: 0.22 } }, kala: { look: 'other', gesture: { name: 'celebrate', key } } };
        cue.say = { host: 'kala', tone: 'happy', line: 'great' };
      } else if (mood === 'ok') {
        cue.acts = { tato: { gesture: { name: 'nod', key } }, kala: { gesture: { name: 'nod', key, delaySeconds: 0.36 } } };
      } else if (mood === 'bad') {
        cue.acts = { tato: { look: 'camera', anger: 3, gesture: { name: 'shake', key } }, kala: { gesture: { name: screen.q % 2 === 0 ? 'doubleTake' : 'laugh', key, delaySeconds: 0.34 } } };
        cue.say = { host: 'tato', tone: 'angry', line: 'bad' };
      } else {
        cue.shot = 'tato-smash';
        cue.acts = { tato: { anger: 4, gesture: { name: 'smash', key } }, kala: { gesture: { name: 'flinch', key, delaySeconds: SMASH_IMPACT_S } } };
        cue.say = { host: 'tato', tone: 'angry', line: 'disaster' };
        cue.impact = key;
      }
      return cue;
    }
    case 'stage_result':
      cue.acts = { tato: TO_CAMERA, kala: { look: 'camera', gesture: { name: 'nod', key: cueKey(screen.stage, 0, 3) } } };
      return cue;
    case 'champion': {
      const key = CHAMPION_GESTURE_KEY;
      cue.shot = 'wide';
      cue.acts = {
        tato: { look: 'camera', gesture: { name: 'approve', key, delaySeconds: 0.28 } },
        kala: { look: 'other', gesture: { name: 'celebrate', key } },
      };
      return cue;
    }
  }
}

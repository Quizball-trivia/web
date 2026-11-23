import { describe, expect, it } from 'vitest';
import { DIGITS, GESTURE_SECONDS, SMASH_IMPACT_S, fingerFlex, gesturePose, handGrip } from '@/features/orshabatoba/studio/acting';
import { crowdMood, directStudio } from '../studioDirector';

describe('crowdMood', () => {
  it('grades the share of right answers', () => {
    expect(crowdMood(0.9)).toBe('great');
    expect(crowdMood(0.6)).toBe('great');
    expect(crowdMood(0.5)).toBe('ok');
    expect(crowdMood(0.3)).toBe('bad');
    expect(crowdMood(0.1)).toBe('disaster');
  });
});

describe('directStudio', () => {
  const REVEAL_MS = 5_000;
  const reveal = (now: number) => ({ kind: 'reveal' as const, stage: 1, q: 2, until: 10_000 + REVEAL_MS, now });

  it('alternates which host checks the laptop once per question', () => {
    const cue = directStudio({
      screen: { kind: 'question', stage: 0, q: 0, shownAt: 0, startsAt: 0, deadline: 1 }, now: 0, speed: 1, correctShare: null,
    });
    expect(cue.shot).toBe('show');
    expect(cue.acts.tato.gesture?.name).toBe('readLaptop');
    expect(cue.acts.kala).toEqual({});
    const next = directStudio({ screen: { kind: 'question', stage: 0, q: 1, shownAt: 0, startsAt: 0, deadline: 1 }, now: 0, speed: 1, correctShare: null });
    expect(next.acts.kala.gesture?.name).toBe('readLaptop');
    expect(next.acts.kala.gesture?.key).not.toBe(cue.acts.tato.gesture?.key);
    expect(cue.impact).toBe(0);
  });

  it('alternates who announces a round', () => {
    const intro = (stage: number) => directStudio({ screen: { kind: 'stage_intro', stage, until: 0 }, now: 0, speed: 1, correctShare: null });
    expect([intro(0).shot, intro(1).shot, intro(2).shot]).toEqual(['tato', 'kala', 'tato']);
    expect(intro(0).acts.tato.gesture?.name).toBe('present');
    expect(intro(1).acts.kala.gesture?.name).toBe('leanToMic');
    expect(intro(2).acts.tato.gesture?.name).toBe('leanToMic');
  });

  it('lets Kala welcome the audience while Tato acknowledges him', () => {
    const cue = directStudio({ screen: { kind: 'lobby', openedAt: 0, closesAt: 5_000 }, now: 0, speed: 1, correctShare: null });
    expect(cue.acts.kala).toMatchObject({ look: 'camera', gesture: { name: 'welcome' } });
    expect(cue.acts.tato).toMatchObject({ look: 'other', gesture: { name: 'nod' } });
  });

  it('has Kala cheer a good question', () => {
    const { now, ...screen } = reveal(10_000);
    const cue = directStudio({ screen, now, speed: 1, correctShare: 0.8 });
    expect(cue.mood).toBe('great');
    expect(cue.acts.kala.gesture?.name).toBe('celebrate');
    expect(cue.acts.tato.gesture).toMatchObject({ name: 'approve', delaySeconds: 0.22 });
    expect(cue.say).toEqual({ host: 'kala', tone: 'happy', line: 'great' });
  });

  it('cuts to Tato for the smash and flags the impact only then', () => {
    const { now, ...screen } = reveal(10_000);
    const smash = directStudio({ screen, now, speed: 1, correctShare: 0.1 });
    expect(smash.shot).toBe('tato-smash');
    expect(smash.acts.tato.gesture?.name).toBe('smash');
    expect(smash.impact).toBe(smash.acts.tato.gesture?.key);
    expect(smash.acts.kala.gesture).toEqual({ name: 'flinch', key: smash.impact, delaySeconds: SMASH_IMPACT_S });
    expect(directStudio({ screen, now, speed: 1, correctShare: 0.3 }).impact).toBe(0);
  });

  it('restarts the gesture when the reaction is changed mid-reveal', () => {
    const { now, ...screen } = reveal(10_000);
    const key = (moodOverride: 'great' | 'disaster') => directStudio({ screen, now, speed: 1, correctShare: 0.5, moodOverride }).acts.tato.gesture?.key;
    expect(key('great')).not.toBe(key('disaster'));
  });

  it('gives every reveal its own gesture key', () => {
    const key = (stage: number, q: number) =>
      directStudio({ screen: { kind: 'reveal', stage, q, until: REVEAL_MS }, now: 0, speed: 1, correctShare: 0.5 }).acts.tato.gesture?.key;
    expect(new Set([key(0, 0), key(0, 1), key(1, 0), key(1, 1)]).size).toBe(4);
  });

  it('lets the dev bar force a reaction', () => {
    const { now, ...screen } = reveal(10_000);
    expect(directStudio({ screen, now, speed: 1, correctShare: 0.9, moodOverride: 'bad' }).mood).toBe('bad');
  });
});

describe('studio hand poses', () => {
  it('uses one open palm for the laptop strike', () => {
    const grip = handGrip('smash', SMASH_IMPACT_S, true);
    for (const digit of DIGITS) expect(fingerFlex(grip, digit, 2)).toBe(0);
    expect(handGrip('smash', SMASH_IMPACT_S, false)).toEqual(handGrip(undefined, 0, false));
    expect(gesturePose('smash', 0.75, 'Right').some(turn => turn.bone.startsWith('Left'))).toBe(false);
  });

  it('keeps elbows at rest throughout approval and celebration', () => {
    for (const gesture of ['approve', 'celebrate'] as const) {
      for (let t = 0; t < GESTURE_SECONDS[gesture]; t += 0.1) {
        expect(gesturePose(gesture, t, 'Left').some(turn => turn.bone.endsWith('Arm'))).toBe(false);
      }
    }
  });

  it('lets the champion reaction settle when the results screen stays open', () => {
    const champion = (now: number) => directStudio({ screen: { kind: 'champion', board: [] }, now, speed: 1, correctShare: null });
    expect(champion(60_000).acts).toEqual(champion(0).acts);
  });
});

it('varies Kala’s reaction to a difficult question and keeps the desk gestures seated', () => {
  const bad = (q: number) => directStudio({ screen: { kind: 'reveal', stage: 0, q, until: 5000 }, now: 0, speed: 1, correctShare: 0.3 });
  expect(bad(0).acts.kala.gesture?.name).toBe('doubleTake');
  expect(bad(1).acts.kala.gesture?.name).toBe('laugh');
  for (const name of ['doubleTake', 'readLaptop', 'leanToMic'] as const) {
    for (let t = 0; t < GESTURE_SECONDS[name]; t += 0.1) {
      expect(gesturePose(name, t, 'Left').every(turn => !/(Arm|Hand)$/.test(turn.bone))).toBe(true);
    }
    expect(gesturePose(name, GESTURE_SECONDS[name], 'Right').every(turn => Math.abs(turn.deg) < 0.001)).toBe(true);
  }
});

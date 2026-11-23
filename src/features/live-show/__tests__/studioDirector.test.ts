import { describe, expect, it } from 'vitest';
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

  it('keeps the hosts at the edges and calm during a question', () => {
    const cue = directStudio({
      screen: { kind: 'question', stage: 0, q: 0, shownAt: 0, startsAt: 0, deadline: 1 }, now: 0, speed: 1, correctShare: null,
    });
    expect(cue.shot).toBe('show');
    expect(cue.acts).toEqual({ tato: {}, kala: {} });
    expect(cue.impact).toBe(0);
  });

  it('alternates who announces a round', () => {
    const shot = (stage: number) => directStudio({ screen: { kind: 'stage_intro', stage, until: 0 }, now: 0, speed: 1, correctShare: null }).shot;
    expect([shot(0), shot(1), shot(2)]).toEqual(['tato', 'kala', 'tato']);
  });

  it('has Kala cheer a good question', () => {
    const { now, ...screen } = reveal(10_000);
    const cue = directStudio({ screen, now, speed: 1, correctShare: 0.8 });
    expect(cue.mood).toBe('great');
    expect(cue.acts.kala.gesture?.name).toBe('celebrate');
    expect(cue.say).toEqual({ host: 'kala', tone: 'happy', line: 'great' });
  });

  it('cuts to Tato for the smash and flags the impact only then', () => {
    const { now, ...screen } = reveal(10_000);
    const smash = directStudio({ screen, now, speed: 1, correctShare: 0.1 });
    expect(smash.shot).toBe('tato-smash');
    expect(smash.acts.tato.gesture?.name).toBe('smash');
    expect(smash.impact).toBe(smash.acts.tato.gesture?.key);
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

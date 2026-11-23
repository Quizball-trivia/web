import { describe, expect, it } from 'vitest';
import { INVENTED_SHOW_PACK } from '@/features/playground/fixtures/liveShow';
import { finalSizeOf, keepCount, minesTally, REVEAL_POINTS, revealStepAt, scoreAnswer, sliderPoints, speedPoints } from '../show.rules';
import { applyCut, makeCrowd, playStageInstantly, YOU_ID } from '../show.sim';
import type { ChoiceQuestion, MinesQuestion, ShowStageDef, SliderQuestion, ZoomOutQuestion } from '../show.types';

const choice: ChoiceQuestion = {
  id: 'c', kind: 'mcq', prompt: { en: 'q' }, correctId: 'a',
  options: [{ id: 'a', label: { en: 'A' } }, { id: 'b', label: { en: 'B' } }],
};

describe('speed points', () => {
  it('keeps 100 inside the grace and never drops below 10 on a right answer', () => {
    expect(speedPoints(0, 10_000)).toBe(100);
    expect(speedPoints(500, 10_000)).toBe(100);
    expect(speedPoints(9_999, 10_000)).toBe(10);
    expect(speedPoints(60_000, 10_000)).toBe(10);
  });
  it('scores a wrong or missing answer 0 and charges the whole window for a miss', () => {
    expect(scoreAnswer(choice, { kind: 'choice', optionId: 'b', elapsedMs: 100 }).points).toBe(0);
    expect(scoreAnswer(choice, null)).toEqual({ points: 0, correct: false, timeMs: 10_000 });
  });
});

describe('reveal steps', () => {
  const zoom: ZoomOutQuestion = {
    id: 'z', kind: 'zoom_out', prompt: { en: 'q' }, art: { kind: 'crest', seed: 's', era: 3, initials: 'X' },
    focus: { x: 0.5, y: 0.5 }, correctId: 'a', options: choice.options,
  };
  it('pays by the step visible at the tap', () => {
    expect(revealStepAt(0, 5)).toBe(0);
    expect(revealStepAt(3_000, 5)).toBe(1);
    expect(revealStepAt(99_000, 5)).toBe(4);
    expect(scoreAnswer(zoom, { kind: 'reveal_choice', optionId: 'a', step: 2, elapsedMs: 6_500 }).points).toBe(REVEAL_POINTS[2]);
    expect(scoreAnswer(zoom, { kind: 'reveal_choice', optionId: 'a', step: 99, elapsedMs: 14_000 }).points).toBe(REVEAL_POINTS[4]);
  });
});

describe('mines', () => {
  const mines: MinesQuestion = {
    id: 'm', kind: 'mines', prompt: { en: 'q' },
    cards: ['1', '2', '3', '4'].map((id) => ({ id, label: { en: id } })), fits: ['1', '2', '3'],
  };
  it('scores found fits, and any mine zeroes the board', () => {
    expect(scoreAnswer(mines, { kind: 'mines', picked: ['1', '2'], elapsedMs: 1 }).points).toBe(67);
    expect(scoreAnswer(mines, { kind: 'mines', picked: ['1', '2', '3'], elapsedMs: 1 })).toMatchObject({ points: 100, correct: true });
    expect(scoreAnswer(mines, { kind: 'mines', picked: ['1', '2', '3', '4'], elapsedMs: 1 }).points).toBe(0);
  });
  it('counts a repeated pick once', () => {
    expect(minesTally(['1', '2'], ['1', '1', '1'])).toEqual({ found: 1, mines: 0 });
  });
});

describe('sliders', () => {
  const q: SliderQuestion = { id: 's', kind: 'what_minute', prompt: { en: 'q' }, min: 1, max: 120, step: 1, answer: 88, tolerance: 30 };
  it('is 100 when exact and falls to 0 at the tolerance', () => {
    expect(sliderPoints(q, 88)).toBe(100);
    expect(sliderPoints(q, 85)).toBe(90);
    expect(sliderPoints(q, 58)).toBe(0);
    expect(sliderPoints(q, 1)).toBe(0);
  });
});

describe('cuts', () => {
  const half: ShowStageDef = { id: 'h', title: { en: 'h' }, questions: [], keep: { share: 0.5 } };
  const toTen: ShowStageDef = { id: 't', title: { en: 't' }, questions: [], keep: { count: 10 } };
  it('halves big fields but never cuts below the final size', () => {
    expect(keepCount(half, 301, 10)).toBe(151);
    expect(keepCount(half, 14, 10)).toBe(10);
    expect(keepCount(half, 6, 10)).toBe(6);
    expect(keepCount(toTen, 38, 10)).toBe(10);
    expect(keepCount(toTen, 4, 10)).toBe(4);
  });
  it('reads the final size from the last fixed cut', () => {
    expect(finalSizeOf(INVENTED_SHOW_PACK.stages)).toBe(10);
  });
  it('plays the invented pack down to ten finalists', () => {
    const players = makeCrowd(300, 'You');
    const stages = INVENTED_SHOW_PACK.stages;
    stages.forEach((stage, s) => {
      if (stage.final) return;
      playStageInstantly(players, stage.questions, false);
      const alive = players.filter((p) => p.alive).length;
      applyCut(players, keepCount(stage, alive, 10), s, 'keep');
    });
    const alive = players.filter((p) => p.alive);
    expect(alive).toHaveLength(10);
    expect(alive.some((p) => p.id === YOU_ID)).toBe(true);
  });
});

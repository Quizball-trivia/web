/**
 * Live Show rules: answer windows, scoring and cuts. Pure and deterministic, so the simulator, the screens and (in
 * phase 2) the server can share one definition. Every question is worth 0–100 points.
 */

import type { ShowAnswer, ShowQuestion, ShowQuestionKind, ShowStageDef, SliderQuestion } from './show.types';

/** Grace before the speed curve starts, as in ranked: an instant tap keeps full points. */
const GRACE_MS = 500;

/** How long each kind stays open. */
export const WINDOW_MS: Record<ShowQuestionKind, number> = {
  true_false: 7_000,
  mcq: 10_000,
  odd_one_out: 10_000,
  fake_fact: 12_000,
  zoom_out: 15_000,
  evolution: 15_000,
  mines: 20_000,
  closest_number: 12_000,
  what_minute: 12_000,
};

/** Zoom out / evolution show a new step this often; the step visible when you tap sets your points. */
export const REVEAL_STEP_MS = 3_000;
export const REVEAL_POINTS = [100, 80, 60, 40, 20] as const;

export function windowMs(q: ShowQuestion): number {
  return WINDOW_MS[q.kind];
}

/** Ranked's curve scaled to the window: 100 for an instant answer, ten steps down to 10 at the buzzer. */
export function speedPoints(elapsedMs: number, windowMsValue: number): number {
  const clamped = Math.min(Math.max(elapsedMs, 0), windowMsValue);
  const effective = Math.max(0, clamped - GRACE_MS);
  const remainingSteps = Math.ceil(((windowMsValue - effective) / windowMsValue) * 10);
  return Math.max(10, Math.min(100, remainingSteps * 10));
}

export function revealStepAt(elapsedMs: number, steps: number): number {
  return Math.min(Math.max(steps - 1, 0), Math.floor(Math.max(elapsedMs, 0) / REVEAL_STEP_MS));
}

export function revealSteps(q: ShowQuestion): number {
  if (q.kind === 'evolution') return Math.min(q.eras.length, REVEAL_POINTS.length);
  if (q.kind === 'zoom_out') return REVEAL_POINTS.length;
  return 1;
}

export function sliderTolerance(q: SliderQuestion): number {
  return q.tolerance ?? Math.max(q.step, (q.max - q.min) / 4);
}

export function sliderPoints(q: SliderQuestion, value: number): number {
  const distance = Math.abs(value - q.answer);
  if (distance === 0) return 100;
  return Math.max(0, Math.round(100 * (1 - distance / sliderTolerance(q))));
}

/** Distinct picks that fit, and distinct picks that are mines. */
export function minesTally(fits: string[], picked: string[]): { found: number; mines: number } {
  const fitSet = new Set(fits);
  const unique = new Set(picked);
  let found = 0;
  for (const id of unique) if (fitSet.has(id)) found += 1;
  return { found, mines: unique.size - found };
}

export interface Scored {
  points: number;
  correct: boolean;
  /** Tie-break charge: lower is better; a missed question charges the whole window. */
  timeMs: number;
}

export function scoreAnswer(q: ShowQuestion, answer: ShowAnswer | null): Scored {
  const win = windowMs(q);
  if (!answer) return { points: 0, correct: false, timeMs: win };
  const timeMs = Math.min(Math.max(answer.elapsedMs, 0), win);
  switch (q.kind) {
    case 'true_false':
    case 'mcq':
    case 'odd_one_out':
    case 'fake_fact': {
      if (answer.kind !== 'choice') return { points: 0, correct: false, timeMs: win };
      const correct = answer.optionId === q.correctId;
      return { points: correct ? speedPoints(timeMs, win) : 0, correct, timeMs };
    }
    case 'zoom_out':
    case 'evolution': {
      if (answer.kind !== 'reveal_choice') return { points: 0, correct: false, timeMs: win };
      const correct = answer.optionId === q.correctId;
      const step = Math.min(answer.step, revealSteps(q) - 1);
      return { points: correct ? REVEAL_POINTS[step] ?? 0 : 0, correct, timeMs };
    }
    case 'mines': {
      if (answer.kind !== 'mines') return { points: 0, correct: false, timeMs: win };
      const { found, mines } = minesTally(q.fits, answer.picked);
      if (mines > 0) return { points: 0, correct: false, timeMs };
      const points = q.fits.length > 0 ? Math.round((100 * found) / q.fits.length) : 0;
      return { points, correct: found === q.fits.length, timeMs };
    }
    case 'closest_number':
    case 'what_minute': {
      if (answer.kind !== 'slider') return { points: 0, correct: false, timeMs: win };
      const points = sliderPoints(q, answer.value);
      return { points, correct: answer.value === q.answer, timeMs };
    }
  }
}

export interface Standing {
  id: string;
  points: number;
  timeMs: number;
}

/** Points first, then less time used, then id so equal players always sort the same way. */
export function compareStanding(a: Standing, b: Standing): number {
  if (a.points !== b.points) return b.points - a.points;
  if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** The smallest final worth playing. */
export const MIN_FINAL = 2;

/**
 * How many go through after a stage. A stage always cuts someone when it can, but never below the final's size, and
 * a small field never loses players it can't spare.
 */
export function keepCount(stage: ShowStageDef, alive: number, finalSize: number): number {
  if (!stage.keep || stage.final) return alive;
  const floor = Math.min(alive, Math.max(MIN_FINAL, finalSize));
  const wanted = 'share' in stage.keep ? Math.ceil(alive * stage.keep.share) : stage.keep.count;
  return Math.min(alive, Math.max(floor, wanted));
}

/** The final's size: the last fixed `keep.count` before it. */
export function finalSizeOf(stages: ShowStageDef[]): number {
  for (let i = stages.length - 1; i >= 0; i -= 1) {
    const keep = stages[i]!.keep;
    if (keep && 'count' in keep) return keep.count;
  }
  return 10;
}

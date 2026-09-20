'use client';

import { useCallback, useMemo, useState } from 'react';

/** What every round reports back when the player taps Next. */
export interface RoundResult {
  correct: boolean;
  points: number;
  /** What the round was about, for the summary list (e.g. the player's name). */
  label: string;
  /** Small tag for the summary row (e.g. the edition). */
  tag?: string;
  /** Best possible score for this round — lets Gauntlet score the rival on the same scale. */
  maxPoints?: number;
}

/** Props every round component accepts so Survival / Gauntlet can chain them. */
export interface RoundProps {
  /** 0 = easiest. Rounds use it to pick difficulty tiers and reveal speeds. */
  level: number;
  /** Player names already used in this run — rounds add theirs to avoid repeats. */
  used: Set<string>;
  onDone: (result: RoundResult) => void;
}

export type Phase = 'intro' | 'play' | 'summary';

/**
 * Sequential-round runner: intro -> N rounds -> summary. Rounds are remounted
 * via `roundKey` so each one draws fresh data; `used` dedupes players per run.
 */
export function useRounds(total: number) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [run, setRun] = useState(0);
  // A mutable Set held in state: rounds add names in place, a new run swaps in a fresh one.
  const [used, setUsed] = useState(() => new Set<string>());

  const start = useCallback(() => {
    setUsed(new Set());
    setResults([]);
    setIndex(0);
    setRun((r) => r + 1);
    setPhase('play');
  }, []);

  const done = useCallback(
    (r: RoundResult) => {
      setResults((prev) => [...prev, r]);
      if (index + 1 >= total) setPhase('summary');
      else setIndex(index + 1);
    },
    [index, total],
  );

  const score = useMemo(() => results.reduce((s, r) => s + r.points, 0), [results]);
  const correct = useMemo(() => results.filter((r) => r.correct).length, [results]);

  return { phase, index, results, score, correct, start, done, used, roundKey: `${run}-${index}` };
}

/** Points ladder for progressive-reveal rounds: earlier = more. */
export const ladder = (stage: number, steps: number[]): number => steps[Math.min(stage, steps.length - 1)];

'use client';

/** Practice mode ("ივარჯიშე") = the streak tournament: run → result → share. */

import { useState } from 'react';
import { getStreakRecord, saveStreakRun } from '../lib/state';
import { StreakResult } from './StreakResult';
import { StreakRun } from './StreakRun';

type Finished = { score: number; best: number; isRecord: boolean };

export function StreakGame({
  onExit,
  preset,
}: {
  onExit: () => void;
  /** Dev playground: open straight on the result screen. */
  preset?: Finished | null;
}) {
  const [run, setRun] = useState(0);
  const [finished, setFinished] = useState<Finished | null>(preset ?? null);

  const finish = (score: number) => {
    const isRecord = saveStreakRun(score);
    setFinished({ score, best: getStreakRecord().best, isRecord });
  };

  if (finished) {
    return (
      <StreakResult
        {...finished}
        onAgain={() => {
          setFinished(null);
          setRun((n) => n + 1);
        }}
        onBack={onExit}
      />
    );
  }
  return (
    // closing mid-run ends it too: the streak reached so far is real, so it is
    // saved and shown (and shareable) like any other finish
    <StreakRun key={run} onFinish={finish} />
  );
}

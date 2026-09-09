'use client';

/**
 * Dev playground for the training match — the guided tutorial match a new
 * player gets before their first ranked qualifier. Mounts the real
 * `TrainingMatchScreen` so every stage (matchmaking → showdown → banning →
 * playing → halftime → penalties → results) can be iterated on without
 * touching the /game flow. Completing or skipping remounts the screen.
 *
 * Guarded by NODE_ENV — production code paths are untouched.
 */

import { useState } from 'react';
import { TrainingMatchScreen } from '@/features/training/TrainingMatchScreen';

export default function DevTrainingPage() {
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-dvh bg-surface-deep flex items-center justify-center text-white font-fun">
        Dev only
      </div>
    );
  }
  return <DevTrainingContent />;
}

function DevTrainingContent() {
  const [runKey, setRunKey] = useState(0);
  const [finished, setFinished] = useState(false);

  if (finished) {
    return (
      <div className="min-h-dvh bg-surface-deep flex flex-col items-center justify-center gap-4 text-white font-fun">
        <div className="text-xl font-black uppercase">Training finished</div>
        <button
          type="button"
          className="px-5 py-2.5 rounded-xl bg-brand-cyan text-white font-black uppercase text-sm"
          onClick={() => {
            setFinished(false);
            setRunKey((k) => k + 1);
          }}
        >
          Run again
        </button>
      </div>
    );
  }

  return <TrainingMatchScreen key={runKey} onComplete={() => setFinished(true)} />;
}

'use client';

/**
 * Dev playground for the Tic Tac Toe training — the guided scripted grid match a
 * member gets before their first real one (and the guest practice round on
 * the public Tic Tac Toe page). Completing or skipping remounts the screen.
 */
import { useState } from 'react';
import { GridTrainingScreen } from '@/features/grid-training/GridTrainingScreen';

export default function DevGridTrainingPage() {
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-dvh bg-surface-deep flex items-center justify-center text-white font-fun">
        Dev only
      </div>
    );
  }
  return <DevGridTrainingContent />;
}

function DevGridTrainingContent() {
  const [runKey, setRunKey] = useState(0);
  const [finished, setFinished] = useState(false);
  if (finished) {
    return (
      <div className="min-h-dvh bg-surface-deep flex flex-col items-center justify-center gap-4 text-white font-fun">
        <div className="text-xl font-black uppercase">Tic Tac Toe training finished</div>
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
  return <GridTrainingScreen key={runKey} onComplete={() => setFinished(true)} />;
}

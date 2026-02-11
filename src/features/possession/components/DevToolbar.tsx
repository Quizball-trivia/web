'use client';

import type { Phase } from '../types/possession.types';

interface DevToolbarProps {
  phase: Phase;
  onSkipToShot: () => void;
  onSkipToHalftime: () => void;
  onSkipToPenalties: () => void;
}

export function DevToolbar({ phase, onSkipToShot, onSkipToHalftime, onSkipToPenalties }: DevToolbarProps) {
  if (process.env.NODE_ENV !== 'development') return null;

  const hidden = phase === 'fulltime' || phase === 'halftime' || phase === 'penalty-transition' || phase.startsWith('penalty');
  if (hidden) return null;

  return (
    <div className="fixed top-4 right-4 z-40 flex flex-col gap-2">
      <button
        onClick={onSkipToShot}
        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-bold rounded-lg shadow-lg border-2 border-yellow-400 transition-colors"
      >
        Skip to Shot
      </button>
      <button
        onClick={onSkipToHalftime}
        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-lg shadow-lg border-2 border-orange-400 transition-colors"
      >
        Skip to Halftime
      </button>
      <button
        onClick={onSkipToPenalties}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-lg border-2 border-red-400 transition-colors"
      >
        Skip to Penalties
      </button>
    </div>
  );
}

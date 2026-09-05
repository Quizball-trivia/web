'use client';

import { DevAnimationsContent } from '../animations/DevAnimationsContent';

export default function PenaltyScoreBugPage() {
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-page font-fun text-white">
        Dev only
      </div>
    );
  }

  return (
    <div className="min-h-dvh overflow-x-hidden">
      <DevAnimationsContent initialScenario="penalty-score-bug" />
    </div>
  );
}

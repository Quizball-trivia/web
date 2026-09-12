'use client';

import { useEffect, useState } from 'react';

/** Milliseconds until an ISO deadline, ticking every 100 ms; frozen at `pausedAt` while a tooltip is open. */
export function useTrainingRemaining(deadlineAt: string | null, pausedAt: number | null): number {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const update = () => {
      const deadline = deadlineAt ? Date.parse(deadlineAt) : Number.NaN;
      setRemaining(Number.isFinite(deadline) ? Math.max(0, deadline - (pausedAt ?? Date.now())) : 0);
    };
    update();
    if (pausedAt !== null) return;
    const interval = window.setInterval(update, 100);
    return () => window.clearInterval(interval);
  }, [deadlineAt, pausedAt]);
  return remaining;
}

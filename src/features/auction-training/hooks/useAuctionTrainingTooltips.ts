'use client';

import { useCallback, useRef, useState } from 'react';
import type { AuctionTrainingBeat } from '../data/auctionTrainingScript';
import { AUCTION_TRAINING_TOOLTIPS, type AuctionTrainingTooltip } from '../data/auctionTrainingTooltipConfig';

/**
 * Queued tooltips for the training auction: a beat that lands while another
 * tooltip is open waits its turn instead of replacing it, each beat shows once
 * per run, and `reset` clears the shown set for a replay. `isPaused` is what
 * freezes the scripted engine.
 */
export function useAuctionTrainingTooltips() {
  const [active, setActive] = useState<AuctionTrainingTooltip | null>(null);
  const activeRef = useRef<AuctionTrainingTooltip | null>(null);
  const queueRef = useRef<AuctionTrainingTooltip[]>([]);
  const shownRef = useRef(new Set<AuctionTrainingBeat>());

  const present = useCallback((next: AuctionTrainingTooltip | null) => {
    activeRef.current = next;
    setActive(next);
  }, []);

  const show = useCallback(
    (beat: AuctionTrainingBeat) => {
      if (shownRef.current.has(beat)) return;
      shownRef.current.add(beat);
      const def = AUCTION_TRAINING_TOOLTIPS[beat];
      if (activeRef.current) queueRef.current.push(def);
      else present(def);
    },
    [present],
  );

  const dismiss = useCallback(() => {
    present(queueRef.current.shift() ?? null);
  }, [present]);

  const reset = useCallback(() => {
    shownRef.current = new Set();
    queueRef.current = [];
    present(null);
  }, [present]);

  return { active, isPaused: active !== null, show, dismiss, reset };
}

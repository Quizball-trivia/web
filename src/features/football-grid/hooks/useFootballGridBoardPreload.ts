'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FootballGridState } from '@/lib/realtime/socket.types';
import { criterionAssetSources } from '../components/CriterionAsset';

/** Give slow crests this long, then report ready anyway so a stalled CDN never blocks kickoff. */
const PRELOAD_TIMEOUT_MS = 1_200;

/**
 * Warms the six criterion images of the current board while the kickoff gate
 * is on screen, the way ranked preloads its ban cards. `ready` gates the
 * client's ready signal so the reveal never shows empty header tiles.
 */
export function useFootballGridBoardPreload(state: FootballGridState | null): { ready: boolean } {
  const boardKey = state?.matchId ?? null;
  const urls = useMemo(() => {
    if (!state) return [] as string[];
    return [...state.board.rows, ...state.board.columns]
      .map((criterion) => criterionAssetSources(criterion)[0])
      .filter((url): url is string => Boolean(url));
  // The board is fixed per match; matchId is the only key that matters.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardKey]);
  const [readyKey, setReadyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!boardKey) return;
    if (typeof window === 'undefined' || urls.length === 0) {
      setReadyKey(boardKey);
      return;
    }
    let cancelled = false;
    let remaining = urls.length;
    const finish = () => { if (!cancelled) setReadyKey(boardKey); };
    // A hidden tab must never hold the opponent's kickoff on a warm-up.
    if (document.visibilityState === 'hidden') { finish(); return; }
    const timer = window.setTimeout(finish, PRELOAD_TIMEOUT_MS);
    for (const url of urls) {
      const image = new window.Image();
      image.decoding = 'async';
      const settle = () => {
        image.onload = null;
        image.onerror = null;
        if (cancelled) return;
        remaining -= 1;
        if (remaining === 0) { window.clearTimeout(timer); finish(); }
      };
      image.onload = settle;
      image.onerror = settle;
      image.src = url;
    }
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [boardKey, urls]);

  return { ready: boardKey !== null && readyKey === boardKey };
}

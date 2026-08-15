'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AuctionGameState } from '../types';
import type { AuctionActions } from './useAuctionGame';

/**
 * Owns the per-round "ROUND N" intro overlay + the server ui-ready handshake.
 *
 * Both bidding layouts need this; the desktop stadium screen previously skipped
 * it entirely, which meant it never called `confirmRoundIntro` — a latent stall
 * in live matches where the server holds the round behind that gate. Sharing the
 * logic fixes desktop and removes the duplication.
 *
 * - `showRoundIntro` — render the overlay once per clue-phase round, unless the
 *   round is already live (server started revealing / opened the study window),
 *   in which case we skip straight to the board.
 * - `onIntroDone` — the overlay's completion callback (also releases the gate).
 * - The effect releases the gate on the skip path too.
 */
export function useRoundIntro(state: AuctionGameState, actions: AuctionActions) {
  const isCluePhase = state.phase === 'clue-reveal';
  const round = state.currentRound;
  const [introDoneForRound, setIntroDoneForRound] = useState<number | null>(null);

  const roundAlreadyLive =
    !isCluePhase ||
    (round ? round.clueRevealIndex > 0 || round.biddingStartsAt !== null : false);
  const showRoundIntro =
    isCluePhase && introDoneForRound !== state.roundIndex && !roundAlreadyLive;

  useEffect(() => {
    if (isCluePhase && roundAlreadyLive) {
      actions.confirmRoundIntro?.();
    }
  }, [isCluePhase, roundAlreadyLive, state.roundIndex, actions]);

  const onIntroDone = useCallback(() => {
    setIntroDoneForRound(state.roundIndex);
    actions.confirmRoundIntro?.();
  }, [actions, state.roundIndex]);

  return { showRoundIntro, onIntroDone };
}

'use client';

import { useEffect, useRef } from 'react';
import { useUserPreferences } from '@/lib/preferences/userPreferences';
import { useGameSounds } from '@/lib/sounds/useGameSounds';
import type { AuctionGameState } from '../types';

interface AuctionAudioOptions {
  state: AuctionGameState | null;
  humanPlayerId: string | null;
  enabled?: boolean;
}

interface AuctionAudioSnapshot {
  phase: AuctionGameState['phase'];
  roundIndex: number;
  clueRevealIndex: number;
  bidCount: number;
  foldCount: number;
  highestBid: number;
}

function snapshotOf(state: AuctionGameState): AuctionAudioSnapshot {
  return {
    phase: state.phase,
    roundIndex: state.roundIndex,
    clueRevealIndex: state.currentRound?.clueRevealIndex ?? 0,
    bidCount: state.currentRound?.bids.length ?? 0,
    foldCount: state.currentRound?.foldedIds.length ?? 0,
    highestBid: state.currentRound?.highestBid ?? 0,
  };
}

/**
 * Auction's audio conductor. It shares ranked's quiet stadium loop, then adds
 * deliberately short cues only when a server-authoritative state transition
 * lands. Repeated renders/reconnect snapshots do not replay the same cue.
 */
export function useAuctionAudio({ state, humanPlayerId, enabled = true }: AuctionAudioOptions): void {
  const { soundEnabled, musicEnabled } = useUserPreferences();
  const { playBgm, playSfx, stopBgm } = useGameSounds();
  const previousRef = useRef<AuctionAudioSnapshot | null>(null);

  const phase = state?.phase ?? null;
  const matchActive = Boolean(
    enabled
      && phase
      && phase !== 'lobby'
      && phase !== 'results',
  );

  useEffect(() => {
    if (!matchActive || !musicEnabled) {
      stopBgm(400);
      return;
    }

    playBgm('auction');
    return () => stopBgm(400);
  }, [matchActive, musicEnabled, playBgm, stopBgm]);

  useEffect(() => {
    if (!enabled || !state) {
      previousRef.current = null;
      return;
    }

    const next = snapshotOf(state);
    const previous = previousRef.current;
    previousRef.current = next;

    if (!previous || !soundEnabled) return;

    if (next.phase === 'results' && previous.phase !== 'results') {
      playSfx('auctionFinished');
      return;
    }

    if (next.phase === 'reveal' && previous.phase !== 'reveal') {
      playSfx(state.currentRound?.winnerId === humanPlayerId ? 'auctionWon' : 'auctionReveal');
      return;
    }

    if (next.phase === 'solo-pick' && previous.phase !== 'solo-pick') {
      playSfx('auctionWarning');
      return;
    }

    // A new round can arrive with a reset bid/fold/clue count. Do not compare
    // those reset counters to the previous round.
    if (next.roundIndex !== previous.roundIndex) return;

    if (next.clueRevealIndex > previous.clueRevealIndex) {
      playSfx('auctionClue');
      return;
    }

    if (next.bidCount > previous.bidCount && next.highestBid > previous.highestBid) {
      playSfx('auctionBid');
      return;
    }

    if (next.foldCount > previous.foldCount) {
      playSfx('auctionFold');
    }
  }, [enabled, humanPlayerId, playSfx, soundEnabled, state]);
}

'use client';

import type { AuctionGameState, AuctionPlayer, AuctionRound, SitOutReason } from '../types';
import type { AuctionActions } from './useAuctionGame';
import { getMaxBid, getMinBid, needsPosition } from '../data';
import { POS_COLORS } from '../constants/auction.constants';

/**
 * All the derived bidding state the two bidding layouts (mobile BiddingScreen +
 * desktop StadiumBiddingScreen) need. Both used to compute this block nearly
 * line-for-line; this is the single source so they can't drift.
 *
 * When the round/human seat isn't available yet, `ready` is false and the
 * screens should render nothing — the other fields carry safe defaults so
 * callers never have to null-check each one.
 */
export interface BiddingViewModel {
  ready: boolean;
  round: AuctionRound | null;
  humanPlayer: AuctionPlayer | null;
  isCluePhase: boolean;
  isBidding: boolean;
  visibleClues: number;
  allCluesRevealed: boolean;
  hasBids: boolean;
  /** Server-driven "bidding opens at" instant during the study window, else null. */
  studyEndsAt: number | null;
  minBid: number;
  maxBid: number;
  posColor: string;
  myTurn: boolean;
  /** Forced opener (no standing bid) — must bid, fold disabled. */
  mustOpen: boolean;
  humanFolded: boolean;
  sitOutReason: SitOutReason;
  currentTurnPlayer: AuctionPlayer | null;
  highestBidder: AuctionPlayer | null;
  /** Human bid this lot but is no longer top → OUTBID. */
  humanOutbid: boolean;
  /** Rivals (not you, not eliminated) who still need this position. */
  competitorsNeedingPos: number;
  pendingTurnAction: AuctionActions['pendingTurnAction'] | null;
}

export function useBiddingViewModel(
  state: AuctionGameState,
  actions: AuctionActions,
  humanPlayerId: string,
): BiddingViewModel {
  const round = state.currentRound ?? null;
  const humanPlayer = state.players.find((p) => p.id === humanPlayerId) ?? null;
  const ready = Boolean(round && humanPlayer);

  const isCluePhase = state.phase === 'clue-reveal';
  const isBidding = state.phase === 'bidding';

  const visibleClues = round ? (isCluePhase ? round.clueRevealIndex : round.clues.length) : 0;
  const allCluesRevealed = round ? visibleClues >= round.clues.length : false;
  const hasBids = round ? round.highestBid > 0 : false;
  const studyEndsAt = isCluePhase ? round?.biddingStartsAt ?? null : null;

  const minBid = round ? getMinBid(round) : 0;
  const maxBid = humanPlayer ? getMaxBid(humanPlayer) : 0;
  const posColor = round ? POS_COLORS[round.positionGroup] : POS_COLORS.GK;

  const myTurn = Boolean(isBidding && round && round.currentTurnId === humanPlayerId);
  const mustOpen = Boolean(myTurn && round && !round.highestBidderId);
  const humanFolded = Boolean(round?.foldedIds.includes(humanPlayerId));
  const inTurnOrder = Boolean(round?.turnOrder.includes(humanPlayerId));

  const sitOutReason: SitOutReason = humanPlayer?.forfeited
    ? 'forfeited'
    : humanPlayer?.isEliminated
      ? 'eliminated'
      : !inTurnOrder
        ? 'position-filled'
        : null;

  const currentTurnPlayer = round?.currentTurnId
    ? state.players.find((p) => p.id === round.currentTurnId) ?? null
    : null;
  const highestBidder = round?.highestBidderId
    ? state.players.find((p) => p.id === round.highestBidderId) ?? null
    : null;

  const humanOutbid = Boolean(
    isBidding &&
      round &&
      round.bids.some((b) => b.playerId === humanPlayerId) &&
      round.highestBidderId !== humanPlayerId,
  );

  const competitorsNeedingPos = round
    ? state.players.filter(
        (p) => (
          p.id !== humanPlayerId
          && !p.isEliminated
          // Folded this lot, or quit the match entirely — neither is still
          // competing for it.
          && !p.forfeited
          && !round.foldedIds.includes(p.id)
          && needsPosition(p, round.positionGroup)
        ),
      ).length
    : 0;

  const pendingTurnAction = actions.pendingTurnAction ?? null;

  return {
    ready,
    round,
    humanPlayer,
    isCluePhase,
    isBidding,
    visibleClues,
    allCluesRevealed,
    hasBids,
    studyEndsAt,
    minBid,
    maxBid,
    posColor,
    myTurn,
    mustOpen,
    humanFolded,
    sitOutReason,
    currentTurnPlayer,
    highestBidder,
    humanOutbid,
    competitorsNeedingPos,
    pendingTurnAction,
  };
}

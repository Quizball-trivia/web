'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AvatarCustomization } from '@/types/game';
import type { Locale } from '@/lib/i18n/messages';
import type { AuctionGameState, AuctionPhase, AuctionPlayer, AuctionRound, Footballer } from '@/features/auction/types';
import type { AuctionActions } from '@/features/auction/hooks/useAuctionGame';
import { ROUND_INTRO_MS } from '@/features/auction/components/screens/AuctionRoundIntro';
import {
  BOT_PLAYERS,
  CLUE_REVEAL_INTERVAL_MS,
  OPENING_TURN_MS,
  RAISE_TURN_MS,
  STARTING_BUDGET,
  createBotPlayer,
  createEmptyTeam,
  getAdjustedProfit,
  getMinBid,
} from '@/features/auction/data';
import { BOT_AVATAR_CUSTOMIZATION, BOT_NAME } from '@/features/training/constants';
import { TRAINING_FORMATION, TRAINING_LOT_COUNT, trainingLotFootballer } from '../data/auctionTrainingFixtures';
import {
  AUCTION_TRAINING_BOT_A_ID,
  AUCTION_TRAINING_BOT_B_ID,
  AUCTION_TRAINING_BOT_THINK_MS,
  AUCTION_TRAINING_HUMAN_ID,
  AUCTION_TRAINING_LOTS,
  AUCTION_TRAINING_RESULTS_BEAT_MS,
  AUCTION_TRAINING_REVEAL_BEAT_MS,
  AUCTION_TRAINING_STUDY_MS,
  type AuctionTrainingBeat,
  type AuctionTrainingEvent,
} from '../data/auctionTrainingScript';

export interface AuctionTrainingHumanSeat {
  username: string;
  avatarSeed: string;
  avatarCustomization?: AvatarCustomization | null;
}

/** The one control the guided step allows; cleared the moment it is used, so a duplicate click never applies. */
export interface AuctionTrainingAllowedAction {
  kind: 'bid' | 'fold';
}

interface Cursor {
  lot: number;
  event: number;
}

const INITIAL_STATE: AuctionGameState = {
  phase: 'lobby',
  players: [],
  formation: TRAINING_FORMATION,
  currentRound: null,
  roundIndex: 0,
  totalRounds: TRAINING_LOT_COUNT,
  completedRounds: [],
  soloPick: null,
};

function makeRound(footballer: Footballer, lotIndex: number): AuctionRound {
  const lot = AUCTION_TRAINING_LOTS[lotIndex];
  return {
    positionGroup: lot.positionGroup,
    footballer,
    clues: footballer.clues,
    clueRevealIndex: 0,
    bids: [],
    highestBidderId: null,
    highestBid: 0,
    startingPrice: footballer.startingPrice,
    winnerId: null,
    winningBid: 0,
    revealed: false,
    countdownEndsAt: null,
    turnOrder: lot.turnOrder,
    currentTurnId: null,
    foldedIds: [],
    turnEndsAt: null,
    biddingStartsAt: null,
  };
}

function assignWinner(players: AuctionPlayer[], round: AuctionRound): AuctionPlayer[] {
  return players.map((p) => {
    if (p.id !== round.highestBidderId) return p;
    const slots = { ...p.team.slots, [round.positionGroup]: [...p.team.slots[round.positionGroup], round.footballer] };
    return { ...p, budget: p.budget - round.highestBid, team: { ...p.team, slots } };
  });
}

function seatOf(event: AuctionTrainingEvent): string {
  return event.kind === 'human' ? AUCTION_TRAINING_HUMAN_ID : event.seat;
}

/**
 * The scripted engine behind the training auction. Same state shape as the
 * live/mock engines so every auction screen renders unchanged; the difference
 * is that every bid, fold and clock is authored (`auctionTrainingScript`) and
 * the engine owns ONE pending timer at a time. While `isPaused` (a tooltip is
 * open) that timer is held and, on resume, every absolute deadline in the
 * state is shifted by the paused duration so the children's countdowns freeze
 * rather than expire under the tooltip.
 */
export function useAuctionTrainingMatch({
  isPaused,
  locale,
  human,
  onBeat,
}: {
  isPaused: boolean;
  locale: Locale;
  human: AuctionTrainingHumanSeat;
  onBeat: (beat: AuctionTrainingBeat) => void;
}) {
  const [state, setStateRaw] = useState<AuctionGameState>(INITIAL_STATE);
  const [allowedAction, setAllowedAction] = useState<AuctionTrainingAllowedAction | null>(null);
  const [clockPausedAt, setClockPausedAt] = useState<number | null>(null);

  const stateRef = useRef(state);
  const commit = useCallback((next: AuctionGameState) => {
    stateRef.current = next;
    setStateRaw(next);
  }, []);
  const patchRound = useCallback(
    (patch: Partial<AuctionRound>, extra: Partial<AuctionGameState> = {}) => {
      const s = stateRef.current;
      if (!s.currentRound) return;
      commit({ ...s, ...extra, currentRound: { ...s.currentRound, ...patch } });
    },
    [commit],
  );

  const onBeatRef = useRef(onBeat);
  useEffect(() => {
    onBeatRef.current = onBeat;
  }, [onBeat]);
  const humanRef = useRef(human);
  useEffect(() => {
    humanRef.current = human;
  }, [human]);
  const localeRef = useRef(locale);
  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  // ── single pending timer, pause-aware ────────────────────────────────────
  const pendingRef = useRef<{ dueAt: number; run: () => void } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const cursorRef = useRef<Cursor>({ lot: 0, event: 0 });
  const allowedRef = useRef<AuctionTrainingAllowedAction | null>(null);
  const setAllowed = useCallback((next: AuctionTrainingAllowedAction | null) => {
    allowedRef.current = next;
    setAllowedAction(next);
  }, []);

  const arm = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending || timerRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      pendingRef.current = null;
      pending.run();
    }, Math.max(0, pending.dueAt - Date.now()));
  }, []);
  const clearPending = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    pendingRef.current = null;
  }, []);
  const schedule = useCallback(
    (ms: number, run: () => void) => {
      clearPending();
      pendingRef.current = { dueAt: (pausedAtRef.current ?? Date.now()) + ms, run };
      if (pausedAtRef.current === null) arm();
    },
    [arm, clearPending],
  );
  useEffect(() => () => clearPending(), [clearPending]);

  useEffect(() => {
    if (isPaused) {
      if (pausedAtRef.current !== null) return;
      pausedAtRef.current = Date.now();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      setClockPausedAt(pausedAtRef.current);
      return;
    }
    if (pausedAtRef.current === null) return;
    const shift = Date.now() - pausedAtRef.current;
    pausedAtRef.current = null;
    setClockPausedAt(null);
    const s = stateRef.current;
    const round = s.currentRound;
    if (round && (round.turnEndsAt !== null || round.biddingStartsAt !== null)) {
      commit({
        ...s,
        currentRound: {
          ...round,
          turnEndsAt: round.turnEndsAt === null ? null : round.turnEndsAt + shift,
          biddingStartsAt: round.biddingStartsAt === null ? null : round.biddingStartsAt + shift,
        },
      });
    }
    if (pendingRef.current) {
      pendingRef.current.dueAt += shift;
      arm();
    }
  }, [isPaused, arm, commit]);

  // ── script walker ────────────────────────────────────────────────────────
  const turnMsFor = (round: AuctionRound) => (round.highestBidderId ? RAISE_TURN_MS : OPENING_TURN_MS);

  const runTurnRef = useRef<() => void>(() => {});
  const startLotRef = useRef<(lotIndex: number) => void>(() => {});
  const revealNextPairRef = useRef<() => void>(() => {});

  const resolveLot = useCallback(() => {
    const s = stateRef.current;
    const round = s.currentRound;
    if (!round) return;
    const lot = AUCTION_TRAINING_LOTS[cursorRef.current.lot];
    setAllowed(null);
    const won = round.highestBidderId !== null;
    commit({
      ...s,
      phase: 'reveal',
      players: won ? assignWinner(s.players, round) : s.players,
      currentRound: {
        ...round,
        currentTurnId: null,
        turnEndsAt: null,
        winnerId: round.highestBidderId,
        winningBid: won ? round.highestBid : 0,
        revealed: true,
      },
    });
    schedule(AUCTION_TRAINING_REVEAL_BEAT_MS, () => onBeatRef.current(lot.beats.reveal));
  }, [commit, schedule, setAllowed]);

  /** Moves to the next scripted event (or resolves the lot once the script is exhausted). */
  const advance = useCallback(() => {
    const cursor = cursorRef.current;
    const lot = AUCTION_TRAINING_LOTS[cursor.lot];
    cursor.event += 1;
    if (cursor.event >= lot.events.length) {
      resolveLot();
      return;
    }
    const s = stateRef.current;
    const round = s.currentRound;
    if (!round) return;
    const next = lot.events[cursor.event];
    commit({
      ...s,
      currentRound: { ...round, currentTurnId: seatOf(next), turnEndsAt: Date.now() + turnMsFor(round) },
    });
    runTurnRef.current();
  }, [commit, resolveLot]);

  const applyBotEvent = useCallback(
    (event: AuctionTrainingEvent) => {
      const s = stateRef.current;
      const round = s.currentRound;
      if (!round || event.kind === 'human') return;
      if (event.kind === 'bot-bid') {
        commit({
          ...s,
          currentRound: {
            ...round,
            bids: [...round.bids, { playerId: event.seat, amount: event.amount }],
            highestBidderId: event.seat,
            highestBid: event.amount,
          },
        });
      } else {
        commit({ ...s, currentRound: { ...round, foldedIds: [...round.foldedIds, event.seat] } });
      }
      if (event.beat) onBeatRef.current(event.beat);
      advance();
    },
    [advance, commit],
  );

  const runTurn = useCallback(() => {
    const cursor = cursorRef.current;
    const lot = AUCTION_TRAINING_LOTS[cursor.lot];
    const event = lot.events[cursor.event];
    if (!event) return;
    if (event.kind !== 'human') {
      schedule(AUCTION_TRAINING_BOT_THINK_MS, () => applyBotEvent(event));
      return;
    }
    setAllowed({ kind: event.action });
    onBeatRef.current(event.beat);
    // The guided turn never expires: when the clock runs out it simply restarts.
    const rearm = () => {
      const s = stateRef.current;
      if (s.phase !== 'bidding' || !s.currentRound) return;
      patchRound({ turnEndsAt: Date.now() + turnMsFor(s.currentRound) });
      schedule(turnMsFor(s.currentRound), rearm);
    };
    schedule(turnMsFor(stateRef.current.currentRound!), rearm);
  }, [applyBotEvent, patchRound, schedule, setAllowed]);
  useEffect(() => {
    runTurnRef.current = runTurn;
  }, [runTurn]);

  const openBidding = useCallback(() => {
    const s = stateRef.current;
    const round = s.currentRound;
    if (!round) return;
    const lot = AUCTION_TRAINING_LOTS[cursorRef.current.lot];
    cursorRef.current.event = 0;
    const first = lot.events[0];
    commit({
      ...s,
      phase: 'bidding',
      currentRound: { ...round, biddingStartsAt: null, currentTurnId: seatOf(first), turnEndsAt: Date.now() + OPENING_TURN_MS },
    });
    runTurnRef.current();
  }, [commit]);

  const revealNextPair = useCallback(() => {
    const s = stateRef.current;
    const round = s.currentRound;
    if (!round || s.phase !== 'clue-reveal') return;
    const lot = AUCTION_TRAINING_LOTS[cursorRef.current.lot];
    // Explained on the SECOND pair: by then the round intro has fully cleared the card.
    const explainNow = round.clueRevealIndex === 2;
    const next = Math.min(round.clues.length, round.clueRevealIndex + 2);
    if (next < round.clues.length) {
      patchRound({ clueRevealIndex: next });
      if (explainNow) lot.beats.clues?.forEach((beat) => onBeatRef.current(beat));
      schedule(CLUE_REVEAL_INTERVAL_MS, () => revealNextPairRef.current());
      return;
    }
    patchRound({ clueRevealIndex: next, biddingStartsAt: Date.now() + AUCTION_TRAINING_STUDY_MS });
    if (explainNow) lot.beats.clues?.forEach((beat) => onBeatRef.current(beat));
    if (lot.beats.study) onBeatRef.current(lot.beats.study);
    schedule(AUCTION_TRAINING_STUDY_MS, openBidding);
  }, [openBidding, patchRound, schedule]);
  useEffect(() => {
    revealNextPairRef.current = revealNextPair;
  }, [revealNextPair]);

  const startLot = useCallback((lotIndex: number) => {
    cursorRef.current = { lot: lotIndex, event: 0 };
    const s = stateRef.current;
    const footballer = trainingLotFootballer(lotIndex, localeRef.current);
    commit({ ...s, phase: 'clue-reveal', roundIndex: lotIndex + 1, currentRound: makeRound(footballer, lotIndex), soloPick: null });
    // Same cadence as the live game: the round intro plays, then pairs of clues.
    schedule(ROUND_INTRO_MS + 400, revealNextPair);
  }, [commit, revealNextPair, schedule]);
  useEffect(() => {
    startLotRef.current = startLot;
  }, [startLot]);

  const finish = useCallback(() => {
    const s = stateRef.current;
    const ranked = [...s.players].sort((a, b) => getAdjustedProfit(b) - getAdjustedProfit(a));
    commit({ ...s, phase: 'results', currentRound: null, rankings: ranked.map((p) => p.id) });
    schedule(AUCTION_TRAINING_RESULTS_BEAT_MS, () => onBeatRef.current('results'));
  }, [commit, schedule]);

  // ── public actions (AuctionActions shape) ───────────────────────────────
  const startGame = useCallback(() => {
    clearPending();
    pausedAtRef.current = null;
    setClockPausedAt(null);
    setAllowed(null);
    cursorRef.current = { lot: 0, event: 0 };
    const seat = humanRef.current;
    const humanPlayer: AuctionPlayer = {
      id: AUCTION_TRAINING_HUMAN_ID,
      username: seat.username,
      avatarSeed: seat.avatarSeed,
      avatarCustomization: seat.avatarCustomization ?? undefined,
      budget: STARTING_BUDGET,
      team: createEmptyTeam(TRAINING_FORMATION),
      isBot: false,
      isEliminated: false,
    };
    const coach: AuctionPlayer = {
      id: AUCTION_TRAINING_BOT_A_ID,
      username: BOT_NAME,
      avatarSeed: 'avatar-2',
      avatarCustomization: BOT_AVATAR_CUSTOMIZATION,
      budget: STARTING_BUDGET,
      team: createEmptyTeam(TRAINING_FORMATION),
      isBot: true,
      isEliminated: false,
    };
    const rival: AuctionPlayer = { ...createBotPlayer(BOT_PLAYERS[0], TRAINING_FORMATION), id: AUCTION_TRAINING_BOT_B_ID };
    commit({ ...INITIAL_STATE, phase: 'matchmaking', players: [humanPlayer, coach, rival] });
  }, [clearPending, commit, setAllowed]);

  const setPhase = useCallback(
    (phase: AuctionPhase) => {
      const s = stateRef.current;
      if (phase === 'bidding') {
        if (s.phase === 'formation') startLotRef.current(0);
        return;
      }
      commit({ ...s, phase });
    },
    [commit],
  );

  const placeBid = useCallback(
    (amount: number) => {
      const s = stateRef.current;
      const round = s.currentRound;
      const allowed = allowedRef.current;
      if (pausedAtRef.current !== null) return; // a tooltip owns the screen
      if (!round || s.phase !== 'bidding' || round.currentTurnId !== AUCTION_TRAINING_HUMAN_ID) return;
      if (!allowed || allowed.kind !== 'bid' || amount !== getMinBid(round)) return;
      setAllowed(null);
      clearPending();
      commit({
        ...s,
        currentRound: {
          ...round,
          bids: [...round.bids, { playerId: AUCTION_TRAINING_HUMAN_ID, amount }],
          highestBidderId: AUCTION_TRAINING_HUMAN_ID,
          highestBid: amount,
        },
      });
      advance();
    },
    [advance, clearPending, commit, setAllowed],
  );

  const fold = useCallback(() => {
    const s = stateRef.current;
    const round = s.currentRound;
    const allowed = allowedRef.current;
    if (pausedAtRef.current !== null) return;
    if (!round || s.phase !== 'bidding' || round.currentTurnId !== AUCTION_TRAINING_HUMAN_ID) return;
    if (!allowed || allowed.kind !== 'fold') return;
    setAllowed(null);
    clearPending();
    commit({ ...s, currentRound: { ...round, foldedIds: [...round.foldedIds, AUCTION_TRAINING_HUMAN_ID] } });
    advance();
  }, [advance, clearPending, commit, setAllowed]);

  const confirmReveal = useCallback(() => {
    const s = stateRef.current;
    if (pausedAtRef.current !== null) return;
    if (s.phase !== 'reveal' || !s.currentRound) return;
    clearPending();
    commit({ ...s, completedRounds: [...s.completedRounds, s.currentRound] });
    const next = cursorRef.current.lot + 1;
    if (next < AUCTION_TRAINING_LOTS.length) startLotRef.current(next);
    else finish();
  }, [clearPending, commit, finish]);

  const actions = useMemo<AuctionActions>(
    () => ({
      startGame,
      placeBid,
      fold,
      confirmReveal,
      confirmRoundIntro: () => {},
      pickSoloOption: () => {},
      setPhase,
    }),
    [confirmReveal, fold, placeBid, setPhase, startGame],
  );

  return {
    state,
    actions,
    humanPlayerId: AUCTION_TRAINING_HUMAN_ID,
    allowedAction,
    clockPausedAt,
  };
}

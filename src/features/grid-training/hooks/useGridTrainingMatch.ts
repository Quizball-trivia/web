'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FootballGridCommandResultPayload, FootballGridState, OpponentInfo } from '@/lib/realtime/socket.types';
import { BOT_AVATAR_CUSTOMIZATION, BOT_NAME } from '@/features/training/constants';
import { GRID_TRAINING_BOARD, cellAnswers, playerIdOf, resolveCellAnswer } from '../data/gridTrainingFixtures';
import {
  GRID_TRAINING_BOARD_REVEAL_MS,
  GRID_TRAINING_BOT_ID,
  GRID_TRAINING_BOT_THINK_MS,
  GRID_TRAINING_COUNTDOWN_MS,
  GRID_TRAINING_FEEDBACK_MS,
  GRID_TRAINING_HUMAN_ID,
  GRID_TRAINING_LINES,
  GRID_TRAINING_MATCHED_MS,
  GRID_TRAINING_RESULTS_BEAT_MS,
  GRID_TRAINING_SEARCH_MS,
  GRID_TRAINING_TURNS,
  GRID_TRAINING_TURN_MS,
  GRID_TRAINING_WIN_HOLD_MS,
  type GridTrainingBeat,
} from '../data/gridTrainingScript';

export type GridTrainingStage = 'idle' | 'searching' | 'matched' | 'match';
export type GridTrainingFeedback = FootballGridCommandResultPayload['outcome'];

export const GRID_TRAINING_OPPONENT: OpponentInfo = {
  id: GRID_TRAINING_BOT_ID,
  username: BOT_NAME,
  avatarUrl: null,
  avatarCustomization: BOT_AVATAR_CUSTOMIZATION,
  isAiOpponent: true,
};

const iso = (ms: number) => new Date(ms).toISOString();
const shiftIso = (value: string | null, ms: number) => (value === null ? null : iso(Date.parse(value) + ms));

function initialState(): FootballGridState {
  return {
    matchId: 'training-grid',
    status: 'handoff',
    phase: 'handoff',
    board: GRID_TRAINING_BOARD,
    players: [
      { userId: GRID_TRAINING_HUMAN_ID, seat: 1, isBot: false, handoffAcknowledged: true, ready: true, noActionTimeouts: 0, pauseBudgetRemainingMs: 30_000 },
      { userId: GRID_TRAINING_BOT_ID, seat: 2, isBot: true, handoffAcknowledged: true, ready: true, noActionTimeouts: 0, pauseBudgetRemainingMs: 30_000 },
    ],
    openerUserId: GRID_TRAINING_HUMAN_ID,
    currentPlayerUserId: null,
    winnerUserId: null,
    turnNumber: 0,
    stateVersion: 0,
    claims: [],
    phaseDeadlineAt: null,
    turnDeadlineAt: null,
    turnRemainingMs: null,
    pausedAt: null,
    pausedFromPhase: null,
    reconnectDeadlineAt: null,
    completionReason: null,
    drawOffer: null,
  };
}

export function lineWinner(claims: FootballGridState['claims']): { userId: string; line: number[] } | null {
  const owner = new Map(claims.map((claim) => [claim.cellIndex, claim.claimantUserId]));
  for (const line of GRID_TRAINING_LINES) {
    const [a, b, c] = line;
    const first = owner.get(a);
    if (first && first === owner.get(b) && first === owner.get(c)) return { userId: first, line };
  }
  return null;
}

/**
 * The scripted engine behind the Tic Tac Toe training. It keeps a real
 * `FootballGridState` so the live grid pieces render unchanged; every bot move
 * is authored (`gridTrainingScript`), the human's guided cell is the only
 * selectable one, and answers are checked against the fixture's valid names
 * (footballers are once-per-match across both seats). One pending timer at a
 * time; `isPaused` (a tooltip is open) holds it and shifts the ISO deadlines on
 * resume so the clocks freeze under the tooltip.
 */
export function useGridTrainingMatch({ isPaused, onBeat }: { isPaused: boolean; onBeat: (beat: GridTrainingBeat) => void }) {
  const [stage, setStageRaw] = useState<GridTrainingStage>('idle');
  const [state, setStateRaw] = useState<FootballGridState>(initialState);
  const [feedback, setFeedback] = useState<GridTrainingFeedback | undefined>(undefined);
  const [clockPausedAt, setClockPausedAt] = useState<number | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [resultsVisible, setResultsVisible] = useState(false);

  const stateRef = useRef(state);
  const turnRef = useRef(0);
  const usedRef = useRef(new Set<string>());
  const commit = useCallback((next: FootballGridState) => {
    stateRef.current = { ...next, stateVersion: next.stateVersion + 1 };
    setStateRaw(stateRef.current);
  }, []);
  const setTurn = useCallback((next: number) => {
    turnRef.current = next;
    setTurnIndex(next);
  }, []);
  const onBeatRef = useRef(onBeat);
  useEffect(() => {
    onBeatRef.current = onBeat;
  }, [onBeat]);

  // ── single pending timer, pause-aware ────────────────────────────────────
  const pendingRef = useRef<{ dueAt: number; run: () => void } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedAtRef = useRef<number | null>(null);
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
  // StrictMode replays this effect: only the timeout is dropped on cleanup, the pending work
  // survives and is re-armed on setup (a real unmount never fires again anyway).
  useEffect(() => {
    if (pausedAtRef.current === null) arm();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [arm]);

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
    if (s.phaseDeadlineAt !== null || s.turnDeadlineAt !== null) {
      commit({ ...s, phaseDeadlineAt: shiftIso(s.phaseDeadlineAt, shift), turnDeadlineAt: shiftIso(s.turnDeadlineAt, shift) });
    }
    if (pendingRef.current) {
      pendingRef.current.dueAt += shift;
      arm();
    }
  }, [isPaused, arm, commit]);

  // ── script walker ────────────────────────────────────────────────────────
  const beginTurnRef = useRef<(index: number) => void>(() => {});

  const finish = useCallback((winnerUserId: string | null, reason: FootballGridState['completionReason'], line: number[] | null) => {
    const s = stateRef.current;
    commit({ ...s, status: 'completed', phase: 'terminal', currentPlayerUserId: null, turnDeadlineAt: null, phaseDeadlineAt: null, winnerUserId, completionReason: reason });
    setWinningLine(line);
    // The lit line stays on the board for a beat, then the results take over.
    schedule(GRID_TRAINING_WIN_HOLD_MS, () => {
      setResultsVisible(true);
      schedule(GRID_TRAINING_RESULTS_BEAT_MS, () => onBeatRef.current('results'));
    });
  }, [commit, schedule]);

  /** Applies a claim (or a lost turn), keeps the verdict on screen, then ends the game or hands the turn on. */
  const settle = useCallback((claim: FootballGridState['claims'][number] | null, afterBeat: GridTrainingBeat | null, nextTurn: number) => {
    const s = stateRef.current;
    const claims = claim ? [...s.claims, claim] : s.claims;
    const winner = lineWinner(claims);
    // The seat stays on the current player while the verdict shows (the turn panel only renders it on your turn).
    commit({ ...s, claims, turnNumber: s.turnNumber + 1, turnDeadlineAt: null });
    if (afterBeat) onBeatRef.current(afterBeat);
    if (winner) {
      finish(winner.userId, 'line', winner.line);
      return;
    }
    if (claims.length >= 9 || nextTurn >= GRID_TRAINING_TURNS.length) {
      finish(null, 'board_full', null);
      return;
    }
    schedule(GRID_TRAINING_FEEDBACK_MS, () => beginTurnRef.current(nextTurn));
  }, [commit, finish, schedule]);

  /** The guided turn never expires: the clock simply restarts. */
  const armGuidedClock = useCallback(() => {
    const rearm = () => {
      const cur = stateRef.current;
      if (cur.phase !== 'turn' || cur.currentPlayerUserId !== GRID_TRAINING_HUMAN_ID) return;
      commit({ ...cur, turnDeadlineAt: iso(Date.now() + GRID_TRAINING_TURN_MS) });
      schedule(GRID_TRAINING_TURN_MS, rearm);
    };
    schedule(GRID_TRAINING_TURN_MS, rearm);
  }, [commit, schedule]);

  const beginTurn = useCallback((index: number) => {
    const turn = GRID_TRAINING_TURNS[index];
    if (!turn) return;
    setTurn(index);
    setFeedback(undefined);
    const s = stateRef.current;
    const who = turn.who === 'human' ? GRID_TRAINING_HUMAN_ID : GRID_TRAINING_BOT_ID;
    commit({ ...s, status: 'active', phase: 'turn', currentPlayerUserId: who, turnDeadlineAt: iso(Date.now() + GRID_TRAINING_TURN_MS), turnRemainingMs: GRID_TRAINING_TURN_MS, phaseDeadlineAt: null });
    if (turn.who === 'bot') {
      schedule(GRID_TRAINING_BOT_THINK_MS, () => {
        usedRef.current.add(playerIdOf(turn.player));
        settle({ cellIndex: turn.cell, footballPlayerId: playerIdOf(turn.player), displayName: turn.player, claimantUserId: GRID_TRAINING_BOT_ID, turnNumber: stateRef.current.turnNumber + 1 }, turn.beat, index + 1);
      });
      return;
    }
    // The board is fully built by the first turn — explain it, then the turn itself.
    if (index === 0) onBeatRef.current('board');
    onBeatRef.current(turn.beat);
    armGuidedClock();
  }, [armGuidedClock, commit, schedule, setTurn, settle]);
  useEffect(() => {
    beginTurnRef.current = beginTurn;
  }, [beginTurn]);

  // ── public actions ───────────────────────────────────────────────────────
  const startSearch = useCallback(() => {
    clearPending();
    pausedAtRef.current = null;
    setClockPausedAt(null);
    usedRef.current = new Set();
    setFeedback(undefined);
    setWinningLine(null);
    setResultsVisible(false);
    setTurn(0);
    commit({ ...initialState(), stateVersion: -1 });
    setStageRaw('searching');
    schedule(GRID_TRAINING_SEARCH_MS, () => {
      setStageRaw('matched');
      schedule(GRID_TRAINING_MATCHED_MS, () => setStageRaw('match'));
    });
  }, [clearPending, commit, schedule, setTurn]);

  /** After the showdown: the 8 s countdown (5 s gate + 3 s board build), then turn 1. */
  const startCountdown = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'handoff') return;
    commit({ ...s, status: 'countdown', phase: 'countdown', phaseDeadlineAt: iso(Date.now() + GRID_TRAINING_COUNTDOWN_MS) });
    schedule(GRID_TRAINING_COUNTDOWN_MS, () => beginTurnRef.current(0));
  }, [commit, schedule]);

  const submitAnswer = useCallback((cellIndex: number, text: string): boolean => {
    if (pausedAtRef.current !== null) return false;
    const s = stateRef.current;
    const turn = GRID_TRAINING_TURNS[turnRef.current];
    if (!turn || turn.who !== 'human' || s.phase !== 'turn' || s.currentPlayerUserId !== GRID_TRAINING_HUMAN_ID) return false;
    if (s.turnDeadlineAt === null) return false; // verdict already showing for this turn
    if (cellIndex !== turn.cell || s.claims.some((claim) => claim.cellIndex === cellIndex) || !text.trim()) return false;
    const answer = resolveCellAnswer(cellIndex, text);
    const playerId = answer ? playerIdOf(answer.name) : null;
    const verdict: GridTrainingFeedback = !answer ? 'wrong' : usedRef.current.has(playerId!) ? 'already_used' : 'correct';
    setFeedback(verdict);
    if (verdict !== 'correct') {
      if (turn.expect === 'wrong') {
        clearPending();
        settle(null, turn.afterBeat, turnRef.current + 1); // the lesson: a wrong name costs the turn
        return true;
      }
      onBeatRef.current('retry'); // a required claim: the tutorial keeps the turn
      return true;
    }
    clearPending();
    usedRef.current.add(playerId!);
    settle(
      { cellIndex, footballPlayerId: playerId!, displayName: answer!.name, claimantUserId: GRID_TRAINING_HUMAN_ID, turnNumber: s.turnNumber + 1 },
      turn.expect === 'wrong' ? null : turn.afterBeat,
      turnRef.current + 1,
    );
    return true;
  }, [clearPending, settle]);

  const clearFeedback = useCallback(() => setFeedback(undefined), []);

  /** A valid, still-unused name for a cell — what the tooltips suggest typing. */
  const hintFor = useCallback((cellIndex: number) => cellAnswers(cellIndex).find((answer) => !usedRef.current.has(playerIdOf(answer.name)))?.name ?? '', []);

  const currentTurn = GRID_TRAINING_TURNS[turnIndex];
  const guidedCell = state.phase === 'turn' && state.currentPlayerUserId === GRID_TRAINING_HUMAN_ID && state.turnDeadlineAt !== null && currentTurn?.who === 'human' ? currentTurn.cell : null;

  const actions = useMemo(() => ({ startSearch, startCountdown, submitAnswer, clearFeedback }), [clearFeedback, startCountdown, startSearch, submitAnswer]);

  return {
    stage,
    state,
    feedback,
    clockPausedAt,
    /** The cell the script wants claimed on this human turn (null on the bot's turn / while a verdict shows). */
    guidedCell,
    winningLine,
    resultsVisible,
    humanPlayerId: GRID_TRAINING_HUMAN_ID,
    opponent: GRID_TRAINING_OPPONENT,
    boardRevealMs: GRID_TRAINING_BOARD_REVEAL_MS,
    hintFor,
    actions,
  };
}

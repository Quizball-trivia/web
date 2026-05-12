'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  MatchAnswerAckPayload,
  MatchRoundResultPayload,
  MatchRoundResultPlayer,
} from '@/lib/realtime/socket.types';
import type { BarBattleState } from '../components/BarBattleOverlay';

// ─── Timing constants (ms) ──────────────────────────────────────────────────
//
// Timeline:
//   [player answers]  → 'player-score' (text appears, holds)
//   [opponent answers] → 'both-score'  (both texts visible, holds briefly)
//   [roundResult]      → 'convert'     (texts fly into zones)
//                      → 'bars'        (bars spawn one by one)
//                      → 'battle'      (bars cancel one by one)
//                      → 'result'      (remaining bars visible)
//                      → 'done'        (cleanup)
//
const BOTH_SCORE_HOLD_MS = 400;   // Brief hold after both scores visible
const CONVERT_DURATION = 500;     // Text flies into zone
const BARS_SPAWN_BASE_MS = 300;   // Base time for bar spawning (+ per-bar stagger)
const BARS_PER_STAGGER_MS = 80;   // Extra time per bar for spawn stagger
const BATTLE_BASE_MS = 200;       // Base time for battle phase (+ per-cancelled-bar)
const BATTLE_PER_BAR_MS = 150;    // Extra time per cancelled bar pair
const RESULT_HOLD_MS = 500;       // Show remaining bars
const DONE_LINGER_MS = 100;

/** Total time from convert start. Export so orchestrator can size its lock window. */
export const BAR_BATTLE_TOTAL_MS = 2800; // Conservative upper bound

const POINTS_PER_BAR = 10;
const MAX_BARS = 12;

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseBarBattleParams {
  /** Player's answer acknowledgement (arrives when player answers) */
  answerAck: MatchAnswerAckPayload | null;
  /** Whether opponent has answered */
  opponentAnswered: boolean;
  /** Opponent's points (optimistic, from answered event) */
  opponentRecentPoints: number | null;
  /** Whether opponent answered correctly */
  opponentAnsweredCorrectly: boolean | null;
  /** Final round result (arrives after both answered) */
  roundResult: MatchRoundResultPayload | null;
  myRound: MatchRoundResultPlayer | null;
  opponentRound: MatchRoundResultPlayer | null;
  phaseKind: string;
  /** Current divider X in SVG coords */
  dividerX: number;
}

function pointsToBars(points: number): number {
  if (points <= 0) return 0;
  return Math.min(Math.max(Math.round(points / POINTS_PER_BAR), 1), MAX_BARS);
}

export function useBarBattle({
  answerAck,
  opponentAnswered,
  opponentRecentPoints,
  opponentAnsweredCorrectly,
  roundResult,
  myRound,
  opponentRound,
  phaseKind,
  dividerX,
}: UseBarBattleParams): BarBattleState | null {
  const [battle, setBattle] = useState<BarBattleState | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const dividerXRef = useRef(dividerX);
  useEffect(() => { dividerXRef.current = dividerX; }, [dividerX]);
  // Track which qIndex we've started showing score for, and which we've started the battle for
  const scoreShownQRef = useRef<{ player: number | null; opponent: number | null }>({
    player: null,
    opponent: null,
  });
  const battleStartedQRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const t of timersRef.current) clearTimeout(t);
    };
  }, []);

  // ─── Step 1: Player answers → show player score immediately ─────────────
  useEffect(() => {
    if (!answerAck) return;
    const kind = answerAck.phaseKind ?? phaseKind;
    if (kind !== 'normal' && kind !== 'last_attack') return;
    if (scoreShownQRef.current.player === answerAck.qIndex) return;

    scoreShownQRef.current.player = answerAck.qIndex;
    const pts = answerAck.isCorrect ? answerAck.pointsEarned : 0;

    queueMicrotask(() => {
      setBattle((prev) => {
        const base = prev && prev.key === answerAck.qIndex ? prev : {
          key: answerAck.qIndex,
          phase: 'player-score' as const,
          playerBars: 0,
          opponentBars: 0,
          playerPoints: 0,
          opponentPoints: 0,
          remainingDelta: 0,
          dividerX: dividerXRef.current,
        };
        return {
          ...base,
          playerPoints: pts,
          phase: base.opponentPoints > 0 || base.phase === 'opponent-score'
            ? 'both-score' as const
            : 'player-score' as const,
        };
      });
    });
  }, [answerAck, phaseKind]);

  // ─── Step 2: Opponent answers → show opponent score ─────────────────────
  useEffect(() => {
    if (!opponentAnswered && !roundResult) return;

    // Determine qIndex from whatever source is available
    const qIndex = roundResult?.qIndex ?? answerAck?.qIndex ?? null;
    if (qIndex === null) return;

    const kind = roundResult?.phaseKind ?? phaseKind;
    if (kind !== 'normal' && kind !== 'last_attack') return;
    if (scoreShownQRef.current.opponent === qIndex) return;

    // Get opponent points from best available source
    const oppCorrect = opponentAnsweredCorrectly === true || opponentRound?.isCorrect === true;
    const oppPts = oppCorrect
      ? (opponentRound?.pointsEarned ?? opponentRecentPoints ?? 0)
      : 0;

    scoreShownQRef.current.opponent = qIndex;

    queueMicrotask(() => {
      setBattle((prev) => {
        const base = prev && prev.key === qIndex ? prev : {
          key: qIndex,
          phase: 'opponent-score' as const,
          playerBars: 0,
          opponentBars: 0,
          playerPoints: 0,
          opponentPoints: 0,
          remainingDelta: 0,
          dividerX: dividerXRef.current,
        };
        return {
          ...base,
          opponentPoints: oppPts,
          phase: base.playerPoints > 0 || base.phase === 'player-score'
            ? 'both-score' as const
            : 'opponent-score' as const,
        };
      });
    });
  }, [opponentAnswered, opponentAnsweredCorrectly, opponentRecentPoints, opponentRound, roundResult, answerAck, phaseKind]);

  // ─── Step 3: roundResult arrives → kick off convert → bars → battle → result ──
  useEffect(() => {
    if (!roundResult || !myRound || !opponentRound) return;

    const kind = roundResult.phaseKind ?? phaseKind;
    if (kind !== 'normal' && kind !== 'last_attack') return;
    if (battleStartedQRef.current === roundResult.qIndex) return;
    battleStartedQRef.current = roundResult.qIndex;

    // Clear old timers
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];

    const myPts = myRound.pointsEarned;
    const oppPts = opponentRound.pointsEarned;
    const pBars = pointsToBars(myPts);
    const oBars = pointsToBars(oppPts);
    const delta = pBars - oBars;
    const cancelledCount = Math.min(pBars, oBars);
    const key = roundResult.qIndex;
    const snapDividerX = dividerXRef.current;

    // If both scored 0, just clean up
    if (myPts === 0 && oppPts === 0) {
      queueMicrotask(() => setBattle(null));
      return;
    }

    const barData = {
      key,
      playerBars: pBars,
      opponentBars: oBars,
      playerPoints: myPts,
      opponentPoints: oppPts,
      remainingDelta: delta,
      dividerX: snapDividerX,
    };

    // First ensure both-score is showing with final values
    queueMicrotask(() => {
      setBattle((prev) => ({
        ...(prev && prev.key === key ? prev : barData),
        ...barData,
        phase: 'both-score',
      }));
    });

    let t = BOTH_SCORE_HOLD_MS;

    // Convert: text flies into zones
    const t1 = setTimeout(() => {
      setBattle((prev) => prev?.key === key ? { ...prev, phase: 'convert' } : prev);
    }, t);

    // Bars: spawn one by one
    t += CONVERT_DURATION;
    const maxBars = Math.max(pBars, oBars);
    const barsPhaseMs = BARS_SPAWN_BASE_MS + maxBars * BARS_PER_STAGGER_MS;
    const t2 = setTimeout(() => {
      setBattle((prev) => prev?.key === key ? { ...prev, phase: 'bars' } : prev);
    }, t);

    // Battle: bars cancel one by one
    t += barsPhaseMs;
    const battleMs = BATTLE_BASE_MS + cancelledCount * BATTLE_PER_BAR_MS;
    const t3 = setTimeout(() => {
      setBattle((prev) => prev?.key === key ? { ...prev, phase: 'battle' } : prev);
    }, t);

    // Result: show remaining bars
    t += battleMs;
    const t4 = setTimeout(() => {
      setBattle((prev) => prev?.key === key ? { ...prev, phase: 'result' } : prev);
    }, t);

    // Done + cleanup
    t += RESULT_HOLD_MS;
    const t5 = setTimeout(() => {
      setBattle((prev) => prev?.key === key ? { ...prev, phase: 'done' } : prev);
    }, t);

    t += DONE_LINGER_MS;
    const t6 = setTimeout(() => {
      setBattle((prev) => prev?.key === key ? null : prev);
      // NOTE: Do NOT reset battleStartedQRef here — dividerX changes after
      // the field lock releases which would re-trigger this effect.
      // It's only reset when a new question arrives (cleanup effect below).
    }, t);

    timersRef.current = [t1, t2, t3, t4, t5, t6];
  }, [roundResult, myRound, opponentRound, phaseKind]);

  // ─── Reset when new question arrives ────────────────────────────────────
  useEffect(() => {
    if (!roundResult && !answerAck && battle) {
      for (const t of timersRef.current) clearTimeout(t);
      timersRef.current = [];
      scoreShownQRef.current = { player: null, opponent: null };
      battleStartedQRef.current = null;
      queueMicrotask(() => setBattle(null));
    }
  }, [roundResult, answerAck, battle]);

  return battle;
}

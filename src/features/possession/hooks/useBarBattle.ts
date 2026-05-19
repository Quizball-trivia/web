'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  MatchAnswerAckPayload,
  MatchRoundResultPayload,
  MatchRoundResultPlayer,
} from '@/lib/realtime/socket.types';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { FLIGHT_TOTAL_MS } from '../components/BarBattleFlightOverlay';
import type { BarBattleState } from '../components/BarBattleOverlay';

// ─── Timing constants (ms) ──────────────────────────────────────────────────
//
// Timeline:
//   [player answers]  → 'player-score' (text appears, holds)
//   [opponent answers] → 'both-score'  (both texts visible, holds briefly)
//   [roundResult]      → 'convert'     (texts fly into zones)
//                      → 'bars'        (bars spawn one by one)
//                      → 'battle'      (bars cancel one by one)
//                      → 'charge'      (shot rounds only: surviving bars power up the avatar)
//                      → 'result'      (remaining bars visible)
//                      → 'done'        (cleanup)
// Goal rounds still run this sequence; the surviving bars hand off to the
// shot/goal animation instead of a normal possession push.
//
const BOTH_SCORE_HOLD_MS = 80;    // Minimal handoff after both scores are known
const CONVERT_DURATION = 80;      // Ranked-sim score flight already handled the visual travel
const BARS_SPAWN_BASE_MS = 130;   // Base time for bar spawning (+ per-bar stagger)
const BARS_PER_STAGGER_MS = 58;   // Extra time per bar for spawn stagger
const BATTLE_BASE_MS = 280;       // Base time for battle phase (+ per-cancelled-bar)
const BATTLE_PER_BAR_MS = 185;    // Extra time per cancelled bar pair
const CHARGE_BASE_MS = 500;       // Power-up phase before a shot
const CHARGE_PER_BAR_MS = 75;     // Sequential glow from farthest bar to avatar
const CHARGE_SHOT_OVERLAP_MS = 260; // Start the shot as the final charge glow peaks
const RESULT_HOLD_MS = 320;       // Show remaining bars briefly before possession moves
const DONE_LINGER_MS = 100;
const UNOPPOSED_PULSE_RESULT_HOLD_MS = 80;
const UNOPPOSED_PULSE_DONE_LINGER_MS = 40;
const RANKED_SCORE_FLIGHT_HANDOFF_MS = FLIGHT_TOTAL_MS + 120;

const POINTS_PER_BAR = 10;
const MAX_BARS = 12;
const BAR_BATTLE_LOCK_BUFFER_MS = 240;
const UNOPPOSED_PULSE_LOCK_BUFFER_MS = 60;

export function pointsToBars(points: number): number {
  if (points <= 0) return 0;
  return Math.min(Math.max(Math.round(points / POINTS_PER_BAR), 1), MAX_BARS);
}

interface BarBattleTimingOptions {
  includeScoreFlightHandoff?: boolean;
  includeUnopposedPulse?: boolean;
}

function getScoreHandoffMs(includeScoreFlightHandoff = false): number {
  return includeScoreFlightHandoff
    ? Math.max(BOTH_SCORE_HOLD_MS, RANKED_SCORE_FLIGHT_HANDOFF_MS)
    : BOTH_SCORE_HOLD_MS;
}

export function getBarBattleTotalMs(
  playerPoints: number,
  opponentPoints: number,
  options: BarBattleTimingOptions = {}
): number {
  return getBarBattleTimelineMs(playerPoints, opponentPoints, false, options).totalMs;
}

function getBarBattleTimelineMs(
  playerPoints: number,
  opponentPoints: number,
  includeShotCharge: boolean,
  options: BarBattleTimingOptions = {}
): {
  totalMs: number;
  shotHandoffMs: number;
} {
  const playerBars = pointsToBars(playerPoints);
  const opponentBars = pointsToBars(opponentPoints);
  if (playerBars === 0 && opponentBars === 0) return { totalMs: 0, shotHandoffMs: 0 };
  const maxBars = Math.max(playerBars, opponentBars);
  const cancelledCount = Math.min(playerBars, opponentBars);
  const survivorCount = maxBars - cancelledCount;
  const battleMs = cancelledCount > 0 ? BATTLE_BASE_MS + cancelledCount * BATTLE_PER_BAR_MS : 0;
  const shouldPulseUnopposed = options.includeUnopposedPulse && cancelledCount === 0 && survivorCount > 0;
  const chargeMs = (includeShotCharge || shouldPulseUnopposed) && survivorCount > 0
    ? CHARGE_BASE_MS + survivorCount * CHARGE_PER_BAR_MS
    : 0;
  const resultHoldMs = shouldPulseUnopposed ? UNOPPOSED_PULSE_RESULT_HOLD_MS : RESULT_HOLD_MS;
  const doneLingerMs = shouldPulseUnopposed ? UNOPPOSED_PULSE_DONE_LINGER_MS : DONE_LINGER_MS;
  const scoreHandoffMs = getScoreHandoffMs(options.includeScoreFlightHandoff);
  const beforeResultMs = (
    scoreHandoffMs +
    CONVERT_DURATION +
    BARS_SPAWN_BASE_MS +
    maxBars * BARS_PER_STAGGER_MS +
    battleMs +
    chargeMs
  );
  return {
    totalMs: beforeResultMs + resultHoldMs + doneLingerMs,
    shotHandoffMs: chargeMs > 0
      ? Math.max(0, beforeResultMs - CHARGE_SHOT_OVERLAP_MS)
      : beforeResultMs,
  };
}

/** Exported so the field orchestrator can size its lock window from real phase timing. */
export const BAR_BATTLE_TOTAL_MS = getBarBattleTotalMs(MAX_BARS * POINTS_PER_BAR, MAX_BARS * POINTS_PER_BAR);

export function getBarBattleFieldLockMs(
  playerPoints: number,
  opponentPoints: number,
  options: BarBattleTimingOptions = {}
): number {
  const playerBars = pointsToBars(playerPoints);
  const opponentBars = pointsToBars(opponentPoints);
  const isUnopposedPulse =
    options.includeUnopposedPulse
    && Math.min(playerBars, opponentBars) === 0
    && Math.max(playerBars, opponentBars) > 0;
  const bufferMs = isUnopposedPulse ? UNOPPOSED_PULSE_LOCK_BUFFER_MS : BAR_BATTLE_LOCK_BUFFER_MS;
  return getBarBattleTotalMs(playerPoints, opponentPoints, options) + bufferMs;
}

export function getBarBattleGoalAttackDelayMs(
  playerPoints: number,
  opponentPoints: number,
  minimumDelayMs: number,
  options: BarBattleTimingOptions = {}
): number {
  return Math.max(minimumDelayMs, getBarBattleTimelineMs(playerPoints, opponentPoints, true, options).shotHandoffMs);
}

export function resolveBattlePoints(
  pointsEarned: number,
  questionKind?: MatchAnswerAckPayload['questionKind'] | MatchRoundResultPayload['questionKind'],
  foundCount?: number
): number {
  if (pointsEarned > 0) return pointsEarned;
  if (questionKind === 'putInOrder' && typeof foundCount === 'number' && foundCount > 0) {
    return Math.min(foundCount, 5) * 20;
  }
  return pointsEarned;
}

function isBarBattlePhaseKind(kind: string | undefined): boolean {
  return kind === 'normal';
}

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
  /** Dev prototype: glow surviving one-sided bars before normal possession movement. */
  unopposedBarPulse?: boolean;
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
  unopposedBarPulse = false,
}: UseBarBattleParams): BarBattleState | null {
  const matchVariant = useRealtimeMatchStore((s) => s.match?.variant);
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
    if (!isBarBattlePhaseKind(kind)) return;
    if (scoreShownQRef.current.player === answerAck.qIndex) return;

    scoreShownQRef.current.player = answerAck.qIndex;
    const pts = resolveBattlePoints(answerAck.pointsEarned, answerAck.questionKind, answerAck.foundCount);

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
    if (!isBarBattlePhaseKind(kind)) return;
    if (scoreShownQRef.current.opponent === qIndex) return;

    // Get opponent points from best available source
    const oppPts = opponentRound
      ? resolveBattlePoints(opponentRound.pointsEarned, roundResult?.questionKind, opponentRound.foundCount)
      : (opponentRecentPoints ?? 0);

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
    if (!isBarBattlePhaseKind(kind)) return;
    if (battleStartedQRef.current === roundResult.qIndex) return;
    battleStartedQRef.current = roundResult.qIndex;

    // Clear old timers
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];

    const myPts = resolveBattlePoints(myRound.pointsEarned, roundResult.questionKind, myRound.foundCount);
    const oppPts = resolveBattlePoints(opponentRound.pointsEarned, roundResult.questionKind, opponentRound.foundCount);
    const pBars = pointsToBars(myPts);
    const oBars = pointsToBars(oppPts);
    const delta = pBars - oBars;
    const cancelledCount = Math.min(pBars, oBars);
    const key = roundResult.qIndex;
    const snapDividerX = dividerXRef.current;
    const isShotResolution = Boolean(
      roundResult.deltas?.goalScoredBySeat || roundResult.deltas?.penaltyOutcome
    );
    const shouldPulseUnopposed = unopposedBarPulse && !isShotResolution && cancelledCount === 0 && Math.max(pBars, oBars) > 0;

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
      chargeMode: shouldPulseUnopposed ? 'pulse' as const : 'lunge' as const,
    };

    // First ensure both-score is showing with final values
    queueMicrotask(() => {
      setBattle((prev) => ({
        ...(prev && prev.key === key ? prev : barData),
        ...barData,
        phase: 'both-score',
      }));
    });

    let t = getScoreHandoffMs(matchVariant === 'ranked_sim');

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

    // Battle: bars cancel one by one. On shot resolutions only, surviving
    // bars then charge sequentially so they power the avatar into the shot.
    t += barsPhaseMs;
    const survivorCount = maxBars - cancelledCount;
    const battleMs = cancelledCount > 0 ? BATTLE_BASE_MS + cancelledCount * BATTLE_PER_BAR_MS : 0;
    const chargeMs = (isShotResolution || shouldPulseUnopposed) && survivorCount > 0
      ? CHARGE_BASE_MS + survivorCount * CHARGE_PER_BAR_MS
      : 0;
    const t3 = cancelledCount > 0
      ? setTimeout(() => {
          setBattle((prev) => prev?.key === key ? { ...prev, phase: 'battle' } : prev);
        }, t)
      : null;

    t += battleMs;
    const tCharge = chargeMs > 0
      ? setTimeout(() => {
          setBattle((prev) => prev?.key === key ? { ...prev, phase: 'charge' } : prev);
        }, t)
      : null;

    const resultHoldMs = shouldPulseUnopposed ? UNOPPOSED_PULSE_RESULT_HOLD_MS : RESULT_HOLD_MS;
    const doneLingerMs = shouldPulseUnopposed ? UNOPPOSED_PULSE_DONE_LINGER_MS : DONE_LINGER_MS;

    // Result: show remaining bars
    t += chargeMs;
    const t4 = setTimeout(() => {
      setBattle((prev) => prev?.key === key ? { ...prev, phase: 'result' } : prev);
    }, t);

    // Done + cleanup
    t += resultHoldMs;
    const t5 = setTimeout(() => {
      setBattle((prev) => prev?.key === key ? { ...prev, phase: 'done' } : prev);
    }, t);

    t += doneLingerMs;
    const t6 = setTimeout(() => {
      setBattle((prev) => prev?.key === key ? null : prev);
      // NOTE: Do NOT reset battleStartedQRef here — dividerX changes after
      // the field lock releases which would re-trigger this effect.
      // It's only reset when a new question arrives (cleanup effect below).
    }, t);

    timersRef.current = [t1, t2, t3, tCharge, t4, t5, t6].filter((timer): timer is ReturnType<typeof setTimeout> => timer !== null);
  }, [roundResult, myRound, opponentRound, phaseKind, matchVariant, unopposedBarPulse]);

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

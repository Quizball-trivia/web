'use client';

/**
 * Drives the bar-battle flight overlay in ranked-sim matches.
 *
 * Triggers a `+N` ghost flight from the MCQ prompt's score-splash anchor
 * (`[data-splash-anchor="player|opponent"]`) onto the pitch avatar
 * (`[data-pitch-avatar="player|opponent"]`) whenever a player answers
 * correctly. The flight visually replaces the suppressed ArenaScoreSplash
 * and hands off naturally to the SVG bars that appear when `roundResult`
 * arrives.
 *
 * Triggers (when `match.variant === 'ranked_sim'`):
 *   - Player flight: fires when `answerAck` arrives with `pointsEarned > 0`,
 *     gated on phaseKind === normal.
 *     Deduped by `answerAck.qIndex`.
 *   - Opponent flight: fires when `opponentAnswered` flips true with
 *     `opponentAnsweredCorrectly === true && opponentRecentPoints > 0`,
 *     gated similarly and delayed until the local question is playable.
 *     Deduped by the current question's qIndex.
 *
 * Returns the active flights list + handlers ready to feed into
 * `BarBattleFlightOverlay`.
 *
 * Note: `answerAck` arrives before `roundResult`, so the flight lands
 * shortly after the player clicks and the SVG bars appear later when both
 * players are done. Timing alignment isn't perfect across variable
 * opponent answer speeds — but the flight serves as immediate "you
 * scored" feedback while the bars are the round resolution. Adequate UX.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import type { FlightSpec } from '../components/BarBattleFlightOverlay';
import { logger } from '@/utils/logger';
import type {
  MatchAnswerAckPayload,
  MatchRoundResultPayload,
} from '@/lib/realtime/socket.types';

type Side = 'player' | 'opponent';

function resolveFlightPoints(
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

function isFlightPhaseKind(kind: string | undefined): boolean {
  return kind === 'normal' || kind === 'penalty';
}

function findScoreAnchor(side: Side): DOMRect | null {
  if (typeof document === 'undefined') return null;
  return findVisibleRect(`[data-splash-anchor="${side}"]`) ?? findSpecialQuestionPanelAnchor(side);
}

function findPitchAvatar(side: Side): DOMRect | null {
  if (typeof document === 'undefined') return null;
  return findVisibleRect(`[data-pitch-avatar="${side}"]`);
}

function findPitchBarTarget(side: Side): DOMRect | null {
  if (typeof document === 'undefined') return null;
  return findVisibleRect(`[data-pitch-bar-target="${side}"]`);
}

// The 2× speed-streak badge in the HUD. When visible, the +N flight detours
// through it and the number doubles (the badge stays put).
function findSpeedStreakBadge(side: Side): DOMRect | null {
  if (typeof document === 'undefined') return null;
  return findVisibleRect(`[data-speed-streak-badge="${side}"]`);
}

// The always-present resting slot for the 2× badge — the target the incoming
// "2× earned" flight lands at.
function findSpeedStreakSlot(side: Side): DOMRect | null {
  if (typeof document === 'undefined') return null;
  return findVisibleRect(`[data-speed-streak-slot="${side}"]`);
}

function findPitchField(): DOMRect | null {
  if (typeof document === 'undefined') return null;
  return findVisibleRect('[data-pitch-field="possession"]');
}

function findVisibleRect(selector: string): DOMRect | null {
  if (typeof document === 'undefined') return null;
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    const style = window.getComputedStyle(el);
    const opacity = Number.parseFloat(style.opacity);
    if (style.display === 'none' || style.visibility === 'hidden' || opacity === 0) continue;
    if (rect.bottom <= 0 || rect.right <= 0 || rect.top >= window.innerHeight || rect.left >= window.innerWidth) continue;
    return rect;
  }
  return null;
}

function rectFromPoint(x: number, y: number): DOMRect {
  if (typeof DOMRect !== 'undefined') {
    return new DOMRect(x, y, 1, 1);
  }
  return {
    x,
    y,
    width: 1,
    height: 1,
    top: y,
    right: x + 1,
    bottom: y + 1,
    left: x,
    toJSON: () => ({}),
  } as DOMRect;
}

function findSpecialQuestionPanelAnchor(side: Side): DOMRect | null {
  const panelRect = findVisibleRect('[data-special-question-panel="true"]');
  if (!panelRect) return null;
  const inset = Math.min(24, Math.max(8, panelRect.width * 0.04));
  const x = side === 'player'
    ? panelRect.left + inset
    : panelRect.right - inset;
  const y = panelRect.top + panelRect.height / 2;
  return rectFromPoint(x, y);
}

function hasUsableAnchors(): boolean {
  return Boolean(
    findScoreAnchor('player') &&
    findScoreAnchor('opponent') &&
    findPitchAvatar('player') &&
    findPitchAvatar('opponent')
  );
}

function rectCentre(rect: DOMRect): { x: number; y: number } {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function clampFlightPoint(point: { x: number; y: number }): { x: number; y: number } {
  if (typeof window === 'undefined') return point;
  const xPadding = window.innerWidth < 640 ? 88 : 56;
  const yPadding = window.innerWidth < 640 ? 64 : 48;
  return {
    x: Math.max(xPadding, Math.min(window.innerWidth - xPadding, point.x)),
    y: Math.max(yPadding, Math.min(window.innerHeight - yPadding, point.y)),
  };
}

function computeFlightTarget(
  selfRect: DOMRect,
  opponentRect: DOMRect | null,
  pitchRect: DOMRect | null
): { x: number; y: number } {
  const centre = clampFlightPoint(rectCentre(selfRect));
  if (!opponentRect) return centre;
  const oppCentre = rectCentre(opponentRect);
  const dx = centre.x - oppCentre.x;
  const dy = centre.y - oppCentre.y;
  const PUSH = 0.22;
  let x = centre.x + dx * PUSH;
  let y = centre.y + dy * PUSH;

  if (pitchRect) {
    const padding = 22;
    x = Math.max(pitchRect.left + padding, Math.min(pitchRect.right - padding, x));
    y = Math.max(pitchRect.top + padding, Math.min(pitchRect.bottom - padding, y));

    const cx = (pitchRect.left + pitchRect.right) / 2;
    const cy = (pitchRect.top + pitchRect.bottom) / 2;
    if (centre.x < cx) x = Math.min(x, cx - padding);
    else if (centre.x > cx) x = Math.max(x, cx + padding);
    if (centre.y < cy) y = Math.min(y, cy - padding);
    else if (centre.y > cy) y = Math.max(y, cy + padding);
  }

  return clampFlightPoint({ x, y });
}

function computeFallbackBarLaneTarget(
  selfRect: DOMRect,
  opponentRect: DOMRect | null,
  pitchRect: DOMRect | null
): { x: number; y: number } {
  const centre = rectCentre(selfRect);
  if (!opponentRect) return clampFlightPoint(centre);

  const oppCentre = rectCentre(opponentRect);
  const isVerticalStack = Math.abs(centre.y - oppCentre.y) > Math.abs(centre.x - oppCentre.x);
  if (!isVerticalStack) return computeFlightTarget(selfRect, opponentRect, pitchRect);

  const offset = Math.max(44, Math.min(78, selfRect.height * 0.82));
  const awayY = centre.y <= oppCentre.y ? -1 : 1;
  let target = {
    x: centre.x,
    y: centre.y + offset * awayY,
  };

  if (pitchRect) {
    const padding = 22;
    target = {
      x: Math.max(pitchRect.left + padding, Math.min(pitchRect.right - padding, target.x)),
      y: Math.max(pitchRect.top + padding, Math.min(pitchRect.bottom - padding, target.y)),
    };
  }

  return clampFlightPoint(target);
}

export function usePossessionBarBattleFlights() {
  const barBattleMatch = useRealtimeMatchStore(useShallow((s) => ({
    variant: s.match?.variant ?? null,
    matchId: s.match?.matchId ?? null,
    mySeat: s.match?.mySeat ?? null,
    currentQIndex: s.match?.currentQuestion?.qIndex ?? null,
    currentQuestionPhase: s.match?.currentQuestionPhase ?? 'reveal',
    currentPhaseKind: s.match?.currentQuestion?.phaseKind ?? null,
    possessionPhaseKind: s.match?.possessionState?.phaseKind ?? null,
    speedStreakHolderSeat: s.match?.possessionState?.speedStreakHolderSeat ?? null,
    answerAck: s.match?.answerAck ?? null,
    lastRoundResult: s.match?.lastRoundResult ?? null,
    opponentAnswered: s.match?.opponentAnswered ?? false,
    opponentAnsweredCorrectly: s.match?.opponentAnsweredCorrectly ?? null,
    opponentRecentPoints: s.match?.opponentRecentPoints ?? 0,
  })));
  const selfUserId = useRealtimeMatchStore((s) => s.selfUserId);
  // Only fire flights for ranked-sim matches (the new bar-battle layout).
  const enabled = barBattleMatch.variant === 'ranked_sim';

  const [flights, setFlights] = useState<FlightSpec[]>([]);
  const [suppressScoreSplash, setSuppressScoreSplash] = useState(false);
  const flightSeqRef = useRef(0);
  // Dedupe per (matchId, qIndex) so reused qIndex across matches doesn't
  // block flights for a new match.
  const playerFiredQRef = useRef<string | null>(null);
  const opponentFiredQRef = useRef<string | null>(null);
  const pendingFlightKeysRef = useRef<Set<string>>(new Set());

  const currentQIndex = barBattleMatch.currentQIndex;
  const currentMatchId = barBattleMatch.matchId;
  const currentKey = currentMatchId != null && currentQIndex != null
    ? `${currentMatchId}:${currentQIndex}`
    : null;
  const lastSeenQIndexRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentKey == null) return;
    if (lastSeenQIndexRef.current === currentKey) return;
    lastSeenQIndexRef.current = currentKey;
    // Only reset refs that belong to a PRIOR key — keeps the current
    // key's dedupe locked in case this effect runs after the trigger
    // effect (which would otherwise allow a duplicate fire).
    if (playerFiredQRef.current != null && playerFiredQRef.current !== currentKey) {
      playerFiredQRef.current = null;
    }
    if (opponentFiredQRef.current != null && opponentFiredQRef.current !== currentKey) {
      opponentFiredQRef.current = null;
    }
  }, [currentKey]);

  useEffect(() => {
    if (!enabled) {
      // One-shot toggle when ranked-sim ends; doesn't cascade (state isn't in deps).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuppressScoreSplash(false);
      return;
    }

    let frame: number | null = null;
    const update = () => setSuppressScoreSplash(hasUsableAnchors());
    if (typeof window.requestAnimationFrame === 'function') {
      frame = window.requestAnimationFrame(update);
    } else {
      update();
    }
    window.addEventListener('resize', update);
    return () => {
      if (frame !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener('resize', update);
    };
  }, [enabled, currentQIndex]);

  const phaseKindFromState = barBattleMatch.currentPhaseKind
    ?? barBattleMatch.possessionPhaseKind
    ?? 'normal';

  const enqueueFlight = useCallback((params: {
    side: Side;
    sourceRect: DOMRect;
    targetRect: DOMRect;
    opponentRect: DOMRect | null;
    pitchRect: DOMRect | null;
    points: number;
    failed?: boolean;
  }) => {
    const id = ++flightSeqRef.current;
    const addFlight = () => {
      const barTargetRect = findPitchBarTarget(params.side);
      // If the 2× streak badge is showing for this side, route the +N through
      // it so the number visibly doubles mid-flight.
      const badgeRect = !params.failed ? findSpeedStreakBadge(params.side) : null;
      setFlights((prev) => [...prev, {
        id,
        side: params.side,
        source: clampFlightPoint(rectCentre(params.sourceRect)),
        target: barTargetRect
          ? clampFlightPoint(rectCentre(barTargetRect))
          : computeFallbackBarLaneTarget(params.targetRect, params.opponentRect, params.pitchRect),
        points: params.points,
        failed: params.failed,
        boostVia: badgeRect ? clampFlightPoint(rectCentre(badgeRect)) : undefined,
      }]);
    };

    if (typeof window === 'undefined') {
      addFlight();
      return;
    }

    window.setTimeout(addFlight, 50);
  }, []);

  const enqueueFlightFromDom = useCallback((params: {
    side: Side;
    roundKey: string;
    points: number;
    failed?: boolean;
    logLabel: string;
    questionKind?: string;
  }) => {
    const pendingKey = `${params.side}:${params.roundKey}`;
    if (pendingFlightKeysRef.current.has(pendingKey)) return;

    const markFired = () => {
      if (params.side === 'player') {
        playerFiredQRef.current = params.roundKey;
      } else {
        opponentFiredQRef.current = params.roundKey;
      }
    };

    const tryStart = (remainingRetries: number) => {
      const sourceRect = findScoreAnchor(params.side);
      const targetRect = findPitchAvatar(params.side);
      if (sourceRect && targetRect) {
        pendingFlightKeysRef.current.delete(pendingKey);
        const otherAvatarRect = findPitchAvatar(params.side === 'player' ? 'opponent' : 'player');
        const pitchRect = findPitchField();
        markFired();
        enqueueFlight({
          side: params.side,
          sourceRect,
          targetRect,
          opponentRect: otherAvatarRect,
          pitchRect,
          points: params.points,
          failed: params.failed,
        });
        return;
      }

      if (remainingRetries > 0 && typeof window !== 'undefined') {
        window.setTimeout(() => tryStart(remainingRetries - 1), 80);
        return;
      }

      pendingFlightKeysRef.current.delete(pendingKey);
      // Fallback to ArenaScoreSplash when DOM anchors are missing.
      setSuppressScoreSplash(false);
      logger.warn(`${params.logLabel} skipped: anchor missing`, {
        questionKind: params.questionKind,
        sourceFound: !!sourceRect,
        targetFound: !!targetRect,
      });
    };

    pendingFlightKeysRef.current.add(pendingKey);
    tryStart(2);
  }, [enqueueFlight]);

  // ── Player flight on answerAck ──────────────────────────────────────────
  // Fires regardless of correctness — wrong/zero-point answers get a "failed"
  // flight that falls off the bottom of the screen instead of reaching the
  // pitch, so the player always sees their splash react to the answer.
  const answerAck = barBattleMatch.answerAck;
  useEffect(() => {
    if (!enabled || !answerAck) return;
    const points = resolveFlightPoints(answerAck.pointsEarned, answerAck.questionKind, answerAck.foundCount);
    const failed = !answerAck.isCorrect || points <= 0;
    const phaseKind = answerAck.phaseKind ?? 'normal';
    if (!isFlightPhaseKind(phaseKind)) return;
    const ackKey = `${answerAck.matchId}:${answerAck.qIndex}`;
    if (currentKey !== ackKey) return;
    if (barBattleMatch.currentQuestionPhase !== 'playing') return;
    if (playerFiredQRef.current === ackKey) return;

    enqueueFlightFromDom({
      side: 'player',
      roundKey: ackKey,
      points,
      failed,
      logLabel: 'Bar-battle player flight',
      questionKind: answerAck.questionKind,
    });
  }, [barBattleMatch.currentQuestionPhase, currentKey, enabled, answerAck, enqueueFlightFromDom]);

  // Fallback: if the client missed its immediate answer_ack, fire the same
  // player flight from the authoritative round_result so the user still sees
  // their own scoring motion.
  const roundResult = barBattleMatch.lastRoundResult;
  useEffect(() => {
    if (!enabled || !roundResult || !selfUserId) return;
    const phaseKind = roundResult.phaseKind ?? phaseKindFromState;
    if (!isFlightPhaseKind(phaseKind)) return;
    const roundKey = `${roundResult.matchId}:${roundResult.qIndex}`;
    if (playerFiredQRef.current === roundKey) return;

    const playerRound = roundResult.players[selfUserId];
    const points = playerRound
      ? resolveFlightPoints(playerRound.pointsEarned, roundResult.questionKind, playerRound.foundCount)
      : 0;
    if (!playerRound || points <= 0) return;

    enqueueFlightFromDom({
      side: 'player',
      roundKey,
      points,
      logLabel: 'Bar-battle player fallback flight',
      questionKind: roundResult.questionKind,
    });
  }, [enabled, enqueueFlightFromDom, phaseKindFromState, roundResult, selfUserId]);

  // Same fallback for the opponent. Special questions may only expose final
  // opponent scoring through round_result, so keep the flight feedback even
  // when match:opponent_answered was not emitted or arrived too early.
  useEffect(() => {
    if (!enabled || !roundResult || !selfUserId) return;
    if (barBattleMatch.currentQuestionPhase !== 'playing') return;
    const phaseKind = roundResult.phaseKind ?? phaseKindFromState;
    if (!isFlightPhaseKind(phaseKind)) return;
    const roundKey = `${roundResult.matchId}:${roundResult.qIndex}`;
    if (opponentFiredQRef.current === roundKey) return;

    const opponentRound = Object.entries(roundResult.players).find(([userId]) => userId !== selfUserId)?.[1];
    const points = opponentRound
      ? resolveFlightPoints(opponentRound.pointsEarned, roundResult.questionKind, opponentRound.foundCount)
      : 0;
    if (!opponentRound || points <= 0) return;

    enqueueFlightFromDom({
      side: 'opponent',
      roundKey,
      points,
      logLabel: 'Bar-battle opponent fallback flight',
      questionKind: roundResult.questionKind,
    });
  }, [barBattleMatch.currentQuestionPhase, enabled, enqueueFlightFromDom, phaseKindFromState, roundResult, selfUserId]);

  // ── Opponent flight on opponent answer ──────────────────────────────────
  const opponentAnswered = barBattleMatch.opponentAnswered;
  const opponentAnsweredCorrectly = barBattleMatch.opponentAnsweredCorrectly;
  const opponentRecentPoints = barBattleMatch.opponentRecentPoints;
  useEffect(() => {
    if (!enabled) return;
    if (!opponentAnswered) return;
    if (barBattleMatch.currentQuestionPhase !== 'playing') return;
    // Fire flights for both correct and wrong opponent answers. The wrong/
    // zero-point case renders a "failed" flight that falls off-screen.
    if (currentQIndex == null) return;
    if (!isFlightPhaseKind(phaseKindFromState)) return;
    if (currentKey == null) return;
    if (opponentFiredQRef.current === currentKey) return;

    const failed = opponentAnsweredCorrectly !== true || opponentRecentPoints <= 0;
    enqueueFlightFromDom({
      side: 'opponent',
      roundKey: currentKey,
      points: opponentRecentPoints,
      failed,
      logLabel: 'Bar-battle opponent flight',
    });
  }, [
    enabled,
    enqueueFlightFromDom,
    opponentAnswered,
    opponentAnsweredCorrectly,
    opponentRecentPoints,
    barBattleMatch.currentQuestionPhase,
    currentQIndex,
    currentKey,
    phaseKindFromState,
  ]);

  // ── 2× badge fly-in when the player newly earns the streak ──────────────
  // Driven by the LIVE match-state holder (the source of truth that survives
  // across questions), not the transient round result. When the holder
  // transitions to my seat, fly a "2×" token from the answer source to the HUD
  // badge slot, where the sticky badge takes over.
  const mySeat = barBattleMatch.mySeat;
  const liveHolderSeat = barBattleMatch.speedStreakHolderSeat;
  const prevHolderRef = useRef<1 | 2 | null>(null);
  const seenFirstHolderRef = useRef(false);
  useEffect(() => {
    if (!enabled) {
      prevHolderRef.current = liveHolderSeat;
      return;
    }
    // First observation (mount / reconnect / state resync): seed the ref to the
    // current live holder and DON'T fire — otherwise an already-held streak
    // would look like a fresh null→me earn and trigger a fake fly-in.
    if (!seenFirstHolderRef.current) {
      seenFirstHolderRef.current = true;
      prevHolderRef.current = liveHolderSeat;
      return;
    }
    const prev = prevHolderRef.current;
    prevHolderRef.current = liveHolderSeat;
    // Only fly the token on a fresh null/opponent → me transition.
    if (mySeat == null || liveHolderSeat !== mySeat || prev === mySeat) return;

    const launch = (retries: number) => {
      const sourceRect = findScoreAnchor('player');
      const slotRect = findSpeedStreakSlot('player');
      if (sourceRect && slotRect) {
        const id = ++flightSeqRef.current;
        setFlights((prevFlights) => [...prevFlights, {
          id,
          side: 'player',
          kind: 'badge',
          source: clampFlightPoint(rectCentre(sourceRect)),
          target: clampFlightPoint(rectCentre(slotRect)),
          points: 0,
        }]);
        return;
      }
      if (retries > 0 && typeof window !== 'undefined') {
        window.setTimeout(() => launch(retries - 1), 80);
      }
    };
    launch(4);
  }, [enabled, liveHolderSeat, mySeat]);

  // Drop flights from the list once they finish animating. The overlay
  // handles enter/exit; we just keep state lean.
  const handleFlightArrive = useCallback((id: number) => {
    setFlights((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return { flights, handleFlightArrive, suppressScoreSplash };
}

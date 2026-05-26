'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { AnimatePresence, motion } from 'motion/react';
import { Crown, X } from 'lucide-react';

import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { MatchCountdownPuck } from '@/components/shared/MatchCountdownPuck';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { QuitMatchModal } from '@/features/game/components/QuitMatchModal';
import { useRealtimeGameLogic } from '@/features/game/hooks/useRealtimeGameLogic';
import { PossessionQuestionPanel } from '@/components/game/PossessionQuestionPanel';
import { RoundTransitionOverlay } from '@/components/game/RoundTransitionOverlay';
import { playBgm, stopBgm } from '@/lib/sounds/gameSounds';
import type { AnswerStateArray, Phase } from '@/lib/types/game.types';
import type { GameQuestion } from '@/lib/domain/gameQuestion';
import type { MatchParticipant } from '@/lib/realtime/socket.types';
import { cn } from '@/lib/utils';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import type { AvatarCustomization } from '@/types/game';
import { useLocale } from '@/contexts/LocaleContext';
import { usePossessionFirstQuestionIntro } from '@/features/possession/hooks/usePossessionRoundTransition';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RealtimePartyQuizScreenProps {
  onQuit: () => void;
  onForfeit: () => void;
  mobileStandingsPlacement?: 'bottom-bar' | 'below-options';
  disableBgm?: boolean;
}

interface PartyStandingViewModel {
  userId: string;
  username: string;
  avatarUrl: string | null;
  avatarCustomization?: AvatarCustomization | null;
  rank: number;
  totalPoints: number;
  answered: boolean;
  isLeader: boolean;
  isSelf: boolean;
  rankShift: number;
  roundDelta: number | null;
}

interface ScoreFlight {
  id: string;
  userId: string;
  points: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  failed?: boolean;
  targetTotal?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toAnswerStates(
  optionsCount: number,
  selectedAnswer: number | null,
  selfAnsweredCorrectly: boolean | null,
): AnswerStateArray {
  if (selectedAnswer === null) {
    return Array.from({ length: optionsCount }, () => 'default') as AnswerStateArray;
  }

  if (selfAnsweredCorrectly === true) {
    return Array.from({ length: optionsCount }, (_, index) => (
      index === selectedAnswer ? 'correct' : 'disabled'
    )) as AnswerStateArray;
  }

  if (selfAnsweredCorrectly === false) {
    return Array.from({ length: optionsCount }, (_, index) => (
      index === selectedAnswer ? 'wrong' : 'disabled'
    )) as AnswerStateArray;
  }

  return Array.from({ length: optionsCount }, (_, index) => (
    index === selectedAnswer ? 'default' : 'disabled'
  )) as AnswerStateArray;
}

function toRevealAnswerStates(
  optionsCount: number,
  correctIndex: number | undefined,
  selectedAnswer: number | null,
): AnswerStateArray {
  return Array.from({ length: optionsCount }, (_, index) => {
    if (index === correctIndex) return 'correct';
    if (selectedAnswer === index) return 'wrong';
    return 'disabled';
  }) as AnswerStateArray;
}

function buildParticipantMap(participants: MatchParticipant[]): Map<string, MatchParticipant> {
  return new Map(participants.map((participant) => [participant.userId, participant]));
}

type StandingDotStatus = 'correct' | 'answering' | 'resolved' | 'idle';

function getStandingDotStatus(params: {
  roundResolved: boolean;
  answered: boolean;
  showOptions: boolean;
}): StandingDotStatus {
  if (params.roundResolved) return 'resolved';
  if (params.answered) return 'correct';
  if (params.showOptions) return 'answering';
  return 'idle';
}

// Hex color per rank — shared by the standings borders/pills and the
// per-player pick chips on the question card, so each player has a single
// recognisable accent colour across the screen.
const RANK_HEX: Record<number, string> = {
  1: '#38B60E',
  2: '#FFE500',
  3: '#1645FF',
  4: '#FF9600',
  5: '#FF4B4B',
  6: '#CE82FF',
};

const PARTY_SUCCESS_FLIGHT_MS = 1150;
const PARTY_FAILED_FLIGHT_MS = 2000;

function getRankHex(rank: number): string {
  return RANK_HEX[rank] ?? RANK_HEX[6]!;
}

function isUsableScoreAnchor(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (rect.bottom < 0 || rect.right < 0) return false;
  if (rect.top > window.innerHeight || rect.left > window.innerWidth) return false;

  const styles = window.getComputedStyle(element);
  return styles.display !== 'none' && styles.visibility !== 'hidden' && Number(styles.opacity) > 0;
}

// Per-rank styling — outlined card + pill colour rotate through the brand
// palette so each row reads as a distinct "slot" with a subtle matching tint.
function getRankStyle(rank: number): {
  border: string;
  pillBg: string;
  glow: string;
  tint: string;
  selfGlow: string;
} {
  switch (rank) {
    case 1:
      return {
        border: 'border-brand-green',
        pillBg: 'bg-brand-green',
        glow: '0 1.76px 6.334px 1.32px rgba(56,182,14,0.25)',
        tint: 'bg-brand-green/[0.08]',
        selfGlow: '0 0 18px rgba(56,182,14,0.55), 0 0 36px rgba(56,182,14,0.25)',
      };
    case 2:
      return {
        border: 'border-brand-yellow',
        pillBg: 'bg-brand-yellow text-surface-page',
        glow: '0 1.76px 6.334px 1.32px rgba(255,229,0,0.25)',
        tint: 'bg-brand-yellow/[0.08]',
        selfGlow: '0 0 18px rgba(255,229,0,0.55), 0 0 36px rgba(255,229,0,0.25)',
      };
    case 3:
      return {
        border: 'border-brand-blue',
        pillBg: 'bg-brand-blue',
        glow: '0 1.76px 6.334px 1.32px rgba(22,69,255,0.25)',
        tint: 'bg-brand-blue/[0.08]',
        selfGlow: '0 0 18px rgba(22,69,255,0.6), 0 0 36px rgba(22,69,255,0.3)',
      };
    case 4:
      return {
        border: 'border-brand-orange',
        pillBg: 'bg-brand-orange',
        glow: '0 1.76px 6.334px 1.32px rgba(255,150,0,0.25)',
        tint: 'bg-brand-orange/[0.08]',
        selfGlow: '0 0 18px rgba(255,150,0,0.55), 0 0 36px rgba(255,150,0,0.25)',
      };
    case 5:
      return {
        border: 'border-brand-red-soft',
        pillBg: 'bg-brand-red-soft',
        glow: '0 1.76px 6.334px 1.32px rgba(255,75,75,0.25)',
        tint: 'bg-brand-red-soft/[0.08]',
        selfGlow: '0 0 18px rgba(255,75,75,0.55), 0 0 36px rgba(255,75,75,0.25)',
      };
    default:
      return {
        border: 'border-brand-purple',
        pillBg: 'bg-brand-purple',
        glow: '0 1.76px 6.334px 1.32px rgba(206,130,255,0.25)',
        tint: 'bg-brand-purple/[0.08]',
        selfGlow: '0 0 18px rgba(206,130,255,0.55), 0 0 36px rgba(206,130,255,0.25)',
      };
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RealtimePartyQuizScreen({
  onQuit,
  onForfeit,
  mobileStandingsPlacement = 'bottom-bar',
  disableBgm = false,
}: RealtimePartyQuizScreenProps) {
  const { t, locale } = useLocale();
  const partyState = useRealtimeMatchStore((store) => store.match?.partyState ?? null);
  const participants = useRealtimeMatchStore((store) => store.match?.participants);
  const matchCategoryName = useRealtimeMatchStore((store) => store.match?.categoryName ?? null);
  const currentQuestion = useRealtimeMatchStore((store) => store.match?.currentQuestion ?? null);
  const answerAck = useRealtimeMatchStore((store) => store.match?.answerAck ?? null);
  const finalResults = useRealtimeMatchStore((store) => store.match?.finalResults ?? null);
  const selfUserId = useRealtimeMatchStore((store) => store.selfUserId);
  const forfeitPending = useRealtimeMatchStore((store) => store.forfeitPending);
  const countdownEndsAt = useRealtimeMatchStore((store) => store.match?.countdownEndsAt ?? null);
  // First-question intro: starts true on mount, waits for kickoff countdown
  // to finish, then shows the overlay for FIRST_QUESTION_INTRO_MS. The
  // hook also passes through as `blockReveal` below so the question +
  // options don't render-then-hide (which was causing the visible flash).
  const firstQuestionIntroVisible = usePossessionFirstQuestionIntro({
    countdownEndsAt,
    currentQuestionIndex: currentQuestion?.qIndex ?? null,
  });
  const { state, actions } = useRealtimeGameLogic({
    transitionDelayMs: 950,
    blockReveal: firstQuestionIntroVisible,
  });
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [preRoundRankingOrder, setPreRoundRankingOrder] = useState<string[]>([]);
  const [scoreFlights, setScoreFlights] = useState<ScoreFlight[]>([]);
  const [liveScoreDeltas, setLiveScoreDeltas] = useState<Record<string, number>>({});
  const [displayedTotalsByUserId, setDisplayedTotalsByUserId] = useState<Record<string, number>>({});
  const splashQuestionRef = useRef<number | null>(null);
  const scoreFlightIdRef = useRef(0);
  const spawnedFlightKeysRef = useRef(new Set<string>());
  const liveDeltaShownKeysRef = useRef(new Set<string>());
  const liveFlightShownKeysRef = useRef(new Set<string>());
  const liveDeltaTimeoutsRef = useRef(new Map<string, number>());
  const previousPartyTotalsRef = useRef(new Map<string, number>());
  const previousPartyAnsweredRef = useRef(new Map<string, boolean>());
  const pendingDisplayedTotalsRef = useRef(new Map<string, number>());
  const rankingOrderRef = useRef<string[]>(partyState?.rankingOrder ?? []);
  const participantMap = useMemo(() => buildParticipantMap(participants ?? []), [participants]);

  const commitDisplayedTotal = useCallback((userId: string, totalPoints: number) => {
    pendingDisplayedTotalsRef.current.delete(userId);
    setDisplayedTotalsByUserId((current) => {
      if (current[userId] === totalPoints) return current;
      return { ...current, [userId]: totalPoints };
    });
  }, []);

  const findScoreAnchor = useCallback((userId: string): HTMLElement | null => {
    const anchors = Array.from(document.querySelectorAll<HTMLElement>('[data-party-score-anchor]'))
      .filter((element) => element.dataset.partyScoreAnchor === userId && isUsableScoreAnchor(element));
    if (anchors.length === 0) return null;

    const preferredPlacement = window.innerWidth >= 1024
      ? 'desktop'
      : mobileStandingsPlacement === 'below-options'
        ? 'mobile-inline'
        : 'mobile-bottom';
    return anchors.find((element) => element.dataset.partyScoreAnchorPlacement === preferredPlacement)
      ?? anchors[0]
      ?? null;
  }, [mobileStandingsPlacement]);

  const spawnScoreFlightFromRects = useCallback((params: {
    userId: string;
    qIndex: number;
    points: number;
    keyPrefix: string;
    sourceRect: DOMRect;
    targetRect: DOMRect;
    failed?: boolean;
    holdTotal?: number;
    targetTotal?: number;
  }) => {
    const failed = params.failed === true || params.points <= 0;
    if (!failed && params.points <= 0) return false;
    const flightKey = `${params.keyPrefix}:${params.qIndex}:${params.userId}`;
    if (spawnedFlightKeysRef.current.has(flightKey)) return true;
    if (
      params.sourceRect.width <= 0 ||
      params.sourceRect.height <= 0 ||
      params.targetRect.width <= 0 ||
      params.targetRect.height <= 0
    ) {
      return false;
    }

    spawnedFlightKeysRef.current.add(flightKey);
    const id = `party-score-flight-${scoreFlightIdRef.current++}`;
    const flight: ScoreFlight = {
      id,
      userId: params.userId,
      points: Math.max(0, params.points),
      from: {
        x: params.sourceRect.left + params.sourceRect.width / 2,
        y: params.sourceRect.top + params.sourceRect.height / 2,
      },
      to: {
        x: params.targetRect.left + params.targetRect.width / 2,
        y: params.targetRect.top + params.targetRect.height / 2,
      },
      failed,
      targetTotal: params.targetTotal,
    };

    if (params.targetTotal != null && params.holdTotal != null) {
      const holdTotal = params.holdTotal;
      pendingDisplayedTotalsRef.current.set(params.userId, params.targetTotal);
      setDisplayedTotalsByUserId((current) => ({ ...current, [params.userId]: holdTotal }));
    }

    setScoreFlights((current) => [...current, flight]);
    window.setTimeout(() => {
      if (params.targetTotal != null) {
        commitDisplayedTotal(
          params.userId,
          pendingDisplayedTotalsRef.current.get(params.userId) ?? params.targetTotal,
        );
      }
      setScoreFlights((current) => current.filter((item) => item.id !== id));
    }, failed ? PARTY_FAILED_FLIGHT_MS + 120 : PARTY_SUCCESS_FLIGHT_MS + 120);
    return true;
  }, []);

  const spawnScoreFlight = useCallback((params: {
    userId: string;
    qIndex: number;
    selectedIndex: number | null | undefined;
    points: number;
    keyPrefix: string;
    failed?: boolean;
    holdTotal?: number;
    targetTotal?: number;
  }) => {
    const failed = params.failed === true || params.points <= 0;
    if (params.selectedIndex == null) return;
    const flightKey = `${params.keyPrefix}:${params.qIndex}:${params.userId}`;
    if (spawnedFlightKeysRef.current.has(flightKey)) return;

    const source = document.querySelector<HTMLElement>(
      `[data-mcq-option-index="${params.selectedIndex}"]`,
    );
    const target = findScoreAnchor(params.userId);
    if (!source || !target) return;

    return spawnScoreFlightFromRects({
      userId: params.userId,
      qIndex: params.qIndex,
      points: params.points,
      keyPrefix: params.keyPrefix,
      sourceRect: source.getBoundingClientRect(),
      targetRect: target.getBoundingClientRect(),
      failed,
      holdTotal: params.holdTotal,
      targetTotal: params.targetTotal,
    });
  }, [findScoreAnchor, spawnScoreFlightFromRects]);

  const spawnLiveScoreFlight = useCallback((params: {
    userId: string;
    qIndex: number;
    points: number;
    failed?: boolean;
    holdTotal?: number;
    targetTotal?: number;
  }) => {
    const source = document.querySelector<HTMLElement>('[data-party-live-score-source]');
    const target = findScoreAnchor(params.userId);
    if (!source || !target) return false;

    return spawnScoreFlightFromRects({
      userId: params.userId,
      qIndex: params.qIndex,
      points: params.points,
      keyPrefix: 'live',
      sourceRect: source.getBoundingClientRect(),
      targetRect: target.getBoundingClientRect(),
      failed: params.failed,
      holdTotal: params.holdTotal,
      targetTotal: params.targetTotal,
    });
  }, [findScoreAnchor, spawnScoreFlightFromRects]);

  useEffect(() => {
    rankingOrderRef.current = partyState?.rankingOrder ?? [];
  }, [partyState?.rankingOrder]);

  useEffect(() => {
    setDisplayedTotalsByUserId({});
    pendingDisplayedTotalsRef.current.clear();
    spawnedFlightKeysRef.current.clear();
    liveDeltaShownKeysRef.current.clear();
    liveFlightShownKeysRef.current.clear();
    previousPartyTotalsRef.current.clear();
    previousPartyAnsweredRef.current.clear();
  }, [partyState?.matchId]);

  useEffect(() => {
    return () => {
      for (const timeoutId of liveDeltaTimeoutsRef.current.values()) {
        window.clearTimeout(timeoutId);
      }
      liveDeltaTimeoutsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    setLiveScoreDeltas({});
    liveDeltaShownKeysRef.current.clear();
    liveFlightShownKeysRef.current.clear();
    previousPartyAnsweredRef.current.clear();
    for (const timeoutId of liveDeltaTimeoutsRef.current.values()) {
      window.clearTimeout(timeoutId);
    }
    liveDeltaTimeoutsRef.current.clear();
  }, [currentQuestion?.qIndex]);

  useLayoutEffect(() => {
    if (!partyState) return;

    const qIndex = currentQuestion?.qIndex ?? partyState.currentQuestionIndex;
    const previousTotals = previousPartyTotalsRef.current;
    const previousAnswered = previousPartyAnsweredRef.current;
    const nextTotals = new Map<string, number>();
    const nextAnswered = new Map<string, boolean>();
    const nextDeltas: Record<string, number> = {};

    for (const player of partyState.players) {
      nextTotals.set(player.userId, player.totalPoints);
      nextAnswered.set(player.userId, player.answered);
      const previousTotal = previousTotals.get(player.userId);
      const hadPreviousState = previousTotal != null || previousAnswered.has(player.userId);
      const wasAnswered = previousAnswered.get(player.userId) ?? false;
      const delta = previousTotal == null ? 0 : player.totalPoints - previousTotal;
      const becameAnswered = hadPreviousState && player.answered && !wasAnswered;
      const deltaKey = `${qIndex}:${player.userId}`;

      if (
        qIndex != null &&
        player.userId !== selfUserId &&
        (delta > 0 || becameAnswered) &&
        !state.roundResolved &&
        !liveDeltaShownKeysRef.current.has(deltaKey)
      ) {
        const failed = delta <= 0;
        liveDeltaShownKeysRef.current.add(deltaKey);
        if (delta > 0) {
          nextDeltas[player.userId] = delta;
        }
        const animated = spawnLiveScoreFlight({
          userId: player.userId,
          qIndex,
          points: Math.max(0, delta),
          failed,
          holdTotal: previousTotal ?? player.totalPoints - Math.max(0, delta),
          targetTotal: delta > 0 ? player.totalPoints : undefined,
        });
        if (animated) {
          liveFlightShownKeysRef.current.add(deltaKey);
        } else if (delta > 0) {
          commitDisplayedTotal(player.userId, player.totalPoints);
        }

        const existingTimeout = liveDeltaTimeoutsRef.current.get(player.userId);
        if (existingTimeout) window.clearTimeout(existingTimeout);

        const timeoutId = window.setTimeout(() => {
          setLiveScoreDeltas((current) => {
            const { [player.userId]: _removed, ...rest } = current;
            return rest;
          });
          liveDeltaTimeoutsRef.current.delete(player.userId);
        }, 1500);
        liveDeltaTimeoutsRef.current.set(player.userId, timeoutId);
      }
    }

    previousPartyTotalsRef.current = nextTotals;
    previousPartyAnsweredRef.current = nextAnswered;
    if (Object.keys(nextDeltas).length > 0) {
      setLiveScoreDeltas((current) => ({ ...current, ...nextDeltas }));
    }
  }, [commitDisplayedTotal, currentQuestion?.qIndex, partyState, selfUserId, spawnLiveScoreFlight, state.roundResolved]);

  // Snapshot the ranking order before each round for rank-shift calculation
  useEffect(() => {
    if (!rankingOrderRef.current.length) return;
    queueMicrotask(() => {
      setPreRoundRankingOrder(rankingOrderRef.current);
    });
  }, [currentQuestion?.qIndex]);

  // Tick timer during pause
  useEffect(() => {
    if (!state.matchPaused || !state.pauseUntil) return;
    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => clearInterval(intervalId);
  }, [state.matchPaused, state.pauseUntil]);

  // Instant local flight for party quiz. The server still authoritatively
  // confirms totals, but party questions include correctIndex so the click can
  // feel as immediate as ranked possession.
  useLayoutEffect(() => {
    if (state.selectedAnswer === null || typeof state.correctIndex !== 'number') return;
    if (state.selectedAnswerQIndex == null) return;
    if (splashQuestionRef.current === state.selectedAnswerQIndex) return;
    if (!selfUserId) return;

    splashQuestionRef.current = state.selectedAnswerQIndex;
    const isCorrect = state.selectedAnswer === state.correctIndex;
    const points = isCorrect ? Math.max(0, Math.min(100, state.timeRemaining * 10)) : 0;
    const currentTotal = partyState?.players.find((player) => player.userId === selfUserId)?.totalPoints ?? 0;
    const holdTotal = displayedTotalsByUserId[selfUserId] ?? currentTotal;
    spawnScoreFlight({
      userId: selfUserId,
      qIndex: state.selectedAnswerQIndex,
      selectedIndex: state.selectedAnswer,
      points,
      keyPrefix: 'optimistic',
      failed: !isCorrect || points <= 0,
      holdTotal,
      targetTotal: points > 0 ? holdTotal + points : undefined,
    });
  }, [
    displayedTotalsByUserId,
    partyState?.players,
    selfUserId,
    spawnScoreFlight,
    state.correctIndex,
    state.selectedAnswer,
    state.selectedAnswerQIndex,
    state.timeRemaining,
  ]);

  useEffect(() => {
    if (!answerAck || !selfUserId) return;
    const optimisticKey = `optimistic:${answerAck.qIndex}:${selfUserId}`;
    if (spawnedFlightKeysRef.current.has(optimisticKey)) {
      if (answerAck.pointsEarned > 0) {
        pendingDisplayedTotalsRef.current.set(selfUserId, answerAck.myTotalPoints);
      }
      return;
    }
    const failed = !answerAck.isCorrect || answerAck.pointsEarned <= 0;
    const holdTotal = Math.max(0, answerAck.myTotalPoints - Math.max(0, answerAck.pointsEarned));
    const animated = spawnScoreFlight({
      userId: selfUserId,
      qIndex: answerAck.qIndex,
      selectedIndex: answerAck.selectedIndex,
      points: answerAck.pointsEarned,
      keyPrefix: 'ack',
      failed,
      holdTotal,
      targetTotal: answerAck.pointsEarned > 0 ? answerAck.myTotalPoints : undefined,
    });
    if (!animated && answerAck.pointsEarned > 0) {
      commitDisplayedTotal(selfUserId, answerAck.myTotalPoints);
    }
  }, [answerAck, commitDisplayedTotal, selfUserId, spawnScoreFlight]);

  // Reset splash ref when question changes
  useEffect(() => {
    if (currentQuestion?.qIndex == null) {
      splashQuestionRef.current = null;
    }
  }, [currentQuestion?.qIndex]);

  useEffect(() => {
    const qIndex = state.roundResult?.qIndex;
    if (qIndex == null) return;

    for (const [userId, player] of Object.entries(state.roundResult?.players ?? {})) {
      const ackFlightKey = `ack:${qIndex}:${userId}`;
      const optimisticFlightKey = `optimistic:${qIndex}:${userId}`;
      if (
        userId === selfUserId &&
        (
          (answerAck?.qIndex === qIndex && spawnedFlightKeysRef.current.has(ackFlightKey)) ||
          spawnedFlightKeysRef.current.has(optimisticFlightKey)
        )
      ) {
        continue;
      }
      const failed = !player.isCorrect || player.pointsEarned <= 0;
      if (liveFlightShownKeysRef.current.has(`${qIndex}:${userId}`)) continue;
      const targetTotal = player.totalPoints;
      const holdTotal = Math.max(0, targetTotal - Math.max(0, player.pointsEarned));
      const animated = spawnScoreFlight({
        userId,
        qIndex,
        selectedIndex: player.selectedIndex,
        points: player.pointsEarned,
        keyPrefix: 'round',
        failed,
        holdTotal,
        targetTotal: player.pointsEarned > 0 ? targetTotal : undefined,
      });
      if (!animated && player.pointsEarned > 0) {
        commitDisplayedTotal(userId, targetTotal);
      }
    }
  }, [answerAck?.qIndex, commitDisplayedTotal, selfUserId, spawnScoreFlight, state.roundResult]);

  useEffect(() => {
    if (disableBgm) return;
    if (!state.startCountdownActive || state.countdownReason === 'resume') return;
    playBgm('kickoff');
  }, [disableBgm, state.countdownReason, state.startCountdownActive]);

  useEffect(() => {
    if (disableBgm) return;
    return () => stopBgm(400);
  }, [disableBgm]);

  useEffect(() => {
    if (!finalResults) return;
    stopBgm(600);
  }, [finalResults]);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const pauseSeconds = state.pauseUntil
    ? Math.max(0, Math.ceil((state.pauseUntil - nowMs) / 1000))
    : 0;
  const forfeitPendingTitle =
    forfeitPending?.reason === 'opponent_forfeit'
      ? 'Opponent forfeited'
      : forfeitPending?.reason === 'opponent_reconnect_limit'
        ? 'Opponent did not reconnect'
        : 'Match forfeited';

  const question: GameQuestion | null = useMemo(() => {
    if (!currentQuestion || currentQuestion.question.kind !== 'multipleChoice') return null;
    return {
      id: currentQuestion.question.id,
      prompt: currentQuestion.question.prompt,
      options: currentQuestion.question.options,
      correctIndex: typeof state.correctIndex === 'number' ? state.correctIndex : -1,
      categoryId: currentQuestion.question.categoryId,
      categoryName: currentQuestion.question.categoryName,
      difficulty: currentQuestion.question.difficulty,
      explanation: currentQuestion.question.explanation ?? undefined,
    };
  }, [currentQuestion, state.correctIndex]);

  const answerStates = useMemo(() => {
    const optionsCount = question?.options.length ?? 4;
    if (state.roundResolved) {
      return toRevealAnswerStates(optionsCount, state.correctIndex, state.selectedAnswer);
    }

    const selfAnsweredCorrectly =
      state.selectedAnswer !== null && typeof state.correctIndex === 'number'
        ? state.selectedAnswer === state.correctIndex
        : answerAck?.isCorrect ?? null;

    return toAnswerStates(optionsCount, state.selectedAnswer, selfAnsweredCorrectly);
  }, [answerAck?.isCorrect, question?.options.length, state.correctIndex, state.roundResolved, state.selectedAnswer]);

  const uiPhase: Phase = useMemo(() => {
    if (state.roundResolved) return 'reveal';
    return state.questionPhase === 'playing' ? 'playing' : 'question-reveal';
  }, [state.questionPhase, state.roundResolved]);

  const questionNumber = currentQuestion?.qIndex != null
    ? currentQuestion.qIndex + 1
    : (partyState?.currentQuestionIndex ?? 0) + 1;
  const totalQuestions = currentQuestion?.total ?? partyState?.totalQuestions ?? 10;
  // (answered count removed from HUD per design — visible via standings dots instead)

  const standings = useMemo<PartyStandingViewModel[]>(() => {
    if (!partyState) return [];

    const previousRanks = new Map(
      preRoundRankingOrder.map((userId, index) => [userId, index + 1]),
    );
    const roundPlayers = state.roundResult?.players ?? {};

    return [...partyState.players]
      .sort((left, right) => left.rank - right.rank)
      .map((player) => {
        const participant = participantMap.get(player.userId);
        const previousRank = previousRanks.get(player.userId) ?? player.rank;
        const rankShift = previousRank - player.rank;
        const roundDelta = roundPlayers[player.userId]?.pointsEarned ?? null;
        const pendingTargetTotal = pendingDisplayedTotalsRef.current.get(player.userId);
        const previousTotal = previousPartyTotalsRef.current.get(player.userId);
        const shouldHoldIncomingTotal =
          pendingTargetTotal != null ||
          (
            !state.roundResolved &&
            previousTotal != null &&
            player.totalPoints > previousTotal
          );
        const displayedTotal = displayedTotalsByUserId[player.userId]
          ?? (shouldHoldIncomingTotal ? previousTotal ?? player.totalPoints : player.totalPoints);
        const liveDelta = player.userId !== selfUserId
          ? liveScoreDeltas[player.userId] ?? null
          : null;

        return {
          userId: player.userId,
          totalPoints: displayedTotal,
          answered: player.answered,
          rank: player.rank,
          username: participant?.username ?? 'Player',
          avatarUrl: participant?.avatarUrl ?? null,
          avatarCustomization: participant?.avatarCustomization ?? null,
          isSelf: player.userId === selfUserId,
          isLeader: player.userId === partyState.leaderUserId,
          rankShift,
          roundDelta: shouldHoldIncomingTotal ? null : liveDelta ?? roundDelta,
        };
      });
  }, [displayedTotalsByUserId, liveScoreDeltas, participantMap, partyState, preRoundRankingOrder, selfUserId, state.roundResult?.players]);

  const transitionVisible = state.roundResultHoldDone;
  const transitionQuestionNumber = Math.min(
    totalQuestions,
    questionNumber + (state.roundResolved ? 1 : 0),
  );
  const matchCategoryNameResolved = matchCategoryName
    ? matchCategoryName[locale] ?? matchCategoryName.en
    : undefined;
  const transitionCategoryName = question?.categoryName ?? matchCategoryNameResolved ?? 'Football';
  const isFinalQuestionResolved = state.roundResolved && questionNumber >= totalQuestions;
  const showFinalizingResults = isFinalQuestionResolved && transitionVisible && !finalResults;

  // Map each player to a stable rank-tint color for the pick chips.
  const rankColorByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const player of standings) {
      map.set(player.userId, getRankHex(player.rank));
    }
    return map;
  }, [standings]);

  // Party-mode pick chips — every other player's selection for this round.
  // Only populated once the round resolves (the server sends `selectedIndex`
  // in the round-result payload, so we can't show live picks during play).
  const partyPicks = useMemo(() => {
    if (!state.roundResult?.players) return undefined;
    const others = Object.entries(state.roundResult.players).filter(
      ([userId]) => userId !== selfUserId,
    );
    if (others.length === 0) return undefined;
    return others.map(([userId, player]) => {
      const participant = participantMap.get(userId);
      return {
        userId,
        username: participant?.username ?? 'Player',
        selectedIndex: player.selectedIndex,
        isCorrect: player.isCorrect,
        accentColor: rankColorByUserId.get(userId),
      };
    });
  }, [participantMap, rankColorByUserId, selfUserId, state.roundResult]);

  const showMobileStandingsBelowOptions = mobileStandingsPlacement === 'below-options';

  // ---------------------------------------------------------------------------
  // Pre-match / loading
  // ---------------------------------------------------------------------------

  if (!partyState) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-surface-page-alt">
        {state.startCountdownActive ? (
          <MatchCountdownPuck
            label="Quiz starts in"
            seconds={Math.max(1, state.countdownSeconds)}
            size="md"
          />
        ) : (
          <LoadingScreen fullScreen={false} className="h-auto min-h-0" />
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="relative min-h-dvh overflow-hidden bg-surface-page-alt bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat text-white">
      {/* Start countdown overlay */}
      <AnimatePresence>
        {state.startCountdownActive && (
          <motion.div
            key="party-countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-surface-page-alt/45 backdrop-blur-[1.5px]" />
            <div className="relative">
              <MatchCountdownPuck
                label={state.countdownReason === 'resume' ? 'Reconnected. Resuming in' : 'Quiz starts in'}
                seconds={Math.max(1, state.countdownSeconds)}
                size="md"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {forfeitPending && (
          <motion.div
            key="party-forfeit-pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-surface-page-alt/75 px-4 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ y: -12, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: -12, scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="w-full max-w-sm rounded-[20px] bg-brand-blue px-6 py-6 text-center shadow-2xl"
            >
              <div className="font-poppins text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-yellow">
                {t('possession.finalizingMatch')}
              </div>
              <div className="mt-2 font-poppins text-xl font-semibold uppercase text-white">{forfeitPendingTitle}</div>
              <div className="mt-1 font-poppins text-sm font-semibold text-white/70">{forfeitPending.message}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause overlay */}
      <AnimatePresence>
        {state.matchPaused && pauseSeconds > 0 && (
          <motion.div
            key="party-pause"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="absolute left-1/2 top-4 z-30 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-[20px] bg-brand-blue px-5 py-3 shadow-2xl"
          >
            <div className="text-center font-poppins">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Match Paused</div>
              <div className="mt-1 text-base font-semibold uppercase text-white">Waiting for a player to reconnect</div>
              <div className="mt-1 text-xs font-semibold text-brand-yellow">Resumes automatically in {pauseSeconds}s</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating leave button */}
      <button
        onClick={() => setShowQuitModal(true)}
        className="absolute right-3 top-3 z-40 rounded-full p-2 text-white/45 transition-colors hover:bg-white/5 hover:text-white/80 sm:right-4 sm:top-4"
        title="Leave match"
      >
        <X className="size-5" />
      </button>

      {/* ================================================================= */}
      {/* Main content */}
      {/* ================================================================= */}
      <div className={cn(
        'relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-3 pt-4 sm:px-5 lg:px-8 lg:pb-6',
        showMobileStandingsBelowOptions ? 'pb-6' : 'pb-20',
      )}>

        {/* ─── 2-column layout: question + standings ─── */}
        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Question panel — same UI as ranked possession match (without pitch) */}
          <div
            className="relative min-h-[30rem] md:min-h-[34rem] lg:min-h-[38rem]"
            data-party-live-score-source
          >
            <motion.div
              animate={{ opacity: (transitionVisible || firstQuestionIntroVisible) ? 0 : 1 }}
              transition={{ duration: (transitionVisible || firstQuestionIntroVisible) ? 0 : 0.6 }}
              initial={false}
              aria-hidden={transitionVisible || firstQuestionIntroVisible}
              className={(transitionVisible || firstQuestionIntroVisible) ? 'pointer-events-none' : ''}
            >
              <PossessionQuestionPanel
                phase={uiPhase}
                isPenaltyPhase={false}
                isShotPhase={false}
                isLastAttackPhase={false}
                question={question}
                qIndex={Math.max(0, questionNumber - 1)}
                totalQuestions={totalQuestions}
                timeRemaining={state.timeRemaining}
                showOptions={state.showOptions}
                selectedAnswer={state.selectedAnswer}
                answerStates={answerStates}
                opponentAnswer={null}
                partyPicks={partyPicks}
                onAnswer={actions.submitAnswer}
              />

              {showMobileStandingsBelowOptions && (
                <div className="mt-3 space-y-2 px-4 lg:hidden">
                  <div className="flex items-center justify-between px-1">
                    <div className="font-fun text-[10px] font-black uppercase tracking-[0.26em] text-white/45">
                      {t('partyResults.standings')}
                    </div>
                    <div className="font-poppins text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                      {t('partyResults.liveScores')}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {standings.map((player) => {
                      const dotStatus = getStandingDotStatus({
                        roundResolved: state.roundResolved,
                        answered: player.answered,
                        showOptions: state.showOptions,
                      });
                      const hasAnswered = dotStatus === 'correct';
                      const rankStyle = getRankStyle(player.rank);
                      return (
                        <motion.div
                          key={player.userId}
                          layout
                          layoutId={`mobile-inline-standing-${player.userId}`}
                          className={cn(
                            'flex min-h-12 items-center gap-2 rounded-[18px] border-2 bg-surface-page/40 px-2.5 py-1.5 backdrop-blur-sm',
                            rankStyle.border,
                            player.isSelf && rankStyle.tint,
                          )}
                          style={player.isSelf ? { boxShadow: rankStyle.selfGlow } : undefined}
                        >
                          <span
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] text-sm font-black tabular-nums text-white',
                              rankStyle.pillBg,
                            )}
                            style={{ boxShadow: rankStyle.glow }}
                          >
                            {player.rank}
                          </span>
                          <div
                            className="relative shrink-0"
                            data-party-score-anchor={player.userId}
                            data-party-score-anchor-placement="mobile-inline"
                          >
                            <AvatarDisplay
                              customization={player.avatarCustomization ?? { base: player.avatarUrl ?? undefined }}
                              size="xs"
                              className="size-8"
                            />
                            {hasAnswered && !player.isSelf && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-brand-green-light ring-2 ring-surface-page-alt"
                              >
                                <svg viewBox="0 0 12 12" className="size-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M2 6l3 3 5-5" />
                                </svg>
                              </motion.div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-poppins text-sm font-black text-white">
                                {player.username}
                              </span>
                              {player.isSelf && (
                                <span className="rounded-full bg-brand-orange px-1.5 py-0.5 font-poppins text-[8px] font-black uppercase tracking-[0.08em] text-white">
                                  You
                                </span>
                              )}
                              {player.isLeader && <Crown className="size-3.5 shrink-0 text-brand-yellow-deep" />}
                            </div>
                          </div>
                          <span className="shrink-0 font-poppins text-sm font-black tabular-nums text-white">
                            {player.totalPoints}
                          </span>
                          <AnimatePresence mode="wait">
                            {player.roundDelta != null && player.roundDelta > 0 && (
                              <motion.span
                                key={`mobile-inline-delta-${player.userId}-${player.totalPoints}`}
                                initial={{ opacity: 0, scale: 0.75, y: 4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: -4 }}
                                transition={{ duration: 0.22 }}
                                className="shrink-0 font-poppins text-xs font-black text-brand-green-light"
                              >
                                +{player.roundDelta}
                              </motion.span>
                            )}
                          </AnimatePresence>
                          <span
                            className={cn(
                              'size-2.5 rounded-full shrink-0',
                              dotStatus === 'correct' && 'bg-brand-green-light',
                              dotStatus === 'answering' && 'bg-brand-cyan animate-pulse',
                              dotStatus === 'resolved' && 'bg-brand-purple animate-pulse',
                              dotStatus === 'idle' && 'bg-white/20',
                            )}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>

            <AnimatePresence>
              {showFinalizingResults ? (
                <motion.div
                  key="party-finalizing-results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 z-20 flex items-center justify-center rounded-[28px] bg-surface-page-alt/85 px-6 backdrop-blur-sm"
                >
                  <motion.div
                    initial={{ y: -12, scale: 0.96, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                    className="w-full max-w-sm rounded-[20px] bg-brand-blue px-6 py-7 text-center shadow-2xl"
                  >
                    <div className="font-poppins text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-yellow">
                      {t('partyResults.matchComplete')}
                    </div>
                    <LoadingScreen
                      fullScreen={false}
                      text=""
                      className="h-auto min-h-0 bg-transparent py-2"
                    />
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="mt-2 font-poppins text-sm font-semibold uppercase tracking-wide text-white"
                    >
                      {t('partyResults.calculatingFinalScores')}
                    </motion.p>
                  </motion.div>
                </motion.div>
              ) : transitionVisible ? (
                <RoundTransitionOverlay
                  title={`Question ${transitionQuestionNumber}`}
                  categoryName={transitionCategoryName}
                />
              ) : firstQuestionIntroVisible ? (
                <RoundTransitionOverlay
                  title="Question 1"
                  categoryName={transitionCategoryName}
                />
              ) : null}
            </AnimatePresence>
          </div>

          {/* ─── Desktop standings sidebar ─── */}
          <div className="hidden lg:block">
            <div className="text-[10px] font-fun font-black uppercase tracking-[0.26em] text-white/45 px-1 mb-2">
              {t('partyResults.standings')}
            </div>
            <div className="space-y-1.5">
              {standings.map((player) => {
                const dotStatus = getStandingDotStatus({
                  roundResolved: state.roundResolved,
                  answered: player.answered,
                  showOptions: state.showOptions,
                });
                const rankStyle = getRankStyle(player.rank);
                return (
                  <motion.div
                    key={player.userId}
                    layout
                    layoutId={`standing-${player.userId}`}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="flex items-center gap-2"
                  >
                  <div
                    className={cn(
                      'flex flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors border-2',
                      rankStyle.border,
                      player.isSelf ? rankStyle.tint : 'bg-transparent',
                    )}
                    style={player.isSelf ? { boxShadow: rankStyle.selfGlow } : undefined}
                  >
                    {/* Rank pill */}
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-base font-black tabular-nums text-white',
                        rankStyle.pillBg,
                      )}
                      style={{ boxShadow: rankStyle.glow }}
                    >
                      {player.rank}
                    </span>

                    {/* Avatar */}
                    <div
                      className="shrink-0"
                      data-party-score-anchor={player.userId}
                      data-party-score-anchor-placement="desktop"
                    >
                      <AvatarDisplay
                        customization={player.avatarCustomization ?? { base: player.avatarUrl ?? undefined }}
                        size="sm"
                        shape="circle"
                        className="bg-transparent"
                      />
                    </div>

                    {/* Name + leader crown */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-base font-bold text-white">{player.username}</span>
                        {player.isLeader && <Crown className="size-4 shrink-0 text-brand-yellow-deep" />}
                      </div>
                    </div>

                    {/* Points */}
                    <span className="text-base font-black tabular-nums text-white shrink-0">
                      {player.totalPoints}
                    </span>

                    {/* Delta flash */}
                    <AnimatePresence mode="wait">
                      {player.roundDelta != null && player.roundDelta > 0 && (
                        <motion.span
                          key={`delta-${player.userId}-${player.totalPoints}`}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 4 }}
                          transition={{ duration: 0.25 }}
                          className="text-sm font-black text-brand-green-light shrink-0"
                        >
                          +{player.roundDelta}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Status dot */}
                    <span
                      className={cn(
                        'size-3 rounded-full shrink-0',
                        dotStatus === 'correct' && 'bg-brand-green-light',
                        dotStatus === 'answering' && 'bg-brand-cyan animate-pulse',
                        dotStatus === 'resolved' && 'bg-brand-purple animate-pulse',
                        dotStatus === 'idle' && 'bg-white/20',
                      )}
                    />
                  </div>
                  {/* YOU pill — sits OUTSIDE the bordered card, stretches to
                      match its height so the right edge reads as a paired
                      action chip rather than a floating badge. */}
                  {player.isSelf && (
                    <span
                      className="flex shrink-0 self-stretch items-center justify-center rounded-[16px] bg-brand-orange px-4 text-sm font-black uppercase tracking-wider text-white"
                      style={{ boxShadow: '0 1.76px 6.334px 1.32px rgba(255,150,0,0.3)' }}
                    >
                      You
                    </span>
                  )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Mobile bottom standings bar ─── */}
      {!showMobileStandingsBelowOptions && (
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-10 bg-gradient-to-t from-surface-page-alt via-surface-page-alt/95 to-transparent pt-6 pb-3 px-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {standings.map((player) => {
            const dotStatus = getStandingDotStatus({
              roundResolved: state.roundResolved,
              answered: player.answered,
              showOptions: state.showOptions,
            });
            const hasAnswered = dotStatus === 'correct';
            const rankStyle = getRankStyle(player.rank);
            return (
              <motion.div
                key={player.userId}
                layout
                layoutId={`mobile-standing-${player.userId}`}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1.5 border-2 bg-transparent transition-colors',
                  rankStyle.border,
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-black tabular-nums text-white',
                    rankStyle.pillBg,
                  )}
                  style={{ boxShadow: rankStyle.glow }}
                >
                  {player.rank}
                </span>
                <div
                  className="relative"
                  data-party-score-anchor={player.userId}
                  data-party-score-anchor-placement="mobile-bottom"
                >
                  <AvatarDisplay
                    customization={player.avatarCustomization ?? { base: player.avatarUrl ?? undefined }}
                    size="xs"
                    className="size-7 shrink-0"
                  />
                  {player.isSelf && (
                    <span
                      className="absolute -top-1 -right-1 rounded-full bg-brand-orange px-1 py-[1px] text-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] font-poppins font-semibold uppercase"
                      style={{ fontSize: 7, letterSpacing: '0.06em', lineHeight: 1 }}
                    >
                      You
                    </span>
                  )}
                  {/* Answered check overlay on avatar */}
                  {hasAnswered && !player.isSelf && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full bg-brand-green-light ring-2 ring-surface-page-alt"
                    >
                      <svg viewBox="0 0 12 12" className="size-2 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    </motion.div>
                  )}
                </div>
                <span className="text-xs font-bold text-white truncate max-w-[80px]">
                  {player.username}
                </span>
                <span className="text-xs font-black tabular-nums text-white/70">
                  {player.totalPoints}
                </span>
                <AnimatePresence mode="wait">
                  {player.roundDelta != null && player.roundDelta > 0 && (
                    <motion.span
                      key={`mobile-bottom-delta-${player.userId}-${player.totalPoints}`}
                      initial={{ opacity: 0, scale: 0.75, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -4 }}
                      transition={{ duration: 0.22 }}
                      className="text-[10px] font-black text-brand-green-light"
                    >
                      +{player.roundDelta}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
      )}

      <AnimatePresence>
        {scoreFlights.map((flight) => {
          const failed = flight.failed === true || flight.points <= 0;
          const dx = flight.to.x - flight.from.x;
          const dy = flight.to.y - flight.from.y;
          const fallY = (typeof window !== 'undefined' ? window.innerHeight : 900) - flight.from.y + 180;
          return (
            <div
              key={flight.id}
              className="pointer-events-none fixed z-50 select-none"
              style={{
                left: flight.from.x,
                top: flight.from.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.5, x: 0, y: 0, rotate: -7 }}
                animate={failed
                  ? {
                    opacity: [0, 1, 1, 1, 0.75, 0],
                    scale: [0.5, 1.18, 1, 1, 0.9, 0.55],
                    x: [0, 0, 0, dx, dx + 6, dx - 24],
                    y: [0, 0, 0, dy, dy + 14, fallY],
                    rotate: [0, -6, 0, 4, 14, 42],
                  }
                  : {
                    opacity: [0, 1, 1, 1, 0],
                    scale: [0.55, 1.15, 1, 0.72, 0.55],
                    x: [0, 0, dx, dx, dx],
                    y: [0, 0, dy, dy, dy],
                    rotate: [0, -5, -2, 1, 2],
                  }}
                exit={{ opacity: 0 }}
                transition={failed
                  ? {
                    duration: PARTY_FAILED_FLIGHT_MS / 1000,
                    times: [0, 0.12, 0.28, 0.52, 0.6, 1],
                    ease: [0.36, 0, 0.66, 1],
                  }
                  : {
                    duration: PARTY_SUCCESS_FLIGHT_MS / 1000,
                    times: [0, 0.12, 0.82, 0.94, 1],
                    ease: [0.24, 0.72, 0.24, 1],
                  }}
                className="font-poppins text-4xl font-black text-brand-yellow"
                style={{
                  WebkitTextStroke: '2px #000000',
                  paintOrder: 'stroke fill',
                  color: failed ? 'rgba(255, 229, 0, 0.85)' : '#FFE500',
                  textShadow: failed
                    ? '0 4px 0 rgba(0,0,0,0.6), 0 8px 14px rgba(0,0,0,0.3)'
                    : '0 6px 0 rgba(0,0,0,0.35), 0 0 16px rgba(255,229,0,0.35)',
                }}
              >
                +{flight.points}
              </motion.div>
            </div>
          );
        })}
      </AnimatePresence>

      {/* Quit modal */}
      <QuitMatchModal
        open={showQuitModal}
        onOpenChange={setShowQuitModal}
        description="Leave temporarily and rejoin before the timer ends, or forfeit the party quiz now."
        secondaryConfirmLabel="Leave Temporarily"
        onSecondaryConfirm={() => {
          setShowQuitModal(false);
          onQuit();
        }}
        confirmLabel="Forfeit Match"
        onConfirm={() => {
          setShowQuitModal(false);
          onForfeit();
        }}
      />
    </div>
  );
}

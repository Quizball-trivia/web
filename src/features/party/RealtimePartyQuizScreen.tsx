'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { AnimatePresence, motion } from 'motion/react';
import { Crown, X } from 'lucide-react';

import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { QuitMatchModal } from '@/features/game/components/QuitMatchModal';
import { useRealtimeGameLogic } from '@/features/game/hooks/useRealtimeGameLogic';
import { PossessionQuestionPanel } from '@/features/possession/components/PossessionQuestionPanel';
import { RoundTransitionOverlay } from '@/features/possession/components/RoundTransitionOverlay';
import type { AnswerStateArray, Phase } from '@/lib/types/game.types';
import type { GameQuestion } from '@/lib/domain/gameQuestion';
import type { MatchParticipant } from '@/lib/realtime/socket.types';
import { cn } from '@/lib/utils';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import type { AvatarCustomization } from '@/types/game';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RealtimePartyQuizScreenProps {
  onQuit: () => void;
  onForfeit: () => void;
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

function getRankHex(rank: number): string {
  return RANK_HEX[rank] ?? RANK_HEX[6]!;
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
}: RealtimePartyQuizScreenProps) {
  const { state, actions } = useRealtimeGameLogic({ transitionDelayMs: 950 });
  const partyState = useRealtimeMatchStore((store) => store.match?.partyState ?? null);
  const participants = useRealtimeMatchStore((store) => store.match?.participants);
  const currentQuestion = useRealtimeMatchStore((store) => store.match?.currentQuestion ?? null);
  const answerAck = useRealtimeMatchStore((store) => store.match?.answerAck ?? null);
  const selfUserId = useRealtimeMatchStore((store) => store.selfUserId);
  const forfeitPending = useRealtimeMatchStore((store) => store.forfeitPending);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showPlayerSplash, setShowPlayerSplash] = useState(false);
  const [playerSplashPoints, setPlayerSplashPoints] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [preRoundRankingOrder, setPreRoundRankingOrder] = useState<string[]>([]);
  const splashQuestionRef = useRef<number | null>(null);
  const rankingOrderRef = useRef<string[]>(partyState?.rankingOrder ?? []);
  const participantMap = useMemo(() => buildParticipantMap(participants ?? []), [participants]);

  useEffect(() => {
    rankingOrderRef.current = partyState?.rankingOrder ?? [];
  }, [partyState?.rankingOrder]);

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

  // Optimistic score splash on correct answer
  useEffect(() => {
    if (state.selectedAnswer === null || typeof state.correctIndex !== 'number') return;
    if (state.selectedAnswerQIndex == null) return;
    if (splashQuestionRef.current === state.selectedAnswerQIndex) return;
    if (state.selectedAnswer !== state.correctIndex) return;

    splashQuestionRef.current = state.selectedAnswerQIndex;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reveal splash is triggered from an incoming round-state transition
    setPlayerSplashPoints(Math.max(0, Math.min(100, state.timeRemaining * 10)));
    setShowPlayerSplash(true);
  }, [state.correctIndex, state.selectedAnswer, state.selectedAnswerQIndex, state.timeRemaining]);

  // Server ack refines optimistic splash points
  useEffect(() => {
    if (!answerAck || !answerAck.isCorrect) return;
    if (splashQuestionRef.current !== answerAck.qIndex) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- server ack refines the optimistic splash points
    setPlayerSplashPoints(answerAck.pointsEarned);
  }, [answerAck]);

  // Reset splash ref when question changes
  useEffect(() => {
    if (currentQuestion?.qIndex == null) {
      splashQuestionRef.current = null;
    }
  }, [currentQuestion?.qIndex]);

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

        return {
          userId: player.userId,
          totalPoints: player.totalPoints,
          answered: player.answered,
          rank: player.rank,
          username: participant?.username ?? 'Player',
          avatarUrl: participant?.avatarUrl ?? null,
          avatarCustomization: participant?.avatarCustomization ?? null,
          isSelf: player.userId === selfUserId,
          isLeader: player.userId === partyState.leaderUserId,
          rankShift,
          roundDelta,
        };
      });
  }, [participantMap, partyState, preRoundRankingOrder, selfUserId, state.roundResult?.players]);

  const transitionVisible = state.roundResultHoldDone;
  const transitionQuestionNumber = Math.min(
    totalQuestions,
    questionNumber + (state.roundResolved ? 1 : 0),
  );
  const transitionCategoryName = question?.categoryName ?? 'Football';

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
  }, [participantMap, rankColorByUserId, selfUserId, state.roundResult?.players]);

  // ---------------------------------------------------------------------------
  // Pre-match / loading
  // ---------------------------------------------------------------------------

  if (!partyState) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-surface-page-alt">
        {state.startCountdownActive ? (
          <div className="flex flex-col items-center gap-2">
            <div className="font-fun text-xs font-bold uppercase tracking-[0.28em] text-white/60">Quiz starts in</div>
            <div className="flex size-28 items-center justify-center rounded-full border-4 border-brand-cyan/60 bg-surface-deep shadow-[0_0_40px_rgba(28,176,246,0.25)]">
              <span className="font-fun text-5xl font-black leading-none tabular-nums text-white">
                {Math.max(1, state.countdownSeconds)}
              </span>
            </div>
          </div>
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
            <motion.div
              key={`party-countdown-${state.countdownSeconds}`}
              initial={{ scale: 0.72, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 340, damping: 22 }}
              className="relative flex flex-col items-center gap-2"
            >
              <div className="font-fun text-xs font-bold uppercase tracking-[0.28em] text-white/70">
                {state.countdownReason === 'resume' ? 'Reconnected. Resuming in' : 'Quiz starts in'}
              </div>
              <div className="flex size-32 items-center justify-center rounded-full border-4 border-brand-cyan/70 bg-surface-deep shadow-[0_0_50px_rgba(28,176,246,0.3)]">
                <span className="font-fun text-6xl font-black leading-none tabular-nums text-white">
                  {Math.max(1, state.countdownSeconds)}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {forfeitPending && (
          <motion.div
            key="party-forfeit-pending"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="absolute left-1/2 top-4 z-40 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border border-brand-red-soft/25 bg-surface-deep/95 px-4 py-3 shadow-2xl backdrop-blur"
          >
            <div className="text-center font-fun">
              <div className="text-[10px] uppercase tracking-[0.22em] text-brand-red-soft/70">Finalizing Match</div>
              <div className="mt-1 text-sm font-black text-white">{forfeitPendingTitle}</div>
              <div className="mt-1 text-xs font-bold text-white/60">{forfeitPending.message}</div>
            </div>
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
            className="absolute left-1/2 top-4 z-30 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border border-white/10 bg-surface-deep/95 px-4 py-3 shadow-2xl backdrop-blur"
          >
            <div className="text-center font-fun">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">Match Paused</div>
              <div className="mt-1 text-sm font-black text-white">Waiting for a player to reconnect</div>
              <div className="mt-1 text-xs font-bold text-brand-purple">Resumes automatically in {pauseSeconds}s</div>
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
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-3 pb-20 pt-4 sm:px-5 lg:px-8 lg:pb-6">

        {/* ─── 2-column layout: question + standings ─── */}
        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Question panel — same UI as ranked possession match (without pitch) */}
          <div className="relative min-h-[30rem] md:min-h-[34rem] lg:min-h-[38rem]">
            <motion.div
              animate={{ opacity: transitionVisible ? 0 : 1 }}
              transition={{ duration: transitionVisible ? 0 : 0.6 }}
              initial={false}
              aria-hidden={transitionVisible}
              className={transitionVisible ? 'pointer-events-none' : ''}
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
                showPlayerSplash={showPlayerSplash}
                playerSplashPoints={playerSplashPoints}
                onPlayerSplashComplete={() => setShowPlayerSplash(false)}
                onAnswer={actions.submitAnswer}
              />
            </motion.div>

            <AnimatePresence>
              {transitionVisible && (
                <RoundTransitionOverlay
                  title={`Question ${transitionQuestionNumber}`}
                  categoryName={transitionCategoryName}
                />
              )}
            </AnimatePresence>
          </div>

          {/* ─── Desktop standings sidebar ─── */}
          <div className="hidden lg:block">
            <div className="text-[10px] font-fun font-black uppercase tracking-[0.26em] text-white/45 px-1 mb-2">
              Standings
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
                    <AvatarDisplay
                      customization={player.avatarCustomization ?? { base: player.avatarUrl ?? undefined }}
                      size="sm"
                      shape="circle"
                      className="shrink-0 bg-transparent"
                    />

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
                <div className="relative">
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
              </motion.div>
            );
          })}
        </div>
      </div>

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

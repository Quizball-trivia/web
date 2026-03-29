'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { AnimatePresence, motion } from 'motion/react';
import { Crown, X } from 'lucide-react';

import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { QuitMatchModal } from '@/features/game/components/QuitMatchModal';
import { useRealtimeGameLogic } from '@/features/game/hooks/useRealtimeGameLogic';
import { PartyQuestionPanel } from '@/features/party/components/PartyQuestionPanel';
import { PartyRoundTransitionOverlay } from '@/features/party/components/PartyRoundTransitionOverlay';
import type { AnswerStateArray, Phase } from '@/lib/types/game.types';
import type { GameQuestion } from '@/lib/domain/gameQuestion';
import type { MatchParticipant } from '@/lib/realtime/socket.types';
import { resolveAvatarUrl } from '@/lib/avatars';
import { cn } from '@/lib/utils';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';

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

function avatarFallback(name: string): string {
  const trimmed = name.trim();
  return trimmed.slice(0, 2).toUpperCase() || 'QB';
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RealtimePartyQuizScreen({
  onQuit,
  onForfeit,
}: RealtimePartyQuizScreenProps) {
  const { state, actions } = useRealtimeGameLogic({ transitionDelayMs: 950 });
  const match = useRealtimeMatchStore((store) => store.match);
  const selfUserId = useRealtimeMatchStore((store) => store.selfUserId);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showPlayerSplash, setShowPlayerSplash] = useState(false);
  const [playerSplashPoints, setPlayerSplashPoints] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [preRoundRankingOrder, setPreRoundRankingOrder] = useState<string[]>([]);
  const splashQuestionRef = useRef<number | null>(null);

  const partyState = match?.partyState ?? null;
  const participants = match?.participants;
  const currentQuestion = match?.currentQuestion ?? null;
  const answerAck = match?.answerAck ?? null;
  const participantMap = useMemo(() => buildParticipantMap(participants ?? []), [participants]);

  // Snapshot the ranking order before each round for rank-shift calculation
  useEffect(() => {
    if (!partyState?.rankingOrder.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- Intentional stale closure: we capture the settled ranking order before each question change, not after. partyState.rankingOrder must not be a dependency to preserve the previous round's ranking.
    setPreRoundRankingOrder(partyState.rankingOrder);
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

  const question: GameQuestion | null = useMemo(() => {
    if (!currentQuestion) return null;
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

  const isTimerUrgent = state.showOptions && state.timeRemaining <= 3;
  // Always show the timer when we have a question — during reading phase show
  // the full value in a neutral state, during playing phase show the countdown.
  const hasQuestion = question !== null;
  const isReading = hasQuestion && !state.showOptions && !state.roundResolved;

  // ---------------------------------------------------------------------------
  // Pre-match / loading
  // ---------------------------------------------------------------------------

  if (!match || !partyState) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-[#0f1420]">
        {state.startCountdownActive ? (
          <div className="flex flex-col items-center gap-3">
            <div className="font-fun text-xs font-bold uppercase tracking-[0.28em] text-white/60">Quiz starts in</div>
            <div className="flex size-28 items-center justify-center rounded-full border-4 border-[#CE82FF]/70 bg-[#131F24] shadow-[0_0_40px_rgba(206,130,255,0.28)]">
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
    <div className="relative min-h-dvh overflow-hidden bg-[#0f1420] text-white">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(206,130,255,0.18),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(28,176,246,0.16),_transparent_36%)]" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }}
      />

      {/* Start countdown overlay */}
      <AnimatePresence>
        {state.startCountdownActive && (
          <motion.div
            key="party-countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-[#0f1420]/60 backdrop-blur-sm" />
            <motion.div
              key={`party-countdown-${state.countdownSeconds}`}
              initial={{ scale: 0.72, opacity: 0.45 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 340, damping: 22 }}
              className="relative flex flex-col items-center gap-3"
            >
              <div className="font-fun text-xs font-bold uppercase tracking-[0.28em] text-white/60">Quiz starts in</div>
              <div className="flex size-28 items-center justify-center rounded-full border-4 border-[#CE82FF]/70 bg-[#131F24] shadow-[0_0_48px_rgba(206,130,255,0.3)] sm:size-32">
                <span className="font-fun text-5xl font-black leading-none tabular-nums text-white sm:text-6xl">
                  {Math.max(1, state.countdownSeconds)}
                </span>
              </div>
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
            className="absolute left-1/2 top-4 z-30 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border border-white/10 bg-[#131F24]/95 px-4 py-3 shadow-2xl backdrop-blur"
          >
            <div className="text-center font-fun">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">Match Paused</div>
              <div className="mt-1 text-sm font-black text-white">Waiting for a player to reconnect</div>
              <div className="mt-1 text-xs font-bold text-[#CE82FF]">Resumes automatically in {pauseSeconds}s</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* Main content */}
      {/* ================================================================= */}
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-3 pb-20 pt-4 sm:px-5 lg:px-8 lg:pb-6">

        {/* ─── HUD Bar ─── */}
        <div className="mb-3 font-fun space-y-2.5">
          {/* Top row: round pill • timer (absolutely centered) • leave */}
          <div className="relative flex items-center justify-between px-1">
            {/* Round pill */}
            <div className="rounded-full bg-white/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.15em] text-white/60">
              Round {Math.min(questionNumber, totalQuestions)}/{totalQuestions}
            </div>

            {/* Center timer — absolutely positioned for true centering */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                className={cn(
                  'flex size-14 items-center justify-center rounded-full border-2 transition-all duration-200',
                  state.showOptions
                    ? isTimerUrgent
                      ? 'border-red-500/50 bg-red-500/10'
                      : 'border-white/15 bg-white/5'
                    : isReading
                      ? 'border-white/10 bg-white/[0.04]'
                      : 'border-white/10 bg-white/[0.03]',
                )}
              >
                <motion.span
                  className={cn(
                    'text-3xl font-black tabular-nums transition-all duration-200',
                    state.showOptions
                      ? isTimerUrgent ? 'text-red-500' : 'text-white'
                      : isReading ? 'text-white/30' : 'text-white/20 opacity-0',
                  )}
                  animate={isTimerUrgent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={isTimerUrgent ? { duration: 0.5, repeat: Infinity } : {}}
                >
                  {state.timeRemaining}
                </motion.span>
              </div>
            </div>

            {/* Right side: leave button only */}
            <button
              onClick={() => setShowQuitModal(true)}
              className="shrink-0 rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
              title="Leave match"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Progress segments */}
          <div className="flex gap-1.5 px-1">
            {Array.from({ length: totalQuestions }).map((_, i) => {
              const qNum = i + 1;
              const isComplete = qNum < questionNumber;
              const isCurrent = qNum === questionNumber;
              return (
                <div
                  key={i}
                  className="h-2 flex-1 rounded-full overflow-hidden bg-white/10"
                >
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      isComplete ? 'w-full' : isCurrent ? 'w-full' : 'w-0',
                    )}
                    style={
                      isComplete
                        ? { background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 100%)' }
                        : isCurrent
                          ? { background: '#1CB0F6' }
                          : undefined
                    }
                  >
                    {isComplete && (
                      <div className="h-1/2 rounded-full bg-gradient-to-b from-white/30 to-transparent" />
                    )}
                    {isCurrent && (
                      <motion.div
                        className="h-full rounded-full bg-white/25"
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── 2-column layout: question + standings ─── */}
        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          {/* Question panel */}
          <div className="relative">
            <PartyQuestionPanel
              phase={uiPhase}
              question={question}
              showOptions={state.showOptions}
              selectedAnswer={state.selectedAnswer}
              answerStates={answerStates}
              showPlayerSplash={showPlayerSplash}
              playerSplashPoints={playerSplashPoints}
              onPlayerSplashComplete={() => setShowPlayerSplash(false)}
              onAnswer={actions.submitAnswer}
            />

            <PartyRoundTransitionOverlay
              visible={transitionVisible}
              questionNumber={transitionQuestionNumber}
              totalQuestions={totalQuestions}
              categoryName={transitionCategoryName}
            />
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
                return (
                  <motion.div
                    key={player.userId}
                    layout
                    layoutId={`standing-${player.userId}`}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors',
                      player.isSelf
                        ? 'bg-[#1CB0F6]/10 border border-[#1CB0F6]/25'
                        : player.isLeader
                          ? 'bg-[#FCD200]/8 border border-[#FCD200]/20'
                          : 'bg-white/[0.03] border border-transparent',
                    )}
                  >
                    {/* Rank */}
                    <span className="w-5 text-center text-xs font-black tabular-nums text-white/40">
                      {player.rank}
                    </span>

                    {/* Avatar */}
                    <Avatar className="size-8 border border-white/15 shrink-0">
                      <AvatarImage
                        src={resolveAvatarUrl(player.avatarUrl, `party-${player.userId}`, 64)}
                        alt={player.username}
                      />
                      <AvatarFallback className="bg-[#243B44] text-[10px] font-black text-white">
                        {avatarFallback(player.username)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name + badges */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-bold text-white">{player.username}</span>
                        {player.isSelf && (
                          <span className="shrink-0 rounded bg-[#1CB0F6]/20 px-1 py-0.5 text-[8px] font-black uppercase text-[#A9E6FF]">
                            You
                          </span>
                        )}
                        {player.isLeader && <Crown className="size-3.5 shrink-0 text-[#FCD200]" />}
                      </div>
                    </div>

                    {/* Points */}
                    <span className="text-sm font-black tabular-nums text-white/80 shrink-0">
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
                          className="text-xs font-black text-[#58CC02] shrink-0"
                        >
                          +{player.roundDelta}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Status dot */}
                    <span
                      className={cn(
                        'size-2.5 rounded-full shrink-0',
                        dotStatus === 'correct' && 'bg-[#58CC02]',
                        dotStatus === 'answering' && 'bg-[#1CB0F6] animate-pulse',
                        dotStatus === 'resolved' && 'bg-[#CE82FF] animate-pulse',
                        dotStatus === 'idle' && 'bg-white/20',
                      )}
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Mobile bottom standings bar ─── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-10 bg-gradient-to-t from-[#0f1420] via-[#0f1420]/95 to-transparent pt-6 pb-3 px-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {standings.map((player) => {
            const dotStatus = getStandingDotStatus({
              roundResolved: state.roundResolved,
              answered: player.answered,
              showOptions: state.showOptions,
            });
            const hasAnswered = dotStatus === 'correct';
            return (
              <motion.div
                key={player.userId}
                layout
                layoutId={`mobile-standing-${player.userId}`}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1.5 border transition-colors',
                  player.isSelf
                    ? 'bg-[#1CB0F6]/10 border-[#1CB0F6]/25'
                    : hasAnswered
                      ? 'bg-[#58CC02]/8 border-[#58CC02]/25'
                      : 'bg-white/5 border-white/10',
                )}
              >
                <span className="text-[10px] font-black tabular-nums text-white/40">
                  #{player.rank}
                </span>
                <div className="relative">
                  <Avatar className="size-6 border border-white/15 shrink-0">
                    <AvatarImage
                      src={resolveAvatarUrl(player.avatarUrl, `party-${player.userId}`, 48)}
                      alt={player.username}
                    />
                    <AvatarFallback className="bg-[#243B44] text-[8px] font-black text-white">
                      {avatarFallback(player.username)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Answered check overlay on avatar */}
                  {hasAnswered && !player.isSelf && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full bg-[#58CC02] ring-2 ring-[#0f1420]"
                    >
                      <svg viewBox="0 0 12 12" className="size-2 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    </motion.div>
                  )}
                </div>
                <span className="text-xs font-bold text-white truncate max-w-[60px]">
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

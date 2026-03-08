'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, ChevronDown, ChevronUp, Crown, Flag, LoaderCircle, Users } from 'lucide-react';

import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { QuitMatchModal } from '@/features/game/components/QuitMatchModal';
import { AnswerCard } from '@/features/game/components/AnswerCard';
import { ArenaScoreSplash } from '@/features/game/components/ArenaScoreSplash';
import { QuestionArena } from '@/features/game/components/QuestionArena';
import { useRealtimeGameLogic } from '@/features/game/hooks/useRealtimeGameLogic';
import type { GameQuestion } from '@/lib/domain/gameQuestion';
import { resolveAvatarUrl } from '@/lib/avatars';
import { cn } from '@/lib/utils';
import type { MatchParticipant } from '@/lib/realtime/socket.types';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import type { AnswerStateArray, Phase } from '@/features/possession/types/possession.types';
import { ANSWER_LABELS } from '@/features/possession/types/possession.types';

interface RealtimePartyQuizScreenProps {
  onQuit: () => void;
  onForfeit: () => void;
}

function getDifficultyLabel(d?: string): string {
  if (d === 'hard') return 'Hard';
  if (d === 'medium') return 'Medium';
  return 'Easy';
}

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

function formatAverageMs(value: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  return `${(value / 1000).toFixed(2)}s`;
}

function buildParticipantMap(participants: MatchParticipant[]): Map<string, MatchParticipant> {
  return new Map(participants.map((participant) => [participant.userId, participant]));
}

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
  const preRoundRankingRef = useRef<string[]>([]);
  const splashQuestionRef = useRef<number | null>(null);

  const partyState = match?.partyState ?? null;
  const participants = match?.participants ?? [];
  const currentQuestion = match?.currentQuestion ?? null;
  const answerAck = match?.answerAck ?? null;
  const participantMap = useMemo(() => buildParticipantMap(participants), [participants]);

  useEffect(() => {
    if (!partyState?.rankingOrder.length) return;
    preRoundRankingRef.current = partyState.rankingOrder;
  }, [currentQuestion?.qIndex, partyState?.rankingOrder]);

  useEffect(() => {
    if (!state.matchPaused || !state.pauseUntil) return;
    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => clearInterval(intervalId);
  }, [state.matchPaused, state.pauseUntil]);

  useEffect(() => {
    if (state.selectedAnswer === null || typeof state.correctIndex !== 'number') return;
    if (state.selectedAnswerQIndex == null) return;
    if (splashQuestionRef.current === state.selectedAnswerQIndex) return;
    if (state.selectedAnswer !== state.correctIndex) return;

    splashQuestionRef.current = state.selectedAnswerQIndex;
    setPlayerSplashPoints(Math.max(0, Math.min(100, state.timeRemaining * 10)));
    setShowPlayerSplash(true);
  }, [state.correctIndex, state.selectedAnswer, state.selectedAnswerQIndex, state.timeRemaining]);

  useEffect(() => {
    if (!answerAck || !answerAck.isCorrect) return;
    if (splashQuestionRef.current !== answerAck.qIndex) return;
    setPlayerSplashPoints(answerAck.pointsEarned);
  }, [answerAck]);

  useEffect(() => {
    if (currentQuestion?.qIndex == null) {
      splashQuestionRef.current = null;
    }
  }, [currentQuestion?.qIndex]);

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
  const answeredCount = partyState?.players.filter((player) => player.answered).length ?? 0;
  const rankingOrder = (state.roundResult?.rankingOrder?.length
    ? state.roundResult.rankingOrder
    : partyState?.rankingOrder) ?? [];

  const standings = useMemo(() => {
    if (!partyState) return [];

    const previousRanks = new Map(
      preRoundRankingRef.current.map((userId, index) => [userId, index + 1]),
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
          ...player,
          username: participant?.username ?? 'Player',
          avatarUrl: participant?.avatarUrl ?? null,
          isSelf: player.userId === selfUserId,
          isLeader: player.userId === partyState.leaderUserId,
          rankShift,
          roundDelta,
        };
      });
  }, [participantMap, partyState, selfUserId, state.roundResult?.players]);

  const leader = standings.find((player) => player.isLeader) ?? standings[0] ?? null;
  const localPlayer = standings.find((player) => player.isSelf) ?? null;

  if (!match || !partyState) {
    return (
      <div className="min-h-dvh w-full bg-[#0f1420] flex items-center justify-center">
        {state.startCountdownActive ? (
          <div className="flex flex-col items-center gap-3">
            <div className="text-white/60 text-xs uppercase tracking-[0.28em] font-fun font-bold">Quiz starts in</div>
            <div className="size-28 rounded-full border-4 border-[#CE82FF]/70 bg-[#131F24] flex items-center justify-center shadow-[0_0_40px_rgba(206,130,255,0.28)]">
              <span className="text-5xl leading-none font-fun font-black text-white tabular-nums">
                {Math.max(1, state.countdownSeconds)}
              </span>
            </div>
          </div>
        ) : (
          <LoadingScreen fullScreen={false} className="min-h-0 h-auto" />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0f1420] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(206,130,255,0.18),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(28,176,246,0.16),_transparent_36%)]" />
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />

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
              <div className="text-white/60 text-xs uppercase tracking-[0.28em] font-fun font-bold">Quiz starts in</div>
              <div className="size-32 rounded-full border-4 border-[#CE82FF]/70 bg-[#131F24] flex items-center justify-center shadow-[0_0_48px_rgba(206,130,255,0.3)]">
                <span className="text-6xl leading-none font-fun font-black text-white tabular-nums">
                  {Math.max(1, state.countdownSeconds)}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.matchPaused && pauseSeconds > 0 && (
          <motion.div
            key="party-pause"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="absolute top-4 left-1/2 z-30 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#131F24]/95 px-4 py-3 shadow-2xl backdrop-blur"
          >
            <div className="text-center font-fun">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">Match Paused</div>
              <div className="mt-1 text-sm font-black text-white">Waiting for a player to reconnect</div>
              <div className="mt-1 text-xs font-bold text-[#CE82FF]">Resumes automatically in {pauseSeconds}s</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-3 pb-6 pt-4 sm:px-5 lg:px-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-white/10 bg-[#131F24]/85 px-3 py-2 font-fun shadow-lg backdrop-blur">
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/50">Party Quiz</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-black">
                <Users className="size-4 text-[#CE82FF]" />
                <span>{participants.length} players</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#131F24]/85 px-3 py-2 font-fun shadow-lg backdrop-blur">
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/50">Round</div>
              <div className="mt-1 text-sm font-black">
                {Math.min(questionNumber, totalQuestions)} / {totalQuestions}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#131F24]/85 px-3 py-2 font-fun shadow-lg backdrop-blur">
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/50">Answered</div>
              <div className="mt-1 text-sm font-black">
                {state.roundResolved ? 'Scoring...' : `${answeredCount}/${participants.length}`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowQuitModal(true)}
            className="rounded-2xl border-2 border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-black font-fun text-red-200 transition-colors hover:bg-red-500/20"
          >
            Leave
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_340px]">
          <div className="order-2 lg:order-1">
            <div className="rounded-[28px] border border-white/10 bg-[#131F24]/88 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-fun font-black uppercase tracking-[0.26em] text-white/45">
                    Shared Question Flow
                  </div>
                  <div className="mt-1 text-sm font-fun font-bold text-white/80">
                    {state.roundResolved
                      ? 'Standings are updating for the next question.'
                      : state.showOptions
                        ? 'Everyone is answering the same question live.'
                        : 'Question reveal in progress.'}
                  </div>
                </div>

                <div className={cn(
                  'rounded-2xl border px-4 py-2 text-right font-fun shadow-lg',
                  state.showOptions
                    ? 'border-[#1CB0F6]/40 bg-[#1CB0F6]/12'
                    : 'border-white/10 bg-white/5',
                )}>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">Timer</div>
                  <div className="mt-1 text-2xl font-black tabular-nums text-white">
                    {state.showOptions ? state.timeRemaining : '--'}
                  </div>
                </div>
              </div>

              <div className="relative mt-5">
                <QuestionArena
                  question={question?.prompt ?? 'Loading question...'}
                  category={question?.categoryName ?? 'Football'}
                  categoryIcon="⚽"
                  difficulty={getDifficultyLabel(question?.difficulty)}
                />

                <div className="relative h-0">
                  <ArenaScoreSplash
                    show={showPlayerSplash}
                    points={playerSplashPoints}
                    side="left"
                    onComplete={() => setShowPlayerSplash(false)}
                  />
                </div>

                <motion.div
                  key={question?.id ?? 'party-answer-grid'}
                  className={cn(
                    'mt-4 grid min-h-[15rem] grid-cols-2 gap-3',
                    state.showOptions ? 'pointer-events-auto' : 'pointer-events-none',
                  )}
                  initial={false}
                  animate={{ opacity: state.showOptions ? 1 : 0, y: state.showOptions ? 0 : 8 }}
                  transition={{ duration: 0.25 }}
                  aria-hidden={!state.showOptions}
                >
                  {(question?.options ?? []).map((option, index) => (
                    <motion.div
                      key={`${question?.id ?? 'option'}-${index}`}
                      initial={false}
                      animate={{
                        opacity: state.showOptions ? 1 : 0.9,
                        y: state.showOptions ? 0 : 6,
                        scale: state.showOptions ? 1 : 0.98,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 320,
                        damping: 24,
                        mass: 0.75,
                        delay: state.showOptions ? index * 0.05 : 0,
                      }}
                    >
                      <AnswerCard
                        label={ANSWER_LABELS[index]}
                        text={option}
                        index={index}
                        isSelected={state.selectedAnswer === index}
                        state={answerStates[index]}
                        onClick={() => {
                          if (!state.showOptions || uiPhase !== 'playing') return;
                          actions.submitAnswer(index);
                        }}
                        disabled={!state.showOptions || uiPhase !== 'playing'}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-fun">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-white/45">Leader</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Crown className="size-4 text-[#FCD200]" />
                    <span className="text-sm font-black text-white">
                      {leader ? `${leader.username} • ${leader.totalPoints} pts` : 'Waiting for scores'}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-fun">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-white/45">Your Pace</div>
                  <div className="mt-1 text-sm font-black text-white">
                    {localPlayer
                      ? `#${localPlayer.rank} • ${localPlayer.totalPoints} pts • avg ${formatAverageMs(localPlayer.avgTimeMs)}`
                      : 'Waiting for local score'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="rounded-[28px] border border-white/10 bg-[#131F24]/90 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-fun font-black uppercase tracking-[0.26em] text-white/45">
                    Live Standings
                  </div>
                  <div className="mt-1 text-sm font-fun font-bold text-white/75">
                    Rank movement and score swings update after every question.
                  </div>
                </div>
                <div className="rounded-full bg-[#CE82FF]/15 px-3 py-1 text-[10px] font-fun font-black uppercase tracking-[0.24em] text-[#E6C8FF]">
                  {rankingOrder.length} tracked
                </div>
              </div>

              <div className="mt-4 flex gap-3 overflow-x-auto pb-1 lg:hidden">
                {standings.map((player) => (
                  <motion.div
                    key={`party-rail-${player.userId}`}
                    layout
                    className={cn(
                      'min-w-[210px] rounded-3xl border px-4 py-4 font-fun shadow-lg',
                      player.isSelf
                        ? 'border-[#1CB0F6]/50 bg-[#1CB0F6]/14'
                        : player.isLeader
                          ? 'border-[#FCD200]/40 bg-[#FCD200]/10'
                          : 'border-white/10 bg-white/[0.04]',
                    )}
                  >
                    <StandingsCardContent
                      userId={player.userId}
                      username={player.username}
                      avatarUrl={player.avatarUrl}
                      rank={player.rank}
                      totalPoints={player.totalPoints}
                      answered={player.answered}
                      isLeader={player.isLeader}
                      isSelf={player.isSelf}
                      rankShift={player.rankShift}
                      roundDelta={player.roundDelta}
                    />
                  </motion.div>
                ))}
              </div>

              <div className="mt-4 hidden gap-3 lg:grid">
                {standings.map((player) => (
                  <motion.div
                    key={`party-grid-${player.userId}`}
                    layout
                    className={cn(
                      'rounded-3xl border px-4 py-4 font-fun shadow-lg transition-colors',
                      player.isSelf
                        ? 'border-[#1CB0F6]/50 bg-[#1CB0F6]/14'
                        : player.isLeader
                          ? 'border-[#FCD200]/40 bg-[#FCD200]/10'
                          : 'border-white/10 bg-white/[0.04]',
                    )}
                  >
                    <StandingsCardContent
                      userId={player.userId}
                      username={player.username}
                      avatarUrl={player.avatarUrl}
                      rank={player.rank}
                      totalPoints={player.totalPoints}
                      answered={player.answered}
                      isLeader={player.isLeader}
                      isSelf={player.isSelf}
                      rankShift={player.rankShift}
                      roundDelta={player.roundDelta}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

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

interface StandingsCardContentProps {
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

function StandingsCardContent({
  userId,
  username,
  avatarUrl,
  rank,
  totalPoints,
  answered,
  isLeader,
  isSelf,
  rankShift,
  roundDelta,
}: StandingsCardContentProps) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-12 border-2 border-white/15 shadow-md">
        <AvatarImage src={resolveAvatarUrl(avatarUrl, `party-${userId}`, 128)} alt={username} />
        <AvatarFallback className="bg-[#243B44] text-white font-black">
          {avatarFallback(username)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
            #{rank}
          </span>
          {isLeader ? <Crown className="size-4 text-[#FCD200]" /> : null}
          {isSelf ? (
            <span className="rounded-full bg-[#1CB0F6]/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#A9E6FF]">
              You
            </span>
          ) : null}
        </div>
        <div className="mt-1 truncate text-sm font-black text-white">{username}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/8 px-2.5 py-1 text-xs font-bold text-white/80">
            {totalPoints} pts
          </span>
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
            answered
              ? 'bg-[#58CC02]/14 text-[#9CFF5A]'
              : 'bg-white/8 text-white/60',
          )}>
            {answered ? <CheckCircle2 className="size-3.5" /> : <LoaderCircle className="size-3.5 animate-spin" />}
            {answered ? 'Answered' : 'Thinking'}
          </span>
        </div>
      </div>

      <div className="text-right font-fun">
        <div className="flex items-center justify-end gap-1 text-xs font-black">
          {rankShift > 0 ? <ChevronUp className="size-4 text-[#58CC02]" /> : null}
          {rankShift < 0 ? <ChevronDown className="size-4 text-[#FF9600]" /> : null}
          <span className={cn(
            rankShift > 0 ? 'text-[#9CFF5A]' : rankShift < 0 ? 'text-[#FFB84D]' : 'text-white/35',
          )}>
            {rankShift > 0 ? `+${rankShift}` : rankShift < 0 ? `${rankShift}` : '0'}
          </span>
        </div>
        <div className={cn(
          'mt-2 rounded-full px-2.5 py-1 text-xs font-black',
          roundDelta == null
            ? 'bg-white/6 text-white/35'
            : roundDelta > 0
              ? 'bg-[#58CC02]/14 text-[#9CFF5A]'
              : 'bg-white/8 text-white/65',
        )}>
          {roundDelta == null ? 'waiting' : roundDelta > 0 ? `+${roundDelta}` : '+0'}
        </div>
      </div>
    </div>
  );
}

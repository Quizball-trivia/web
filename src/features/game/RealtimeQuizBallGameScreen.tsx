"use client";

import { useEffect, useState } from 'react';

import { motion } from 'motion/react';

import { MatchScoreHUD } from '@/features/game/components/MatchScoreHUD';
import { QuestionArena } from '@/features/game/components/QuestionArena';
import { AnswerCard } from '@/features/game/components/AnswerCard';
import { QuitMatchModal } from '@/features/game/components/QuitMatchModal';
import { useRealtimeGameLogic } from '@/features/game/hooks/useRealtimeGameLogic';

interface RealtimeQuizBallGameScreenProps {
  playerAvatar: string;
  playerUsername: string;
  opponentAvatar: string;
  opponentUsername: string;
  onQuit: () => void;
}

export function RealtimeQuizBallGameScreen({
  playerAvatar,
  playerUsername,
  opponentAvatar,
  opponentUsername,
  onQuit,
}: RealtimeQuizBallGameScreenProps) {
  const { state, actions } = useRealtimeGameLogic();
  const [showQuitModal, setShowQuitModal] = useState(false);

  const {
    currentQuestion,
    timeRemaining,
    selectedAnswer,
    showResult,
    isAnswered,
    correctIndex,
    opponentAnswered,
    myRoundResult,
    opponentRoundResult,
    playerScore,
    opponentScore,
    matchPaused,
    pauseUntil,
  } = state;

  const [pauseCountdown, setPauseCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!matchPaused || !pauseUntil) {
      setPauseCountdown(null);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, pauseUntil - Date.now());
      setPauseCountdown(Math.ceil(remaining / 1000));
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [matchPaused, pauseUntil]);

  if (!currentQuestion) {
    return (
      <div className="min-h-dvh w-full bg-[#0f1420] flex items-center justify-center">
        <div className="text-sm text-white/40 font-fun font-bold">Waiting for question...</div>
      </div>
    );
  }

  const categoryName = currentQuestion.question.categoryName ?? 'General';
  const categoryIcon = '\u26BD';
  const difficultyLabel = (currentQuestion.question.difficulty ?? 'Medium').toString();
  const difficultyDisplay = difficultyLabel.charAt(0).toUpperCase() + difficultyLabel.slice(1);

  const isCorrectAnswer = typeof correctIndex === 'number' && selectedAnswer === correctIndex;
  const isWrongAnswer = showResult && typeof correctIndex === 'number' && selectedAnswer !== null && selectedAnswer !== correctIndex;
  const myResultKnown = myRoundResult != null;
  const opponentResultKnown = opponentRoundResult != null;
  const opponentSelectedLabel =
    opponentRoundResult?.selectedIndex != null
      ? String.fromCharCode(65 + opponentRoundResult.selectedIndex)
      : null;

  return (
    <div className="relative min-h-dvh w-full bg-[#0f1420]">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col p-4">
        <MatchScoreHUD
          playerScore={playerScore}
          opponentScore={opponentScore}
          playerName={playerUsername}
          opponentName={opponentUsername}
          playerAvatar={playerAvatar}
          opponentAvatar={opponentAvatar}
          timeRemaining={timeRemaining}
          maxTime={6}
          roundCurrent={currentQuestion.qIndex + 1}
          roundTotal={currentQuestion.total}
          playerAnswered={isAnswered}
          opponentAnswered={opponentAnswered}
          onQuit={() => setShowQuitModal(true)}
        />

        <div className="flex-1 flex flex-col justify-center gap-6 mb-12">
          <QuestionArena
            question={currentQuestion.question.prompt}
            category={categoryName}
            categoryIcon={categoryIcon}
            difficulty={difficultyDisplay}
          />

          {showResult && !matchPaused && (
            <div className="w-full max-w-2xl mx-auto -mt-2">
              <div className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/70">
                {opponentSelectedLabel
                  ? `Opponent chose option ${opponentSelectedLabel}`
                  : 'Opponent did not submit an answer in time'}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 w-full max-w-2xl mx-auto">
            {currentQuestion.question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = typeof correctIndex === 'number' && index === correctIndex;
              const opponentPicked = showResult && opponentRoundResult?.selectedIndex === index;
              const opponentPickCorrect = opponentPicked
                ? Boolean(opponentRoundResult?.isCorrect)
                : undefined;

              let uiState: 'default' | 'correct' | 'wrong' | 'disabled' = 'default';

              if (showResult) {
                if (isCorrect) uiState = 'correct';
                else if (isSelected) uiState = 'wrong';
                else uiState = 'disabled';
              } else if (isAnswered && !isSelected) {
                uiState = 'disabled';
              }

              return (
                <AnswerCard
                  key={index}
                  label={String.fromCharCode(65 + index)}
                  text={option}
                  index={index}
                  isSelected={isSelected}
                  state={uiState}
                  opponentPicked={opponentPicked}
                  opponentPickCorrect={opponentPickCorrect}
                  disabled={isAnswered || matchPaused}
                  onClick={() => actions.submitAnswer(index)}
                />
              );
            })}
          </div>

          {showResult && !matchPaused && (
            <div className="w-full max-w-2xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div
                  className={`rounded-xl border px-3 py-2 text-sm font-bold ${
                    !myResultKnown
                      ? 'bg-white/5 border-white/15 text-white/60'
                      : myRoundResult.isCorrect
                      ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300'
                      : 'bg-red-500/10 border-red-500/35 text-red-300'
                  }`}
                >
                  You:{' '}
                  {!myResultKnown
                    ? 'Awaiting result...'
                    : myRoundResult.isCorrect
                    ? `Correct (+${myRoundResult.pointsEarned})`
                    : 'Incorrect'}
                </div>
                <div
                  className={`rounded-xl border px-3 py-2 text-sm font-bold ${
                    !opponentResultKnown
                      ? 'bg-white/5 border-white/15 text-white/60'
                      : opponentRoundResult.isCorrect
                      ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300'
                      : 'bg-red-500/10 border-red-500/35 text-red-300'
                  }`}
                >
                  Opponent:{' '}
                  {!opponentResultKnown
                    ? 'Awaiting result...'
                    : opponentRoundResult.isCorrect
                    ? `Correct (+${opponentRoundResult.pointsEarned})`
                    : 'Incorrect'}
                </div>
              </div>
            </div>
          )}

          {/* Result feedback banner */}
          <div className="text-center h-8">
            {showResult && !matchPaused && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-fun font-bold text-sm"
              >
                {isCorrectAnswer && (
                  <span className="text-emerald-400">Correct!</span>
                )}
                {isWrongAnswer && (
                  <span className="text-red-400">Wrong answer</span>
                )}
                {!isCorrectAnswer && !isWrongAnswer && (
                  <span className="text-white/40">Time&apos;s up!</span>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Match pause overlay */}
      {matchPaused && (
        <div className="absolute inset-0 bg-[#0f1420]/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a1f2e] border-b-4 border-b-white/10 rounded-3xl p-6 shadow-lg text-center max-w-sm w-full mx-4 font-fun">
            <div className="text-xl font-black text-white mb-2">Opponent disconnected</div>
            <p className="text-sm text-white/50 font-semibold mb-4">
              We&apos;ll resume if they return within {pauseCountdown ?? 30}s.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 text-sm font-bold">
              Match paused
            </div>
          </div>
        </div>
      )}

      <QuitMatchModal
        open={showQuitModal}
        onOpenChange={setShowQuitModal}
        onConfirm={() => {
          setShowQuitModal(false);
          onQuit();
        }}
      />
    </div>
  );
}

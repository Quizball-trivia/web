"use client";

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';

import { MatchScoreHUD } from '@/features/game/components/MatchScoreHUD';
import { QuestionArena } from '@/features/game/components/QuestionArena';
import { AnswerCard } from '@/features/game/components/AnswerCard';
import { QuitMatchModal } from '@/features/game/components/QuitMatchModal';
import { ArenaScoreSplash } from '@/features/game/components/ArenaScoreSplash';
import { useRealtimeGameLogic } from '@/features/game/hooks/useRealtimeGameLogic';

interface RealtimeQuizBallGameScreenProps {
  playerAvatar: string;
  playerUsername: string;
  opponentAvatar: string;
  opponentUsername: string;
  onQuit: () => void;
  onForfeit: () => void;
}

export function RealtimeQuizBallGameScreen({
  playerAvatar,
  playerUsername,
  opponentAvatar,
  opponentUsername,
  onQuit,
  onForfeit,
}: RealtimeQuizBallGameScreenProps) {
  const { state, actions } = useRealtimeGameLogic();
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [showPlayerSplash, setShowPlayerSplash] = useState(false);
  const [showOpponentSplash, setShowOpponentSplash] = useState(false);
  const [playerPoints, setPlayerPoints] = useState(0);
  const [opponentPoints, setOpponentPoints] = useState(0);

  const {
    currentQuestion,
    timeRemaining,
    selectedAnswer,
    showResult,
    roundResolved,
    isAnswered,
    correctIndex,
    opponentAnswered,
    opponentRoundResult,
    playerScore,
    opponentScore,
    matchPaused,
    pauseUntil,
    questionPhase,
    showOptions,
  } = state;

  // Watch for answer acknowledgement to show player splash
  const match = useRealtimeMatchStore((state) => state.match);
  const answerAck = match?.answerAck;
  const opponentRecentPoints = match?.opponentRecentPoints ?? 0;

  // Reset splashes when question changes
  useEffect(() => {
    const resetTimer = setTimeout(() => {
      setShowPlayerSplash(false);
      setShowOpponentSplash(false);
    }, 0);

    return () => clearTimeout(resetTimer);
  }, [currentQuestion?.qIndex]);

  useEffect(() => {
    if (answerAck?.pointsEarned !== undefined && answerAck?.qIndex === currentQuestion?.qIndex) {
      const splashTimer = setTimeout(() => {
        setPlayerPoints(answerAck.pointsEarned);
        setShowPlayerSplash(true);
      }, 0);

      return () => clearTimeout(splashTimer);
    }
  }, [answerAck, currentQuestion?.qIndex]);

  // Watch for opponent scoring
  useEffect(() => {
    if (opponentRecentPoints > 0 && opponentAnswered) {
      const splashTimer = setTimeout(() => {
        setOpponentPoints(opponentRecentPoints);
        setShowOpponentSplash(true);
      }, 0);

      return () => clearTimeout(splashTimer);
    }
  }, [opponentRecentPoints, opponentAnswered]);

  useEffect(() => {
    if (!matchPaused || !pauseUntil) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [matchPaused, pauseUntil]);

  const pauseCountdown =
    matchPaused && pauseUntil ? Math.max(0, Math.ceil((pauseUntil - now) / 1000)) : null;
  const pauseCountdownLabel =
    typeof pauseCountdown === 'number' ? `${pauseCountdown}s` : '…';

  // Debug logging for question rendering
  useEffect(() => {
    if (currentQuestion) {
      console.log('🎯 Rendering question:', {
        qIndex: currentQuestion.qIndex,
        questionId: currentQuestion.question.id,
        prompt: currentQuestion.question.prompt,
        promptType: typeof currentQuestion.question.prompt,
        promptLength: currentQuestion.question.prompt?.length,
        promptPreview: currentQuestion.question.prompt?.substring(0, 100),
        options: currentQuestion.question.options,
        optionsCount: currentQuestion.question.options?.length,
        categoryName: currentQuestion.question.categoryName,
        difficulty: currentQuestion.question.difficulty,
      });
    }
  }, [currentQuestion]);

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

  const hasAnswerAckForCurrentQuestion = Boolean(
    answerAck && answerAck.qIndex === currentQuestion.qIndex
  );
  const bothPlayersAnswered = Boolean(
    hasAnswerAckForCurrentQuestion && (answerAck?.oppAnswered || opponentAnswered)
  );
  const waitingForOpponent =
    hasAnswerAckForCurrentQuestion && !bothPlayersAnswered && !roundResolved;
  const shouldRevealResults = roundResolved && typeof correctIndex === 'number';
  const isCorrectAnswer = shouldRevealResults && typeof correctIndex === 'number' && selectedAnswer === correctIndex;
  const isWrongAnswer =
    shouldRevealResults &&
    typeof correctIndex === 'number' &&
    selectedAnswer !== null &&
    selectedAnswer !== correctIndex;

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
          timeRemaining={questionPhase === 'playing' ? timeRemaining : null}
          roundCurrent={currentQuestion.qIndex + 1}
          roundTotal={currentQuestion.total}
          playerAnswered={isAnswered}
          opponentAnswered={opponentAnswered}
          opponentRecentPoints={opponentRecentPoints}
          onQuit={() => setShowQuitModal(true)}
        />

        <div className="flex-1 flex flex-col justify-center gap-6 mb-12 relative">
          {/* Question with slide-in animation */}
          <motion.div
            key={`question-${currentQuestion.qIndex}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <QuestionArena
              question={currentQuestion.question.prompt}
              category={categoryName}
              categoryIcon={categoryIcon}
              difficulty={difficultyDisplay}
            />
          </motion.div>

          {/* Question reveal phase indicator */}
          {questionPhase === 'reveal' && !matchPaused && (
            <div className="w-full max-w-2xl mx-auto -mt-2 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-blue-300 font-fun font-bold text-sm"
              >
                <span className="inline-block animate-pulse">⚡</span> Get ready...
              </motion.div>
            </div>
          )}

          {/* Arena score splashes */}
          <ArenaScoreSplash
            show={showPlayerSplash}
            points={playerPoints}
            side="left"
            onComplete={() => setShowPlayerSplash(false)}
          />
          <ArenaScoreSplash
            show={showOpponentSplash}
            points={opponentPoints}
            side="right"
            onComplete={() => setShowOpponentSplash(false)}
          />

          {/* Answer cards */}
          {showOptions && (
            <motion.div
              key={`options-${currentQuestion.qIndex}`}
              className="grid grid-cols-2 auto-rows-[104px] sm:auto-rows-[112px] gap-3 w-full max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.2, 0.9, 0.3, 1] }}
            >
              {currentQuestion.question.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = typeof correctIndex === 'number' && index === correctIndex;
                const opponentPicked = shouldRevealResults && opponentRoundResult?.selectedIndex === index;
                // Only show opponent correctness if player has answered
                const opponentPickCorrect = opponentPicked && isAnswered
                  ? Boolean(opponentRoundResult?.isCorrect)
                  : undefined;

                let uiState: 'default' | 'correct' | 'wrong' | 'disabled' = 'default';

                if (shouldRevealResults) {
                  if (isCorrect) uiState = 'correct';
                  else if (isSelected) uiState = 'wrong';
                  else uiState = 'disabled';
                } else if (isAnswered && !isSelected) {
                  uiState = 'disabled';
                }
                const shouldFadeOut = shouldRevealResults && uiState !== 'correct';

                return (
                  <motion.div
                    key={`${currentQuestion.qIndex}-${index}`}
                    className="h-full"
                    initial={{ opacity: 0, y: 16, scale: 0.94, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    transition={{
                      type: 'spring',
                      stiffness: 260,
                      damping: 20,
                      mass: 0.7,
                      delay: index * 0.065,
                      filter: { duration: 0.22 },
                    }}
                  >
                    <AnswerCard
                      label={String.fromCharCode(65 + index)}
                      text={option}
                      index={index}
                      isSelected={isSelected}
                      state={uiState}
                      opponentPicked={opponentPicked}
                      opponentPickCorrect={opponentPickCorrect}
                      fadeOut={shouldFadeOut}
                      disabled={isAnswered || matchPaused}
                      onClick={() => actions.submitAnswer(index)}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Result feedback banner */}
          <div className="text-center h-8">
            {(showResult || waitingForOpponent || shouldRevealResults) && !matchPaused && (
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
                {waitingForOpponent && (
                  <span className="text-white/40">Waiting for opponent...</span>
                )}
                {shouldRevealResults && !isCorrectAnswer && !isWrongAnswer && (
                  <span className="text-white/40">Time&apos;s up!</span>
                )}
              </motion.div>
            )}
          </div>

          {/* Round transition handled by card animations */}
        </div>
      </div>

      {/* Match pause overlay */}
      {matchPaused && (
        <div className="absolute inset-0 bg-[#0f1420]/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a1f2e] border-b-4 border-b-white/10 rounded-3xl p-6 shadow-lg text-center max-w-sm w-full mx-4 font-fun">
            <div className="text-xl font-black text-white mb-2">Opponent disconnected</div>
            <p className="text-sm text-white/50 font-semibold mb-4">
              We&apos;ll resume if they return within {pauseCountdownLabel}.
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
        description="Leave temporarily and rejoin before the timer ends, or forfeit now."
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

import { useState } from 'react';

import type { GameQuestion } from '@/lib/domain';
import { motion } from 'motion/react';

import { MatchScoreHUD } from '@/features/game/components/MatchScoreHUD';
import { QuestionArena } from '@/features/game/components/QuestionArena';
import { AnswerCard } from '@/features/game/components/AnswerCard';
import { MatchToastContainer } from '@/features/game/components/MatchToast';
import { QuitMatchModal } from '@/features/game/components/QuitMatchModal';
import { useGameLogic } from '@/features/game/hooks/useGameLogic';

interface QuizBallGameScreenProps {
  questions: GameQuestion[];
  category: string;
  categoryIcon: string;
  categories?: { id: string; name: string; icon: string }[];
  playerAvatar: string;
  playerUsername: string;
  opponentAvatar: string;
  opponentUsername: string;
  onGameEnd: (score: number, opponentScore: number, correctAnswers: number, playerAnswers: (number | null)[]) => void;
  onQuit: () => void;
}

export function QuizBallGameScreen({
  questions,
  category,
  categoryIcon,
  categories,
  playerAvatar,
  playerUsername,
  opponentAvatar,
  opponentUsername,
  onGameEnd,
  onQuit,
}: QuizBallGameScreenProps) {
  const { state, actions } = useGameLogic({
    questions,
    onGameEnd,
    timePerQuestion: 6,
  });
  const [showQuitModal, setShowQuitModal] = useState(false);

  const {
    currentQuestionIndex,
    timeRemaining,
    selectedAnswer,
    isAnswered,
    showResult,
    playerRoundScore,
    opponentRoundScore,
    opponentAnswered,
    toasts,
  } = state;

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) return null;

  const difficultyLabel = currentQuestion.difficulty
    ? `${currentQuestion.difficulty.charAt(0).toUpperCase()}${currentQuestion.difficulty.slice(1)}`
    : 'Medium';

  const getCurrentCategoryInfo = () => {
    if (categories && categories.length === 2) {
      const categoryIndex = currentQuestionIndex % 2;
      return {
        name: categories[categoryIndex].name,
        icon: categories[categoryIndex].icon,
      };
    }
    return { name: category, icon: categoryIcon };
  };
  const currentCategoryInfo = getCurrentCategoryInfo();

  const isCorrectAnswer = showResult && selectedAnswer === currentQuestion.correctIndex;
  const isWrongAnswer = showResult && selectedAnswer !== null && selectedAnswer !== currentQuestion.correctIndex;

  return (
    <div className="relative min-h-dvh w-full bg-[#0f1420]">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col p-4">
        <MatchToastContainer toasts={toasts} />

        <MatchScoreHUD
          playerScore={playerRoundScore}
          opponentScore={opponentRoundScore}
          playerName={playerUsername}
          opponentName={opponentUsername}
          playerAvatar={playerAvatar}
          opponentAvatar={opponentAvatar}
          timeRemaining={timeRemaining}
          maxTime={6}
          roundCurrent={currentQuestionIndex + 1}
          roundTotal={questions.length}
          playerAnswered={isAnswered}
          opponentAnswered={opponentAnswered}
          onQuit={() => setShowQuitModal(true)}
        />

        <div className="flex-1 flex flex-col justify-center gap-6 mb-12">
          <QuestionArena
            question={currentQuestion.prompt}
            category={currentCategoryInfo.name}
            categoryIcon={currentCategoryInfo.icon}
            difficulty={difficultyLabel}
          />

          <div className="grid grid-cols-2 gap-3 w-full max-w-2xl mx-auto">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === currentQuestion.correctIndex;

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
                  disabled={isAnswered}
                  onClick={() => actions.handleAnswer(index)}
                />
              );
            })}
          </div>

          {/* Result feedback banner */}
          <div className="text-center h-8">
            {showResult && (
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

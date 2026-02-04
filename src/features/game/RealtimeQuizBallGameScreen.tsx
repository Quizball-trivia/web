"use client";

import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { MatchScoreHUD } from '@/features/game/components/MatchScoreHUD';
import { QuestionArena } from '@/features/game/components/QuestionArena';
import { AnswerCard } from '@/features/game/components/AnswerCard';
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

  const {
    currentQuestion,
    timeRemaining,
    selectedAnswer,
    showResult,
    isAnswered,
    correctIndex,
    opponentAnswered,
    playerScore,
    opponentScore,
  } = state;

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Waiting for question...</div>
      </div>
    );
  }

  const categoryName = currentQuestion.question.categoryName ?? 'General';
  const categoryIcon = '⚽';
  const difficultyLabel = (currentQuestion.question.difficulty ?? 'Medium').toString();
  const difficultyDisplay = difficultyLabel.charAt(0).toUpperCase() + difficultyLabel.slice(1);

  return (
    <div className="min-h-screen bg-background flex flex-col p-4 w-full max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-2">
        <button onClick={onQuit} className="p-2 rounded-full hover:bg-muted text-muted-foreground">
          <X className="size-5" />
        </button>
      </div>

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
      />

      <div className="flex-1 flex flex-col justify-center gap-8 mb-12">
        <QuestionArena
          question={currentQuestion.question.prompt}
          category={categoryName}
          categoryIcon={categoryIcon}
          difficulty={difficultyDisplay}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mx-auto">
          {currentQuestion.question.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = typeof correctIndex === 'number' && index === correctIndex;

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
                isSelected={isSelected}
                state={uiState}
                disabled={isAnswered}
                onClick={() => actions.submitAnswer(index)}
              />
            );
          })}
        </div>

        <div className="text-center h-6">
          {showResult && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-medium text-muted-foreground">
              Next round starting...
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

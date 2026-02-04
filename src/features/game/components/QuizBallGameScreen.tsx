import type { GameQuestion } from "@/lib/domain";
import { MatchScoreHUD } from "@/features/game/components/MatchScoreHUD";
import { QuestionArena } from "@/features/game/components/QuestionArena";
import { AnswerCard } from "@/features/game/components/AnswerCard";
import { MatchToastContainer } from "@/features/game/components/MatchToast";
import { useGameLogic } from "@/features/game/hooks/useGameLogic";
import { X } from "lucide-react";
import { motion } from "motion/react";

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
     timePerQuestion: 6
  });

  const { 
     currentQuestionIndex, timeRemaining, selectedAnswer, isAnswered, showResult, 
     playerRoundScore, opponentRoundScore, opponentAnswered, toasts
  } = state;

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) return null;
  const difficultyLabel = currentQuestion.difficulty
    ? `${currentQuestion.difficulty.charAt(0).toUpperCase()}${currentQuestion.difficulty.slice(1)}`
    : "Medium";

  // Category Info Helper
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

  return (
    <div className="min-h-screen bg-background flex flex-col p-4 w-full max-w-5xl mx-auto">
      
      <MatchToastContainer toasts={toasts} />

      {/* Top Bar (Quit) */}
      <div className="flex justify-between items-center mb-2">
         <button onClick={onQuit} className="p-2 rounded-full hover:bg-muted text-muted-foreground">
            <X className="size-5" />
         </button>
      </div>

      {/* 1. ESPORTS HUD */}
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
      />

      {/* 2. QUESTION ARENA */}
      <div className="flex-1 flex flex-col justify-center gap-8 mb-12">
         
         <QuestionArena 
            question={currentQuestion.prompt}
            category={currentCategoryInfo.name}
            categoryIcon={currentCategoryInfo.icon}
            difficulty={difficultyLabel}
         />

         {/* 3. ANSWERS GRID */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mx-auto">
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
                     isSelected={isSelected}
                     state={uiState}
                     disabled={isAnswered}
                     onClick={() => actions.handleAnswer(index)}
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

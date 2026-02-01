"use client";

import { useState, useEffect } from 'react';
import { GameState, GameMode, Question } from '@/types/game';
import { QuestionCard } from '@/components/QuestionCard';
import { Timer } from '@/components/Timer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { HelpButtons } from '@/components/HelpButtons';
import { questionsService } from '@/services';
import { opponentService } from '@/services/opponent.service';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Heart, Flame, Trophy, ArrowRight, X } from 'lucide-react';
import { MinimalPlayerScores } from '@/components/game/MinimalPlayerScores';

interface GameScreenProps {
  mode: GameMode;
  questions: Question[];
  onGameEnd: (score: number, correctAnswers: number, streak: number) => void;
  onQuit: () => void;
  // Multiplayer opponent data
  opponentName?: string;
  opponentAvatar?: string;
  isMultiplayer?: boolean;
}

export function GameScreen({ mode, questions, onGameEnd, onQuit, opponentName, opponentAvatar, isMultiplayer = false }: GameScreenProps) {
  const [gameState, setGameState] = useState<GameState>({
    mode,
    currentQuestionIndex: 0,
    score: 0,
    lives: mode === 'survival' ? 3 : 1,
    streak: 0,
    timeRemaining: 10, // Always 10 seconds per question
    questions,
    answeredQuestions: new Array(questions.length).fill(false),
    correctAnswers: 0,
  });

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [timerActive, setTimerActive] = useState(true);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  
  // Opponent simulation for multiplayer
  const [opponentQuestionIndex, setOpponentQuestionIndex] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);

  // Help features
  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState(false);
  const [clueUsed, setClueUsed] = useState(false);
  const [changeQuestionUsed, setChangeQuestionUsed] = useState(false);
  const [hiddenAnswers, setHiddenAnswers] = useState<number[]>([]);
  const [showClue, setShowClue] = useState(false);
  const [allQuestions, setAllQuestions] = useState(questions);

  const currentQuestion = allQuestions?.[gameState.currentQuestionIndex];
  const maxTime = 10; // Always 10 seconds per question

  const getStableNumberFromString = (value: string): number => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return hash;
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    
    setSelectedAnswer(answerIndex);
    setTimerActive(false);
    setShowClue(false); // Hide clue after answering
    
    const correct = answerIndex === currentQuestion.correctAnswer;
    setIsCorrect(correct);
    setShowResult(true);

    const pointsEarned = correct ? (mode === 'timeAttack' ? 200 : 100) : 0;
    const newStreak = correct ? gameState.streak + 1 : 0;
    const newLives = !correct && mode === 'survival' ? gameState.lives - 1 : gameState.lives;

    setGameState(prev => ({
      ...prev,
      score: prev.score + pointsEarned + (newStreak * 10),
      correctAnswers: correct ? prev.correctAnswers + 1 : prev.correctAnswers,
      streak: newStreak,
      lives: newLives,
      answeredQuestions: prev.answeredQuestions.map((answered, idx) =>
        idx === prev.currentQuestionIndex ? true : answered
      ),
    }));
  };

  const handleNextQuestion = () => {
    const nextIndex = gameState.currentQuestionIndex + 1;
    
    if (nextIndex >= questions.length || (mode === 'survival' && gameState.lives <= 0)) {
      onGameEnd(gameState.score, gameState.correctAnswers, gameState.streak);
      return;
    }

    setGameState(prev => ({
      ...prev,
      currentQuestionIndex: nextIndex,
      timeRemaining: maxTime,
    }));
    setSelectedAnswer(null);
    setShowResult(false);
    setTimerActive(true);
    setHiddenAnswers([]);
    setShowClue(false);
  };

  const handleTimeUp = () => {
    if (showResult) return;
    
    setTimerActive(false);
    setShowResult(true);
    setIsCorrect(false);
    
    const newLives = mode === 'survival' ? gameState.lives - 1 : gameState.lives;
    
    setGameState(prev => ({
      ...prev,
      streak: 0,
      lives: newLives,
      answeredQuestions: prev.answeredQuestions.map((answered, idx) =>
        idx === prev.currentQuestionIndex ? true : answered
      ),
    }));
  };

  const handleTimerTick = (time: number) => {
    setGameState(prev => ({ ...prev, timeRemaining: time }));
  };

  // Simulate opponent progress in multiplayer
  useEffect(() => {
    if (!isMultiplayer || !questions || questions.length === 0 || opponentQuestionIndex >= questions.length) return;

    const action = opponentService.simulateAnswer(mode, opponentQuestionIndex, questions.length);

    const timer = setTimeout(() => {
      setOpponentScore(prev => prev + action.points);
      setOpponentQuestionIndex(prev => prev + 1);
    }, action.delay);

    return () => clearTimeout(timer);
  }, [opponentQuestionIndex, isMultiplayer, questions, mode]);

  // Help handlers
  const handleFiftyFifty = () => {
    if (fiftyFiftyUsed || showResult) return;
    
    setFiftyFiftyUsed(true);
    
    // Find two wrong answers to hide
    const wrongAnswers = currentQuestion.options
      .map((_, idx) => idx)
      .filter(idx => idx !== currentQuestion.correctAnswer);
    
    // Randomly select 2 wrong answers to hide
    const seed = getStableNumberFromString(String(currentQuestion.id));
    const toHide = [...wrongAnswers]
      .sort((a, b) => ((a + seed) % 100) - ((b + seed) % 100))
      .slice(0, 2);
    
    setHiddenAnswers(toHide);
  };

  const handleClue = () => {
    if (clueUsed || showResult) return;
    
    setClueUsed(true);
    setShowClue(true);
  };

  const handleChangeQuestion = async () => {
    if (changeQuestionUsed || showResult) return;

    setChangeQuestionUsed(true);

    // Get a replacement question via service
    const usedIds = allQuestions.map((q: Question) => q.id);
    const candidates: Question[] = await questionsService.getRandomQuestions(usedIds.length + 5);
    const availableQuestions = candidates.filter((q: Question) => !usedIds.includes(q.id));

    if (availableQuestions.length > 0) {
      const newQuestion = availableQuestions[0];
      const updatedQuestions = [...allQuestions];
      updatedQuestions[gameState.currentQuestionIndex] = newQuestion;
      setAllQuestions(updatedQuestions);
    }

    // Reset current question state
    setSelectedAnswer(null);
    setHiddenAnswers([]);
    setShowClue(false);
    setTimerActive(true);
    setGameState(prev => ({ ...prev, timeRemaining: maxTime }));
  };

  useEffect(() => {
    if (mode === 'survival' && gameState.lives <= 0 && showResult) {
      setTimeout(() => {
        onGameEnd(gameState.score, gameState.correctAnswers, gameState.streak);
      }, 2000);
    }
  }, [gameState.lives, showResult, mode, gameState.score, gameState.correctAnswers, gameState.streak, onGameEnd]);

  // Early return if no valid question data - must come after all hooks
  if (!allQuestions || allQuestions.length === 0 || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading questions...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Minimal Player Scores Header */}
      {isMultiplayer && opponentName && opponentAvatar && questions && questions.length > 0 && (
        <MinimalPlayerScores
          yourAvatar="⚽"
          yourScore={gameState.score}
          opponentAvatar={opponentAvatar}
          opponentName={opponentName}
          opponentScore={opponentScore}
        />
      )}

      <div className="flex-1 p-4 space-y-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setShowQuitDialog(true)}
          className="flex items-center justify-center size-9 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
          aria-label="Quit game"
        >
          <X className="size-5" />
        </button>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Card className="px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <Trophy className="size-4 text-yellow-500" />
              <span className="text-sm">{gameState.score}</span>
            </div>
          </Card>
          
          {mode === 'survival' && (
            <Card className="px-3 py-1.5">
              <div className="flex items-center gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`size-4 ${
                      i < gameState.lives
                        ? 'fill-red-500 text-red-500'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
            </Card>
          )}
          
          {gameState.streak > 0 && (
            <Card className="px-3 py-1.5">
              <div className="flex items-center gap-1.5">
                <Flame className="size-4 text-orange-500" />
                <span className="text-sm">{gameState.streak}</span>
              </div>
            </Card>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {gameState.currentQuestionIndex + 1}/{questions.length}
        </div>
      </div>

      {/* Progress */}
      <Progress 
        value={((gameState.currentQuestionIndex + 1) / questions.length) * 100} 
        className="h-2"
      />

      {/* Timer */}
      <Timer
        timeRemaining={gameState.timeRemaining}
        maxTime={maxTime}
        onTimeUp={handleTimeUp}
        onTick={handleTimerTick}
        isActive={timerActive}
      />

      {/* Help Buttons */}
      <div className="space-y-3">
        <HelpButtons
          fiftyFiftyUsed={fiftyFiftyUsed}
          clueUsed={clueUsed}
          changeQuestionUsed={changeQuestionUsed}
          onFiftyFifty={handleFiftyFifty}
          onClue={handleClue}
          onChangeQuestion={handleChangeQuestion}
          disabled={showResult}
          hidden={isMultiplayer}
        />

        {/* Clue Display */}
        {showClue && !showResult && (
          <Card className="p-3 bg-yellow-500/10 border-yellow-500/30">
            <div className="flex items-start gap-2">
              <div className="shrink-0 text-yellow-600 dark:text-yellow-400">💡</div>
              <div className="text-sm">
                <div className="text-yellow-700 dark:text-yellow-300 mb-1">Clue:</div>
                <div className="text-muted-foreground">{currentQuestion.clue}</div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Question */}
      <QuestionCard
        question={currentQuestion}
        questionNumber={gameState.currentQuestionIndex + 1}
        totalQuestions={questions.length}
        selectedAnswer={selectedAnswer}
        onSelectAnswer={handleAnswerSelect}
        showResult={showResult}
        isCorrect={isCorrect}
        hiddenAnswers={hiddenAnswers}
      />

      {/* Next Button */}
      {showResult && (
        <div className="flex flex-col items-center gap-3 mt-auto">
          {isCorrect ? (
            <div className="text-center text-green-600 dark:text-green-400">
              <div className="text-2xl mb-1">✓</div>
              <div>Correct! +{mode === 'timeAttack' ? 200 : 100} points</div>
              {gameState.streak > 1 && (
                <div className="text-sm">+{gameState.streak * 10} streak bonus</div>
              )}
            </div>
          ) : (
            <div className="text-center text-red-600 dark:text-red-400">
              <div className="text-2xl mb-1">✗</div>
              <div>{selectedAnswer === null ? 'Time\'s up!' : 'Incorrect'}</div>
            </div>
          )}
          
          {!(mode === 'survival' && gameState.lives <= 0) && (
            <Button onClick={handleNextQuestion} size="lg" className="w-full">
              {gameState.currentQuestionIndex + 1 >= questions.length ? 'Finish' : 'Next Question'}
              <ArrowRight className="ml-2 size-4" />
            </Button>
          )}
        </div>
      )}

      {/* Quit Confirmation Dialog */}
      <AlertDialog open={showQuitDialog} onOpenChange={setShowQuitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quit Game?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to quit? Your progress in this game will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Playing</AlertDialogCancel>
            <AlertDialogAction onClick={onQuit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Quit Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}

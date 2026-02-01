import { useState, useEffect, useCallback } from "react";
import { Question } from "@/types/game";
import { ToastMessage } from "@/features/game/components/MatchToast";

interface GameLogicProps {
  questions: Question[];
  onGameEnd: (score: number, opponentScore: number, correctAnswers: number, playerAnswers: (number | null)[]) => void;
  timePerQuestion?: number;
}

export function useGameLogic({ 
  questions, 
  onGameEnd,
  timePerQuestion = 6 
}: GameLogicProps) {
  
  // -- State --
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(timePerQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [opponentAnswered, setOpponentAnswered] = useState(false);
  const [showResult, setShowResult] = useState(false);
  
  // Scoring
  const [playerRoundScore, setPlayerRoundScore] = useState(0);
  const [opponentRoundScore, setOpponentRoundScore] = useState(0);
  const [playerTotalXP, setPlayerTotalXP] = useState(0);
  const [opponentTotalXP, setOpponentTotalXP] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [playerAnswers, setPlayerAnswers] = useState<(number | null)[]>([]);

  // Feedback
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const currentQuestion = questions[currentQuestionIndex];

  // Helper: Toast
  const addToast = useCallback((text: string, type: ToastMessage['type'], side: ToastMessage['side']) => {
     const id = Date.now().toString() + Math.random();
     setToasts(prev => [...prev, { id, text, type, side }]);
     setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // -- 1. AI Behavior --
  useEffect(() => {
     const delay = 1000 + Math.random() * 3000;
     const timer = setTimeout(() => {
        setOpponentAnswered(true);
     }, delay);
     return () => clearTimeout(timer);
  }, [currentQuestionIndex]);

  // -- 2. Core Scoring Logic --
  const calculateResult = useCallback((playerIdx: number | null, oppIdx: boolean) => {
     if (!currentQuestion) return;

     const opponentIsCorrect = Math.random() > 0.4; // 60% win sim
     const playerIsCorrect = playerIdx === currentQuestion.correctAnswer;
     
     let playerRoundPoints = 0;
     let opponentRoundPoints = 0;

     // PLAYER POINTS
     if (playerIsCorrect) {
        const speedBonus = timeRemaining / timePerQuestion; 
        const basePoints = 100;
        const bonusPoints = Math.floor(speedBonus * 100);
        playerRoundPoints = basePoints + bonusPoints;

        setPlayerTotalXP(prev => prev + playerRoundPoints); 
        
        addToast(`+${playerRoundPoints} PTS`, 'score', 'player');
        if (speedBonus > 0.5) addToast('FAST ANSWER', 'speed', 'player');
        setCorrectAnswersCount(prev => prev + 1);
     } else {
        addToast('WRONG', 'rp', 'player');
     }

     // OPPONENT POINTS
     if (opponentIsCorrect && oppIdx) { 
          const basePoints = 100;
          const bonusPoints = Math.floor(Math.random() * 80);
          opponentRoundPoints = basePoints + bonusPoints;
          setOpponentTotalXP(prev => prev + opponentRoundPoints);
          addToast(`+${opponentRoundPoints} PTS`, 'score', 'opponent');
     }

     // HUD SCORE (Unique Wins Only)
     if (playerIsCorrect && !opponentIsCorrect) {
        setPlayerRoundScore(prev => prev + 1); 
        addToast('ROUND WON', 'score', 'player');
     } else if (!playerIsCorrect && opponentIsCorrect) {
        setOpponentRoundScore(prev => prev + 1);
        addToast('ROUND LOST', 'score', 'opponent');
     } else if (playerIsCorrect && opponentIsCorrect) {
        addToast('DRAW', 'rp', 'player');
     }

  }, [currentQuestion, timeRemaining, timePerQuestion, addToast]);

  // -- 3. Actions --
  
  const handleTimeUp = useCallback(() => {
    if (isAnswered) return;
    setIsAnswered(true);
    setShowResult(true);
    calculateResult(selectedAnswer, opponentAnswered);
  }, [isAnswered, selectedAnswer, opponentAnswered, calculateResult]);

  const handleAnswer = useCallback((answerIndex: number) => {
    if (isAnswered) return;
    setSelectedAnswer(answerIndex);
    setIsAnswered(true);
    setShowResult(true);
    calculateResult(answerIndex, opponentAnswered);
  }, [isAnswered, calculateResult, opponentAnswered]);

  // -- 4. Progression --
  const handleNext = useCallback(() => {
    const updatedAnswers = [...playerAnswers, selectedAnswer];
    
    if (currentQuestionIndex < questions.length - 1) {
      setPlayerAnswers(updatedAnswers);
      setCurrentQuestionIndex((prev) => prev + 1);
      setTimeRemaining(timePerQuestion);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setShowResult(false);
      setOpponentAnswered(false);
    } else {
      onGameEnd(playerTotalXP, opponentTotalXP, correctAnswersCount, updatedAnswers);
    }
  }, [playerAnswers, selectedAnswer, currentQuestionIndex, questions.length, onGameEnd, playerTotalXP, opponentTotalXP, correctAnswersCount, timePerQuestion]);

  // -- 5. Effects --
  useEffect(() => {
    if (showResult || timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0.1) {
          handleTimeUp();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [timeRemaining, showResult, handleTimeUp]);

  useEffect(() => {
    if (showResult) {
      const timer = setTimeout(() => {
        handleNext();
      }, 2000); 
      return () => clearTimeout(timer);
    }
  }, [showResult, handleNext]);

  return {
    state: {
       currentQuestionIndex,
       timeRemaining,
       selectedAnswer,
       isAnswered,
       opponentAnswered,
       showResult,
       playerRoundScore,
       opponentRoundScore,
       playerTotalXP, 
       opponentTotalXP,
       toasts
    },
    actions: {
       handleAnswer
    }
  };
}

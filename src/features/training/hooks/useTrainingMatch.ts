import { useState, useCallback, useRef, useEffect } from "react";
import { TRAINING_QUESTIONS } from "../data/trainingQuestions";
import { TRAINING_SCRIPT } from "../data/trainingScript";
import type { GameQuestion } from "@/lib/domain";
import type { Phase, AnswerStateArray } from "@/features/possession/types/possession.types";
import { QUESTIONS_PER_HALF, TIMER_SECONDS } from "@/features/possession/types/possession.types";
import { getZone, clamp } from "@/features/possession/hooks/usePossessionMovement";

function getZoneKey(position: number): string {
  if (position >= 71) return "ATT";
  if (position >= 46) return "ATT_THIRD";
  if (position >= 21) return "MID";
  return "DEF";
}

/** Position on pitch is derived from cumulative point diff — same as real match */
function positionFromDiff(diff: number): number {
  return clamp(50 + diff / 2, 0, 100);
}

// ─── Types ──────────────────────────────────────────────────────
export type TrainingStage =
  | "matchmaking"
  | "showdown"
  | "banning"
  | "playing"
  | "halftime"
  | "results";

export interface TrainingMatchState {
  stage: TrainingStage;
  half: 1 | 2;
  questionIndex: number;
  questionInHalf: number;
  /** Cumulative point difference (player - opponent). Position derived from this. */
  possessionDiff: number;
  playerPosition: number;
  playerGoals: number;
  opponentGoals: number;
  phase: Phase;
  question: GameQuestion | null;
  showOptions: boolean;
  selectedAnswer: number | null;
  answerStates: AnswerStateArray;
  timeRemaining: number;
  zone: string;
  zoneColor: string;
  zoneKey: string;
  shotMode: null | {
    result: "pending" | "goal" | "saved" | "miss";
    ballOriginX: number;
    isPlayerAttacker: boolean;
    variant?: number;
  };
  showGoalCelebration: boolean;
  goalScorerIsPlayer: boolean;
  showPlayerSplash: boolean;
  showOpponentSplash: boolean;
  playerSplashPoints: number;
  opponentSplashPoints: number;
  opponentAnswered: boolean;
  opponentAnsweredCorrectly: boolean | null;
  opponentAnswer: number | null;
  feedMessage: string;
  feedDirection: "forward" | "backward" | "neutral";
}

const DEFAULT_ANSWER_STATES: AnswerStateArray = ["default", "default", "default", "default"];

export function useTrainingMatch(isPaused: boolean) {
  const [state, setState] = useState<TrainingMatchState>({
    stage: "matchmaking",
    half: 1,
    questionIndex: 0,
    questionInHalf: 0,
    possessionDiff: 0,
    playerPosition: 50,
    playerGoals: 0,
    opponentGoals: 0,
    phase: "playing",
    question: TRAINING_QUESTIONS[0],
    showOptions: true,
    selectedAnswer: null,
    answerStates: DEFAULT_ANSWER_STATES,
    timeRemaining: TIMER_SECONDS,
    zone: "ATT",
    zoneColor: "#FF9600",
    zoneKey: "ATT_THIRD",
    shotMode: null,
    showGoalCelebration: false,
    goalScorerIsPlayer: false,
    showPlayerSplash: false,
    showOpponentSplash: false,
    playerSplashPoints: 0,
    opponentSplashPoints: 0,
    opponentAnswered: false,
    opponentAnsweredCorrectly: null,
    opponentAnswer: null,
    feedMessage: "",
    feedDirection: "neutral",
  });

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingNextQuestionRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, []);

  // ─── Stage transitions ─────────────────────────────────────
  const setStage = useCallback((stage: TrainingStage) => {
    setState((prev) => ({ ...prev, stage }));
  }, []);

  // ─── Start playing phase for a question ─────────────────────
  const startQuestion = useCallback(
    (qIndex: number) => {
      const question = TRAINING_QUESTIONS[qIndex];
      const half = qIndex < QUESTIONS_PER_HALF ? 1 : 2;
      const questionInHalf = qIndex < QUESTIONS_PER_HALF ? qIndex : qIndex - QUESTIONS_PER_HALF;

      setState((prev) => {
        const zone = getZone(prev.playerPosition);
        return {
          ...prev,
          stage: "playing",
          phase: "playing",
          question,
          questionIndex: qIndex,
          questionInHalf,
          half,
          showOptions: true,
          selectedAnswer: null,
          answerStates: DEFAULT_ANSWER_STATES,
          timeRemaining: TIMER_SECONDS,
          shotMode: null,
          showGoalCelebration: false,
          showPlayerSplash: false,
          showOpponentSplash: false,
          opponentAnswered: false,
          opponentAnsweredCorrectly: null,
          opponentAnswer: null,
          zone: zone.zone,
          zoneColor: zone.color,
          zoneKey: getZoneKey(prev.playerPosition),
          feedMessage: "",
          feedDirection: "neutral" as const,
        };
      });

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setState((prev) => {
          if (isPausedRef.current) return prev;
          if (prev.timeRemaining <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return { ...prev, timeRemaining: 0 };
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);

      const script = TRAINING_SCRIPT[qIndex];
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      botTimerRef.current = setTimeout(() => {
        setState((prev) => {
          if (prev.stage !== "playing" || prev.questionIndex !== qIndex) return prev;
          return { ...prev, opponentAnswered: true };
        });
      }, script.botDelayMs);
    },
    [],
  );

  // Watch for pending next question
  useEffect(() => {
    if (state.phase === ("transitioning" as Phase) && pendingNextQuestionRef.current !== null) {
      const nextIdx = pendingNextQuestionRef.current;
      pendingNextQuestionRef.current = null;
      startQuestion(nextIdx);
    }
  }, [state.phase, startQuestion]);

  // ─── Handle player answer ──────────────────────────────────
  const handleAnswer = useCallback(
    (selectedIndex: number) => {
      setState((prev) => {
        if (prev.selectedAnswer !== null || prev.phase !== "playing") return prev;
        if (!prev.question) return prev;

        const isCorrect = selectedIndex === prev.question.correctIndex;
        const script = TRAINING_SCRIPT[prev.questionIndex];
        const botCorrect = isCorrect
          ? script.botCorrectIfPlayerCorrect
          : script.botCorrectIfPlayerWrong;

        // Build answer states
        const newAnswerStates: AnswerStateArray = ["disabled", "disabled", "disabled", "disabled"];
        newAnswerStates[prev.question.correctIndex] = "correct";
        if (!isCorrect) {
          newAnswerStates[selectedIndex] = "wrong";
        }

        // Points: timeRemaining * 10, capped 0–100
        const playerPoints = isCorrect ? clamp(prev.timeRemaining * 10, 0, 100) : 0;
        const botRemainingTime = TIMER_SECONDS - script.botTimeSec;
        const opponentPoints = botCorrect ? clamp(botRemainingTime * 10, 0, 100) : 0;

        // Update possessionDiff by the point difference
        const pointDiff = playerPoints - opponentPoints;
        const newDiff = prev.possessionDiff + pointDiff;
        const newPosition = positionFromDiff(newDiff);
        const newZone = getZone(newPosition);
        const newZoneKey = getZoneKey(newPosition);

        // Build feed message
        let feedMessage = "";
        let feedDirection: "forward" | "backward" | "neutral" = "neutral";
        if (pointDiff > 0) {
          feedMessage = `+${pointDiff} → ATTACK!`;
          feedDirection = "forward";
        } else if (pointDiff < 0) {
          feedMessage = `${pointDiff} → Pushed back`;
          feedDirection = "backward";
        } else if (isCorrect && botCorrect) {
          feedMessage = "Both correct → Draw";
          feedDirection = "neutral";
        } else {
          feedMessage = "Both wrong → No change";
          feedDirection = "neutral";
        }

        if (timerRef.current) clearInterval(timerRef.current);

        // Pick bot answer for display
        let botAnswer: number | null = null;
        if (botCorrect) {
          botAnswer = prev.question.correctIndex;
        } else {
          const wrongIndices = [0, 1, 2, 3].filter((i) => i !== prev.question!.correctIndex);
          botAnswer = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
        }

        return {
          ...prev,
          selectedAnswer: selectedIndex,
          answerStates: newAnswerStates,
          phase: "reveal" as Phase,
          possessionDiff: newDiff,
          playerPosition: newPosition,
          zone: newZone.zone,
          zoneColor: newZone.color,
          zoneKey: newZoneKey,
          showPlayerSplash: true,
          showOpponentSplash: true,
          playerSplashPoints: playerPoints,
          opponentSplashPoints: opponentPoints,
          opponentAnswered: true,
          opponentAnsweredCorrectly: botCorrect,
          opponentAnswer: botAnswer,
          feedMessage,
          feedDirection,
        };
      });
    },
    [],
  );

  // ─── Handle timeout (no answer) — treat as wrong ─────
  const handleTimeout = useCallback(() => {
    setState((prev) => {
      if (prev.selectedAnswer !== null || prev.phase !== "playing") return prev;
      if (!prev.question) return prev;

      const script = TRAINING_SCRIPT[prev.questionIndex];
      const botCorrect = script.botCorrectIfPlayerWrong;

      const newAnswerStates: AnswerStateArray = ["disabled", "disabled", "disabled", "disabled"];
      newAnswerStates[prev.question.correctIndex] = "correct";

      const playerPoints = 0; // timed out
      const botRemainingTime = TIMER_SECONDS - script.botTimeSec;
      const opponentPoints = botCorrect ? clamp(botRemainingTime * 10, 0, 100) : 0;

      const pointDiff = playerPoints - opponentPoints;
      const newDiff = prev.possessionDiff + pointDiff;
      const newPosition = positionFromDiff(newDiff);
      const newZone = getZone(newPosition);
      const newZoneKey = getZoneKey(newPosition);

      let feedMessage = "";
      let feedDirection: "forward" | "backward" | "neutral" = "neutral";
      if (pointDiff < 0) {
        feedMessage = `${pointDiff} → Pushed back`;
        feedDirection = "backward";
      } else {
        feedMessage = "Both wrong → No change";
      }

      if (timerRef.current) clearInterval(timerRef.current);

      let botAnswer: number | null = null;
      if (botCorrect) {
        botAnswer = prev.question.correctIndex;
      } else {
        const wrongIndices = [0, 1, 2, 3].filter((i) => i !== prev.question!.correctIndex);
        botAnswer = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
      }

      return {
        ...prev,
        selectedAnswer: -1,
        answerStates: newAnswerStates,
        phase: "reveal" as Phase,
        possessionDiff: newDiff,
        playerPosition: newPosition,
        zone: newZone.zone,
        zoneColor: newZone.color,
        zoneKey: newZoneKey,
        showPlayerSplash: false,
        showOpponentSplash: false,
        playerSplashPoints: 0,
        opponentSplashPoints: opponentPoints,
        opponentAnswered: true,
        opponentAnsweredCorrectly: botCorrect,
        opponentAnswer: botAnswer,
        feedMessage,
        feedDirection,
      };
    });
  }, []);

  // ─── After reveal, check for shot or advance ───────────────
  const advanceAfterReveal = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== "reveal") return prev;

      const isCorrect = prev.selectedAnswer !== null && prev.selectedAnswer >= 0
        && prev.selectedAnswer === prev.question?.correctIndex;

      // Shot triggers at position >= 75 (player attacking)
      if (isCorrect && prev.playerPosition >= 75) {
        const ballOriginX = 30 + (prev.playerPosition / 100) * 440 + 14;
        const variant = prev.questionIndex % 5;
        return {
          ...prev,
          phase: "shot" as Phase,
          shotMode: {
            result: "pending" as const,
            ballOriginX,
            isPlayerAttacker: true,
            variant,
          },
          showPlayerSplash: false,
          showOpponentSplash: false,
        };
      }

      // Opponent shot triggers when player position <= 25
      if (prev.playerPosition <= 25 && !isCorrect) {
        const ballOriginX = 30 + ((100 - prev.playerPosition) / 100) * 440 + 14;
        const variant = prev.questionIndex % 5;
        return {
          ...prev,
          phase: "shot" as Phase,
          shotMode: {
            result: "pending" as const,
            ballOriginX,
            isPlayerAttacker: false,
            variant,
          },
          showPlayerSplash: false,
          showOpponentSplash: false,
        };
      }

      // Normal advance
      const nextIdx = prev.questionIndex + 1;

      if (nextIdx === QUESTIONS_PER_HALF && prev.half === 1) {
        return {
          ...prev,
          stage: "halftime" as TrainingStage,
          phase: "halftime" as Phase,
          showGoalCelebration: false,
          showPlayerSplash: false,
          showOpponentSplash: false,
          shotMode: null,
        };
      }

      if (nextIdx >= TRAINING_QUESTIONS.length) {
        return {
          ...prev,
          stage: "results" as TrainingStage,
          phase: "fulltime" as Phase,
          showGoalCelebration: false,
          showPlayerSplash: false,
          showOpponentSplash: false,
          shotMode: null,
        };
      }

      pendingNextQuestionRef.current = nextIdx;
      return {
        ...prev,
        phase: "transitioning" as Phase,
        showPlayerSplash: false,
        showOpponentSplash: false,
      };
    });
  }, []);

  // ─── Handle shot result ────────────────────────────────────
  const resolveShot = useCallback((attackerCorrect: boolean, defenderCorrect: boolean) => {
    setState((prev) => {
      const isPlayerAttacker = prev.shotMode?.isPlayerAttacker ?? true;

      if (attackerCorrect && !defenderCorrect) {
        // GOAL
        return {
          ...prev,
          phase: "goal" as Phase,
          playerGoals: isPlayerAttacker ? prev.playerGoals + 1 : prev.playerGoals,
          opponentGoals: isPlayerAttacker ? prev.opponentGoals : prev.opponentGoals + 1,
          showGoalCelebration: true,
          goalScorerIsPlayer: isPlayerAttacker,
          shotMode: prev.shotMode ? { ...prev.shotMode, result: "goal" as const } : null,
          // Reset to midfield after goal
          possessionDiff: 0,
          playerPosition: 50,
          feedMessage: isPlayerAttacker ? "GOOOL!" : "Opponent scores!",
          feedDirection: isPlayerAttacker ? "forward" as const : "backward" as const,
        };
      }

      if (defenderCorrect) {
        // SAVED
        return {
          ...prev,
          phase: "saved" as Phase,
          shotMode: prev.shotMode ? { ...prev.shotMode, result: "saved" as const } : null,
          // Push back toward midfield after save
          possessionDiff: isPlayerAttacker ? Math.max(prev.possessionDiff - 30, 0) : Math.min(prev.possessionDiff + 30, 0),
          playerPosition: positionFromDiff(isPlayerAttacker ? Math.max(prev.possessionDiff - 30, 0) : Math.min(prev.possessionDiff + 30, 0)),
          feedMessage: isPlayerAttacker ? "Saved!" : "Great save!",
          feedDirection: isPlayerAttacker ? "backward" as const : "forward" as const,
        };
      }

      // MISS
      return {
        ...prev,
        phase: "saved" as Phase,
        shotMode: prev.shotMode ? { ...prev.shotMode, result: "miss" as const } : null,
        possessionDiff: isPlayerAttacker ? Math.max(prev.possessionDiff - 30, 0) : Math.min(prev.possessionDiff + 30, 0),
        playerPosition: positionFromDiff(isPlayerAttacker ? Math.max(prev.possessionDiff - 30, 0) : Math.min(prev.possessionDiff + 30, 0)),
        feedMessage: "Off target!",
        feedDirection: "neutral" as const,
      };
    });
  }, []);

  // Called after goal celebration or saved phase
  const continueAfterPhase = useCallback(() => {
    setState((prev) => {
      const nextIdx = prev.questionIndex + 1;

      if (nextIdx === QUESTIONS_PER_HALF && prev.half === 1) {
        return {
          ...prev,
          stage: "halftime" as TrainingStage,
          phase: "halftime" as Phase,
          showGoalCelebration: false,
          shotMode: null,
        };
      }

      if (nextIdx >= TRAINING_QUESTIONS.length) {
        return {
          ...prev,
          stage: "results" as TrainingStage,
          phase: "fulltime" as Phase,
          showGoalCelebration: false,
          shotMode: null,
        };
      }

      pendingNextQuestionRef.current = nextIdx;
      return {
        ...prev,
        phase: "transitioning" as Phase,
        showGoalCelebration: false,
        shotMode: null,
      };
    });
  }, []);

  const dismissPlayerSplash = useCallback(() => {
    setState((prev) => ({ ...prev, showPlayerSplash: false }));
  }, []);

  const dismissOpponentSplash = useCallback(() => {
    setState((prev) => ({ ...prev, showOpponentSplash: false }));
  }, []);

  const startSecondHalf = useCallback(() => {
    startQuestion(QUESTIONS_PER_HALF);
  }, [startQuestion]);

  return {
    state,
    setStage,
    startQuestion,
    handleAnswer,
    handleTimeout,
    advanceAfterReveal,
    resolveShot,
    continueAfterPhase,
    dismissPlayerSplash,
    dismissOpponentSplash,
    startSecondHalf,
  };
}

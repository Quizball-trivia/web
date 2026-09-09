import { useState, useCallback, useRef, useEffect } from "react";
import { TRAINING_QUESTIONS } from "../data/trainingQuestions";
import { TRAINING_SPECIAL_INDEXES } from "../data/trainingSpecialRounds";
import {
  TRAINING_SCRIPT,
  getTrainingRequiredAnswerIndex,
  getTrainingShotPlan,
} from "../data/trainingScript";
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
  | "penalties"
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
    shotId?: number;
    /** Ranked freezes the pitch at this position while the attack plays. */
    originPosition: number;
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
  /** Per-question outcome, index = questionIndex — drives the results dots. */
  playerQuestionResults: Array<"correct" | "wrong" | null>;
  opponentQuestionResults: Array<"correct" | "wrong" | null>;
  /** Practice-shootout scoreboard — null until the penalties stage finishes. */
  penaltyPlayerGoals: number | null;
  penaltyOpponentGoals: number | null;
  /**
   * This round's possession swing, held back during the reveal so the pitch,
   * goal meter and bar-battle divider stay at the pre-round position while the
   * bars animate (ranked's field lock). Committed by advanceAfterReveal.
   */
  pendingPointDiff: number | null;
}

const DEFAULT_ANSWER_STATES: AnswerStateArray = ["default", "default", "default", "default"];

function getGuidedAnswerStates(question: GameQuestion, qIndex: number): AnswerStateArray {
  const requiredIndex = getTrainingRequiredAnswerIndex(TRAINING_SCRIPT[qIndex], question);
  if (requiredIndex === null) return DEFAULT_ANSWER_STATES;
  return DEFAULT_ANSWER_STATES.map((_, index) => (
    index === requiredIndex ? "default" : "disabled"
  )) as AnswerStateArray;
}

// The bot script (TRAINING_SCRIPT) is indexed per question, so an override is
// only usable when it can cover every scripted question. Anything shorter
// falls back to the built-in set instead of crashing mid-match.
function resolveQuestions(questionsOverride?: GameQuestion[]): GameQuestion[] {
  if (questionsOverride && questionsOverride.length >= TRAINING_SCRIPT.length) {
    return questionsOverride.slice(0, TRAINING_SCRIPT.length);
  }
  return TRAINING_QUESTIONS;
}

export function useTrainingMatch(isPaused: boolean, questionsOverride?: GameQuestion[]) {
  // Ref so the empty-dep callbacks below never close over a stale question list.
  const questionsRef = useRef(resolveQuestions(questionsOverride));
  useEffect(() => {
    questionsRef.current = resolveQuestions(questionsOverride);
  }, [questionsOverride]);
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
    question: resolveQuestions(questionsOverride)[0],
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
    playerQuestionResults: [],
    opponentQuestionResults: [],
    penaltyPlayerGoals: null,
    penaltyOpponentGoals: null,
    pendingPointDiff: null,
  });

  const isPausedRef = useRef(isPaused);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingNextQuestionRef = useRef<number | null>(null);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const clearLatestTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
  }, []);

  useEffect(() => {
    return clearLatestTimers;
  }, [clearLatestTimers]);

  // ─── Stage transitions ─────────────────────────────────────
  const setStage = useCallback((stage: TrainingStage) => {
    setState((prev) => ({ ...prev, stage }));
  }, []);

  // ─── Start playing phase for a question ─────────────────────
  const startQuestion = useCallback(
    (qIndex: number) => {
      const question = questionsRef.current[qIndex];
      const script = TRAINING_SCRIPT[qIndex];
      const half = qIndex < QUESTIONS_PER_HALF ? 1 : 2;
      const questionInHalf = qIndex < QUESTIONS_PER_HALF ? qIndex : qIndex - QUESTIONS_PER_HALF;

      setState((prev) => {
        const diff = script.startPossessionDiff ?? prev.possessionDiff;
        const position = positionFromDiff(diff);
        const zone = getZone(position);
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
          answerStates: getGuidedAnswerStates(question, qIndex),
          timeRemaining: TIMER_SECONDS,
          shotMode: null,
          pendingPointDiff: null,
          showGoalCelebration: false,
          showPlayerSplash: false,
          showOpponentSplash: false,
          opponentAnswered: false,
          opponentAnsweredCorrectly: null,
          opponentAnswer: null,
          possessionDiff: diff,
          playerPosition: position,
          zone: zone.zone,
          zoneColor: zone.color,
          zoneKey: getZoneKey(position),
        };
      });

      if (timerRef.current) clearInterval(timerRef.current);
      // Guided MCQs deliberately have no hidden timeout: the coach permits one
      // action and waits for it. Free-form rounds may use the normal clock.
      if (script.requiredAnswer === "free" && !TRAINING_SPECIAL_INDEXES.has(qIndex)) {
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
      }

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
    if (state.phase === "transitioning" && pendingNextQuestionRef.current !== null) {
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

        const script = TRAINING_SCRIPT[prev.questionIndex];
        const requiredIndex = getTrainingRequiredAnswerIndex(script, prev.question);
        if (requiredIndex !== null && selectedIndex !== requiredIndex) return prev;

        const isCorrect = selectedIndex === prev.question.correctIndex;
        const botCorrect = isCorrect
          ? script.botCorrectIfPlayerCorrect
          : script.botCorrectIfPlayerWrong;

        // Build answer states
        const newAnswerStates: AnswerStateArray = ["disabled", "disabled", "disabled", "disabled"];
        newAnswerStates[prev.question.correctIndex] = "correct";
        if (!isCorrect) {
          newAnswerStates[selectedIndex] = "wrong";
        }

        const playerPoints = script.playerPoints;
        const opponentPoints = script.opponentPoints;

        // Possession swing is computed now but committed AFTER the bar battle
        // (advanceAfterReveal) so the pitch doesn't move before the bars fight.
        const pointDiff = playerPoints - opponentPoints;

        const playerQuestionResults = [...prev.playerQuestionResults];
        playerQuestionResults[prev.questionIndex] = isCorrect ? "correct" : "wrong";
        const opponentQuestionResults = [...prev.opponentQuestionResults];
        opponentQuestionResults[prev.questionIndex] = botCorrect ? "correct" : "wrong";

        if (timerRef.current) clearInterval(timerRef.current);

        // Pick bot answer for display
        let botAnswer: number | null = null;
        if (botCorrect) {
          botAnswer = prev.question.correctIndex;
        } else {
          const wrongIndices = [0, 1, 2, 3].filter((i) => i !== prev.question!.correctIndex);
          botAnswer = wrongIndices[0] ?? null;
        }

        return {
          ...prev,
          selectedAnswer: selectedIndex,
          answerStates: newAnswerStates,
          phase: "reveal",
          pendingPointDiff: pointDiff,
          showPlayerSplash: true,
          showOpponentSplash: true,
          playerSplashPoints: playerPoints,
          opponentSplashPoints: opponentPoints,
          opponentAnswered: true,
          opponentAnsweredCorrectly: botCorrect,
          opponentAnswer: botAnswer,
          playerQuestionResults,
          opponentQuestionResults,
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

      const playerPoints = 0;
      const opponentPoints = script.opponentPoints;

      const pointDiff = playerPoints - opponentPoints;

      const playerQuestionResults = [...prev.playerQuestionResults];
      playerQuestionResults[prev.questionIndex] = "wrong";
      const opponentQuestionResults = [...prev.opponentQuestionResults];
      opponentQuestionResults[prev.questionIndex] = botCorrect ? "correct" : "wrong";

      if (timerRef.current) clearInterval(timerRef.current);

      let botAnswer: number | null = null;
      if (botCorrect) {
        botAnswer = prev.question.correctIndex;
      } else {
        const wrongIndices = [0, 1, 2, 3].filter((i) => i !== prev.question!.correctIndex);
        botAnswer = wrongIndices[0] ?? null;
      }

      return {
        ...prev,
        selectedAnswer: -1,
        answerStates: newAnswerStates,
        phase: "reveal",
        pendingPointDiff: pointDiff,
        showPlayerSplash: false,
        showOpponentSplash: false,
        playerSplashPoints: playerPoints,
        opponentSplashPoints: opponentPoints,
        opponentAnswered: true,
        opponentAnsweredCorrectly: botCorrect,
        opponentAnswer: botAnswer,
        playerQuestionResults,
        opponentQuestionResults,
      };
    });
  }, []);

  // ─── After reveal (bar battle done): commit the possession swing,
  //     then check for shot or advance ───────────────
  const advanceAfterReveal = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== "reveal") return prev;

      const isCorrect = prev.playerQuestionResults[prev.questionIndex] === "correct";

      // Commit the round's swing now — mirrors ranked, where the field only
      // moves after the bar battle resolves.
      const newDiff = prev.possessionDiff + (prev.pendingPointDiff ?? 0);
      const newPosition = positionFromDiff(newDiff);
      const newZone = getZone(newPosition);
      const committed = {
        possessionDiff: newDiff,
        playerPosition: newPosition,
        zone: newZone.zone,
        zoneColor: newZone.color,
        zoneKey: getZoneKey(newPosition),
        pendingPointDiff: null,
      };
      const shotPlan = getTrainingShotPlan({
        script: TRAINING_SCRIPT[prev.questionIndex],
        playerCorrect: isCorrect,
        opponentCorrect: prev.opponentAnsweredCorrectly === true,
        projectedPosition: newPosition,
      });

      if (shotPlan) {
        // Like ranked, the logical possession/meter commits immediately, but
        // the pitch itself stays frozen at the pre-round attack origin until
        // the shot result sequence has finished.
        const basePlayerX = 30 + (prev.playerPosition / 100) * 440;
        const baseOpponentX = basePlayerX - 30;
        const ballOriginX = shotPlan.isPlayerAttacker
          ? basePlayerX + 14
          : baseOpponentX - 14;
        const variant = prev.questionIndex % 5;
        return {
          ...prev,
          ...committed,
          phase: "shot",
          shotMode: {
            result: shotPlan.result,
            ballOriginX,
            isPlayerAttacker: shotPlan.isPlayerAttacker,
            variant,
            shotId: prev.questionIndex,
            originPosition: prev.playerPosition,
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
          ...committed,
          stage: "halftime",
          phase: "halftime",
          showGoalCelebration: false,
          showPlayerSplash: false,
          showOpponentSplash: false,
          shotMode: null,
        };
      }

      if (nextIdx >= questionsRef.current.length) {
        return {
          ...prev,
          ...committed,
          stage: "penalties",
          phase: "fulltime",
          showGoalCelebration: false,
          showPlayerSplash: false,
          showOpponentSplash: false,
          shotMode: null,
        };
      }

      pendingNextQuestionRef.current = nextIdx;
      return {
        ...prev,
        ...committed,
        phase: "transitioning",
        showPlayerSplash: false,
        showOpponentSplash: false,
      };
    });
  }, []);

  // ─── Resolve a special round (put-in-order / who-am-I) ────────
  // The special panel scores itself and hands the outcome here; the bot's
  // outcome comes from the same per-question script as MCQ rounds.
  const resolveSpecialRound = useCallback((playerCorrect: boolean, panelPoints: number) => {
    // The production panel still reports its live score, but training uses the
    // manifest's fixed score so dragging/typing speed cannot alter the script.
    void panelPoints;
    setState((prev) => {
      if (prev.selectedAnswer !== null || prev.phase !== "playing") return prev;

      const script = TRAINING_SCRIPT[prev.questionIndex];
      const botCorrect = playerCorrect
        ? script.botCorrectIfPlayerCorrect
        : script.botCorrectIfPlayerWrong;
      const playerPoints = script.playerPoints;
      const opponentPoints = script.opponentPoints;

      if (timerRef.current) clearInterval(timerRef.current);

      const playerQuestionResults = [...prev.playerQuestionResults];
      playerQuestionResults[prev.questionIndex] = playerCorrect ? "correct" : "wrong";
      const opponentQuestionResults = [...prev.opponentQuestionResults];
      opponentQuestionResults[prev.questionIndex] = botCorrect ? "correct" : "wrong";

      return {
        ...prev,
        selectedAnswer: -2, // resolved marker — this round had no MCQ grid
        phase: "reveal",
        pendingPointDiff: playerPoints - opponentPoints,
        showPlayerSplash: playerPoints > 0,
        showOpponentSplash: true,
        playerSplashPoints: playerPoints,
        opponentSplashPoints: opponentPoints,
        opponentAnswered: true,
        opponentAnsweredCorrectly: botCorrect,
        opponentAnswer: null,
        playerQuestionResults,
        opponentQuestionResults,
      };
    });
  }, []);

  // The result is already present when shot mode begins (ranked parity). These
  // callbacks advance the VISUAL lifecycle without changing that result:
  // ball flight → celebration/result → reset → tooltip → next question.
  const showGoalCelebration = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== "shot" || prev.shotMode?.result !== "goal" || prev.showGoalCelebration) {
        return prev;
      }
      const isPlayerAttacker = prev.shotMode.isPlayerAttacker;
      return {
        ...prev,
        playerGoals: isPlayerAttacker ? prev.playerGoals + 1 : prev.playerGoals,
        opponentGoals: isPlayerAttacker ? prev.opponentGoals : prev.opponentGoals + 1,
        goalScorerIsPlayer: isPlayerAttacker,
        showGoalCelebration: true,
      };
    });
  }, []);

  const finishGoalCelebration = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== "shot" || prev.shotMode?.result !== "goal" || !prev.showGoalCelebration) {
        return prev;
      }
      const newPosition = positionFromDiff(0);
      const newZone = getZone(newPosition);
      return {
        ...prev,
        phase: "goal",
        possessionDiff: 0,
        playerPosition: newPosition,
        zone: newZone.zone,
        zoneColor: newZone.color,
        zoneKey: getZoneKey(newPosition),
        showGoalCelebration: false,
        shotMode: null,
      };
    });
  }, []);

  const finishShotFlight = useCallback(() => {
    setState((prev) => {
      if (
        prev.phase !== "shot"
        || !prev.shotMode
        || (prev.shotMode.result !== "saved" && prev.shotMode.result !== "miss")
      ) {
        return prev;
      }
      const newDiff = prev.shotMode.isPlayerAttacker
        ? Math.max(prev.possessionDiff - 30, 0)
        : Math.min(prev.possessionDiff + 30, 0);
      const newPosition = positionFromDiff(newDiff);
      const newZone = getZone(newPosition);
      return {
        ...prev,
        phase: "saved",
        possessionDiff: newDiff,
        playerPosition: newPosition,
        zone: newZone.zone,
        zoneColor: newZone.color,
        zoneKey: getZoneKey(newPosition),
        shotMode: null,
      };
    });
  }, []);

  const continueAfterPhase = useCallback(() => {
    setState((prev) => {
      const nextIdx = prev.questionIndex + 1;

      if (nextIdx === QUESTIONS_PER_HALF && prev.half === 1) {
        return {
          ...prev,
          stage: "halftime",
          phase: "halftime",
          showGoalCelebration: false,
          shotMode: null,
        };
      }

      if (nextIdx >= questionsRef.current.length) {
        return {
          ...prev,
          stage: "penalties",
          phase: "fulltime",
          showGoalCelebration: false,
          shotMode: null,
        };
      }

      pendingNextQuestionRef.current = nextIdx;
      return {
        ...prev,
        phase: "transitioning",
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

  // Practice shootout finished — record the scoreboard and show results.
  const finishPenalties = useCallback((playerGoals: number, opponentGoals: number) => {
    setState((prev) => ({
      ...prev,
      stage: "results",
      penaltyPlayerGoals: playerGoals,
      penaltyOpponentGoals: opponentGoals,
    }));
  }, []);

  return {
    state,
    setStage,
    startQuestion,
    handleAnswer,
    handleTimeout,
    resolveSpecialRound,
    advanceAfterReveal,
    showGoalCelebration,
    finishGoalCelebration,
    finishShotFlight,
    continueAfterPhase,
    dismissPlayerSplash,
    dismissOpponentSplash,
    startSecondHalf,
    finishPenalties,
  };
}

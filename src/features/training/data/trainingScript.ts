import type { GameQuestion } from "@/lib/domain";

export type TrainingRequiredAnswer = "correct" | "wrong" | "free";
export type TrainingShotResult = "goal" | "saved" | "miss";

/**
 * Per-question AI behaviour script.
 * Besides the bot result, this defines the exact tutorial action and any
 * guaranteed score/shot beats. Keeping the lesson here prevents UI effects
 * from quietly inventing a second, competing script.
 */
export interface TrainingScriptEntry {
  /** Which answer the coach lets the player choose. `free` is for special rounds. */
  requiredAnswer: TrainingRequiredAnswer;
  /** Whether the bot answers correctly when the player also answers correctly */
  botCorrectIfPlayerCorrect: boolean;
  /** Whether the bot answers correctly when the player gets it wrong */
  botCorrectIfPlayerWrong: boolean;
  /** Bot answer delay in ms (when the "opponent answered" indicator appears) */
  botDelayMs: number;
  /** Bot's simulated answer time in seconds (used for speed comparison) */
  botTimeSec: number;
  /** Fixed points. Training never falls back to clock-derived live scoring. */
  playerPoints: number;
  opponentPoints: number;
  /** Optional field setup before this question starts. */
  startPossessionDiff?: number;
  /** Forced result if this round reaches a shooting boundary. */
  shotResult?: TrainingShotResult;
}

/**
 * Scripted "perfect round" showcase: the guided correct answer resolves 100
 * vs 0 and ends in a goal. The field is pre-set so the swing crosses the shot
 * threshold deterministically.
 */
export const TRAINING_DEMO_GOAL_INDEX = 1;
/** Q1 ends at +40, so Q2 starts from that same deterministic field position. */
export const TRAINING_DEMO_START_DIFF = 40;

/** Every non-question choice in the tutorial is selected by visible index. */
export const TRAINING_FLOW_SCRIPT = {
  // Each ban leaves one declared category. That surviving category supplies
  // the real API questions for the corresponding half.
  banning: { playerCategoryIndex: 0, opponentCategoryIndex: 1, questionCategoryIndex: 2 },
  halftime: { playerCategoryIndex: 2, opponentCategoryIndex: 0, questionCategoryIndex: 1 },
} as const;

export const TRAINING_SCRIPT: TrainingScriptEntry[] = [
  // ── Half 1 ──
  // Q1: the only enabled answer is correct. 60–20 creates a visible flight,
  // cancellation and surviving-bar push without reaching the shot boundary.
  { requiredAnswer: "correct", botCorrectIfPlayerCorrect: true, botCorrectIfPlayerWrong: false, botDelayMs: 4000, botTimeSec: 5, playerPoints: 60, opponentPoints: 20 },
  // Q2: the next guided answer is a guaranteed perfect round. It starts from
  // Q1's +40 position, reaches 100 and resolves as a goal.
  { requiredAnswer: "correct", botCorrectIfPlayerCorrect: false, botCorrectIfPlayerWrong: false, botDelayMs: 5000, botTimeSec: 6, playerPoints: 100, opponentPoints: 0, startPossessionDiff: TRAINING_DEMO_START_DIFF, shotResult: "goal" },
  // Q3: rebuild from midfield to 70%.
  { requiredAnswer: "correct", botCorrectIfPlayerCorrect: true, botCorrectIfPlayerWrong: false, botDelayMs: 6000, botTimeSec: 7, playerPoints: 60, opponentPoints: 20 },
  // Q4: the explicit 100–50 lesson. From 70% this reaches 95%, NOT a shot.
  { requiredAnswer: "correct", botCorrectIfPlayerCorrect: true, botCorrectIfPlayerWrong: false, botDelayMs: 3500, botTimeSec: 5, playerPoints: 100, opponentPoints: 50 },
  // Q5: put-in-order. CoachBot pulls the field back from 95% to 80%.
  { requiredAnswer: "correct", botCorrectIfPlayerCorrect: true, botCorrectIfPlayerWrong: false, botDelayMs: 5500, botTimeSec: 6, playerPoints: 60, opponentPoints: 90 },
  // Q6: both correct; CoachBot is faster. Half ends at 70%.
  { requiredAnswer: "correct", botCorrectIfPlayerCorrect: true, botCorrectIfPlayerWrong: true, botDelayMs: 4000, botTimeSec: 4, playerPoints: 50, opponentPoints: 70 },

  // ── Half 2 ──
  // Q7: second-half reset, then CoachBot pushes to 30%.
  { requiredAnswer: "correct", botCorrectIfPlayerCorrect: true, botCorrectIfPlayerWrong: false, botDelayMs: 5000, botTimeSec: 6, playerPoints: 40, opponentPoints: 80, startPossessionDiff: 0 },
  // Q8: equal exchange holds the field.
  { requiredAnswer: "correct", botCorrectIfPlayerCorrect: true, botCorrectIfPlayerWrong: false, botDelayMs: 3000, botTimeSec: 3, playerPoints: 50, opponentPoints: 50 },
  // Q9: who-am-I; CoachBot pushes to 20%.
  { requiredAnswer: "correct", botCorrectIfPlayerCorrect: true, botCorrectIfPlayerWrong: false, botDelayMs: 6000, botTimeSec: 7, playerPoints: 60, opponentPoints: 80 },
  // Q10: player recovers to 30%.
  { requiredAnswer: "correct", botCorrectIfPlayerCorrect: true, botCorrectIfPlayerWrong: false, botDelayMs: 5000, botTimeSec: 6, playerPoints: 60, opponentPoints: 40 },
  // Q11: explicitly guided wrong answer lets CoachBot reach 0% and score.
  { requiredAnswer: "wrong", botCorrectIfPlayerCorrect: true, botCorrectIfPlayerWrong: true, botDelayMs: 2500, botTimeSec: 3, playerPoints: 0, opponentPoints: 100, shotResult: "goal" },
  // Q12: equal finish at midfield; regulation ends 1–1 for penalties.
  { requiredAnswer: "correct", botCorrectIfPlayerCorrect: true, botCorrectIfPlayerWrong: false, botDelayMs: 5500, botTimeSec: 6, playerPoints: 50, opponentPoints: 50 },
];

export interface TrainingPenaltyScriptEntry {
  shooterIsPlayer: boolean;
  requiredAnswer: Exclude<TrainingRequiredAnswer, "free">;
  result: Extract<TrainingShotResult, "goal" | "saved">;
  playerPoints: number;
  opponentPoints: number;
}

/** Two fixed pairs: score, save, score, concede. Player wins the shootout 2–1. */
export const TRAINING_PENALTY_SCRIPT: readonly TrainingPenaltyScriptEntry[] = [
  { shooterIsPlayer: true, requiredAnswer: "correct", result: "goal", playerPoints: 80, opponentPoints: 0 },
  { shooterIsPlayer: false, requiredAnswer: "correct", result: "saved", playerPoints: 70, opponentPoints: 0 },
  { shooterIsPlayer: true, requiredAnswer: "correct", result: "goal", playerPoints: 90, opponentPoints: 0 },
  { shooterIsPlayer: false, requiredAnswer: "wrong", result: "goal", playerPoints: 0, opponentPoints: 60 },
] as const;

/** Returns the one MCQ option the coach permits, or null for an ungated round. */
export function getTrainingRequiredAnswerIndex(
  script: Pick<TrainingScriptEntry, "requiredAnswer">,
  question: Pick<GameQuestion, "correctIndex" | "options">,
): number | null {
  if (script.requiredAnswer === "free") return null;
  if (script.requiredAnswer === "correct") return question.correctIndex;
  return question.options.findIndex((_, index) => index !== question.correctIndex);
}

export interface TrainingShotPlan {
  isPlayerAttacker: boolean;
  result: TrainingShotResult;
}

/**
 * Resolve the shot once, from the same script/state inputs used by both the
 * synthetic ranked payload and the local match state machine.
 */
export function getTrainingShotPlan(params: {
  script: TrainingScriptEntry;
  playerCorrect: boolean;
  opponentCorrect: boolean;
  projectedPosition: number;
}): TrainingShotPlan | null {
  const { script, playerCorrect, opponentCorrect, projectedPosition } = params;
  // A shot is a declared tutorial beat AND requires the meter to reach the
  // actual end of the pitch. Merely entering the attack zone (75–99) cannot
  // create the surprise shot that used to happen on the 100–50 Q4 exchange.
  if (!script.shotResult) return null;
  const isPlayerAttacker = playerCorrect && projectedPosition >= 100;
  const isOpponentAttacker = !playerCorrect && opponentCorrect && projectedPosition <= 0;
  if (!isPlayerAttacker && !isOpponentAttacker) return null;
  return { isPlayerAttacker, result: script.shotResult };
}

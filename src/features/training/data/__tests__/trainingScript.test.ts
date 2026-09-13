import { describe, expect, it } from "vitest";
import { TRAINING_QUESTIONS } from "../trainingQuestions";
import {
  TRAINING_DEMO_GOAL_INDEX,
  TRAINING_FLOW_SCRIPT,
  TRAINING_PENALTY_SCRIPT,
  TRAINING_SCRIPT,
  getTrainingRequiredAnswerIndex,
  getTrainingShotPlan,
} from "../trainingScript";

describe("trainingScript", () => {
  it("guides the first answer without triggering a shot", () => {
    const script = TRAINING_SCRIPT[0];
    expect(getTrainingRequiredAnswerIndex(script, TRAINING_QUESTIONS[0])).toBe(1);
    expect(getTrainingShotPlan({
      script,
      playerCorrect: true,
      opponentCorrect: true,
      projectedPosition: 70,
    })).toBeNull();
  });

  it("makes the second guided answer the deterministic goal scene", () => {
    const script = TRAINING_SCRIPT[TRAINING_DEMO_GOAL_INDEX];
    expect(TRAINING_DEMO_GOAL_INDEX).toBe(1);
    expect(getTrainingRequiredAnswerIndex(
      script,
      TRAINING_QUESTIONS[TRAINING_DEMO_GOAL_INDEX],
    )).toBe(TRAINING_QUESTIONS[TRAINING_DEMO_GOAL_INDEX].correctIndex);
    expect(getTrainingShotPlan({
      script,
      playerCorrect: true,
      opponentCorrect: false,
      projectedPosition: 100,
    })).toEqual({ isPlayerAttacker: true, result: "goal" });
  });

  it("keeps the 100–50 Q4 exchange below the goal line with no shot", () => {
    const script = TRAINING_SCRIPT[3];
    expect(script).toMatchObject({ playerPoints: 100, opponentPoints: 50 });
    expect(getTrainingShotPlan({
      script,
      playerCorrect: true,
      opponentCorrect: true,
      projectedPosition: 95,
    })).toBeNull();
    // Even a boundary cannot shoot unless that question explicitly declares
    // a shot beat in the tutorial script.
    expect(getTrainingShotPlan({
      script,
      playerCorrect: true,
      opponentCorrect: true,
      projectedPosition: 100,
    })).toBeNull();
  });

  it("allows only the two declared regulation shots", () => {
    const declared = TRAINING_SCRIPT
      .map((entry, index) => entry.shotResult ? index : null)
      .filter((index): index is number => index !== null);
    expect(declared).toEqual([1, 10]);

    const opponentGoal = TRAINING_SCRIPT[10];
    expect(getTrainingRequiredAnswerIndex(opponentGoal, TRAINING_QUESTIONS[10])).toBe(0);
    expect(getTrainingShotPlan({
      script: opponentGoal,
      playerCorrect: false,
      opponentCorrect: true,
      projectedPosition: 0,
    })).toEqual({ isPlayerAttacker: false, result: "goal" });
  });

  it("scripts every score and every penalty kick", () => {
    expect(TRAINING_SCRIPT).toHaveLength(12);
    expect(TRAINING_SCRIPT.every((entry) => (
      Number.isFinite(entry.playerPoints) && Number.isFinite(entry.opponentPoints)
    ))).toBe(true);
    expect(TRAINING_PENALTY_SCRIPT).toEqual([
      { shooterIsPlayer: true, requiredAnswer: "correct", result: "goal", playerPoints: 80, opponentPoints: 0 },
      { shooterIsPlayer: false, requiredAnswer: "correct", result: "saved", playerPoints: 70, opponentPoints: 0 },
      { shooterIsPlayer: true, requiredAnswer: "correct", result: "goal", playerPoints: 90, opponentPoints: 0 },
      { shooterIsPlayer: false, requiredAnswer: "wrong", result: "goal", playerPoints: 0, opponentPoints: 60 },
    ]);
  });

  it("declares the surviving question category for both ban phases", () => {
    expect(new Set(Object.values(TRAINING_FLOW_SCRIPT.banning))).toEqual(new Set([0, 1, 2]));
    expect(new Set(Object.values(TRAINING_FLOW_SCRIPT.halftime))).toEqual(new Set([0, 1, 2]));
  });
});

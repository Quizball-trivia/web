import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TRAINING_DEMO_GOAL_INDEX,
  TRAINING_SCRIPT,
  getTrainingRequiredAnswerIndex,
} from "../../data/trainingScript";
import { useTrainingMatch } from "../useTrainingMatch";

describe("useTrainingMatch scripted lesson", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("gates Q1, then makes Q2 a resolved shot before the celebration", () => {
    const { result, unmount } = renderHook(() => useTrainingMatch(false));

    act(() => result.current.startQuestion(0));
    expect(result.current.state.answerStates).toEqual([
      "disabled",
      "default",
      "disabled",
      "disabled",
    ]);

    // A disabled option cannot change the scripted state.
    act(() => result.current.handleAnswer(0));
    expect(result.current.state.selectedAnswer).toBeNull();

    act(() => result.current.handleAnswer(1));
    expect(result.current.state.phase).toBe("reveal");
    expect(result.current.state.playerSplashPoints).toBe(60);
    expect(result.current.state.opponentSplashPoints).toBe(20);

    act(() => result.current.advanceAfterReveal());
    expect(result.current.state.questionIndex).toBe(TRAINING_DEMO_GOAL_INDEX);
    expect(result.current.state.playerPosition).toBe(70);

    act(() => result.current.handleAnswer(1));
    expect(result.current.state.playerSplashPoints).toBe(100);
    expect(result.current.state.opponentSplashPoints).toBe(0);
    expect(result.current.state.opponentAnswer).toBe(0);

    act(() => result.current.advanceAfterReveal());
    expect(result.current.state.phase).toBe("shot");
    expect(result.current.state.playerPosition).toBe(100);
    expect(result.current.state.shotMode).toMatchObject({
      result: "goal",
      isPlayerAttacker: true,
      originPosition: 70,
    });
    expect(result.current.state.showGoalCelebration).toBe(false);

    act(() => result.current.showGoalCelebration());
    expect(result.current.state.phase).toBe("shot");
    expect(result.current.state.showGoalCelebration).toBe(true);
    expect(result.current.state.playerGoals).toBe(1);

    act(() => result.current.finishGoalCelebration());
    expect(result.current.state.phase).toBe("goal");
    expect(result.current.state.showGoalCelebration).toBe(false);
    expect(result.current.state.shotMode).toBeNull();
    expect(result.current.state.playerPosition).toBe(50);

    unmount();
  });

  it("follows the complete fixed regulation script with no surprise Q4 shot", () => {
    const { result, unmount } = renderHook(() => useTrainingMatch(false));

    const answerAndAdvance = () => {
      const qIndex = result.current.state.questionIndex;
      const question = result.current.state.question!;
      const required = getTrainingRequiredAnswerIndex(TRAINING_SCRIPT[qIndex], question)!;
      act(() => result.current.handleAnswer(required));
      act(() => result.current.advanceAfterReveal());
    };

    act(() => result.current.startQuestion(0));
    answerAndAdvance(); // Q1 → Q2
    answerAndAdvance(); // Q2 shot
    act(() => result.current.showGoalCelebration());
    act(() => result.current.finishGoalCelebration());
    act(() => result.current.continueAfterPhase());

    answerAndAdvance(); // Q3 → Q4 at 70%
    expect(result.current.state.questionIndex).toBe(3);
    act(() => result.current.handleAnswer(2));
    expect(result.current.state.playerSplashPoints).toBe(100);
    expect(result.current.state.opponentSplashPoints).toBe(50);
    act(() => result.current.advanceAfterReveal());
    expect(result.current.state.phase).toBe("playing");
    expect(result.current.state.questionIndex).toBe(4);
    expect(result.current.state.playerPosition).toBe(95);
    expect(result.current.state.shotMode).toBeNull();

    answerAndAdvance(); // Q5 → Q6
    answerAndAdvance(); // Q6 → halftime
    expect(result.current.state.stage).toBe("halftime");
    act(() => result.current.startSecondHalf());

    answerAndAdvance(); // Q7
    answerAndAdvance(); // Q8
    answerAndAdvance(); // Q9
    answerAndAdvance(); // Q10
    expect(result.current.state.questionIndex).toBe(10);
    expect(result.current.state.playerPosition).toBe(30);

    const scriptedWrong = getTrainingRequiredAnswerIndex(
      TRAINING_SCRIPT[10],
      result.current.state.question!,
    )!;
    expect(scriptedWrong).not.toBe(result.current.state.question!.correctIndex);
    act(() => result.current.handleAnswer(scriptedWrong));
    act(() => result.current.advanceAfterReveal());
    expect(result.current.state.shotMode).toMatchObject({
      result: "goal",
      isPlayerAttacker: false,
      originPosition: 30,
    });

    act(() => result.current.showGoalCelebration());
    act(() => result.current.finishGoalCelebration());
    expect(result.current.state.playerGoals).toBe(1);
    expect(result.current.state.opponentGoals).toBe(1);
    act(() => result.current.continueAfterPhase());
    answerAndAdvance(); // Q12 → penalties
    expect(result.current.state.stage).toBe("penalties");
    expect(result.current.state.playerGoals).toBe(1);
    expect(result.current.state.opponentGoals).toBe(1);

    unmount();
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  acquireRoadToGoalMutation,
  didRoadToGoalMutationAdvance,
  type PendingRoadToGoalMutation,
} from "../roadToGoalMutations";

const answerIntent = {
  kind: "answer" as const,
  roundId: "round-1",
  questionId: "question-1",
  optionId: "option-a",
  expectedVersion: 3,
};

describe("Road to Goal mutation identity", () => {
  it("reuses the nonce only when the action and payload are identical", () => {
    const createNonce = vi.fn(() => "nonce-1");
    const first = acquireRoadToGoalMutation(null, answerIntent, createNonce);
    const retry = acquireRoadToGoalMutation(first.pending, { ...answerIntent }, createNonce);

    expect(retry).toEqual({ pending: first.pending, blocked: false });
    expect(createNonce).toHaveBeenCalledTimes(1);
  });

  it("retains both prepare and finalize nonces across a start retry", () => {
    const createNonce = vi.fn()
      .mockReturnValueOnce("prepare-nonce")
      .mockReturnValueOnce("finalize-nonce");
    const intent = {
      kind: "start" as const,
      stake: 25 as const,
      clientSeed: "player-seed",
      autoCashoutZone: 4,
    };

    const first = acquireRoadToGoalMutation(null, intent, createNonce);
    const retry = acquireRoadToGoalMutation(first.pending, intent, createNonce);

    expect(first.pending).toMatchObject({
      nonce: "prepare-nonce",
      finalizeNonce: "finalize-nonce",
    });
    expect(retry).toEqual({ pending: first.pending, blocked: false });
    expect(createNonce).toHaveBeenCalledTimes(2);
  });

  it("blocks a changed payload without replacing or reusing the pending nonce", () => {
    const pending: PendingRoadToGoalMutation = {
      intent: answerIntent,
      nonce: "nonce-1",
    };
    const createNonce = vi.fn(() => "nonce-2");
    const result = acquireRoadToGoalMutation(
      pending,
      { ...answerIntent, optionId: "option-b" },
      createNonce,
    );

    expect(result).toEqual({ pending, blocked: true });
    expect(createNonce).not.toHaveBeenCalled();
  });

  it("blocks a different decision action while cash-out is unresolved", () => {
    const pending: PendingRoadToGoalMutation = {
      intent: {
        kind: "cashout",
        roundId: "round-1",
        expectedVersion: 8,
      },
      nonce: "nonce-1",
    };

    const result = acquireRoadToGoalMutation(
      pending,
      { kind: "continue", roundId: "round-1", expectedVersion: 8 },
      () => "nonce-2",
    );

    expect(result).toEqual({ pending, blocked: true });
  });

  it("clears an ambiguous mutation only after reconciliation advances it", () => {
    const pending: PendingRoadToGoalMutation = {
      intent: answerIntent,
      nonce: "nonce-1",
    };

    expect(didRoadToGoalMutationAdvance(pending, {
      roundId: "round-1",
      stateVersion: 3,
      status: "active",
    })).toBe(false);
    expect(didRoadToGoalMutationAdvance(pending, {
      roundId: "round-1",
      stateVersion: 4,
      status: "active",
    })).toBe(true);
    expect(didRoadToGoalMutationAdvance(pending, {
      roundId: "round-1",
      stateVersion: 3,
      status: "lost",
    })).toBe(true);
  });
});

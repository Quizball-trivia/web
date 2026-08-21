export type RoadToGoalMutationIntent =
  | {
      kind: "start";
      stake: 10 | 25 | 50;
      clientSeed: string;
      autoCashoutZone: number | null;
    }
  | {
      kind: "answer";
      roundId: string;
      questionId: string;
      optionId: string;
      expectedVersion: number;
    }
  | {
      kind: "continue" | "cashout";
      roundId: string;
      expectedVersion: number;
    };

export type PendingRoadToGoalMutation = {
  intent: RoadToGoalMutationIntent;
  nonce: string;
  /** Start is a two-step commit/finalize handshake, so both request identities
   * must survive an ambiguous network response. */
  finalizeNonce?: string;
};

export type RoadToGoalReconciledState = {
  roundId: string;
  stateVersion: number;
  status: string;
};

function isSameIntent(
  left: RoadToGoalMutationIntent,
  right: RoadToGoalMutationIntent,
): boolean {
  if (left.kind !== right.kind) return false;

  switch (left.kind) {
    case "start":
      return (
        right.kind === "start"
        && left.stake === right.stake
        && left.clientSeed === right.clientSeed
        && left.autoCashoutZone === right.autoCashoutZone
      );
    case "answer":
      return (
        right.kind === "answer"
        && left.roundId === right.roundId
        && left.questionId === right.questionId
        && left.optionId === right.optionId
        && left.expectedVersion === right.expectedVersion
      );
    case "continue":
    case "cashout":
      return (
        right.kind === left.kind
        && left.roundId === right.roundId
        && left.expectedVersion === right.expectedVersion
      );
  }
}

export function acquireRoadToGoalMutation(
  pending: PendingRoadToGoalMutation | null,
  intent: RoadToGoalMutationIntent,
  createNonce: () => string,
): { pending: PendingRoadToGoalMutation; blocked: boolean } {
  if (!pending) {
    return {
      pending: {
        intent,
        nonce: createNonce(),
        finalizeNonce: intent.kind === "start" ? createNonce() : undefined,
      },
      blocked: false,
    };
  }

  if (isSameIntent(pending.intent, intent)) {
    return { pending, blocked: false };
  }

  return { pending, blocked: true };
}

export function didRoadToGoalMutationAdvance(
  pending: PendingRoadToGoalMutation,
  state: RoadToGoalReconciledState,
): boolean {
  if (pending.intent.kind === "start") return true;
  if (state.roundId !== pending.intent.roundId) return true;
  return (
    state.stateVersion > pending.intent.expectedVersion
    || state.status !== "active"
  );
}

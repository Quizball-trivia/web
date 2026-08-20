import { API_BASE_URL } from "@/lib/config";
import { getSupabaseAccessToken } from "@/lib/auth/supabase";
import type { components } from "@/types/api.generated";

export type RoadToGoalState = components["schemas"]["RoadToGoalStateResponse"];
export type RoadToGoalCommitment = components["schemas"]["RoadToGoalCommitmentResponse"];
export type RoadToGoalAnswerResult = components["schemas"]["RoadToGoalAnswerResponse"];
export type RoadToGoalProof = components["schemas"]["RoadToGoalProofResponse"];
export type RoadToGoalQuestion = NonNullable<RoadToGoalState["question"]>;

export class RoadToGoalApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "RoadToGoalApiError";
  }
}

async function call<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  const headers = new Headers({ "Content-Type": "application/json" });
  const token = await getSupabaseAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (payload as { message?: string; error?: { message?: string } } | null)?.message
      ?? (payload as { error?: { message?: string } } | null)?.error?.message
      ?? `Request failed (${response.status})`;
    throw new RoadToGoalApiError(message, response.status);
  }
  return payload as T;
}

export const roadToGoalApi = {
  prepare(input: {
    stake: 10 | 25 | 50;
    requestNonce: string;
    autoCashoutZone: number | null;
  }): Promise<RoadToGoalCommitment> {
    return call("/api/v1/road-to-goal/rounds/commitments", "POST", {
      stake: input.stake,
      request_nonce: input.requestNonce,
      auto_cashout_zone: input.autoCashoutZone,
    });
  },

  start(input: {
    commitmentId: string;
    clientNonce: string;
    clientSeed: string;
  }): Promise<RoadToGoalState> {
    return call("/api/v1/road-to-goal/rounds", "POST", {
      commitment_id: input.commitmentId,
      client_nonce: input.clientNonce,
      client_seed: input.clientSeed,
    });
  },

  async current(): Promise<RoadToGoalState | null> {
    try {
      return await call<RoadToGoalState>("/api/v1/road-to-goal/rounds/current", "GET");
    } catch (error) {
      if (error instanceof RoadToGoalApiError && error.status === 404) return null;
      throw error;
    }
  },

  get(roundId: string): Promise<RoadToGoalState> {
    return call(`/api/v1/road-to-goal/rounds/${roundId}`, "GET");
  },

  answer(input: {
    roundId: string;
    questionId: string;
    optionId: string;
    expectedVersion: number;
    requestNonce: string;
  }): Promise<RoadToGoalAnswerResult> {
    return call("/api/v1/road-to-goal/rounds/answer", "POST", {
      round_id: input.roundId,
      question_id: input.questionId,
      option_id: input.optionId,
      expected_version: input.expectedVersion,
      request_nonce: input.requestNonce,
    });
  },

  continue(input: {
    roundId: string;
    expectedVersion: number;
    requestNonce: string;
  }): Promise<RoadToGoalState> {
    return call("/api/v1/road-to-goal/rounds/continue", "POST", {
      round_id: input.roundId,
      expected_version: input.expectedVersion,
      request_nonce: input.requestNonce,
    });
  },

  cashout(input: {
    roundId: string;
    expectedVersion: number;
    requestNonce: string;
  }): Promise<RoadToGoalState> {
    return call("/api/v1/road-to-goal/rounds/cashout", "POST", {
      round_id: input.roundId,
      expected_version: input.expectedVersion,
      request_nonce: input.requestNonce,
    });
  },

  proof(roundId: string): Promise<RoadToGoalProof> {
    return call(`/api/v1/road-to-goal/rounds/${roundId}/proof`, "GET");
  },

  heartbeat(): Promise<void> {
    return call("/api/v1/road-to-goal/rounds/heartbeat", "POST", {});
  },
};

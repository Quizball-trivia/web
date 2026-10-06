import { describe, expect, it, vi } from "vitest";
import { RoadToGoalApiError } from "@/lib/repositories/roadToGoal.repo";
import { PartnerApiError } from "../../../api/partnerApiClient";
import { createPartnerRoadToGoalClient, type PartnerRoadToGoalWireState } from "../partnerRoadToGoalClient";

const wire = (over: Partial<PartnerRoadToGoalWireState> = {}): PartnerRoadToGoalWireState => ({
  run_id: "run-1",
  play_id: "play-1",
  status: "active",
  phase: "question",
  state_version: 1,
  start_points: 100,
  cleared_zones: 0,
  total_zones: 11,
  zone_multipliers_bp: [10300],
  current_multiplier_bp: 10000,
  next_multiplier_bp: 10300,
  current_points: 100,
  next_points: 103,
  decision_deadline_at: null,
  question: {
    question_id: "q1", zone: 1, difficulty: "easy", prompt: { en: "Q" }, image: null,
    options: [{ id: "a", text: { en: "A" } }], duration_ms: 15000, deadline_at: "2026-10-05T10:00:15.000Z",
  },
  score: null,
  settlement_reason: null,
  server_now: "2026-10-05T10:00:00.000Z",
  ...over,
});

describe("partner Road to Goal client", () => {
  it("maps points onto the screen's round shape and starts with the start id", async () => {
    const api = { get: vi.fn(), post: vi.fn().mockResolvedValue(wire()) };
    const client = createPartnerRoadToGoalClient(api);
    const state = await client.start("start-1");
    expect(api.post).toHaveBeenCalledWith("runs", { start_id: "start-1" });
    expect(state).toMatchObject({ round_id: "run-1", stake_coins: 100, current_return_coins: 100, next_return_coins: 103, auto_cashout_zone: null });
    expect(state.question).toMatchObject({ question_id: "q1", correct_survival_bp: 0 });
  });

  it("an answer survives only when right, and the last state carries the play id for the host", async () => {
    const settled = wire({ status: "lost", phase: "settled", question: null, score: 0, state_version: 2 });
    const api = { get: vi.fn(), post: vi.fn().mockResolvedValue({ outcome: "wrong", correct_option_id: "a", state: settled }) };
    const client = createPartnerRoadToGoalClient(api);
    const result = await client.answer({ roundId: "run-1", questionId: "q1", optionId: "b", expectedVersion: 1, requestNonce: "n" });
    expect(api.post).toHaveBeenCalledWith("runs/run-1/answer", { question_id: "q1", option_id: "b", expected_version: 1 });
    expect(result).toMatchObject({ outcome: "wrong", survived: false, correct_option_id: "a", state: { status: "lost", payout_coins: 0 } });
    expect(client.last()).toMatchObject({ play_id: "play-1", score: 0 });
  });

  it("turns partner errors into the screen's error type and reads a missing open run as none", async () => {
    const api = {
      get: vi.fn().mockRejectedValue(new PartnerApiError(404, "not_found", "No open run")),
      post: vi.fn().mockRejectedValue(new PartnerApiError(409, "stale_version", "changed")),
    };
    const client = createPartnerRoadToGoalClient(api);
    await expect(client.current()).resolves.toBeNull();
    await expect(client.cashout({ roundId: "run-1", expectedVersion: 1, requestNonce: "n" })).rejects.toMatchObject({ status: 409 });
    await expect(client.cashout({ roundId: "run-1", expectedVersion: 1, requestNonce: "n" })).rejects.toBeInstanceOf(RoadToGoalApiError);
  });
});

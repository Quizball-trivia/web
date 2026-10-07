import { describe, expect, it, vi } from "vitest";
import { TriviaMinesApiError } from "@/lib/repositories/triviaMines.repo";
import { PartnerApiError } from "../../../api/partnerApiClient";
import { createPartnerTriviaMinesClient, type PartnerTriviaMinesWireState } from "../partnerTriviaMinesClient";

const wire = (over: Partial<PartnerTriviaMinesWireState> = {}): PartnerTriviaMinesWireState => ({
  run_id: "run-1",
  play_id: "play-1",
  status: "active",
  phase: "picking",
  state_version: 1,
  start_points: 100,
  max_points: 1000,
  points: 100,
  next_points: 115,
  mult_bp: 10000,
  opened: [],
  flagged: [],
  bust_tile: null,
  scouts_left: 3,
  board_size: 25,
  defender_count: 4,
  question: null,
  score: null,
  settlement_reason: null,
  reveal: null,
  server_now: "2026-10-05T10:00:00.000Z",
  ...over,
});

describe("partner Trivia Mines client", () => {
  it("starts with the nonce as start id (no stake) and maps points onto the board shape", async () => {
    const api = { get: vi.fn(), post: vi.fn().mockResolvedValue(wire()) };
    const client = createPartnerTriviaMinesClient(api);
    const state = await client.start(250, "nonce-1");
    expect(api.post).toHaveBeenCalledWith("runs", { start_id: "nonce-1" });
    expect(state).toMatchObject({ round_id: "run-1", stake_coins: 100, pot_coins: 100, next_pot_coins: 115, reveal: null });
  });

  it("a returned (cancelled) run reads as expired; the settled board reveals the defenders", async () => {
    const api = { get: vi.fn().mockResolvedValue(wire({ status: "cancelled", phase: "settled", reveal: { defenders: [1, 2, 3, 4] } })), post: vi.fn() };
    const state = await createPartnerTriviaMinesClient(api).latest();
    expect(state).toMatchObject({ status: "expired", reveal: { defenders: [1, 2, 3, 4] } });
  });

  it("keeps the last state for the host and turns partner errors into the screen's error type", async () => {
    const cashed = wire({ status: "cashed", phase: "settled", score: 138, state_version: 4 });
    const api = {
      get: vi.fn().mockRejectedValue(new PartnerApiError(404, "not_found", "No open run")),
      post: vi.fn().mockResolvedValueOnce({ safe: true, state: cashed }).mockRejectedValueOnce(new PartnerApiError(409, "stale_version", "changed")),
    };
    const client = createPartnerTriviaMinesClient(api);
    await client.pick("run-1", 3, 3);
    expect(api.post).toHaveBeenCalledWith("runs/run-1/pick", { tile: 3, expected_version: 3 });
    expect(client.last()).toMatchObject({ play_id: "play-1", score: 138 });
    await expect(client.current()).resolves.toBeNull();
    await expect(client.cashout("run-1", 4)).rejects.toBeInstanceOf(TriviaMinesApiError);
    await expect(client.stats()).resolves.toEqual({ playing_now: 0, recent_wins: [], top_runs: [] });
  });
});

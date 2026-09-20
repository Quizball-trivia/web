import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/supabase", () => ({
  getSupabaseAccessToken: vi.fn().mockResolvedValue("test-token"),
}));

import { roadToGoalApi } from "../roadToGoal.repo";

const fetchMock = vi.fn();

describe("roadToGoalApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prepares the commitment before finalizing with the player seed", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ round_id: "round" }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }));

    await roadToGoalApi.prepare({
      stake: 25,
      requestNonce: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      autoCashoutZone: 4,
    });

    const [prepareUrl, prepareInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(prepareUrl).toContain("/api/v1/road-to-goal/rounds/commitments");
    expect(JSON.parse(String(prepareInit.body))).toEqual({
      stake: 25,
      request_nonce: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      auto_cashout_zone: 4,
    });

    await roadToGoalApi.start({
      commitmentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      clientNonce: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      clientSeed: "player-seed",
    });
    const [startUrl, startInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(startUrl).toContain("/api/v1/road-to-goal/rounds");
    expect(JSON.parse(String(startInit.body))).toEqual({
      commitment_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      client_nonce: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      client_seed: "player-seed",
    });
    expect(new Headers(startInit.headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("returns null only for the no-active-round response", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    }));

    await expect(roadToGoalApi.current()).resolves.toBeNull();
  });

  it("includes a stable request nonce on answer mutations", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ outcome: "correct" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    await roadToGoalApi.answer({
      roundId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      questionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      optionId: "answer-a",
      expectedVersion: 3,
      requestNonce: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual(expect.objectContaining({
      expected_version: 3,
      request_nonce: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    }));
  });
});

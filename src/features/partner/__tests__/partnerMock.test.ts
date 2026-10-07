import { afterEach, describe, expect, it, vi } from "vitest";
import { createPartnerApiClient, defaultPartnerTransport, PartnerApiError } from "../api/partnerApiClient";
import { createMockPartnerTransport, nextTbilisiMidnight, tbilisiDay } from "../api/partnerMock";

afterEach(() => vi.unstubAllEnvs());

function mockClient(now = () => new Date("2026-10-05T10:00:00Z")) {
  let token: string | null = null;
  const onSessionEnded = vi.fn();
  const client = createPartnerApiClient({
    transport: createMockPartnerTransport({ latencyMs: 0, now }),
    getAccessToken: () => token,
    onSessionEnded,
  });
  return { client, onSessionEnded, setToken: (value: string | null) => (token = value) };
}

describe("partner mock API", () => {
  it("redeems any token and serves the seeded default games with a mix of states", async () => {
    const { client, setToken } = mockClient();
    const session = await client.redeem("anything");
    setToken(session.accessToken);

    const games = await client.getMyGames();
    expect(games.partnerDay).toBe("2026-10-05");
    expect(games.resetsAt).toBe("2026-10-05T20:00:00.000Z");
    expect(games.games.map((game) => game.gameId)).toEqual([
      "ranked", "guess-the-goal", "true-false", "countdown", "pick-em", "career-path",
      "higher-lower", "card-detective", "road-to-goal", "trivia-mines", "quiz-board",
    ]);
    expect(games.games[0]).toMatchObject({ gameId: "ranked", playsLimit: 10, playsLeft: 7 });
    expect(games.games.some((game) => game.available && game.playsLeft === 0)).toBe(true);
    expect(games.games.some((game) => !game.available)).toBe(true);
  });

  it("returns the contract errors for the special launch tokens", async () => {
    const { client } = mockClient();
    await expect(client.redeem("used")).rejects.toMatchObject({ status: 400, code: "token_used" });
    await expect(client.redeem("blocked")).rejects.toMatchObject({ status: 403, code: "player_blocked" });
  });

  it("ends the session for the 'ends' token and on a missing access token", async () => {
    const { client, onSessionEnded, setToken } = mockClient();
    setToken((await client.redeem("ends")).accessToken);
    await expect(client.getMyGames()).rejects.toBeInstanceOf(PartnerApiError);
    expect(onSessionEnded).toHaveBeenCalledTimes(1);

    setToken(null);
    await expect(client.getMyGames()).rejects.toMatchObject({ status: 401, code: "session_ended" });
    expect(onSessionEnded).toHaveBeenCalledTimes(2);
  });

  it("rotates the access token on refresh", async () => {
    const { client, setToken } = mockClient();
    const first = await client.redeem("x");
    setToken(first.accessToken);
    const second = await client.refresh();
    expect(second.accessToken).not.toBe(first.accessToken);
    await expect(client.getMyGames()).rejects.toMatchObject({ status: 401 });
  });

  it("is used only when NEXT_PUBLIC_PARTNER_API_MOCK=1", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEXT_PUBLIC_PARTNER_API_MOCK", "1");
    await defaultPartnerTransport()("/partner/v1/sessions/redeem", { method: "POST", headers: {}, body: JSON.stringify({ token: "t" }) });
    expect(fetchMock).not.toHaveBeenCalled();

    vi.stubEnv("NEXT_PUBLIC_PARTNER_API_MOCK", "");
    await defaultPartnerTransport()("/partner/v1/me/games", { method: "GET", headers: {} });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/partner\/v1\/me\/games$/), expect.objectContaining({ credentials: "omit" }));
    vi.unstubAllGlobals();
  });

  it("computes the Tbilisi day and its next midnight", () => {
    expect(tbilisiDay(new Date("2026-10-05T19:59:59Z"))).toBe("2026-10-05");
    expect(tbilisiDay(new Date("2026-10-05T20:00:00Z"))).toBe("2026-10-06");
    expect(nextTbilisiMidnight(new Date("2026-10-05T20:00:00Z")).toISOString()).toBe("2026-10-06T20:00:00.000Z");
  });
});

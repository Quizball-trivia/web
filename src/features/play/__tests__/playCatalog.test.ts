import { describe, expect, it, vi } from "vitest";
import { DAILY_CHALLENGE_SLUGS, PLAY_WITH_COINS_SLUGS, parsePlayPopularity, playOrderFrom, playPopularityKey } from "../playCatalog";
import { createPlayOrderLoader } from "../playOrderLoader";

const NOW = new Date("2026-10-11T12:00:00Z");

describe("playPopularityKey", () => {
  it("names each card's game the way the backend counts it", () => {
    expect(playPopularityKey("daily-trueFalse")).toBe("daily:trueFalse");
    expect(playPopularityKey("lab-missing-xi")).toBe("daily:missingXi");
    expect(playPopularityKey("mini-final-third")).toBe("free-kicks");
    expect(playPopularityKey("minuto")).toBe("minuto");
    expect(playPopularityKey("buscaminas")).toBe("buscaminas");
  });
});

describe("playOrderFrom", () => {
  it("keeps the hand-made order when there are no numbers, and still marks new games", () => {
    for (const empty of [null, { generated_at: null, games: {} }]) {
      expect(playOrderFrom(empty, NOW)).toEqual({ daily: null, coins: null, newSlugs: ["minuto", "shared-player", "name-chain", "buscaminas", "pistas", "ultimo"] });
    }
  });

  it("orders each row by its own numbers and keeps every card", () => {
    const order = playOrderFrom({
      generated_at: "2026-10-11T11:00:00Z",
      games: {
        "daily:statSniper": { players_7d: 900, players_3d: 400 },
        "daily:trueFalse": { players_7d: 300, players_3d: 130 },
        minuto: { players_7d: 50, players_3d: 20 },
        "free-kicks": { players_7d: 20, players_3d: 9 },
        "squad-spin": { players_7d: 200, players_3d: 90 },
      },
    }, NOW);
    expect(order.daily?.[0]).toBe("daily-statSniper");
    expect([...(order.daily ?? [])].sort()).toEqual([...DAILY_CHALLENGE_SLUGS].sort());
    expect(order.coins?.[0]).toBe("mini-squad-spin");
    expect([...(order.coins ?? [])].sort()).toEqual([...PLAY_WITH_COINS_SLUGS].sort());
  });

  it("keeps the hand-made order of a row that has no counts of its own", () => {
    const order = playOrderFrom({ generated_at: null, games: { "squad-spin": { players_7d: 9, players_3d: 3 } } }, NOW);
    expect(order.daily).toBeNull();
    expect(order.coins?.[0]).toBe("mini-squad-spin");
  });

  it("stops marking a game as new three weeks after its release", () => {
    expect(playOrderFrom(null, new Date("2026-10-26T12:00:00Z")).newSlugs).toEqual(["tenable", "shared-player", "name-chain", "football-horserace"]);
    expect(playOrderFrom(null, new Date("2026-11-15T12:00:00Z")).newSlugs).toEqual([]);
  });
});

describe("parsePlayPopularity", () => {
  it("keeps well-formed counts and drops everything else", () => {
    expect(parsePlayPopularity({ generated_at: "x", games: { a: { players_7d: 3, players_3d: 1 }, b: { players_7d: -1, players_3d: 0 }, c: null, d: { players_7d: "9" } } }))
      .toEqual({ generated_at: "x", games: { a: { players_7d: 3, players_3d: 1 } } });
  });

  it("treats a body without usable counts as no numbers", () => {
    for (const body of [null, "text", {}, { games: null }, { games: [] }, { games: {} }, { games: { a: { players_7d: "900", players_3d: 4 } } }]) {
      expect(parsePlayPopularity(body)).toBeNull();
    }
  });
});

describe("createPlayOrderLoader", () => {
  const numbers = (players: number) => ({ generated_at: "x", games: { "daily:statSniper": { players_7d: players, players_3d: 1 } } });

  it("waits for the first read only, then serves what it has while a refresh runs behind", async () => {
    let now = Date.parse("2026-10-11T12:00:00Z");
    let finish: (value: ReturnType<typeof numbers>) => void = () => undefined;
    const read = vi.fn()
      .mockResolvedValueOnce(numbers(900))
      .mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const keepAlive = vi.fn();
    const load = createPlayOrderLoader(read, { clock: () => now, keepAlive });
    expect((await load()).daily?.[0]).toBe("daily-statSniper");
    now += 5 * 60_000;
    await load();
    expect(read).toHaveBeenCalledTimes(1);
    now += 6 * 60_000;
    // The refresh has not answered: the page is not kept waiting.
    expect((await load()).daily?.[0]).toBe("daily-statSniper");
    expect(read).toHaveBeenCalledTimes(2);
    // The host is told about the work that outlives this page, once per page that started or joined it.
    expect(keepAlive).toHaveBeenCalledTimes(2);
    finish(numbers(0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((await load()).daily?.[0]).not.toBe("daily-statSniper");
  });

  it("keeps the hand-made order when the endpoint fails, and leaves it alone for two minutes", async () => {
    let now = Date.parse("2026-10-11T12:00:00Z");
    const read = vi.fn().mockRejectedValue(new Error("404"));
    const load = createPlayOrderLoader(read, { clock: () => now });
    expect(await load()).toMatchObject({ daily: null, coins: null });
    now += 60_000;
    await load();
    expect(read).toHaveBeenCalledTimes(1);
    now += 61_000;
    await load();
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("keeps the last good numbers when a later read fails", async () => {
    let now = Date.parse("2026-10-11T12:00:00Z");
    const read = vi.fn().mockResolvedValueOnce(numbers(900)).mockResolvedValue(null);
    const load = createPlayOrderLoader(read, { clock: () => now });
    await load();
    now += 11 * 60_000;
    await load();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((await load()).daily?.[0]).toBe("daily-statSniper");
  });

  it("does not hold the first page up for a slow first read", async () => {
    let finish: (value: ReturnType<typeof numbers>) => void = () => undefined;
    const read = vi.fn().mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const load = createPlayOrderLoader(read, { firstWaitMs: 5 });
    expect(await load()).toMatchObject({ daily: null, coins: null });
    // Pages arriving while it is still running join the same read.
    expect(await load()).toMatchObject({ daily: null });
    expect(read).toHaveBeenCalledTimes(1);
    finish(numbers(900));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((await load()).daily?.[0]).toBe("daily-statSniper");
  });

  it("drops counts that could not be refreshed for a day", async () => {
    let now = Date.parse("2026-10-11T12:00:00Z");
    const read = vi.fn().mockResolvedValueOnce(numbers(900)).mockResolvedValue(null);
    const load = createPlayOrderLoader(read, { clock: () => now });
    expect((await load()).daily?.[0]).toBe("daily-statSniper");
    now += 23 * 60 * 60_000;
    await load();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((await load()).daily?.[0]).toBe("daily-statSniper");
    now += 2 * 60 * 60_000;
    expect((await load()).daily).toBeNull();
  });

  it("uses a first read that answers while the page waits, on a moving clock", async () => {
    const read = vi.fn().mockImplementation(async () => numbers(900));
    const load = createPlayOrderLoader(read);
    expect((await load()).daily?.[0]).toBe("daily-statSniper");
  });

  it("drops a copy the backend counted more than a day ago", async () => {
    const now = Date.parse("2026-10-11T12:00:00Z");
    const old = { ...numbers(900), generated_at: "2026-10-10T11:00:00Z" };
    const load = createPlayOrderLoader(vi.fn().mockResolvedValue(old), { clock: () => now });
    expect((await load()).daily).toBeNull();
  });

  it("asks again when the clock has gone backwards", async () => {
    let now = Date.parse("2026-10-11T12:00:00Z");
    const read = vi.fn().mockResolvedValue(numbers(900));
    const load = createPlayOrderLoader(read, { clock: () => now });
    await load();
    now -= 60 * 60_000;
    await load();
    expect(read).toHaveBeenCalledTimes(2);
  });
});

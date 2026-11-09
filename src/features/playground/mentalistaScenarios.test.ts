import { describe, expect, it } from "vitest";
import { standings } from "@/features/mentalista/mentalista.engine";
import { _mentalistaFixtures } from "./mentalistaScenarios";

/**
 * Guards that the playground fixtures actually mean what their labels claim. The earlier data reused a round-0 name in a
 * later category (out-of-category → the round silently voided), so "you won" / "tied" / "you read it" screens showed the
 * wrong outcome. These assertions fail loudly if a fixture drifts back into an impossible or mislabelled state. (The
 * builders themselves throw on any rejected command, so an out-of-category pick can no longer pass unnoticed.)
 */
describe("mentalista playground fixtures mean what they say", () => {
  const rankOf = (s: ReturnType<typeof standings>, seat: number) => s.find((r) => r.seat === seat)!.rank;

  it("over-win: seat 0 finishes first, alone", () => {
    const table = standings(_mentalistaFixtures.winState);
    expect(_mentalistaFixtures.winState.phase).toBe("over");
    expect(rankOf(table, 0)).toBe(1);
    expect(table.filter((r) => r.rank === 1)).toHaveLength(1);
  });

  it("over-tie: seats 0 and 1 share first", () => {
    const table = standings(_mentalistaFixtures.tieState);
    expect(table.filter((r) => r.rank === 1).map((r) => r.seat).sort()).toEqual([0, 1]);
  });

  it("over-lost: viewer seat 2 is strictly mid-table (rank 2 of 3)", () => {
    const table = standings(_mentalistaFixtures.midState);
    expect(rankOf(table, 2)).toBe(2);
  });

  it("over-drop: the departed seat 2 is ranked last", () => {
    const table = standings(_mentalistaFixtures.dropState);
    expect(table.find((r) => r.seat === 2)!.status).toBe("dropped");
    expect(rankOf(table, 2)).toBe(3);
  });

  it("reveal-hit: seat 0 read the Mentalist; reveal-miss: seat 0 did not", () => {
    expect(_mentalistaFixtures.revealHit.round!.phase).toBe("reveal");
    expect(_mentalistaFixtures.revealHit.round!.matched).toContain(0);
    expect(_mentalistaFixtures.revealMiss.round!.matched).not.toContain(0);
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_CLUE_COSTS, freeCluesFor, type ClueKey } from "@/features/fifa-universe/components/DetectiveCard";
import { hintsBought, pointsSaved } from "../cardDetectiveReview";

const CARD = "card-test-1";
const free = freeCluesFor(CARD);
const buyable = (Object.keys(DEFAULT_CLUE_COSTS) as ClueKey[]).filter((k) => !free.has(k));
const buyableTotal = buyable.reduce((sum, k) => sum + DEFAULT_CLUE_COSTS[k], 0);

describe("card detective review", () => {
  it("counts only bought hints, never the free starters", () => {
    expect(hintsBought(CARD, free)).toBe(0);
    expect(hintsBought(CARD, new Set([...free, "nation", "club"]))).toBe(2);
  });

  it("a solve with no hints saves every hint price (within the budget it scored)", () => {
    expect(pointsSaved(DEFAULT_CLUE_COSTS, CARD, free, true, 100)).toBe(Math.min(buyableTotal, 100));
  });

  it("buying hints lowers what was saved by their prices", () => {
    const open = new Set<ClueKey>([...free, "club", "nation"]);
    const spent = DEFAULT_CLUE_COSTS.club + DEFAULT_CLUE_COSTS.nation;
    expect(pointsSaved(DEFAULT_CLUE_COSTS, CARD, open, true, 100 - spent)).toBe(buyableTotal - spent);
  });

  it("never claims more than the card banked, and a surrendered card saves nothing", () => {
    // Two wrong names cost 30: nothing bought, 70 scored, so 70 saved at most.
    expect(pointsSaved(DEFAULT_CLUE_COSTS, CARD, free, true, 70)).toBe(70);
    expect(pointsSaved(DEFAULT_CLUE_COSTS, CARD, free, false, 100)).toBe(0);
  });
});

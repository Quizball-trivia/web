import { freeCluesFor, type ClueCosts, type ClueKey } from "@/features/fifa-universe/components/DetectiveCard";

/** Hints bought on a card: the opened clues minus the free starters every card comes with. */
export function hintsBought(cardId: string, open: ReadonlySet<ClueKey>): number {
  const free = freeCluesFor(cardId);
  return [...open].filter((k) => !free.has(k)).length;
}

/**
 * Hint points a solved card kept by deduction: the prices of the hints left locked, capped at the budget the card
 * actually scored (a wrong name costs points too, and "saved" never claims more than was banked). A surrendered card
 * scores nothing, so it saves nothing.
 */
export function pointsSaved(costs: ClueCosts, cardId: string, open: ReadonlySet<ClueKey>, solved: boolean, pointsLeft: number): number {
  if (!solved) return 0;
  const free = freeCluesFor(cardId);
  const locked = (Object.keys(costs) as ClueKey[]).filter((k) => !free.has(k) && !open.has(k));
  const skipped = locked.reduce((sum, k) => sum + costs[k], 0);
  return Math.max(0, Math.min(skipped, pointsLeft));
}

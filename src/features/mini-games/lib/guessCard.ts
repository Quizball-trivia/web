import { FIFA_CARDS, type FifaCard, type FifaEdition } from '../data/guessFifaCard';

/** A card the player guesses. */
export type GuessableCard = FifaCard;

export {
  POINTS_PER_SOLVE,
  ROUND_SIZE,
  MAX_SCORE,
  IDENTITY_CLUES,
  clueReveal,
  type IdentityClue,
} from './guessCardConstants';

export interface RoundResult {
  card: GuessableCard;
  points: number;
  solved: boolean;
}

/** edition key -> display label ("FC26" -> "FC 26"), pulled from the data. */
export const EDITION_LABEL: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const c of FIFA_CARDS) if (!m[c.edition]) m[c.edition] = c.editionLabel;
  return m;
})();

export const rand = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

/** Random unused card from a given edition (falls back to any if all used). */
export function pickCard(used: Set<string>, edition: FifaEdition): FifaCard | null {
  const fresh = FIFA_CARDS.filter((c) => c.edition === edition && !used.has(c.name));
  if (fresh.length) return rand(fresh);
  const any = FIFA_CARDS.filter((c) => c.edition === edition);
  return any.length ? rand(any) : null;
}

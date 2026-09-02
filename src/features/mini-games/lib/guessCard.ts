import { FIFA_CARDS, type FifaCard, type FifaEdition, type FifaCardDifficulty } from '../data/guessFifaCard';

/** A card the player guesses. */
export type GuessableCard = FifaCard;

export type { FifaCardDifficulty };

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

/** Fisher-Yates shuffle into a new array. */
export function shuffle<T>(a: readonly T[]): T[] {
  const out = a.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Random unused card from a given edition (falls back to any if all used). */
export function pickCard(used: Set<string>, edition: FifaEdition): FifaCard | null {
  const fresh = FIFA_CARDS.filter((c) => c.edition === edition && !used.has(c.name));
  if (fresh.length) return rand(fresh);
  const any = FIFA_CARDS.filter((c) => c.edition === edition);
  return any.length ? rand(any) : null;
}

/** Edition number: "FIFA15" -> 15, "FC24" -> 24. */
export const editionNum = (edition: string): number => parseInt(edition.replace(/[^0-9]/g, ''), 10);
/** "Older than FIFA 2020" — the daily wants >=5 of these per set. */
export const isOldCard = (c: FifaCard): boolean => editionNum(c.edition) < 20;

/**
 * Deal a balanced set of 10 like the daily should: 3 veryHard + 3 hard +
 * 4 medium/easy, with >=5 from pre-FIFA20 editions (2 old veryHard + 2 old hard +
 * 1 old medium/easy). Dedupes players, shuffles the final order. This is a
 * frontend preview of the backend selection — see scripts/fifa/DAILY-SELECTION.md.
 */
export function buildDifficultySet(): FifaCard[] {
  const usedNames = new Set<string>();
  const draw = (tiers: FifaCardDifficulty[], n: number, oldQuota: number): FifaCard[] => {
    const avail = FIFA_CARDS.filter((c) => tiers.includes(c.difficulty) && !usedNames.has(c.name));
    const seen = new Set<string>();
    const take = (list: FifaCard[], count: number): FifaCard[] => {
      const out: FifaCard[] = [];
      for (const c of list) {
        if (out.length >= count) break;
        if (seen.has(c.name)) continue;
        seen.add(c.name);
        out.push(c);
      }
      return out;
    };
    const old = shuffle(avail.filter(isOldCard));
    const fresh = shuffle(avail.filter((c) => !isOldCard(c)));
    let picked = take(old, oldQuota);
    picked = picked.concat(take(fresh, n - picked.length));
    if (picked.length < n) picked = picked.concat(take([...old, ...fresh], n - picked.length));
    for (const c of picked) usedNames.add(c.name);
    return picked;
  };
  return shuffle([
    ...draw(['veryHard'], 3, 2),
    ...draw(['hard'], 3, 2),
    ...draw(['medium', 'easy'], 4, 1),
  ]);
}

import { FIFA_CARDS, type FifaCard, type FifaEdition } from '../data/guessFifaCard';

/** A card the player guesses. */
export type GuessableCard = FifaCard;

/** Points for naming a card (all clues are shown up front — flat per solve). */
export const POINTS_PER_SOLVE = 10;
/** Cards per round (also the daily-challenge daily cap). */
export const ROUND_SIZE = 10;
/** Highest score obtainable in one round. */
export const MAX_SCORE = ROUND_SIZE * POINTS_PER_SOLVE;

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

/** The three identity clues on a card. During play one is shown and two are
 *  hidden (random); all three reveal once the player answers or gives up. */
export type IdentityClue = 'nation' | 'league' | 'club';
export const IDENTITY_CLUES: IdentityClue[] = ['nation', 'league', 'club'];

export function clueReveal(shown: IdentityClue, all: boolean) {
  return {
    nation: all || shown === 'nation',
    league: all || shown === 'league',
    club: all || shown === 'club',
  };
}

/** Random unused card from a given edition (falls back to any if all used). */
export function pickCard(used: Set<string>, edition: FifaEdition): FifaCard | null {
  const fresh = FIFA_CARDS.filter((c) => c.edition === edition && !used.has(c.name));
  if (fresh.length) return rand(fresh);
  const any = FIFA_CARDS.filter((c) => c.edition === edition);
  return any.length ? rand(any) : null;
}

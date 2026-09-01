/**
 * Data-free constants for the Guess-the-Card game. Split from guessCard.ts so
 * surfaces that only need numbers (the daily hub card) don't pull the 720-card
 * dataset into their client bundle.
 */

/** Points for naming a card (all clues are shown up front — flat per solve). */
export const POINTS_PER_SOLVE = 10;
/** Cards per round (also the daily-challenge daily cap). */
export const ROUND_SIZE = 10;
/** Highest score obtainable in one round. */
export const MAX_SCORE = ROUND_SIZE * POINTS_PER_SOLVE;

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

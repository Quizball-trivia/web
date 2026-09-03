// Hardcoded prototype data — Bingo Battle. Eligibility mappings are curated by
// hand for the prototype; production would need a proper player-attribute DB.

/** Board squares in render order (3×3, row-major). */
export const bingoCategories = [
  "Brazilian",
  "Played for Arsenal",
  "Champions League winner",
  "Played for Barcelona",
  "Played under Guardiola",
  "World Cup winner",
  "Played in Serie A",
  "PL Golden Boot",
  "Played for Real Madrid",
] as const;

export interface BingoPlayer {
  name: string;
  /** Indices into bingoCategories this player can be placed on. */
  eligible: number[];
}

/** Reveal queue — one full game's worth of players. */
export const bingoQueue: BingoPlayer[] = [
  { name: "Thierry Henry", eligible: [1, 2, 3, 4, 5, 6, 7] },
  { name: "Robin van Persie", eligible: [1, 7] },
  { name: "Kaká", eligible: [0, 2, 5, 6, 8] },
  { name: "Luis Suárez", eligible: [2, 3, 7] },
  { name: "Mesut Özil", eligible: [1, 5, 8] },
  { name: "Ronaldinho", eligible: [0, 2, 3, 5, 6] },
  { name: "Samuel Eto'o", eligible: [2, 3, 4, 6] },
  { name: "Roberto Carlos", eligible: [0, 2, 5, 6, 8] },
  { name: "Harry Kane", eligible: [7] },
  { name: "Alexis Sánchez", eligible: [1, 3, 4, 6] },
  { name: "Marcelo", eligible: [0, 2, 8] },
  { name: "David Villa", eligible: [2, 3, 4, 5] },
  { name: "Zlatan Ibrahimović", eligible: [3, 4, 6] },
  { name: "Casemiro", eligible: [0, 2, 8] },
  { name: "Gabriel Jesus", eligible: [0, 1, 4] },
  { name: "Vinícius Júnior", eligible: [0, 2, 8] },
];

/**
 * Scripted rival card progress: square index filled on each of its turns
 * (null = the rival skips that turn). It completes column 0/3/6 on its 8th
 * fill, so the user has roughly ten reveals to finish a line first.
 */
export const bingoOpponentScript: Array<number | null> = [4, 2, 7, null, 0, null, 3, 6, 1, 8];

/** All winning lines on a 3×3 board (row-major indices). */
export const bingoLines: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

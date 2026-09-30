import type { BuscaminasDuelView, PistasDuelView, UltimoDuelView } from "@/features/duel/duel.views";
import { CLUB, NO_PORTRAIT, PLAYERS } from "./universe";

export const ultimoBase: UltimoDuelView = {
  phase: "turn", category: 1, totalCategories: 5, target: 3, difficulty: "medium",
  title: `XI del ${CLUB.aurora} en la final de 2031`, hint: "Una lista inventada para el playground",
  total: 11, turn: 0, starter: 0, k: 4, misses: 0, turnMs: 16_000,
  said: [{ seat: 0, name: PLAYERS[0] }, { seat: 1, name: PLAYERS[1] }, { seat: 0, name: PLAYERS[2] }, { seat: 1, name: PLAYERS[3] }],
  last: { seat: 1, kind: "ok", text: PLAYERS[3], name: PLAYERS[3] },
  missing: null, scores: [1, 0],
  results: [{ winner: 0, reason: "misses", said: 6, named: [4, 2] }],
};

export const buscaminasBase: BuscaminasDuelView = {
  phase: "turn", round: 2, totalRounds: 10, difficulty: "medium", points: 2,
  prompt: `Jugaron en el ${CLUB.brisa}`, opener: 0, turn: 0, pickIndex: 3, found: 3, needed: 12,
  cards: PLAYERS.map((name, i) => ({
    id: `c${i}`, name, img: NO_PORTRAIT,
    pick: i === 1 ? { seat: 0, auto: false } : i === 4 ? { seat: 1, auto: false } : i === 6 ? { seat: 0, auto: true } : null,
    fits: i === 1 || i === 4 || i === 6 ? true : null,
  })),
  results: [{ outcome: "cleared", by: null, points: [1, 1] }],
  scores: [2, 1], timeouts: [0, 0],
};

export const pistasBase: PistasDuelView = {
  phase: "clue", round: 3, totalRounds: 10, difficulty: "medium", clue: 3, ceiling: 10, pointsInPlay: 8,
  clues: [
    { kind: "confed", icon: "CONMEBOL", text: "Sudamericano" },
    { kind: "position", icon: "MF", text: "Mediocampista" },
    { kind: "decade", icon: "2030", text: "Debutó en los 2030" },
    { kind: "fact", icon: null, text: `Fue capitán del ${CLUB.nube} en su primer ascenso.` },
  ],
  seats: [{ locked: false, passed: false, wrong: null }, { locked: false, passed: false, wrong: null }],
  settled: null,
  results: [{ winner: 0, clue: 4, points: 7 }, { winner: 1, clue: 6, points: 5 }],
  scores: [7, 5], idle: [0, 0],
};

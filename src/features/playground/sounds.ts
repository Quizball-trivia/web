import { ULTIMO_SOUNDS } from "@/features/ultimo/ultimo.sounds";
import type { GameId, PlayMode } from "./types";

/**
 * What each game plays today, read from the games' own trigger code (2026-09-30). Phase B moves these into constants the games
 * import, so a change made here is the game's change; until then this list documents the code, it does not drive it.
 */
export interface SoundEvent { moment: string; sound: string | null; where: string }

export const SOUND_EVENTS: Record<GameId, Partial<Record<PlayMode, SoundEvent[]>>> = {
  conexiones: {
    solo: [{ moment: "Any daily moment", sound: null, where: "prototype: no sounds yet" }],
    duel: [{ moment: "Any duel moment", sound: null, where: "prototype: no sounds yet" }],
  },
  datofalso: {
    solo: [
      { moment: "Your pick was the fake", sound: "correctRanked", where: "datoFalso.sounds.ts useRevealSound" },
      { moment: "Wrong pick or time up", sound: "wrongAnswer", where: "datoFalso.sounds.ts useRevealSound" },
    ],
    duel: [
      { moment: "Reveal: your pick was the fake", sound: "correctRanked", where: "datoFalso.sounds.ts useRevealSound" },
      { moment: "Reveal: wrong or no pick", sound: "wrongAnswer", where: "datoFalso.sounds.ts useRevealSound" },
    ],
    room: [
      { moment: "Reveal: your pick was the fake", sound: "correctRanked", where: "datoFalso.sounds.ts useRevealSound" },
      { moment: "Reveal: wrong or no pick", sound: "wrongAnswer", where: "datoFalso.sounds.ts useRevealSound" },
    ],
  },
  codenames: {
    solo: [{ moment: "Any daily moment", sound: null, where: "prototype: no sounds yet" }],
    room: [{ moment: "Any room moment", sound: null, where: "prototype: no sounds yet" }],
  },
  "codenames-words": {
    room: [{ moment: "Any room moment", sound: null, where: "same sounds as the picture board (codenames.sounds.ts)" }],
  },
  carrera: {
    duel: [{ moment: "Any 1v1 moment", sound: null, where: "prototype: no sounds yet" }],
    room: [{ moment: "Any room moment", sound: null, where: "prototype: no sounds yet" }],
  },
  aproximado: {
    solo: [
      { moment: "Lock in, 60+ accuracy points", sound: "dailyCorrect", where: "StatSniperGame lock-in" },
      { moment: "Lock in, under 60 points", sound: "wrongAnswer", where: "StatSniperGame lock-in" },
    ],
    duel: [{ moment: "Any 1v1 moment", sound: null, where: "prototype: no sounds yet" }],
    room: [{ moment: "Any room moment", sound: null, where: "prototype: no sounds yet" }],
  },
  ultimo: {
    // Read from the map the game plays from: a change in ultimo.sounds.ts shows here and plays in the game.
    solo: [
      { moment: "Correct answer", sound: ULTIMO_SOUNDS.correct, where: "ultimo.sounds.ts · correct" },
      { moment: "Wrong name or repeat (a miss)", sound: ULTIMO_SOUNDS.miss, where: "ultimo.sounds.ts · miss" },
      { moment: "Category ends (clock, 3 misses, list complete)", sound: ULTIMO_SOUNDS.categoryEnd, where: "ultimo.sounds.ts · categoryEnd" },
      { moment: "Ambiguous surname / late answer", sound: ULTIMO_SOUNDS.ambiguous, where: "ultimo.sounds.ts · ambiguous" },
    ],
    duel: [{ moment: "Any duel moment", sound: null, where: "duels play no sounds yet" }],
  },
  buscaminas: {
    solo: [
      { moment: "Round ends on a mine", sound: "wrongAnswer", where: "BuscaminasGame round settle" },
      { moment: "Perfect round (every fit found)", sound: "correctRanked", where: "BuscaminasGame round settle" },
      { moment: "Banked round", sound: null, where: "silent" },
    ],
    duel: [{ moment: "Any duel moment", sound: null, where: "duels play no sounds yet" }],
  },
  pistas: {
    solo: [
      { moment: "Round solved", sound: "correctRanked", where: "PistasGame round settle" },
      { moment: "Round failed (gave up / out of clues)", sound: "wrongAnswer", where: "PistasGame round settle" },
      { moment: "Wrong guess", sound: "wrongAnswer", where: "PistasGame guess" },
    ],
    duel: [{ moment: "Any duel moment", sound: null, where: "duels play no sounds yet" }],
  },
  football501: {
    solo: [{ moment: "Any solo moment", sound: null, where: "prototype: sounds to pick (dart thud, checkout, bust)" }],
    duel: [{ moment: "Any 1v1 moment", sound: null, where: "prototype: no sounds yet" }],
    room: [{ moment: "Any room moment", sound: null, where: "prototype: no sounds yet" }],
  },
  tenable: {
    solo: [{ moment: "Any solo moment", sound: null, where: "prototype: sounds to pick (Último's map is the candidate)" }],
    duel: [{ moment: "Any 1v1 moment", sound: null, where: "prototype: no sounds yet" }],
    room: [{ moment: "Any room moment", sound: null, where: "prototype: no sounds yet" }],
  },
};

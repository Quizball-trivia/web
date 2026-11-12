import { ULTIMO_SOUNDS } from "@/features/ultimo/ultimo.sounds";
import { DRAFT_SOUNDS } from "@/features/draft/draft.sounds";
import type { GameId, PlayMode } from "./types";

/**
 * What each game plays today, read from the games' own trigger code (2026-09-30). Phase B moves these into constants the games
 * import, so a change made here is the game's change; until then this list documents the code, it does not drive it.
 */
export interface SoundEvent { moment: string; sound: string | null; where: string }

export const SOUND_EVENTS: Record<GameId, Partial<Record<PlayMode, SoundEvent[]>>> = {
  mentalista: {
    // Prototype: the room screen plays no audio yet. Candidates for the real build: a soft reveal sting, a "read it"
    // hit for a matching predictor, a flat miss. Listed here so /dev/games can open the mode (the lookup is by game id).
    room: [
      { moment: "Reveal: you read the Mentalist (+2)", sound: null, where: "prototype: sound to pick (reveal hit)" },
      { moment: "Reveal: you missed", sound: null, where: "prototype: sound to pick (reveal miss)" },
      { moment: "Round voided (timeout / chooser left)", sound: null, where: "prototype: no sound yet" },
    ],
  },
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
  draft: {
    solo: [
      { moment: "Reels start rolling", sound: DRAFT_SOUNDS.spin, where: "draft.sounds.ts spin" },
      { moment: "Reels land on a club + season", sound: DRAFT_SOUNDS.land, where: "draft.sounds.ts land" },
      { moment: "Player signed", sound: DRAFT_SOUNDS.sign, where: "draft.sounds.ts sign" },
      { moment: "Season kicks off / full time", sound: DRAFT_SOUNDS.kickoff, where: "draft.sounds.ts kickoff, fullTime" },
      { moment: "Perfect season or title", sound: DRAFT_SOUNDS.glory, where: "draft.sounds.ts glory" },
      { moment: "Europe / mid-table", sound: DRAFT_SOUNDS.result, where: "draft.sounds.ts result" },
      { moment: "Relegated", sound: DRAFT_SOUNDS.defeat, where: "draft.sounds.ts defeat" },
    ],
    duel: [
      { moment: "5 s left on your pick", sound: DRAFT_SOUNDS.hurry, where: "draft.sounds.ts hurry" },
      { moment: "Match day won", sound: DRAFT_SOUNDS.matchWin, where: "draft.sounds.ts matchWin" },
      { moment: "Match day lost", sound: DRAFT_SOUNDS.defeat, where: "draft.sounds.ts defeat" },
    ],
    room: [{ moment: "Room won / lost", sound: DRAFT_SOUNDS.glory, where: "draft.sounds.ts glory / defeat" }],
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

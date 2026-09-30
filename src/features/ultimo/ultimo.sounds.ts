import type { SoundName } from "@/lib/sounds/gameSounds";

/**
 * Which sound each moment of Último en pie plays (null = silent on purpose). The game plays from this map and the games
 * playground lists it, so a change here is the change in the game.
 */
export const ULTIMO_SOUNDS = {
  /** A new name from the list. */
  correct: "correctRanked",
  /** A wrong name or a repeat: a miss. */
  miss: "wrongAnswer",
  /** The category ends: clock, three misses or the whole list. */
  categoryEnd: "whistle",
  /** An ambiguous surname or an answer after the clock: no miss, no sound. */
  ambiguous: null,
} as const satisfies Record<string, SoundName | null>;

export type UltimoSoundMoment = keyof typeof ULTIMO_SOUNDS;

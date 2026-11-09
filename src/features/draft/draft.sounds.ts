import { isMuted, preloadSfx, type SoundName } from "@/lib/sounds/gameSounds";

/**
 * Which sound each moment of Football Draft plays (null = silent on purpose). The game plays from this map and the
 * games playground lists it, so a change here is the change in the game.
 */
export const DRAFT_SOUNDS = {
  /** The reels start rolling (new spin or re-spin). */
  spin: "draftSpin",
  /** The reels land on a club and a season. */
  land: "draftLand",
  /** A player signed into a slot, and a bigger one for an 85+ signing. */
  sign: "draftSign",
  signStar: "draftSignStar",
  /** The player presses re-spin. */
  respin: "draftRespin",
  /** Five seconds left on a duel/room pick. */
  hurry: "draftHurry",
  /** The season kicks off, and the final whistle. */
  kickoff: "draftKickoff",
  fullTime: "draftFullTime",
  /** A goal in the live season or a tie, for and against. */
  goal: "draftGoal",
  conceded: "draftConceded",
  /** The title, and the perfect season. */
  glory: "draftGlory",
  perfect: "draftPerfect",
  /** A finish in Europe or mid-table. */
  result: "draftResult",
  /** Relegated, or a lost match day. */
  defeat: "draftDefeat",
  /** Won the match day. */
  matchWin: "draftMatchWin",
  /** Coins on the result screen. */
  coins: "draftCoins",
} as const satisfies Record<string, SoundName | null>;

export type DraftSoundMoment = keyof typeof DRAFT_SOUNDS;

/** Only when sound is on, so a muted player downloads nothing. */
export const preloadDraftSounds = () => {
  if (isMuted()) return;
  const names: (SoundName | null)[] = Object.values(DRAFT_SOUNDS);
  preloadSfx(...names.filter((name): name is SoundName => name !== null));
};

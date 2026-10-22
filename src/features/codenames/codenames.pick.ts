import type { WordAnswerMissed } from "@/features/wordgames/daily/useWordDaily";
import type { WordRun } from "@/features/wordgames/daily/wordDaily.api";
import type { CodenamesDailyState } from "./codenames.daily";

export type StaleNote = "confirmAgain" | "notSent" | "clueChanged" | "cardTaken" | "finished" | "stopAgain";
type Run = WordRun<CodenamesDailyState>;

/** A card picked on one copy of the daily run. `confirmed`: the player confirmed it, but it was not sent or not saved. */
export interface DailyPick { cardId: string; clue: number; runId: string; version: number; confirmed: boolean }

export const pickOn = (run: Run, cardId: string, confirmed = false): DailyPick =>
  ({ cardId, clue: run.state.clue, runId: run.run.id, version: run.run.version, confirmed });

/**
 * A move the server did not save (another tab moved the run on, or its reply was lost): the confirmed pick to hold
 * against the re-synced copy, or a note. Null when the copy shows the move landed after all (only its reply was lost).
 */
export function afterMissed(m: WordAnswerMissed<CodenamesDailyState>): { pick: DailyPick | null; note: StaleNote | null } | null {
  const { sentOn, fresh, lost } = m;
  const next = fresh.state.flips[sentOn.state.flips.length];
  const oneStep = fresh.run.id === sentOn.run.id && fresh.run.version === sentOn.run.version + 1;
  if (m.extra?.move === "stop") {
    if (lost && oneStep && !next && (fresh.state.done || fresh.state.clue === sentOn.state.clue + 1)) return null;
    return { pick: null, note: fresh.state.done ? "finished" : fresh.run.id !== sentOn.run.id || fresh.state.clue !== sentOn.state.clue ? "clueChanged" : "stopAgain" };
  }
  const card = sentOn.state.cards[Number(m.text)];
  if (!card) return null;
  if (lost && fresh.run.id === sentOn.run.id && next?.card === Number(m.text) && next.clue === sentOn.state.clue) return null;
  return { pick: pickOn(sentOn, card.id, true), note: null };
}

/**
 * The pick against the copy now on screen. The same copy: a confirmed pick that never went out is kept and asked for
 * again. A newer copy (another tab): the pick never carries to another clue, a turned card or a finished run; on the
 * same clue it is kept, and a confirmed one is asked for again. Null: nothing changes.
 */
export function reconcilePick(pick: DailyPick, run: Run): { pick: DailyPick | null; note: StaleNote | null } | null {
  // Another run of the day (its content was corrected): the hook's own notice explains it.
  if (run.run.id !== pick.runId) return { pick: null, note: null };
  if (run.run.version === pick.version) return pick.confirmed ? { pick: { ...pick, confirmed: false }, note: "notSent" } : null;
  const s = run.state;
  const card = s.cards.find((c) => c.id === pick.cardId);
  const gone: StaleNote | null = s.done ? "finished" : !card || card.kind !== null ? "cardTaken" : s.clue !== pick.clue ? "clueChanged" : null;
  if (gone) return { pick: null, note: gone };
  return { pick: { ...pick, version: run.run.version, confirmed: false }, note: pick.confirmed ? "confirmAgain" : null };
}

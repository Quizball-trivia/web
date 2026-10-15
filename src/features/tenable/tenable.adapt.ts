import { asWordLocale } from "@/features/wordgames/copy";
import type { TenableServerRun } from "./tenable.api";
import { formatFigure } from "./tenable.figures";
import type { TenableSoloState, TenableVerdict } from "./tenable.view";

/** The server's run as the approved solo screens draw it. */
export function toSoloState(run: TenableServerRun, locale: string): TenableSoloState {
  const l = asWordLocale(locale);
  return {
    day: run.day,
    list: { title: run.list.title[l] ?? run.list.title.en, note: (run.list.note?.[l] ?? run.list.note?.en) ?? null, asOf: run.list.asOf, kind: run.list.kind, release: run.list.release },
    slots: run.slots.map((slot) => ({
      rank: slot.rank,
      name: slot.name,
      detail: formatFigure(slot.figure, locale),
      by: slot.found ? 0 : null,
      missed: !slot.found && slot.name !== null,
    })),
    lives: run.lives,
    maxLives: run.maxLives,
    misses: run.misses,
    status: run.done ? "done" : "playing",
    endReason: run.end,
    last: run.last && { id: run.last.n, kind: run.last.kind as TenableVerdict, text: run.last.name ?? run.last.text, rank: run.last.rank },
    ranked: run.ranked,
    rank: run.rank,
    disclosed: run.disclosed,
    score: run.score,
  };
}

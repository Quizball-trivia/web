import type { D501ServerRun, ServerDart } from "./d501.api";
import type { Dart, D501SoloState } from "./d501.view";

const toDart = (d: ServerDart, id: number): Dart => ({ id, by: 0, text: d.text, name: d.name, stat: d.value, verdict: d.verdict, before: d.before, after: d.after });

/** The server's run as the approved solo screens draw it. */
export function toSoloState(run: D501ServerRun): D501SoloState {
  const category = run.category ?? { title: "", note: null, unit: "", asOf: "", release: "", kind: "player" as const };
  return {
    day: run.day,
    category: { title: category.title, note: category.note, unit: category.unit, asOf: category.asOf, kind: "player", release: category.release },
    remaining: run.remaining,
    darts: run.darts.map(toDart),
    maxDarts: run.maxDarts,
    status: run.done ? "done" : "playing",
    endReason: run.end,
    // The answer number keeps the feedback line animating once per answer, free ones included.
    last: run.last && toDart(run.last, run.last.n),
    ranked: run.ranked,
    rank: run.rank,
    outs: run.outs,
    finishes: run.finishes?.shown?.map((f) => ({ name: f.name, stat: f.value })),
    finishesCount: run.finishes?.count ?? null,
  };
}

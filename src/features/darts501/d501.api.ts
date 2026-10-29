import { createWordDailyApi, type WordRunStateBase } from "@/features/wordgames/daily/wordDaily.api";
import type { DartVerdict } from "./d501.rules";

export interface ServerDart { name: string | null; text: string; verdict: DartVerdict; value: number | null; before: number; after: number }

/** Server-held run state (backend darts501-daily.rules PublicRunState). */
export interface D501ServerRun extends WordRunStateBase {
  category: { id: string; title: string; note: string | null; unit: string; asOf: string; release: string; kind: "player" } | null;
  remaining: number;
  darts: ServerDart[];
  maxDarts: number;
  outs: number | null;
  last: (ServerDart & { n: number }) | null;
  end: "checkout" | "darts" | "gaveUp" | null;
  /** At the end: how many would have checked out from the final score; their names only once the day is closed. */
  finishes: { count: number; shown: Array<{ name: string; value: number }> | null } | null;
}

export interface D501Review {
  day: string; title: string; note: string | null; unit: string; asOf: string;
  top: Array<{ name: string; value: number }>;
  finishes: Array<{ from: number; players: Array<{ name: string; value: number }> }>;
}

export const darts501DailyApi = createWordDailyApi<D501ServerRun, never, D501Review>("/api/v1/darts501");

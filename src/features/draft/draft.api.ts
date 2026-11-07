import { createDailyGameCall, DailyGameApiError, isNetworkFailure } from "@/lib/repositories/dailyGameApi";
import type { Era, FormationId, MatchDay, Pick, Prediction, SeasonResult, Variant } from "./draft.rules";

/** Same calendar as the backend (draft-daily.days.ts). */
export const DRAFT_CALENDAR = { contentStart: "2026-10-31", rankedStart: "2026-11-05", publishedDays: 400 };

export interface ServerSpin { id: string; club: string; season: string; legend: boolean; finish: number; players: Pick["player"][] }
export interface ServerRun {
  variant: Variant; league: { id: string; name: string; short: string; teams: number; games: number }; era: Era; formation: FormationId;
  phase: "picking" | "ready" | "result"; armed: boolean; round: number; picks: (Pick | null)[]; spin: ServerSpin | null; pool: string[];
  respins: number; respinCost: number | null; budget: number | null; spent: number; notice: string | null; undoName: string | null; canUndo: boolean;
  prediction: Prediction | null; result: { season: SeasonResult; prediction: Prediction; coinsEarned: number; goalSeed: string } | null;
  done: boolean; day?: string; ranked?: boolean; rank?: number; number?: number | null; kind?: "free" | "challenge"; challengeCode?: string | null;
}
export interface RunEnvelope { run: { id: string; version: number }; state: ServerRun }
export interface DraftToday { day: string; number: number; league: { id: string; name: string; short: string; teams: number; games: number }; era: Era; formation: FormationId; leagues: Array<{ id: string; name: string; short: string; teams: number; games: number }>; best: { rec: string; points: number } | null; played: boolean; guest: boolean; practiceDay: string | null }
export interface BoardEntry { rank: number; userId: string; username: string; avatarUrl: string | null; avatarCustomization: never; w: number; d: number; l: number; points: number; gd: number; gf: number; score: number }
export interface Leaderboard { day: string; players: number; top: BoardEntry[]; me: BoardEntry | null }
export interface TeamResponse { formation: FormationId; picks: (Pick | null)[] }
export interface TieResponse { id: string; seed: string; formation: FormationId; at: string; side: 0 | 1; opponent: string; opponentPicks: (Pick | null)[]; result: MatchDay }
export interface ChallengeView { code: string; from: string; variant: Variant; league: string; era: Era; formation: FormationId; record: { w: number; d: number; l: number; points: number; gf: number; ga: number }; picks: (Pick | null)[] | null }

const call = createDailyGameCall("/api/v1/draft");
const LONG = { timeoutMs: 20_000 };

export type RunKind = { daily: Variant } | { free: true };
const moveBase = (kind: RunKind) => ("daily" in kind ? `/${kind.daily}` : "/play/free");

export const draftApi = {
  today: (variant: Variant, locale: string, day?: string | null) => call<DraftToday>(`/${variant}/today${day ? `?day=${day}` : ""}`, "GET", undefined, locale, { identity: "optional" }),
  startDaily: (variant: Variant, day: string, locale: string) => call<RunEnvelope>(`/${variant}/start`, "POST", { day }, locale),
  startFree: (choice: { leagueId: string; era: Era; formation: FormationId; variant: Variant }, locale: string) => call<RunEnvelope>("/play/free", "POST", choice, locale),
  currentFree: (runId: string, locale: string) => call<RunEnvelope>(`/play/free?runId=${runId}`, "GET", undefined, locale),
  move: (kind: RunKind, path: "spin" | "pick" | "academy" | "respin" | "undo" | "finish", run: RunEnvelope["run"], body: Record<string, unknown>, locale: string) =>
    call<RunEnvelope>(`${moveBase(kind)}/${path}`, "POST", { runId: run.id, version: run.version, ...body }, locale, path === "finish" ? LONG : {}),
  leaderboard: (variant: Variant, day: string, locale: string) => call<Leaderboard>(`/${variant}/leaderboard?day=${day}`, "GET", undefined, locale, { identity: "optional" }),
  team: (variant: Variant, day: string, userId: string, locale: string) => call<TeamResponse>(`/${variant}/team?day=${day}&userId=${userId}`, "GET", undefined, locale),
  tie: (variant: Variant, day: string, userId: string, locale: string) => call<TieResponse>(`/${variant}/tie`, "POST", { day, userId }, locale),
  challengeCreate: (body: { variant: Variant; day: string } | { runId: string }, locale: string) => call<{ code: string }>("/play/challenges", "POST", body, locale),
  challengeRead: (code: string, locale: string) => call<ChallengeView>(`/play/challenges/${code}`, "GET", undefined, locale),
  challengeAccept: (code: string, locale: string) => call<{ daily?: RunEnvelope; variant?: Variant; day?: string; free?: RunEnvelope }>(`/play/challenges/${code}/accept`, "POST", {}, locale),
  challengeTie: (code: string, locale: string) => call<TieResponse>(`/play/challenges/${code}/tie`, "POST", {}, locale),
  myTies: (locale: string) => call<TieResponse[]>("/play/ties", "GET", undefined, locale),
};

/** Asked again after no answer or a server that is busy (5xx). Only for what is safe to repeat. */
export async function withRetry<T>(work: () => Promise<T>, delays: readonly number[] = [500, 1_500, 3_000]): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      const transient = isNetworkFailure(error) || (error instanceof DailyGameApiError && (error.status === 0 || error.status >= 500));
      if (!transient || attempt >= delays.length) throw error;
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}

export const reasonOf = (error: unknown): string | null => (error instanceof DailyGameApiError ? error.message : null);

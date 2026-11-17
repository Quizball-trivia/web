import { createDailyGameCall, DailyGameApiError, isNetworkFailure } from "@/lib/repositories/dailyGameApi";
import type { ChemLink, CupRun, Era, FormationId, Honour, MatchDay, MomentView, Pick, SeasonResult, TacticId, Variant } from "./draft.rules";

/** Same calendar as the backend (draft-daily.days.ts). */
export const DRAFT_CALENDAR = { contentStart: "2026-10-31", rankedStart: "2026-11-05", publishedDays: 400 };

export interface ServerSpin { id: string; club: string; season: string; legend: boolean; finish: number; honour?: Honour; players: Pick["player"][] }
export interface ServerRun {
  variant: Variant; league: { id: string; name: string; short: string; teams: number; games: number }; era: Era; formation: FormationId;
  phase: "picking" | "ready" | "half" | "result"; armed: boolean; round: number; picks: (Pick | null)[]; spin: ServerSpin | null; pool: string[];
  respins: number; respinCost: number | null; budget: number | null; spent: number; notice: string | null; undoName: string | null; canUndo: boolean;
  /** The squad on offer shows names (and prices) only; picks too in Ball Knowledge until the result. */
  hideSquad?: boolean; hidePicks?: boolean;
  /** The places free academy kids just took on their own (nobody was affordable). */
  forced?: string[];
  result: { season: SeasonResult; coinsEarned: number; goalSeed: string; extra?: SeasonExtra } | null;
  /** The season rules: 2 has the bench, the team talk, two halves with a January window, moments and cups. */
  rules?: number; captain?: string | null; tactic?: TacticId | null; tactic2?: TacticId | null; tactics?: TacticId[] | null; links?: ChemLink[] | null; half?: PublicHalf | null;
  done: boolean; day?: string; ranked?: boolean; rank?: number; number?: number | null; kind?: "free" | "challenge"; challengeCode?: string | null;
}
/** Rules v2, after the season: the cups, moments, chemistry, captain and tactics, and the real top scorer. */
export interface SeasonExtra {
  cup: CupRun; europe: CupRun | null; moments: MomentView[]; derby: string | null; links: ChemLink[]; captain: string | null; tactic: TacticId | null; tactic2: TacticId | null;
  realTop: { name: string; club: string; goals: number; season: string } | null; cupCoins: number; half: number; january: { slotId: string; in: string; out: string | null } | null;
}
/** Rules v2, at the winter break: the first half as played and the January window. */
export interface PublicHalf {
  half: number; matches: Array<{ round: number; home: boolean; gf: number; ga: number; opponent: string }>; position: number; gap: number; leader: string; moments: MomentView[];
  window: { spin: ServerSpin | null; spinsLeft: number; money: number; signing: { slotId: string; in: string; out: string | null; refund: number } | null };
}
export interface RunEnvelope { run: { id: string; version: number }; state: ServerRun }
export interface DraftToday { day: string; number: number; league: { id: string; name: string; short: string; teams: number; games: number }; era: Era; formation: FormationId; leagues: Array<{ id: string; name: string; short: string; teams: number; games: number }>; best: { rec: string; points: number } | null; played: boolean; guest: boolean; live: string; practiceDay: string | null }
export interface BoardEntry { rank: number; userId: string; username: string; avatarUrl: string | null; avatarCustomization: never; w: number; d: number; l: number; points: number; gd: number; gf: number; score: number }
export interface Leaderboard { day: string; players: number; top: BoardEntry[]; me: BoardEntry | null }
export interface TeamResponse { formation: FormationId; picks: (Pick | null)[] }
export interface TieResponse { id: string; seed: string; formation: FormationId; opponentFormation?: FormationId; picks?: (Pick | null)[]; at: string; side: 0 | 1; opponent: string; opponentPicks: (Pick | null)[]; result: MatchDay }
export interface LeagueInfo { id: string; name: string; short: string; teams: number; games: number }
/** The first screen: leagues on offer, the board week, and the member's best of the week in each league. */
export interface DraftLeagues { week: string; leagues: LeagueInfo[]; mine: Array<{ leagueId: string; w: number; d: number; l: number; points: number }>; guest: boolean }
export interface LeagueBoardEntry { rank: number; runId: string; userId: string; username: string; avatarUrl: string | null; avatarCustomization: never; w: number; d: number; l: number; points: number; gd: number; gf: number; score: number }
export interface LeagueBoard { leagueId: string; week: string; players: number; top: LeagueBoardEntry[]; me: LeagueBoardEntry | null }
export interface ChallengeView { code: string; from: string; variant: Variant; league: string; era: Era; formation: FormationId; record: { w: number; d: number; l: number; points: number; gf: number; ga: number }; picks: (Pick | null)[] | null }

const call = createDailyGameCall("/api/v1/draft");
const LONG = { timeoutMs: 20_000 };

export type RunKind = { daily: Variant } | { free: true };
const moveBase = (kind: RunKind) => ("daily" in kind ? `/${kind.daily}` : "/play/free");

const q = encodeURIComponent;
/** A challenge code comes from the address bar. Encoding leaves "." and ".." alone, and those would walk to another API path. */
const codePath = (code: string) => {
  if (code === "." || code === "..") throw new DailyGameApiError("not_found", 404);
  return q(code);
};

export const draftApi = {
  today: (variant: Variant, locale: string, day?: string | null) => call<DraftToday>(`/${variant}/today${day ? `?day=${q(day)}` : ""}`, "GET", undefined, locale, { identity: "optional" }),
  startDaily: (variant: Variant, day: string, locale: string) => call<RunEnvelope>(`/${variant}/start`, "POST", { day }, locale),
  startFree: (choice: { leagueId: string; era: Era; formation: FormationId; variant: Variant }, locale: string) => call<RunEnvelope>("/play/free", "POST", choice, locale),
  currentFree: (runId: string, locale: string) => call<RunEnvelope>(`/play/free?runId=${q(runId)}`, "GET", undefined, locale),
  move: (kind: RunKind, path: "spin" | "pick" | "academy" | "respin" | "undo" | "finish" | "captain" | "tactic" | "january/spin" | "january/sign", run: RunEnvelope["run"], body: Record<string, unknown>, locale: string) =>
    call<RunEnvelope>(`${moveBase(kind)}/${path}`, "POST", { runId: run.id, version: run.version, ...body }, locale, path === "finish" ? LONG : {}),
  leaderboard: (variant: Variant, day: string, locale: string) => call<Leaderboard>(`/${variant}/leaderboard?day=${q(day)}`, "GET", undefined, locale, { identity: "optional" }),
  team: (variant: Variant, day: string, userId: string, locale: string) => call<TeamResponse>(`/${variant}/team?day=${q(day)}&userId=${q(userId)}`, "GET", undefined, locale),
  tie: (variant: Variant, day: string, userId: string, locale: string) => call<TieResponse>(`/${variant}/tie`, "POST", { day, userId }, locale),
  challengeCreate: (body: { variant: Variant; day: string } | { runId: string }, locale: string) => call<{ code: string }>("/play/challenges", "POST", body, locale),
  challengeRead: (code: string, locale: string) => call<ChallengeView>(`/play/challenges/${codePath(code)}`, "GET", undefined, locale),
  challengeAccept: (code: string, locale: string) => call<{ daily?: RunEnvelope; variant?: Variant; day?: string; free?: RunEnvelope }>(`/play/challenges/${codePath(code)}/accept`, "POST", {}, locale),
  challengeTie: (code: string, locale: string) => call<TieResponse>(`/play/challenges/${codePath(code)}/tie`, "POST", {}, locale),
  myTies: (locale: string) => call<TieResponse[]>("/play/ties", "GET", undefined, locale),
  leagues: (locale: string) => call<DraftLeagues>("/play/leagues", "GET", undefined, locale, { identity: "optional" }),
  leagueBoard: (leagueId: string, locale: string, week?: string) => call<LeagueBoard>(`/play/board?league=${q(leagueId)}${week ? `&week=${q(week)}` : ""}`, "GET", undefined, locale, { identity: "optional" }),
  boardTeam: (runId: string, locale: string) => call<TeamResponse>(`/play/board/team?runId=${q(runId)}`, "GET", undefined, locale, { identity: "optional" }),
  boardTie: (runId: string, locale: string) => call<TieResponse>("/play/board/tie", "POST", { runId }, locale),
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

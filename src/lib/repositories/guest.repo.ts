import { guestFetch } from "@/lib/guest/guestSession";
import { API_BASE_URL } from "@/lib/config";
import type { DailyChallengeSession, DailyChallengeType, PassChainLinkResult, StatSniperLeaderboard } from "@/lib/domain/dailyChallenge";

export interface GuestCompletion { status: "completed"; guest: true; score: number; bestScore: number; attempts: number; coinsAwarded: 0; xpAwarded: 0 }
export interface PublicStandingEntry { alias: string; rank: number; score: number }
export interface PublicStandingsBlock { competition: "ranked" | "weekend_league"; scoring_label: string; status: "live" | "pending_results" | "not_started" | "unavailable"; entries: PublicStandingEntry[]; updated_at: string }
export interface PublicStatSniperBoard { challengeDay: string; entries: Array<{ rank: number; alias: string; score: number }>; me: null }
export interface PublicStandings { ranked: PublicStandingsBlock; weekend_league: PublicStandingsBlock }

/** Guest play API (no account): today's real daily sets, results without rewards, public boards. */
export const guestApi = {
  createDailySession: (type: DailyChallengeType, locale: string) =>
    guestFetch<DailyChallengeSession>(`/api/v1/guest/daily-challenges/${type}/session?locale=${encodeURIComponent(locale)}`, { method: "POST", locale }),
  completeDaily: (type: DailyChallengeType, score: number, locale: string) =>
    guestFetch<GuestCompletion>(`/api/v1/guest/daily-challenges/${type}/complete`, { method: "POST", body: { score }, locale }),
  linkPassChain: (body: { puzzleId: string; fromPlayerId: string; text: string; locale: string }) =>
    guestFetch<PassChainLinkResult>("/api/v1/guest/daily-challenges/pass-chain/link", { method: "POST", body, locale: body.locale }),
  /** The public board carries alias/rank/score only; shaped like the member board so the same component renders it. */
  statSniperLeaderboard: async (locale: string): Promise<StatSniperLeaderboard> => {
    const board = await guestFetch<PublicStatSniperBoard>("/api/v1/guest/daily-challenges/stat-sniper/leaderboard", { locale });
    return { challengeDay: board.challengeDay, me: null, entries: board.entries.map((e) => ({ userId: `guest-board-${e.rank}`, rank: e.rank, username: e.alias, avatarCustomization: null, country: null, score: e.score })) } as StatSniperLeaderboard;
  },
  async standings(): Promise<PublicStandings | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/guest/standings`, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return null;
      const data = (await res.json()) as Partial<PublicStandings>;
      return data && data.ranked && data.weekend_league && Array.isArray(data.ranked.entries) && Array.isArray(data.weekend_league.entries) ? (data as PublicStandings) : null;
    } catch {
      return null;
    }
  },
};

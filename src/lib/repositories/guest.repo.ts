import { guestFetch } from "@/lib/guest/guestSession";
import { API_BASE_URL } from "@/lib/config";
import type { DailyChallengeSession, DailyChallengeType, PassChainLinkResult, StatSniperLeaderboard } from "@/lib/domain/dailyChallenge";

export interface GuestCompletion { status: "completed"; guest: true; score: number; bestScore: number; attempts: number; coinsAwarded: 0; xpAwarded: 0 }
export interface PublicStandingEntry { alias: string; rank: number; score: number }
export interface PublicStandingsBlock { competition: "ranked" | "weekend_league"; scoring_label: string; status: "live" | "not_started" | "unavailable"; entries: PublicStandingEntry[]; updated_at: string }
export interface PublicStandings { ranked: PublicStandingsBlock; weekend_league: PublicStandingsBlock }

/** Guest play API (no account): today's real daily sets, results without rewards, public boards. */
export const guestApi = {
  createDailySession: (type: DailyChallengeType, locale: string) =>
    guestFetch<DailyChallengeSession>(`/api/v1/guest/daily-challenges/${type}/session?locale=${encodeURIComponent(locale)}`, { method: "POST", locale }),
  completeDaily: (type: DailyChallengeType, score: number, locale: string) =>
    guestFetch<GuestCompletion>(`/api/v1/guest/daily-challenges/${type}/complete`, { method: "POST", body: { score }, locale }),
  linkPassChain: (body: { puzzleId: string; fromPlayerId: string; text: string; locale: string }) =>
    guestFetch<PassChainLinkResult>("/api/v1/guest/daily-challenges/pass-chain/link", { method: "POST", body, locale: body.locale }),
  statSniperLeaderboard: (locale: string) => guestFetch<StatSniperLeaderboard>("/api/v1/guest/daily-challenges/stat-sniper/leaderboard", { locale }),
  async standings(): Promise<PublicStandings | null> {
    const res = await fetch(`${API_BASE_URL}/api/v1/guest/standings`, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
    if (!res || !res.ok) return null;
    return (await res.json()) as PublicStandings;
  },
};

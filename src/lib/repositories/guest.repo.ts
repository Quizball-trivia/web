import { guestFetch } from "@/lib/guest/guestSession";
import type { DailyChallengeSession, DailyChallengeType, PassChainLinkResult, StatSniperLeaderboard } from "@/lib/domain/dailyChallenge";

export interface GuestCompletion { status: "completed"; guest: true; score: number; bestScore: number; attempts: number; coinsAwarded: 0; xpAwarded: 0 }
export interface PublicStatSniperBoard { challengeDay: string; entries: Array<{ rank: number; alias: string; score: number }>; me: null }

/** Guest play API (no account): today's real daily sets, results without rewards, the public Stat Sniper board. */
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
};

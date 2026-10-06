import { API_BASE_URL } from "@/lib/config";
import { timeoutSignal } from "@/lib/timeoutSignal";
import type { StatSniperLeaderboard } from "@/lib/domain/dailyChallenge";

type PublicRow = { rank: number; alias: string; score: number; country: string | null; avatarCustomization?: unknown };

/** Today's Stat Sniper board for any visitor (no account or guest session); never carries a personal row. */
export async function fetchPublicStatSniperBoard(): Promise<StatSniperLeaderboard> {
  const res = await fetch(`${API_BASE_URL}/api/v1/guest/daily-challenges/stat-sniper/leaderboard`, { signal: timeoutSignal(10_000) });
  if (!res.ok) throw new Error(`Leaderboard request failed (${res.status})`);
  const data = (await res.json()) as { challengeDay: string; entries: PublicRow[] };
  return {
    challengeDay: data.challengeDay,
    // The public board has no ids: the rank keys the row and can never match the viewer.
    entries: data.entries.map((e) => ({ userId: `public-${e.rank}`, rank: e.rank, username: e.alias, score: e.score, country: e.country ?? null, avatarCustomization: e.avatarCustomization })),
    me: null,
  };
}

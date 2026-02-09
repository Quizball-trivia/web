import type { HeadToHeadSummary } from "@/lib/domain";
import type { RecentMatchSummary } from "@/lib/domain";
import type { MatchStatsSummary } from "@/lib/domain";
import type {
  HeadToHeadResponse,
  RecentMatchesResponse,
  StatsSummaryResponse,
} from "@/lib/repositories/stats.repo";

export function toHeadToHeadSummary(response: HeadToHeadResponse): HeadToHeadSummary {
  return {
    userAId: response.userAId,
    userBId: response.userBId,
    winsA: response.winsA,
    winsB: response.winsB,
    draws: response.draws,
    total: response.total,
    lastPlayedAt: response.lastPlayedAt,
  };
}

function formatTimeAgo(dateIso: string | null): string {
  if (!dateIso) return "Just now";
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return "Just now";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const seconds = Math.max(1, Math.floor(diffMs / 1000));

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export function toRecentMatchSummaries(response: RecentMatchesResponse): RecentMatchSummary[] {
  return response.items.map((item) => ({
    matchId: item.matchId,
    mode: item.mode,
    status: item.status,
    result: item.result,
    endedAt: item.endedAt,
    timeLabel: formatTimeAgo(item.endedAt),
    playerScore: item.playerScore,
    opponentScore: item.opponentScore,
    opponent: {
      id: item.opponent.id,
      username: item.opponent.username,
      avatarUrl: item.opponent.avatarUrl,
      isAi: item.opponent.isAi,
    },
  }));
}

export function toMatchStatsSummary(response: StatsSummaryResponse): MatchStatsSummary {
  return {
    overall: {
      gamesPlayed: response.overall.gamesPlayed,
      wins: response.overall.wins,
      losses: response.overall.losses,
      draws: response.overall.draws,
      winRate: response.overall.winRate,
    },
    ranked: {
      gamesPlayed: response.ranked.gamesPlayed,
      wins: response.ranked.wins,
      losses: response.ranked.losses,
      draws: response.ranked.draws,
      winRate: response.ranked.winRate,
    },
    friendly: {
      gamesPlayed: response.friendly.gamesPlayed,
      wins: response.friendly.wins,
      losses: response.friendly.losses,
      draws: response.friendly.draws,
      winRate: response.friendly.winRate,
    },
  };
}

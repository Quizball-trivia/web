import type { HeadToHeadSummary } from "@/lib/domain";
import type { HeadToHeadResponse } from "@/lib/repositories/stats.repo";

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

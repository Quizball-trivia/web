import type { MatchStatsSummary } from "@/lib/domain";
import type { RankedProfileResponse } from "@/lib/repositories/ranked.repo";

interface ShouldShowProfileSeasonSelectorArgs {
  isSelf: boolean;
  archivedSeasonCount: number;
  rankedProfile: RankedProfileResponse | null;
  rankedProfileLoading: boolean;
  matchStatsSummary: MatchStatsSummary | null;
}

export function shouldShowProfileSeasonSelector({
  isSelf,
  archivedSeasonCount,
  rankedProfile,
  rankedProfileLoading,
  matchStatsSummary,
}: ShouldShowProfileSeasonSelectorArgs): boolean {
  if (!isSelf || archivedSeasonCount <= 0 || rankedProfileLoading) {
    return false;
  }

  const placementRequired = Math.max(1, rankedProfile?.placementRequired ?? 3);
  const rankedGamesPlayed = matchStatsSummary?.ranked.gamesPlayed ?? 0;
  const previousSeasonGames = matchStatsSummary?.rankedSeasons?.previous.gamesPlayed ?? 0;

  return (
    rankedProfile?.placementStatus === "placed" ||
    previousSeasonGames > 0 ||
    rankedGamesPlayed >= placementRequired
  );
}

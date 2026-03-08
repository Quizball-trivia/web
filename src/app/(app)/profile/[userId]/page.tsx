"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { usePublicProfile, useUserAchievements } from "@/lib/queries/users.queries";
import { useRecentMatches } from "@/lib/queries/stats.queries";
import { useAuthStore } from "@/stores/auth.store";
import { ProfileWeb, toProfileRecentMatch } from "@/features/profile/ProfileWeb";
import { ApiError } from "@/lib/api/api";
import type { PlayerStats } from "@/types/game";
import type { RankedProfileResponse } from "@/lib/repositories/ranked.repo";

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.user?.id);

  // Redirect to own profile page
  if (currentUserId && userId === currentUserId) {
    router.replace("/profile");
    return null;
  }

  return <PublicProfileContent userId={userId} />;
}

function PublicProfileContent({ userId }: { userId: string }) {
  const router = useRouter();
  const { data: profile, isLoading, error } = usePublicProfile(userId);
  const { data: achievements = [] } = useUserAchievements(userId);
  const {
    data: recentMatches = [],
    isLoading: recentMatchesLoading,
    error: recentMatchesError,
  } = useRecentMatches(20, userId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-fun font-bold animate-pulse">
          Loading profile...
        </p>
      </div>
    );
  }

  if (error) {
    const is404 = error instanceof ApiError && error.status === 404;
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8 font-fun">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <div className="text-center py-20 rounded-2xl bg-card border-2 border-border border-b-4">
          <div className="text-4xl mb-3">{is404 ? "👤" : "⚠️"}</div>
          <h2 className="text-xl font-black mb-1">
            {is404 ? "Player not found" : "Something went wrong"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {is404
              ? "This player doesn't exist or their profile is unavailable."
              : "Failed to load profile. Please try again later."}
          </p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  // Map PublicProfile to the minimal PlayerStats shape ProfileWeb needs
  const playerStats: PlayerStats = {
    id: profile.id,
    username: profile.nickname ?? "Unknown",
    avatar: profile.avatarUrl ?? "avatar-1",
    avatarCustomization: profile.avatarUrl
      ? { base: profile.avatarUrl }
      : undefined,
    coins: 0,
    level: 0,
    xp: 0,
    xpToNextLevel: 1,
    totalScore: 0,
    gamesPlayed: profile.stats.overall.gamesPlayed,
    correctAnswers: 0,
    currentStreak: 0,
    bestStreak: 0,
    achievements,
    badges: [],
    rank: 0,
    ownedItems: [],
  };

  const rankedProfile: RankedProfileResponse | null = profile.ranked
    ? {
        rp: profile.ranked.rp,
        tier: profile.ranked.tier as RankedProfileResponse["tier"],
        placementStatus: profile.ranked.placementStatus as RankedProfileResponse["placementStatus"],
        placementPlayed: profile.ranked.placementPlayed,
        placementRequired: profile.ranked.placementRequired,
        placementWins: profile.ranked.placementWins,
        currentWinStreak: profile.ranked.currentWinStreak,
        lastRankedMatchAt: profile.ranked.lastRankedMatchAt,
      }
    : null;

  const matchStatsSummary = {
    overall: profile.stats.overall,
    ranked: profile.stats.ranked,
    friendly: profile.stats.friendly,
  };

  const mappedMatches = recentMatches.map(toProfileRecentMatch);

  return (
    <div>
      <div className="container mx-auto max-w-7xl px-4 pt-4 lg:px-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-fun font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      </div>
      <ProfileWeb
        viewMode="other"
        player={playerStats}
        avatarUrl={profile.avatarUrl}
        country={profile.country}
        favoriteClub={profile.favoriteClub}
        globalRank={profile.globalRank}
        countryRank={profile.countryRank}
        matchStatsSummary={matchStatsSummary}
        rankedProfile={rankedProfile}
        recentMatches={mappedMatches}
        recentMatchesLoading={recentMatchesLoading}
        recentMatchesError={
          recentMatchesError instanceof Error && recentMatches.length === 0
            ? recentMatchesError.message
            : null
        }
        headToHead={profile.headToHead}
      />
    </div>
  );
}

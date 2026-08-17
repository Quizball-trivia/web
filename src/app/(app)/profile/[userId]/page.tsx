"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { usePublicProfile, useResolveNickname, useUserAchievements } from "@/lib/queries/users.queries";
import { useRecentMatches } from "@/lib/queries/stats.queries";
import { useAuthStore } from "@/stores/auth.store";
import { ProfileWeb, toProfileRecentMatch } from "@/features/profile/ProfileWeb";
import { MAX_MATCHES_COUNT } from "@/lib/constants/matches";
import { ApiError } from "@/lib/api/api";
import { useLocale } from "@/contexts/LocaleContext";
import type { PlayerStats } from "@/types/game";
import type { RankedProfileResponse } from "@/lib/repositories/ranked.repo";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  // The segment is either a user id (legacy links) or a nickname — nicknames
  // are case-insensitively unique among claimable users, so /profile/მახატა
  // resolves to exactly one account. UUID links keep working forever.
  // CLIENT pages receive the segment still percent-encoded (route handlers
  // get it decoded — verified empirically on this Next version: staging
  // /profile/Tako%20Eliashava arrived as the literal encoded string and the
  // resolver 404ed). Decode defensively: a nickname with a literal '%' is not
  // valid percent-encoding, so on decode failure the raw value passes through.
  const { userId: rawParam } = use(params);
  let handle = rawParam;
  try { handle = decodeURIComponent(rawParam); } catch { /* literal % */ }
  const isId = UUID_RE.test(handle);
  const { data: resolved, error: resolveError } = useResolveNickname(isId ? undefined : handle);
  const userId = isId ? handle : resolved?.user_id;
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.user?.id);

  // Own profile lives at /profile — redirect from an effect: replace() during
  // render re-fires every render until navigation commits (review).
  const isOwn = Boolean(currentUserId) && userId === currentUserId;
  useEffect(() => {
    if (isOwn) router.replace("/profile");
  }, [isOwn, router]);
  if (isOwn) return null;

  if (!isId && !userId) {
    // Only a settled failure shows the not-found state — while auth hydrates
    // or the lookup is in flight, the query has neither data nor error, and a
    // premature 404 would flash on every nickname link.
    if (resolveError) {
      return <ProfileErrorState is404={resolveError instanceof ApiError && resolveError.status === 404} />;
    }
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-white/40" />
      </div>
    );
  }

  return <PublicProfileContent userId={userId ?? handle} />;
}

function ProfileErrorState({ is404 }: { is404: boolean }) {
  const router = useRouter();
  const { t } = useLocale();
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 font-fun">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="size-4" />
        {t("common.back")}
      </button>
      <div className="text-center py-20 rounded-2xl bg-card border-2 border-border border-b-4">
        <div className="text-4xl mb-3">{is404 ? "👤" : "⚠️"}</div>
        <h2 className="text-xl font-black mb-1">
          {is404 ? t("profileScreen.playerNotFound") : t("errors.INTERNAL_ERROR")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {is404
            ? t("profileScreen.playerNotFoundDescription")
            : t("profileScreen.failedToLoadProfile")}
        </p>
      </div>
    </div>
  );
}

function PublicProfileContent({ userId }: { userId: string }) {
  const router = useRouter();
  const { t } = useLocale();
  const { data: profile, isLoading, error } = usePublicProfile(userId);
  const { data: achievements = [] } = useUserAchievements(userId);
  const {
    data: recentMatches = [],
    isLoading: recentMatchesLoading,
    error: recentMatchesError,
  } = useRecentMatches(MAX_MATCHES_COUNT, userId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-fun font-bold animate-pulse">
          {t("profileScreen.loadingProfile")}
        </p>
      </div>
    );
  }

  if (error) {
    return <ProfileErrorState is404={error instanceof ApiError && error.status === 404} />;
  }

  if (!profile) return null;

  // Map PublicProfile to the minimal PlayerStats shape ProfileWeb needs
  const playerStats: PlayerStats = {
    id: profile.id,
    username: profile.nickname ?? "Unknown",
    avatar: profile.avatarUrl ?? "avatar-1",
    avatarCustomization: profile.avatarCustomization
      ? profile.avatarCustomization
      : profile.avatarUrl
      ? { base: profile.avatarUrl }
      : undefined,
    coins: 0,
    level: profile.progression.level,
    xp: profile.progression.currentLevelXp,
    xpToNextLevel: profile.progression.xpForNextLevel,
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
    ...(profile.stats.rankedSeasons
      ? { rankedSeasons: profile.stats.rankedSeasons }
      : {}),
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
        previousNicknames={profile.previousNicknames}
      />
    </div>
  );
}

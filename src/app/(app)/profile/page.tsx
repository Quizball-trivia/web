"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ProfileScreen } from "@/features/profile/ProfileScreen";
import { usePlayer } from "@/contexts/PlayerContext";
import { updateMe } from "@/lib/api/endpoints";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth.store";
import { useMatchStatsSummary, useRecentMatches } from "@/lib/queries/stats.queries";
import { useRankedProfile, useUserRanks } from "@/lib/queries/ranked.queries";
import { queryKeys } from "@/lib/queries/queryKeys";
import { useLocale } from "@/contexts/LocaleContext";
import { LOCALES, type Locale } from "@/lib/i18n/messages";
import { toProfileRecentMatch } from "@/features/profile/ProfileWeb";
import { useEffect } from "react";
import { useMyAchievements } from "@/lib/queries/users.queries";
import { decodeAvatarCustomization } from "@/lib/avatars";
import { trackNicknameChanged, trackFavoriteClubChanged } from "@/lib/analytics/game-events";

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { player, updateStats } = usePlayer();
  const authUser = useAuthStore((state) => state.user);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const {
    data: recentMatches = [],
    isLoading: recentMatchesLoading,
    error: recentMatchesError,
  } = useRecentMatches(20);
  const { data: matchStatsSummary = null } = useMatchStatsSummary();
  const { data: rankedProfile, isLoading: rankedProfileLoading } = useRankedProfile();
  const { data: userRanks } = useUserRanks();
  const { data: achievements = [] } = useMyAchievements();

  const { setLocale, t } = useLocale();
  const [isUpdating, setIsUpdating] = useState(false);
  const purchaseStatus = searchParams.get("purchase");

  useEffect(() => {
    if (!purchaseStatus) return;
    if (purchaseStatus === "success") {
      toast.success(t("profile.purchaseCompleted"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.inventory() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() });
    }
    if (purchaseStatus === "cancelled") {
      toast.message(t("profile.purchaseCancelled"));
    }
    // Clear the query param so the toast doesn't re-fire on remount/navigation
    const params = new URLSearchParams(searchParams.toString());
    params.delete("purchase");
    const cleaned = params.toString();
    router.replace(cleaned ? `?${cleaned}` : window.location.pathname, { scroll: false });
  }, [purchaseStatus, queryClient, router, searchParams, t]);

  const handleNameChange = async (name: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const updated = await updateMe({ nickname: name });
      updateStats({ username: name });
      if (authUser) {
        setAuthenticated({ ...authUser, nickname: updated.nickname ?? name });
      }
      try {
        trackNicknameChanged();
      } catch (analyticsError) {
        console.error('Analytics tracking failed', analyticsError);
      }
      toast.success(t("profile.nicknameUpdated"));
    } catch (error) {
      toast.error(t("profile.nicknameUpdateFailed"), {
        description: error instanceof Error ? error.message : t("profile.pleaseTryAgain"),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarChange = async (avatarUrl: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const avatarCustomization = decodeAvatarCustomization(avatarUrl);
      const updated = avatarCustomization
        ? await updateMe({ avatar_url: null, avatar_customization: avatarCustomization })
        : await updateMe({ avatar_url: null, avatar_customization: null });
      updateStats({ avatarCustomization: avatarCustomization ?? undefined });
      if (authUser) {
        setAuthenticated({
          ...authUser,
          avatar_url: updated.avatar_url,
          avatar_customization: updated.avatar_customization ?? avatarCustomization,
        });
      }
      toast.success(t("profile.avatarUpdated"));
    } catch (error) {
      toast.error(t("profile.avatarUpdateFailed"), {
        description: error instanceof Error ? error.message : t("profile.pleaseTryAgain"),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClubChange = async (club: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const updated = await updateMe({ favorite_club: club });
      if (authUser) {
        setAuthenticated({ ...authUser, favorite_club: updated.favorite_club });
      }
      try {
        trackFavoriteClubChanged(club);
      } catch (analyticsError) {
        console.error('Analytics tracking failed', analyticsError);
      }
      toast.success(t("profile.favoriteClubUpdated"));
    } catch (error) {
      toast.error(t("profile.favoriteClubUpdateFailed"), {
        description: error instanceof Error ? error.message : t("profile.pleaseTryAgain"),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLanguageChange = async (language: string) => {
    if (isUpdating) return;
    if (!LOCALES.some((l) => l.code === language)) {
      toast.error(t("profile.invalidLanguage"));
      return;
    }
    setIsUpdating(true);
    try {
      const updated = await updateMe({ preferred_language: language });
      if (authUser) {
        setAuthenticated({ ...authUser, preferred_language: updated.preferred_language });
      }
      setLocale(language as Locale);
      toast.success(t("profile.languageUpdated"));
    } catch (error) {
      toast.error(t("profile.languageUpdateFailed"), {
        description: error instanceof Error ? error.message : t("profile.pleaseTryAgain"),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <ProfileScreen
      player={{
        ...player,
        level: authUser?.progression?.level ?? player.level,
        xp: authUser?.progression?.currentLevelXp ?? player.xp,
        xpToNextLevel: authUser?.progression?.xpForNextLevel ?? player.xpToNextLevel,
        achievements,
        badges: [],
      }}
      avatarUrl={authUser?.avatar_url ?? null}
      country={authUser?.country ?? null}
      favoriteClub={authUser?.favorite_club ?? null}
      preferredLanguage={authUser?.preferred_language ?? null}
      globalRank={userRanks?.globalRank ?? null}
      countryRank={userRanks?.countryRank ?? null}
      matchStatsSummary={matchStatsSummary}
      rankedProfile={rankedProfile ?? null}
      rankedProfileLoading={rankedProfileLoading}
      recentMatches={recentMatches.map(toProfileRecentMatch)}
      recentMatchesLoading={recentMatchesLoading}
      recentMatchesError={
        recentMatchesError instanceof Error && recentMatches.length === 0
          ? recentMatchesError.message
          : null
      }
      onNameChange={handleNameChange}
      onAvatarChange={handleAvatarChange}
      onClubChange={handleClubChange}
      onLanguageChange={handleLanguageChange}
      isUpdating={isUpdating}
    />
  );
}

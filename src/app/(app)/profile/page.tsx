"use client";

import { useState } from "react";
import { ProfileScreen } from "@/features/profile/ProfileScreen";
import { usePlayer } from "@/contexts/PlayerContext";
import { updateMe } from "@/lib/api/endpoints";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth.store";
import { useMatchStatsSummary, useRecentMatches } from "@/lib/queries/stats.queries";
import { useRankedProfile } from "@/lib/queries/ranked.queries";
import { useLocale } from "@/contexts/LocaleContext";
import { LOCALES, type Locale } from "@/data/locales";
import { formatMatchScore } from "@/utils/matchScore";

export default function ProfilePage() {
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

  const { setLocale } = useLocale();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleNameChange = async (name: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const updated = await updateMe({ nickname: name });
      updateStats({ username: name });
      if (authUser) {
        setAuthenticated({ ...authUser, nickname: updated.nickname ?? name });
      }
      toast.success("Nickname updated");
    } catch (error) {
      toast.error("Failed to update nickname", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarChange = async (avatarUrl: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const updated = await updateMe({ avatar_url: avatarUrl });
      updateStats({ avatarCustomization: { base: avatarUrl } });
      if (authUser) {
        setAuthenticated({ ...authUser, avatar_url: updated.avatar_url ?? avatarUrl });
      }
      toast.success("Avatar updated");
    } catch (error) {
      toast.error("Failed to update avatar", {
        description: error instanceof Error ? error.message : "Please try again.",
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
      toast.success("Favorite club updated");
    } catch (error) {
      toast.error("Failed to update favorite club", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLanguageChange = async (language: string) => {
    if (isUpdating) return;
    if (!LOCALES.some((l) => l.code === language)) {
      toast.error("Invalid language selected");
      return;
    }
    setIsUpdating(true);
    try {
      const updated = await updateMe({ preferred_language: language });
      if (authUser) {
        setAuthenticated({ ...authUser, preferred_language: updated.preferred_language });
      }
      setLocale(language as Locale);
      toast.success("Language updated");
    } catch (error) {
      toast.error("Failed to update language", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <ProfileScreen
      player={player}
      avatarUrl={authUser?.avatar_url ?? null}
      favoriteClub={authUser?.favorite_club ?? null}
      preferredLanguage={authUser?.preferred_language ?? null}
      matchStatsSummary={matchStatsSummary}
      rankedProfile={rankedProfile ?? null}
      rankedProfileLoading={rankedProfileLoading}
      recentMatches={recentMatches.map((match) => ({
        id: match.matchId,
        mode: match.mode === "ranked" ? "Ranked" : "Friendly",
        result:
          match.result === "win"
            ? "Win"
            : match.result === "loss"
              ? "Loss"
              : "Draw",
        time: match.timeLabel,
        opponent: match.opponent.username,
        scoreFormatted: formatMatchScore(match),
      }))}
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

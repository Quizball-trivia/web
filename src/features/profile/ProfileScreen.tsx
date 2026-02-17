'use client';

import type { PlayerStats } from '@/types/game';
import type { MatchStatsSummary } from '@/lib/domain';
import type { RankedProfileResponse } from '@/lib/repositories/ranked.repo';
import { ProfileWeb, type ProfileRecentMatch } from './ProfileWeb';
import { useAuthStore } from '@/stores/auth.store';
import { logger } from '@/utils/logger';

interface ProfileScreenProps {
  player: PlayerStats;
  avatarUrl?: string | null;
  favoriteClub?: string | null;
  preferredLanguage?: string | null;
  countryRank?: number | string | null;
  friendsRank?: number | string | null;
  matchStatsSummary?: MatchStatsSummary | null;
  rankedProfile?: RankedProfileResponse | null;
  rankedProfileLoading?: boolean;
  recentMatches?: ProfileRecentMatch[];
  recentMatchesLoading?: boolean;
  recentMatchesError?: string | null;
  onNameChange?: (newName: string) => Promise<void> | void;
  onAvatarChange?: (avatarUrl: string) => Promise<void> | void;
  onClubChange?: (club: string) => Promise<void> | void;
  onLanguageChange?: (language: string) => Promise<void> | void;
  /** Whether a profile update is in progress (disables inputs/buttons) */
  isUpdating?: boolean;
}

export function ProfileScreen(props: ProfileScreenProps) {
  const logout = useAuthStore((state) => state.logout);

  const handleSignOut = async () => {
    try {
      await logout();
      // Navigation handled by auth state change
    } catch (error) {
      logger.error('Logout failed', error);
    }
  };

  return (
      <ProfileWeb
        player={props.player}
        avatarUrl={props.avatarUrl}
        favoriteClub={props.favoriteClub}
        preferredLanguage={props.preferredLanguage}
        countryRank={props.countryRank}
        friendsRank={props.friendsRank}
        matchStatsSummary={props.matchStatsSummary}
        rankedProfile={props.rankedProfile}
        rankedProfileLoading={props.rankedProfileLoading}
        recentMatches={props.recentMatches}
        recentMatchesLoading={props.recentMatchesLoading}
        recentMatchesError={props.recentMatchesError}
        onNameChange={props.onNameChange}
        onAvatarChange={props.onAvatarChange}
        onClubChange={props.onClubChange}
        onLanguageChange={props.onLanguageChange}
        onSignOut={handleSignOut}
        isUpdating={props.isUpdating}
      />
  );
}

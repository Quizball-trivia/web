'use client';

import type { PlayerStats } from '@/types/game';
import { ProfileWeb } from './ProfileWeb';
import { useAuthStore } from '@/stores/auth.store';
import { logger } from '@/utils/logger';

interface ProfileScreenProps {
  player: PlayerStats;
  avatarUrl?: string | null;
  onNameChange?: (newName: string) => Promise<void> | void;
  onAvatarChange?: (avatarUrl: string) => Promise<void> | void;
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
        onNameChange={props.onNameChange}
        onAvatarChange={props.onAvatarChange}
        onSignOut={handleSignOut}
        isUpdating={props.isUpdating}
      />
  );
}

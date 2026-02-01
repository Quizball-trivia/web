import type { PlayerStats } from '@/types/game';
import { ProfileMobile } from './profile/ProfileMobile';
import { ProfileWeb } from './profile/ProfileWeb';
import { useAuthStore } from '@/stores/auth.store';
import { logger } from '@/utils/logger';

interface ProfileScreenProps {
  player: PlayerStats;
  onNavigateToStore?: () => void;
  onNavigateToSettings?: () => void;
  onFeatureFlagsChange?: (flags: { extraGameModes: boolean }) => void;
  onNameChange?: (newName: string) => void;
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
    <>
      <div className="block md:hidden">
        <ProfileMobile {...props} />
      </div>
      <div className="hidden md:block">
        <ProfileWeb
          player={props.player}
          onNameChange={props.onNameChange}
          onSignOut={handleSignOut}
        />
      </div>
    </>
  );
}

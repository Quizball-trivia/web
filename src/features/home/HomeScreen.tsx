import type { PlayerStats } from '@/types/game';
import { HomeDashboard } from './HomeDashboard';

interface HomeScreenProps {
  playerStats: PlayerStats;
}

export function HomeScreen({
  playerStats,
}: HomeScreenProps) {
  return (
    <HomeDashboard
       playerStats={playerStats}
    />
  );
}

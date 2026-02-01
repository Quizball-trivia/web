import type { PlayerStats } from '@/types/game';
import { HomeDashboard } from './HomeDashboard';

interface HomeScreenProps {
  playerStats: PlayerStats;
  dailyChallengesCompleted: Map<string, number>;
}

export function HomeScreen({
  playerStats,
  dailyChallengesCompleted,
}: HomeScreenProps) {
  return (
    <HomeDashboard
       playerStats={playerStats}
       dailyChallengesCompleted={dailyChallengesCompleted}
    />
  );
}

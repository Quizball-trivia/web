import { useMemo } from 'react';
import { DailyChallengeCard } from './DailyChallengeCard';
import { useDailyChallenges } from '@/lib/queries/dailyChallenges.queries';
import { toChallengeCard, type DailyChallengeId } from '../challenges';

interface DailyChallengesSectionProps {
  onViewAll: () => void;
  onSelectChallenge: (challengeId: DailyChallengeId) => void;
}

export function DailyChallengesSection({
  onViewAll,
  onSelectChallenge,
}: DailyChallengesSectionProps) {
  const { data: dailyChallenges = [] } = useDailyChallenges();
  const homeChallenges = useMemo(
    () => dailyChallenges.filter((challenge) => challenge.showOnHome).map(toChallengeCard),
    [dailyChallenges]
  );

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Daily Challenges</h2>
        <button
          onClick={onViewAll}
          className="text-sm text-primary hover:underline"
        >
          View All
        </button>
      </div>

      <div className="space-y-3">
        {homeChallenges.map((challenge) => (
          <DailyChallengeCard
            key={challenge.id}
            id={challenge.id}
            title={challenge.title}
            description={challenge.description}
            icon={challenge.icon}
            iconBgColor={challenge.iconBgColor}
            coinReward={challenge.coinReward}
            isCompleted={challenge.completedToday}
            onClick={() => onSelectChallenge(challenge.id)}
          />
        ))}
      </div>
    </div>
  );
}

import { DailyChallengeCard } from './DailyChallengeCard';
import { HOME_CHALLENGES, type DailyChallengeId } from '../challenges';

interface DailyChallengesSectionProps {
  dailyChallengesCompleted: Map<string, number>;
  onViewAll: () => void;
  onSelectChallenge: (challengeId: DailyChallengeId) => void;
}

export function DailyChallengesSection({
  dailyChallengesCompleted,
  onViewAll,
  onSelectChallenge,
}: DailyChallengesSectionProps) {
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
        {HOME_CHALLENGES.map((challenge) => (
          <DailyChallengeCard
            key={challenge.id}
            id={challenge.id}
            title={challenge.title}
            description={challenge.description}
            icon={challenge.icon}
            iconBgColor={challenge.iconBgColor}
            coinReward={challenge.coinReward}
            isCompleted={dailyChallengesCompleted.has(challenge.id)}
            onClick={() => onSelectChallenge(challenge.id)}
          />
        ))}
      </div>
    </div>
  );
}

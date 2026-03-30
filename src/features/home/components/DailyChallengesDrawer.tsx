import { formatTimeRemaining } from '@/utils/gameHelpers';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  Coins,
  Sparkles,
  Clock,
  CheckCircle2,
  Timer,
  DollarSign,
  Brain,
  Lightbulb,
  ListOrdered,
  CircleCheckBig,
  type LucideIcon,
} from 'lucide-react';
import { useDailyChallenges } from '@/lib/queries/dailyChallenges.queries';
import {
  toChallengeCard,
  type ChallengeCard,
  type IconToken,
  type DailyChallengeId,
} from '../challenges';

// Map icon tokens to Lucide components
const ICON_MAP: Record<IconToken, LucideIcon> = {
  dollarSign: DollarSign,
  brain: Brain,
  checkCircle: CircleCheckBig,
  lightbulb: Lightbulb,
  timer: Timer,
  list: ListOrdered,
};

interface DailyChallengesDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rankedEntriesResetTimestamp: number | null;
  onSelectChallenge: (challengeId: DailyChallengeId) => void;
}

function ChallengeCard({
  challenge,
  isCompleted,
  onClick,
}: {
  challenge: ChallengeCard;
  isCompleted: boolean;
  onClick: () => void;
}) {
  const IconComponent = ICON_MAP[challenge.iconToken];

  return (
    <Card
      className={`cursor-pointer transition-all hover:border-primary/50 ${
        isCompleted ? 'opacity-60' : 'active:scale-[0.98]'
      }`}
      onClick={() => !isCompleted && onClick()}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
            <IconComponent className={`size-5 ${challenge.iconColorClass}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm mb-1 flex items-center gap-2">
              {challenge.title}
              {isCompleted && <CheckCircle2 className="size-4 text-green-500" />}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isCompleted
                ? 'Completed! Great job!'
                : challenge.description}
            </p>
            {isCompleted ? (
              <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                <Timer className="size-3" />
                <span>Available again after the UTC reset</span>
              </div>
            ) : null}
          </div>
        </div>
        {!isCompleted && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
            <Badge variant="secondary" className="text-xs">
              <Coins className="size-3 mr-1" />
              {challenge.coinReward}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="size-3 mr-1" />
              {challenge.xpReward} XP
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DailyChallengesDrawer({
  isOpen,
  onOpenChange,
  rankedEntriesResetTimestamp,
  onSelectChallenge,
}: DailyChallengesDrawerProps) {
  const { data: dailyChallenges = [] } = useDailyChallenges();
  const completedCount = dailyChallenges.filter((challenge) => challenge.completedToday).length;
  const totalCount = dailyChallenges.length;
  const challengeCards = dailyChallenges.map(toChallengeCard);

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Daily Challenges</DrawerTitle>
          <DrawerDescription>
            Complete challenges to earn coins and XP. Resets every 24 hours.
          </DrawerDescription>
          {rankedEntriesResetTimestamp && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Clock className="size-4" />
              <span>
                Resets in {formatTimeRemaining(rankedEntriesResetTimestamp)}
              </span>
            </div>
          )}
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto">
          {/* Progress indicator */}
          <div className="mb-4 p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Today&apos;s Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedCount}/{totalCount} completed
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>

          {/* Challenge list */}
          <div className="space-y-3">
            {challengeCards.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                isCompleted={challenge.completedToday}
                onClick={() => onSelectChallenge(challenge.id)}
              />
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

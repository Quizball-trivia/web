import { Coins, CheckCircle2 } from 'lucide-react';

interface DailyChallengeCardProps {
  id: string;
  title: string;
  description: string;
  completedDescription?: string;
  icon: string;
  iconBgColor: string;
  coinReward: number;
  isCompleted: boolean;
  onClick: () => void;
  variant?: 'default' | 'compact';
}

export function DailyChallengeCard({
  title,
  description,
  completedDescription = 'Completed! Great job!',
  icon,
  iconBgColor,
  coinReward,
  isCompleted,
  onClick,
  variant = 'default',
}: DailyChallengeCardProps) {
  const isCompact = variant === 'compact';

  return (
    <button
      onClick={() => {
        if (!isCompleted) {
          onClick();
        }
      }}
      disabled={isCompleted}
      className={`w-full p-3 flex items-center gap-3 transition-all ${
        isCompleted ? 'opacity-60' : 'active:scale-[0.98]'
      }`}
    >
      <div
        className={`${isCompact ? 'size-16' : 'size-24'} rounded-lg ${iconBgColor} flex items-center justify-center flex-shrink-0`}
      >
        <span className={isCompact ? 'text-2xl' : 'text-4xl'}>{icon}</span>
      </div>
      <div className="flex-1 text-left">
        <div className={`${isCompact ? 'text-sm' : 'text-base'} font-semibold`}>{title}</div>
        <div className={`${isCompact ? 'text-xs' : 'text-sm'} text-muted-foreground mt-0.5`}>
          {isCompleted ? completedDescription : description}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1 text-sm text-yellow-500">
            <Coins className="size-4" />
            <span className="font-medium">{coinReward}</span>
          </div>
          {isCompleted && <CheckCircle2 className="size-5 text-green-500" />}
        </div>
      </div>
    </button>
  );
}

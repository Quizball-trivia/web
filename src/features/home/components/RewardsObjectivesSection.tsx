import { Gift, Target } from 'lucide-react';

interface RewardsObjectivesSectionProps {
  lastSpinDate?: string;
  onDailySpinClick: () => void;
  onObjectivesClick: () => void;
}

export function RewardsObjectivesSection({
  lastSpinDate,
  onDailySpinClick,
  onObjectivesClick,
}: RewardsObjectivesSectionProps) {
  const hasSpunToday = lastSpinDate &&
    new Date(lastSpinDate).toDateString() === new Date().toDateString();

  return (
    <div className="px-4 mt-6">
      <div className="grid grid-cols-2 gap-3">
        {/* Daily Spin */}
        <button
          onClick={onDailySpinClick}
          className="h-14 rounded-xl bg-card border border-border hover:border-primary/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 relative"
        >
          <Gift className="size-5 text-yellow-400" />
          <span className="text-sm">Daily Spin</span>
          {hasSpunToday && (
            <div className="absolute top-1.5 right-1.5 size-2 rounded-full bg-green-500 border border-background" />
          )}
        </button>

        {/* Objectives */}
        <button
          onClick={onObjectivesClick}
          className="h-14 rounded-xl bg-card border border-border hover:border-primary/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Target className="size-5 text-primary" />
          <span className="text-sm">Objectives</span>
        </button>
      </div>
    </div>
  );
}

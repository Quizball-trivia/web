import { Target, Star, Trophy } from 'lucide-react';
import type { PlayerStats } from '@/types/game';
import { useLocale } from '@/contexts/LocaleContext';

interface HomeQuickStatsRowProps {
  playerStats: PlayerStats;
}

export function HomeQuickStatsRow({ playerStats }: HomeQuickStatsRowProps) {
  const { t } = useLocale();
  const accuracy = playerStats.gamesPlayed > 0
    ? Math.round((playerStats.correctAnswers / (playerStats.gamesPlayed * 10)) * 100)
    : 0;

  return (
    <div className="flex items-center justify-around py-4 px-2 border-b border-border/50">
      <div className="flex items-center gap-2 md:gap-3 group cursor-help" title={t('home.statAccuracyTooltip')}>
        <Target className="size-4 md:size-5 text-green-500 group-hover:scale-110 transition-transform" />
        <div className="flex flex-col md:flex-row md:items-baseline md:gap-2">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide text-[10px] md:text-xs">{t('home.statAccuracy')}</span>
          <span className="font-bold text-sm md:text-base">{accuracy}%</span>
        </div>
      </div>

      <div className="h-8 w-px bg-border/50" />

      <div className="flex items-center gap-2 md:gap-3 group cursor-help" title={t('home.statGamesTooltip')}>
        <Star className="size-4 md:size-5 text-purple-500 group-hover:scale-110 transition-transform" />
        <div className="flex flex-col md:flex-row md:items-baseline md:gap-2">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide text-[10px] md:text-xs">{t('home.statGames')}</span>
          <span className="font-bold text-sm md:text-base">{playerStats.gamesPlayed}</span>
        </div>
      </div>

      <div className="h-8 w-px bg-border/50" />

      <div className="flex items-center gap-2 md:gap-3 group cursor-help" title={t('home.statRPTooltip')}>
        <Trophy className="size-4 md:size-5 text-yellow-500 group-hover:scale-110 transition-transform" />
        <div className="flex flex-col md:flex-row md:items-baseline md:gap-2">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide text-[10px] md:text-xs">{t('home.statRP')}</span>
          <span className="font-bold text-sm md:text-base">{playerStats.rankPoints}</span>
        </div>
      </div>
    </div>
  );
}

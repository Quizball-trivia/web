'use client';
import { useLocale } from '@/contexts/LocaleContext';
import { useWeekendLeaguePrizes } from '../use-weekend-league-prizes';
import { RareRewardsBoard, WeekendLeagueRewardDetails } from './RareRewardsBoard';

/** Placement rewards and essential event details on one screen. */
export function PrizesPanel({ highlightRank }: { highlightRank?: number | null }) {
  const { t } = useLocale();
  const prizes = useWeekendLeaguePrizes();
  return <section>
    <RareRewardsBoard highlightRank={highlightRank} />
    <div className="mt-3 flex flex-col gap-2">
      {prizes.tiers.map(prize => <p key={prize.id} className="font-poppins text-xs leading-relaxed text-white/85">
        <strong>{t(prize.rankKey)}</strong> — <span>{t(prize.prizeKey)}</span>
      </p>)}
    </div>
    <p className="mt-3 font-poppins text-xs leading-relaxed text-white/60">{t('weekendLeague.prizesNote')}</p>
    <WeekendLeagueRewardDetails />
  </section>;
}

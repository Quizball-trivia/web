'use client';
import { useLocale } from '@/contexts/LocaleContext';
import { WlPrizeCard, WeekendLeagueRewardDetails } from './WlPrizeCard';

/**
 * Reward rules, plus the prize board when nothing above already shows it.
 * Before kickoff and after the final the promo card / header carries the
 * board, so a second copy here only repeated it (owner, 2026-10-04).
 */
export function PrizesPanel({ highlightRank, showBoard = true }: { highlightRank?: number | null; showBoard?: boolean }) {
  const { t } = useLocale();
  return <section>
    {showBoard ? (
      <WlPrizeCard surface="dark" highlightRank={highlightRank} />
    ) : (
      <h2 className="mb-1 font-poppins text-lg font-black uppercase tracking-wide text-white">{t('weekendLeague.prizes')}</h2>
    )}
    <WeekendLeagueRewardDetails />
  </section>;
}

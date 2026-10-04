'use client';

import Image from 'next/image';
import { useLocale } from '@/contexts/LocaleContext';
import { PRIZES } from '../mock-data';
import { WEEKEND_COIN_REWARDS } from '../prizes';
import styles from './RareRewardsBoard.module.css';

// The same kit art and names the reward reveal and the wardrobe use.
const ARTWORK = [
  { file: 'home-v3', nameKey: 'wlRewards.jerseyHome' },
  { file: 'away-v2', nameKey: 'wlRewards.jerseyAway' },
  { file: 'training-v4', nameKey: 'wlRewards.jerseyTraining' },
] as const;

/** What each place wins: the podium's victory packs, then the coin ladder. */
export function RareRewardsBoard({ compact = false, highlightRank }: {
  compact?: boolean; highlightRank?: number | null;
}) {
  const { t, locale } = useLocale();
  const formatCoins = (coins: number) => coins.toLocaleString(locale === 'ka' ? 'ka-GE' : locale);
  return <section data-testid="weekend-rare-drop" className={styles.board}>
    <p className={styles.kicker}>{t('weekendLeague.rewardDropKicker')}</p>
    <h2 className={styles.title}>{t('weekendLeague.rewardDropTitle')}</h2>
    {!compact && <p className={styles.body}>{t('weekendLeague.rewardDropBody')}</p>}
    <p className={styles.collection}>{t('weekendLeague.rewardCollection')}</p>
    <div className={styles.packs}>
      {PRIZES.map((pack, index) => {
        const mine = highlightRank === pack.rankFrom;
        return <div key={pack.id} className={styles.pack}
          data-testid={mine ? 'weekend-reward-current-place' : undefined}
          data-place={pack.rankFrom} data-selected={mine}>
          <span className={styles.place}>{t(pack.rankKey)}</span>
          <Image src={`/assets/store/rewards/wl-retro-playmaker/${ARTWORK[index].file}.webp`} width={700} height={580}
            alt={t(ARTWORK[index].nameKey)} sizes="(max-width: 600px) 26vw, 180px" className={styles.artwork} />
          <h3 className={styles.packName}>{t(pack.labelKey)}</h3>
          <div className={styles.coinValue}>
            <Image src="/assets/coin-1.png?v=2" alt="" width={18} height={18} />
            <span>{formatCoins(WEEKEND_COIN_REWARDS[index].coins)}</span>
          </div>
          {mine && <span className={styles.you}>{t('weekendLeague.you')}</span>}
        </div>;
      })}
    </div>
    <p className={styles.contents}>{t('weekendLeague.rewardPackContents')}</p>
    <div className={styles.milestones}>
      {WEEKEND_COIN_REWARDS.slice(3).map(tier => <div key={tier.id} className={styles.milestone}>
        <span>{t(tier.labelKey)}</span>
        <div className={styles.coinValue}>
          <Image src="/assets/coin-1.png?v=2" alt="" width={18} height={18} />
          <span>{formatCoins(tier.coins)}</span>
        </div>
      </div>)}
    </div>
    <p className={styles.highest}>{t('weekendLeague.rewardHighestOnly')}</p>
    <p className={styles.preview}>{t('weekendLeague.rewardPreviewNote')}</p>
  </section>;
}

export function WeekendLeagueRewardDetails() {
  const { t } = useLocale();
  return <div data-testid="weekend-inline-rules" className={styles.details}>
    <p>{t('weekendLeague.rewardEntryRule')}</p>
    <p>{t('weekendLeague.rewardScoringRule')}</p>
    <p>{t('weekendLeague.rewardHighestOnly')}</p>
    <p>{t('weekendLeague.rewardParticipationRule')}</p>
    <p>{t('weekendLeague.rewardNonCash')}</p>
    <p>{t('weekendLeague.prizesPayoutNote')}</p>
    <p>{t('weekendLeague.rewardContact')}</p>
  </div>;
}

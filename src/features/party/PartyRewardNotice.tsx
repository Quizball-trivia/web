'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import type { PartyRewardsView } from './usePartyRewards';

export function PartyRewardNotice({ rewards }: { rewards: PartyRewardsView }) {
  const { t } = useLocale();
  const [delayedMatchId, setDelayedMatchId] = useState<string | null>(null);
  const pending = rewards.status === 'pending';
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setDelayedMatchId(rewards.matchId), 2_000);
    return () => clearTimeout(timer);
  }, [pending, rewards.matchId]);

  const message = rewards.status === 'failed' ? t('partyResults.rewardsFailed')
    : rewards.status === 'unavailable' ? t('partyResults.rewardsUnavailable')
      : pending && delayedMatchId === rewards.matchId ? t('partyResults.savingRewards') : null;
  return message ? <p role="status" className="w-full text-sm leading-relaxed text-white/70">{message}</p> : null;
}

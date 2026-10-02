'use client';

import { useState } from 'react';

import { WorldCupUnlockOverlay } from '@/components/shared/WorldCupUnlockOverlay';
import { WlChampionUnlockOverlay } from '@/components/shared/WlChampionUnlockOverlay';
import { isWlAwardSlug, wlAwardWeekLabel } from '@/components/shared/WlChampionAchievementCard';
import { useAckEventAward, useMyEventAwards } from '@/lib/queries/eventAwards.queries';
import { useLocale } from '@/contexts/LocaleContext';
import { rewardSession, useRewardSessionVersion } from '@/features/weekend-league/rewards/rewardSession';

/**
 * Plays the one-time podium unlock ceremony after login: the first unseen
 * award renders the overlay; Collect acks it server-side so it never replays.
 */
export function EventAwardCeremony() {
  const { locale } = useLocale();
  const { data: awards } = useMyEventAwards();
  const ack = useAckEventAward();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  useRewardSessionVersion();

  const pending = (awards ?? []).find(
    (award) => !award.seen && !dismissedIds.includes(award.id),
  );
  // A badge that arrives while a Weekend League reward reveal is already on
  // screen waits for it, so two full-screen ceremonies never overlap.
  if (!pending || rewardSession.claimedBy() !== null) return null;

  const close = () => {
    setDismissedIds((ids) => [...ids, pending.id]);
    // The Weekend League reward reveal waits its turn behind this ceremony.
    rewardSession.noteBadgeDismissed(pending.id);
    ack.mutate(pending.id);
  };
  // Each event family keeps its own medal + ceremony; the queue/ack flow is
  // shared. WL slugs are minted by the final's writeAwards.
  if (isWlAwardSlug(pending.eventSlug)) {
    return (
      <WlChampionUnlockOverlay
        key={pending.id}
        place={pending.place}
        weekLabel={wlAwardWeekLabel(pending.eventSlug, locale)}
        open
        onClose={close}
      />
    );
  }
  return <WorldCupUnlockOverlay key={pending.id} place={pending.place} open onClose={close} />;
}

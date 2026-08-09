'use client';

import { useState } from 'react';

import { WorldCupUnlockOverlay } from '@/components/shared/WorldCupUnlockOverlay';
import { WlChampionUnlockOverlay } from '@/components/shared/WlChampionUnlockOverlay';
import { isWlAwardSlug, wlAwardWeekLabel } from '@/components/shared/WlChampionAchievementCard';
import { useAckEventAward, useMyEventAwards } from '@/lib/queries/eventAwards.queries';

/**
 * Plays the one-time podium unlock ceremony after login: the first unseen
 * award renders the overlay; Collect acks it server-side so it never replays.
 */
export function EventAwardCeremony() {
  const { data: awards } = useMyEventAwards();
  const ack = useAckEventAward();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const pending = (awards ?? []).find(
    (award) => !award.seen && !dismissedIds.includes(award.id),
  );
  if (!pending) return null;

  const close = () => {
    setDismissedIds((ids) => [...ids, pending.id]);
    ack.mutate(pending.id);
  };
  // Each event family keeps its own medal + ceremony; the queue/ack flow is
  // shared. WL slugs are minted by the final's writeAwards.
  if (isWlAwardSlug(pending.eventSlug)) {
    return (
      <WlChampionUnlockOverlay
        place={pending.place}
        weekLabel={wlAwardWeekLabel(pending.eventSlug)}
        open
        onClose={close}
      />
    );
  }
  return <WorldCupUnlockOverlay place={pending.place} open onClose={close} />;
}

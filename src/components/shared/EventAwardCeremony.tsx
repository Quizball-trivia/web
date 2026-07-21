'use client';

import { useState } from 'react';

import { WorldCupUnlockOverlay } from '@/components/shared/WorldCupUnlockOverlay';
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

  return (
    <WorldCupUnlockOverlay
      place={pending.place}
      open
      onClose={() => {
        setDismissedIds((ids) => [...ids, pending.id]);
        ack.mutate(pending.id);
      }}
    />
  );
}

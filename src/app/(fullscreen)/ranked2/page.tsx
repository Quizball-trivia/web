'use client';

/**
 * Ranked 2.0 (zone match) beta queue, flag-gated: search for a human, the server seats its bot after a random
 * 10–20 s. No RP, no tickets — the beta never touches live ranked.
 */

import { RANKED_V2_ENABLED, ZONE_BOT_ENABLED } from '@/lib/config';
import { ZoneMatchQueueScreen } from '@/features/zone-match/ZoneMatchQueueScreen';

export default function Ranked2Page() {
  if (!RANKED_V2_ENABLED || !ZONE_BOT_ENABLED) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-page font-poppins text-white">
        Ranked 2.0 is not available yet
      </div>
    );
  }
  return <ZoneMatchQueueScreen />;
}

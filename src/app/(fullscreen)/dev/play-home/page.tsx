'use client';

// Dev preview of the redesigned play home — the Weekend League objective band
// above the mode grid. /dev/* bypasses AppAuthGate, so no login needed.

import { ModeSelectionScreen } from '@/features/play/ModeSelectionScreen';
import type { RankedProfileResponse } from '@/lib/repositories/ranked.repo';

const PREVIEW_PROFILE = {
  rp: 0,
  placementStatus: 'placed',
  placementPlayed: 3,
  placementRequired: 3,
} as unknown as RankedProfileResponse;

export default function DevPlayHomePage() {
  return (
    <div className="min-h-screen bg-surface-page">
      <ModeSelectionScreen
        onSelectMode={() => {}}
        rankedProfile={PREVIEW_PROFILE}
        matchStatsSummary={null}
      />
    </div>
  );
}

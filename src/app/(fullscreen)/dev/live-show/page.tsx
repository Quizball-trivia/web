'use client';

// Dev prototype of the Live Show (the creator-hosted rework of the Weekend League): the full night on a simulated
// crowd, phone and OBS host screen side by side. Reachable without login (/dev/* bypasses AppAuthGate).

import { LiveShowSim } from '@/features/live-show/LiveShowSim';

export default function DevLiveShowPage() {
  return <LiveShowSim />;
}

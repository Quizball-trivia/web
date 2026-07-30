'use client';

// Dev preview of the Saturday gauntlet — player flow and spectator mode without
// login (/dev/* bypasses AppAuthGate). Use the gear icon for prototype controls.

import { useState } from 'react';
import { GauntletFlow } from '@/features/weekend-league/gauntlet/GauntletFlow';
import { SpectatorFlow } from '@/features/weekend-league/gauntlet/SpectatorFlow';

export default function DevGauntletPage() {
  const [mode, setMode] = useState<'gauntlet' | 'spectate'>('gauntlet');
  const [runId, setRunId] = useState(0);

  const restart = (next: 'gauntlet' | 'spectate') => {
    setMode(next);
    setRunId((n) => n + 1);
  };

  if (mode === 'spectate') {
    return <SpectatorFlow key={`s-${runId}`} onExit={() => restart('gauntlet')} />;
  }
  return (
    <GauntletFlow
      key={`g-${runId}`}
      registered={600}
      kickoffMs={null}
      canPlay
      onExit={() => restart('gauntlet')}
      onWatch={() => restart('spectate')}
    />
  );
}

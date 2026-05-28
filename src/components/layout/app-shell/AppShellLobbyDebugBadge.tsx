'use client';

/**
 * Temporary lobby/session debug pill — shown in the desktop header
 * in non-production builds. Compares the locally-tracked waiting
 * lobby id against the server-side session-state lobby id so a
 * developer can spot drift at a glance.
 */

import { cn } from '@/lib/utils';
import type { RankedGeoHintDebug } from './appShell.types';

interface AppShellLobbyDebugBadgeProps {
  lobbyDebugMismatch: boolean;
  localWaitingLobbyId: string | null;
  sessionWaitingLobbyId: string | null;
  sessionStateLabel: string;
  rankedGeoHintDebug: RankedGeoHintDebug | null;
}

export function AppShellLobbyDebugBadge({
  lobbyDebugMismatch,
  localWaitingLobbyId,
  sessionWaitingLobbyId,
  sessionStateLabel,
  rankedGeoHintDebug,
}: AppShellLobbyDebugBadgeProps) {
  return (
    <div
      className={cn(
        'hidden lg:flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold',
        lobbyDebugMismatch
          ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
          : 'border-slate-500/40 bg-slate-500/15 text-slate-200',
      )}
      title="Temporary lobby/session debug badge"
    >
      <span>LobbyDbg</span>
      <span>local:{localWaitingLobbyId ? localWaitingLobbyId.slice(0, 6) : '-'}</span>
      <span>session:{sessionWaitingLobbyId ? sessionWaitingLobbyId.slice(0, 6) : '-'}</span>
      <span>state:{sessionStateLabel}</span>
      <span>
        loc:{rankedGeoHintDebug?.city ?? '-'},
        {rankedGeoHintDebug?.countryCode ?? rankedGeoHintDebug?.country ?? '-'}
      </span>
      <span>
        ll:
        {typeof rankedGeoHintDebug?.latitude === 'number'
          ? rankedGeoHintDebug.latitude.toFixed(2)
          : '-'}
        ,
        {typeof rankedGeoHintDebug?.longitude === 'number'
          ? rankedGeoHintDebug.longitude.toFixed(2)
          : '-'}
      </span>
      <span>src:{rankedGeoHintDebug?.source ?? '-'}</span>
    </div>
  );
}

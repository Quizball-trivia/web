'use client';

import { useEffect, useRef } from 'react';
import { useUserPreferences } from '@/lib/preferences/userPreferences';
import { useGameSounds } from '@/lib/sounds/useGameSounds';
import type {
  FootballGridCommandResultPayload,
  FootballGridSearchStatePayload,
  FootballGridState,
} from '@/lib/realtime/socket.types';

interface FootballGridAudioOptions {
  search: FootballGridSearchStatePayload;
  state: FootballGridState | null;
  commandResult: FootballGridCommandResultPayload | null;
  enabled?: boolean;
}

/**
 * Tic Tac Toe's audio conductor, same shape as auction's: the matchmaking
 * loop while searching, the stadium loop ranked and auction share while a
 * game is live, and short cues only on server-confirmed transitions. Both
 * follow the user's music / sound preferences.
 */
export function useFootballGridAudio({ search, state, commandResult, enabled = true }: FootballGridAudioOptions): void {
  const { soundEnabled, musicEnabled } = useUserPreferences();
  const { playBgm, playSfx, stopBgm } = useGameSounds();

  const searching = enabled && !state && (search.state === 'searching' || search.state === 'pairing');
  const live = enabled && Boolean(state) && state?.phase !== 'terminal';

  useEffect(() => {
    if (!musicEnabled || (!searching && !live)) {
      stopBgm(400);
      return;
    }
    playBgm(live ? 'auction' : 'search');
    return () => stopBgm(400);
  }, [live, musicEnabled, playBgm, searching, stopBgm]);

  // Kickoff whistle once per game, when the countdown hands over to the first turn.
  const previousPhaseRef = useRef<FootballGridState['phase'] | null>(null);
  const previousMatchRef = useRef<string | null>(null);
  useEffect(() => {
    const phase = state?.phase ?? null;
    const matchId = state?.matchId ?? null;
    if (matchId !== previousMatchRef.current) {
      previousMatchRef.current = matchId;
      previousPhaseRef.current = phase;
      return;
    }
    const previous = previousPhaseRef.current;
    previousPhaseRef.current = phase;
    if (!enabled) return;
    if (!soundEnabled) {
      if (phase === 'turn' && previous === 'countdown' && musicEnabled) playBgm('auction');
      return;
    }
    if (phase === 'turn' && previous === 'countdown') {
      playSfx('whistle');
      // The kickoff gate swapped in ranked's kickoff track; hand the loop back.
      if (musicEnabled) playBgm('auction');
    }
  }, [enabled, musicEnabled, playBgm, playSfx, soundEnabled, state?.phase, state?.matchId]);

  // Answer cues fire once per command result, never on redelivery of the same one.
  const lastCueCommandRef = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !soundEnabled || !commandResult) return;
    if (lastCueCommandRef.current === commandResult.commandId) return;
    lastCueCommandRef.current = commandResult.commandId;
    if (commandResult.outcome === 'correct') playSfx('correctRanked');
    else if (commandResult.outcome === 'wrong' || commandResult.outcome === 'already_used') playSfx('wrongAnswer');
  }, [commandResult, enabled, playSfx, soundEnabled]);
}

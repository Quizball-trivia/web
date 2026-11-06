'use client';

/**
 * Ranked 2.0 (beta) queue: pick a loadout, search, and play whoever the server finds — another searching human, or
 * (after the server's random 10–20 s window) the practice bot. The match itself is an ordinary zone-match room at
 * /sala/<matchId>; the picked deck rides along in sessionStorage and the room screen submits it as the loadout.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEnsureGuestPrincipal, useRealtimePrincipal } from '@/lib/realtime/realtime-principal';
import { useRealtimeConnection } from '@/lib/realtime/useRealtimeConnection';
import { getSocket } from '@/lib/realtime/socket-client';
import type { ZoneMatchSearchStatePayload } from '@/lib/realtime/socket.types';
import type { CardId } from './zoneMatch.cards';
import { LoadoutSteps, RuleChips } from './ZoneMatchLoadout';
import { PlaystylePicker } from './picker/PickerLab';
import { ScreenFrame } from './ZoneMatchPrototype';
import { SearchStadium3D } from './search/SearchStadium3D';
import type { FutSeat } from './ZoneMatchFutCard';

export const ZONE_QUEUE_DECK_KEY = 'zone-queue-deck';

const SELF: FutSeat = { name: 'You', avatarCustomization: null, rankPoints: null };

export function ZoneMatchQueueScreen() {
  const router = useRouter();
  // Guests may queue in the beta: without a principal the socket never connects — and the connection itself is
  // driven here (nothing else on this screen opens it).
  useEnsureGuestPrincipal('en');
  const principal = useRealtimePrincipal();
  useRealtimeConnection({ enabled: principal.kind !== 'none', selfUserId: principal.userId });
  const [deck, setDeck] = useState<CardId[]>([]);
  const [search, setSearch] = useState<{ searchId: string; startedAt: number } | null>(null);
  const deckRef = useRef(deck);
  const searchRef = useRef(search);
  const matchedRef = useRef(false);
  const startedRef = useRef(false);
  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);
  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  useEffect(() => {
    const socket = getSocket();
    const onState = (payload: ZoneMatchSearchStatePayload) => {
      if (payload.state === 'searching' && payload.searchId) {
        setSearch({ searchId: payload.searchId, startedAt: payload.queuedAt ? Date.parse(payload.queuedAt) : Date.now() });
        return;
      }
      if (payload.state === 'matched' && payload.matchId) {
        matchedRef.current = true;
        // The room's loadout phase submits this deck; an empty pick falls back to the room's own picker.
        try {
          if (deckRef.current.length > 0) sessionStorage.setItem(ZONE_QUEUE_DECK_KEY, JSON.stringify({ matchId: payload.matchId, cards: deckRef.current }));
        } catch { /* storage may be unavailable; the room picker stands in */ }
        router.push(`/sala/${payload.matchId}`);
        return;
      }
      if (payload.state === 'idle') setSearch(null);
    };
    socket.on('zone:search_state', onState);
    return () => {
      socket.off('zone:search_state', onState);
      // Leaving the page (back navigation, a different screen) must not leave the search running — unless we are
      // leaving BECAUSE a match was found. '*' covers a start whose searching ack never arrived before leaving.
      if (!matchedRef.current && (searchRef.current || startedRef.current)) {
        socket.emit('zone:search_cancel', { searchId: searchRef.current?.searchId ?? '*' });
      }
    };
  }, [router]);

  const findMatch = useCallback(() => {
    startedRef.current = true;
    getSocket().emit('zone:search_start');
  }, []);

  const cancel = useCallback(() => {
    // The screen keeps 'searching' until the server confirms idle: a cancel the server missed must not leave a
    // hidden search that pairs behind the player's back.
    if (search) getSocket().emit('zone:search_cancel', { searchId: search.searchId });
  }, [search]);

  if (search) {
    return <SearchStadium3D self={SELF} deck={deck} startedAt={search.startedAt} opponent={null} onCancel={cancel} />;
  }
  return (
    <ScreenFrame wide>
      <div className="flex min-h-[calc(100dvh-1.5rem)] flex-col gap-3">
        <div className="rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 px-3 py-2 text-center text-xs text-white/85" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Ranked 2.0 beta — a test queue with no RP or tickets at stake. If nobody else is searching, you&apos;ll play our practice bot.
        </div>
        <PlaystylePicker
          seat={SELF}
          deck={deck}
          onDeckChange={setDeck}
          loading={principal.kind === 'none'}
          onFindMatch={findMatch}
          steps={<LoadoutSteps ready={deck.length > 0} />}
          rules={<RuleChips />}
        />
      </div>
    </ScreenFrame>
  );
}

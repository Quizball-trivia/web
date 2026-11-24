'use client';

/**
 * Ranked 2.0 (beta) queue: search and play whoever the server finds — another searching human, or (after the server's
 * random 10–20 s window) the practice bot. No loadout to pick: every player has the same paid helplines in the match
 * (HELPLINES). The match itself is an ordinary zone-match room at /sala/<matchId>.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useEnsureGuestPrincipal, useRealtimePrincipal } from '@/lib/realtime/realtime-principal';
import { useRealtimeConnection } from '@/lib/realtime/useRealtimeConnection';
import { getSocket } from '@/lib/realtime/socket-client';
import type { ZoneMatchSearchStatePayload } from '@/lib/realtime/socket.types';
import { HELPLINE_COINS, HELPLINES } from './zoneMatch.cards';
import { PlaystyleBadge } from './ZoneMatchCardFace';
import { ScreenFrame } from './ZoneMatchPrototype';
import { SearchStadium3D } from './search/SearchStadium3D';
import type { FutSeat } from './ZoneMatchFutCard';
import { useZoneCopy } from './useZoneCopy';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;


export function ZoneMatchQueueScreen() {
  const router = useRouter();
  const { c, locale } = useZoneCopy();
  const self: FutSeat = { name: c.common.you, avatarCustomization: null, rankPoints: null };
  // Guests may queue in the beta: without a principal the socket never connects — and the connection itself is
  // driven here (nothing else on this screen opens it).
  useEnsureGuestPrincipal(locale);
  const principal = useRealtimePrincipal();
  useRealtimeConnection({ enabled: principal.kind !== 'none', selfUserId: principal.userId });
  const [search, setSearch] = useState<{ searchId: string; startedAt: number } | null>(null);
  const searchRef = useRef(search);
  const matchedRef = useRef(false);
  const startedRef = useRef(false);
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
    return <SearchStadium3D self={self} deck={[...HELPLINES]} startedAt={search.startedAt} opponent={null} onCancel={cancel} />;
  }
  const loading = principal.kind === 'none';
  return (
    <ScreenFrame wide>
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col gap-4" data-zm-queue>
        <div className="rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 px-3 py-2 text-center text-xs text-white/85" style={{ fontFamily: "'Poppins', sans-serif" }}>
          {c.room.queueNotice}
        </div>
        <div className="flex flex-1 flex-col justify-center gap-4">
          <h1 className="text-center text-3xl uppercase text-white md:text-4xl" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800 }}>
            {c.brand[0]} <span className="text-brand-green">{c.brand[1]}</span>
          </h1>
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4" data-zm-helplines>
            <h2 className="text-sm uppercase tracking-[0.12em] text-white/70" style={poppins}>{c.room.helplinesTitle}</h2>
            <p className="mt-1 text-sm text-white/60">{c.room.helplinesBlurb}</p>
            <ul className="mt-3 flex flex-col gap-2">
              {HELPLINES.map((id) => (
                <li key={id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-2" data-zm-helpline={id}>
                  <PlaystyleBadge id={id} size={40} showName={false} showCost={false} playable />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm uppercase text-white" style={poppins}>{c.cards[id].name}</div>
                    <div className="text-xs text-white/60">{c.cards[id].effect}</div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-black/30 py-1 pl-1 pr-2 text-sm text-brand-yellow" style={poppins}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/coin-1.png?v=2" alt="" className="size-5 object-contain" />
                    {HELPLINE_COINS[id]}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <button
          type="button"
          onClick={findMatch}
          disabled={loading}
          className="mb-2 flex h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-brand-green uppercase text-white hover:bg-brand-green-deep disabled:bg-white/10 disabled:text-white/40"
          style={poppins}
          data-zm-find-match
        >
          {loading ? c.common.loading : <>{c.common.findMatch} <ArrowRight className="size-5" strokeWidth={3} /></>}
        </button>
      </div>
    </ScreenFrame>
  );
}

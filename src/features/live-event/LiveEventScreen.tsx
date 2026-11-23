'use client';

/**
 * Host-run live event on the Events tab (Orshabatoba podcast night, every
 * Monday). Registration opens Monday in a lobby; the host account sees a
 * Start button; Start opens a 1-minute countdown during which people can
 * still register, then registration closes and everyone (host included) is on
 * the same Weekend League live screens: registered players play, anyone else
 * watches the same stream (1s delay).
 */

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuthStore } from '@/stores/auth.store';
import { useAuthPromptStore } from "@/stores/authPrompt.store";
import { rememberPostAuthRedirect } from '@/lib/auth/postAuthRedirect';
import { queryKeys } from '@/lib/queries/queryKeys';
import { enterWeekendLeague, getWeekendLeagueCurrent, hostStartWeekendLeague } from '@/lib/api/endpoints';
import { getSocket } from '@/lib/realtime/socket-client';
import { syncWlClock, wlNow } from '@/features/weekend-league/wlClock';
import { WlLiveFlow } from '@/features/weekend-league/live/WlLiveFlow';
import { liveEventCopy } from './liveEvent.copy';
import { OrshabatobaShow } from './OrshabatobaShow';
import { EventLobby } from './OrshabatobaCard';

export { EventLobby };
import type { ShowRound } from '@/features/live-show/live/showLive.adapter';

type Copy = ReturnType<typeof liveEventCopy>;

const PRE_GAME = new Set(['scheduled', 'content_pending', 'ready', 'entry_open', 'entry_closed']);

function pollMs(status: string | undefined): number {
  if (status === 'checkin') return 2_000;
  if (status === 'entry_open' || status === 'entry_closed') return 10_000;
  if (status === 'scheduled' || status === 'content_pending' || status === 'ready') return 5_000;
  return 15_000;
}


export function LiveEventScreen({ fallback }: { fallback: ReactNode }) {
  const { locale } = useLocale();
  const copy = liveEventCopy(locale);
  const router = useRouter();
  const queryClient = useQueryClient();
  const authStatus = useAuthStore((s) => s.status);
  const authed = authStatus === 'authenticated';
  const openAuthPrompt = useAuthPromptStore((state) => state.open);

  const query = useQuery({
    queryKey: queryKeys.weekendLeague.current(),
    queryFn: getWeekendLeagueCurrent,
    enabled: authed,
    staleTime: 0,
    refetchInterval: (q) => pollMs(q.state.data?.tournament?.status),
  });
  const tournament = query.data?.tournament ?? null;
  const you = query.data?.you ?? null;
  const hostRun = tournament?.host_run === true;

  useEffect(() => {
    if (typeof tournament?.server_now_ms === 'number') syncWlClock(tournament.server_now_ms);
  }, [tournament?.server_now_ms]);

  // Keep the event on screen after it completes (/current moves on).
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [mountedAt] = useState(() => Date.now());
  const [lastRole, setLastRole] = useState<'player' | 'spectator'>('spectator');
  const [showMode, setShowMode] = useState(false);
  // Pin once, from a response this mount fetched: a cached /current from an
  // earlier visit may describe an event that has since finished, and a later
  // event replacing the pin would reset the live flow mid-result.
  // dataUpdatedAt only moves on SUCCESS (a failed refetch keeps the cache and
  // still counts as "fetched after mount").
  if (pinnedId == null && hostRun && tournament?.id && query.dataUpdatedAt >= mountedAt) {
    setPinnedId(tournament.id);
  }

  // Phase flips (host pressed Start, game began) arrive on the socket room the
  // live flow subscribes to — refetch at once instead of waiting for a poll.
  useEffect(() => {
    if (!pinnedId) return;
    const socket = getSocket();
    const onPhase = () => { void queryClient.invalidateQueries({ queryKey: queryKeys.weekendLeague.current() }); };
    socket.on('wl:phase', onPhase);
    return () => { socket.off('wl:phase', onPhase); };
  }, [pinnedId, queryClient]);

  const [enterError, setEnterError] = useState<string | null>(null);
  const enter = useMutation({
    mutationFn: enterWeekendLeague,
    onMutate: () => setEnterError(null),
    onSuccess: (res) => {
      if (!res.entered) setEnterError(res.reason === 'window_closed' ? copy.registrationClosed : copy.registerFailed);
    },
    onError: () => setEnterError(copy.registerFailed),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.weekendLeague.current() }),
  });
  const [hostMessage, setHostMessage] = useState<string | null>(null);
  const start = useMutation({
    mutationFn: hostStartWeekendLeague,
    onSuccess: (res) => {
      if (res.reason === 'not_enough_players') setHostMessage(copy.needTwo);
      else setHostMessage(null);
    },
    onError: () => setHostMessage(copy.startFailed),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.weekendLeague.current() }),
  });

  if (authStatus === 'loading' || (authed && query.isLoading)) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-5">
        <div className="h-72 animate-pulse rounded-[24px] bg-white/5" />
      </div>
    );
  }

  if (!authed) {
    return (
      <EventLobby
        copy={copy}
        scheduledAt={null}
        registered={null}
        status={null}
        entered={false}
        signedOut
        onSignIn={() => { rememberPostAuthRedirect('/events'); openAuthPrompt(); }}
      />
    );
  }

  const fresh = query.dataUpdatedAt >= mountedAt;
  const activeId = pinnedId ?? (hostRun && fresh ? tournament?.id ?? null : null);
  if (!activeId && !fresh && !query.isError) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-5">
        <div className="h-72 animate-pulse rounded-[24px] bg-white/5" />
      </div>
    );
  }
  if (!activeId && query.isError && !fresh) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <div className="rounded-[24px] border-2 border-white/10 bg-surface-card-deep p-8 text-center">
          <div className="font-poppins text-lg font-black uppercase text-white">{copy.loadError}</div>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="mx-auto mt-4 flex h-11 items-center justify-center rounded-xl bg-brand-green px-6 font-poppins text-sm font-black uppercase tracking-wide text-white hover:bg-brand-green/90"
          >
            {copy.retry}
          </button>
        </div>
      </div>
    );
  }
  if (!activeId) return <>{fallback}</>;

  const status = tournament?.id === activeId ? tournament.status : null;
  const entered = you?.entered === true;
  const checkedIn = you?.checked_in === true;
  const preGame = status == null || PRE_GAME.has(status);
  // Once /current stops describing this event (it completed and moved on),
  // keep the last role: flipping it would resubscribe and drop the result.
  const known = tournament?.id === activeId;
  const computedRole: 'player' | 'spectator' = entered && (preGame || status === 'checkin' || checkedIn) ? 'player' : 'spectator';
  if (known && lastRole !== computedRole) setLastRole(computedRole);
  const role = known ? computedRole : lastRole;
  const kickoffMs = tournament?.qualifier_starts_at ? Date.parse(tournament.qualifier_starts_at) : null;
  // Registration stays open through the countdown and closes at kickoff
  // (the countdown itself hides the button once it reaches 0).
  const countdownJoinOpen = !entered && kickoffMs != null
    && (status === 'entry_open' || status === 'entry_closed' || status === 'checkin');
  const register = () => { if (!enter.isPending) enter.mutate(); };
  // The ორშაბათობა show (3D studio). Remembered, so the final stays in the show look after /current moves on.
  // Only when the server sent a show layout (a hand-written pack of tap rounds): a bank-drawn event still plays WL
  // kinds (put in order, career path, who am I…) the show screens can't answer, so it stays on WlLiveFlow.
  const showRounds = (tournament as { show_rounds?: ShowRound[] } | null)?.show_rounds;
  const showSlug = known && typeof tournament?.event_slug === 'string' && tournament.event_slug.startsWith('orshabatoba')
    && Array.isArray(showRounds) && showRounds.length > 0;
  if (showSlug && !showMode) setShowMode(true);

  const lobby = (
    <EventLobby
      compact={showMode || showSlug}
      copy={copy}
      scheduledAt={tournament?.scheduled_at ?? null}
      registered={tournament?.registered_count ?? null}
      status={status}
      entered={entered}
      registering={enter.isPending}
      onRegister={register}
      error={enterError}
      host={you?.is_host ? {
        busy: start.isPending,
        message: hostMessage,
        onStart: () => {
          const n = tournament?.registered_count ?? 0;
          if (n < 2) { setHostMessage(copy.needTwo); return; }
          if (window.confirm(copy.confirmStart(n))) start.mutate();
        },
      } : undefined}
    />
  );

  if (showMode) {
    return (
      <OrshabatobaShow
        tournamentId={activeId}
        role={role}
        status={status}
        kickoffMs={kickoffMs}
        registered={tournament?.registered_count ?? null}
        rounds={(tournament as { show_rounds?: ShowRound[] } | null)?.show_rounds ?? null}
        title={copy.title}
        lobbyLine={copy.startsWhenHostsSay}
        pregamePanel={lobby}
        countdownPanel={(
          <KickoffCountdown
            compact
            copy={copy}
            kickoffMs={kickoffMs}
            canJoin={countdownJoinOpen}
            joining={enter.isPending}
            onJoin={register}
            error={enterError}
          />
        )}
        onExit={() => router.push('/play')}
      />
    );
  }

  return (
    <WlLiveFlow
      tournamentId={activeId}
      role={role}
      status={status}
      checkedIn={checkedIn}
      checkinPending={enter.isPending}
      onCheckin={register}
      lateJoinUntilMs={null}
      onExit={() => router.push('/play')}
      kickoffMs={kickoffMs}
      registered={tournament?.registered_count ?? null}
      checkedInCount={tournament?.checked_in_count ?? 0}
      breakUntilMs={tournament?.break_until_ms ?? null}
      spectatorDelayMs={tournament?.spectator_delay_ms ?? 1_000}
      lastGameRank={you?.last_game_rank ?? null}
      currentGameIndex={tournament?.current_game_index ?? 0}
      noRewards
      singleGame={tournament?.single_game === true || !known}
      pregame={lobby}
      kickoffCountdown={(ms) => (
        <KickoffCountdown
          copy={copy}
          kickoffMs={ms}
          canJoin={countdownJoinOpen}
          joining={enter.isPending}
          onJoin={register}
          error={enterError}
        />
      )}
    />
  );
}

function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-14 w-full items-center justify-center rounded-2xl bg-brand-green font-poppins text-lg font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function KickoffCountdown({
  copy, kickoffMs, canJoin, joining, onJoin, error, compact,
}: {
  copy: Copy;
  kickoffMs: number | null;
  canJoin: boolean;
  joining: boolean;
  onJoin: () => void;
  error?: string | null;
  /** Inside the show's side panel instead of full screen. */
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => wlNow());
  useEffect(() => {
    const id = setInterval(() => setNow(wlNow()), 200);
    return () => clearInterval(id);
  }, []);
  const left = kickoffMs == null ? null : Math.max(0, Math.ceil((kickoffMs - now) / 1000));
  return (
    <div className={compact
      ? 'flex flex-col items-center justify-center rounded-[24px] border-2 border-white/10 bg-surface-card-deep px-4 py-8 text-center'
      : 'flex min-h-[100dvh] flex-col items-center justify-center px-4 text-center'}>
      <div className="font-poppins text-[13px] font-black uppercase tracking-widest text-brand-green-light">{copy.title}</div>
      <div className="mt-2 font-poppins text-2xl font-black uppercase text-white">
        {left != null && left > 0 ? copy.startsIn : copy.getReady}
      </div>
      <div
        key={left ?? 'go'}
        className="mt-4 font-poppins text-[160px] font-black leading-none text-white tabular-nums motion-safe:animate-[pulse_1s_ease-out_1]"
        aria-live="assertive"
      >
        {left != null && left > 0 ? left : '⚽'}
      </div>
      {canJoin && left != null && left > 0 && (
        <div className="mt-8 w-full max-w-sm">
          <PrimaryButton onClick={onJoin} disabled={joining}>{joining ? copy.registering : copy.register}</PrimaryButton>
          <p className="mt-3 font-poppins text-[13px] font-bold text-white/70">{copy.closesAtZero}</p>
          {error && <p role="alert" className="mt-3 font-poppins text-[13px] font-bold text-brand-yellow">{error}</p>}
        </div>
      )}
    </div>
  );
}

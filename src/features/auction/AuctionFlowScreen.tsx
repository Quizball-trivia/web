'use client';

import { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuthStore } from '@/stores/auth.store';
import { QuitMatchModal } from '@/components/match/QuitMatchModal';
import { useRealtimeConnectionHealth } from '@/lib/realtime/connection-health';
import { poppins, AUCTION_QUIT_MODAL_THEME } from './constants/auction.constants';
import { useAuctionGame } from './hooks/useAuctionGame';
import { useRealtimeAuctionMatch, type AuctionPauseState, type AuctionSearchState } from './realtime/useRealtimeAuctionMatch';
import { AuctionShowdownScreen } from './components/AuctionShowdownScreen';
import { AuctionGameScreen } from './components/AuctionGameScreen';
import { AuctionResultsScreen } from './components/AuctionResultsScreen';
import { FormationReveal } from './components/screens/FormationReveal';
import { LottieSearch } from './components/screens/LottieSearch';
import { MatchCountdown } from './components/screens/MatchCountdown';
import type { AuctionFormationName } from '@/lib/realtime/socket.types';

// The matchmaking search still sends a formation name (the hook requires one),
// but the SERVER picks the real formation randomly and ignores this value.
const LIVE_AUCTION_FORMATION_NAME: AuctionFormationName = '4-3-3';

interface AuctionFlowScreenProps {
  username: string;
  avatarSeed: string;
  mode?: 'mock' | 'live';
}

export function AuctionFlowScreen({ username, avatarSeed, mode = 'mock' }: AuctionFlowScreenProps) {
  if (mode === 'live') {
    return <AuctionRealtimeFlowScreen username={username} avatarSeed={avatarSeed} />;
  }

  return <AuctionMockFlowScreen username={username} avatarSeed={avatarSeed} />;
}

function AuctionMockFlowScreen({ username, avatarSeed }: Omit<AuctionFlowScreenProps, 'mode'>) {
  const router = useRouter();
  const { state, actions, humanPlayerId } = useAuctionGame(username, avatarSeed);
  const [mockSearching, setMockSearching] = useState(true);

  useEffect(() => {
    // Start the game immediately (mock matchmaking)
    actions.startGame(3);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
  }, []);

  useEffect(() => {
    if (mockSearching && state.players.length > 0) {
      // Simulate matchmaking delay
      const timer = setTimeout(() => {
        setMockSearching(false);
        actions.setPhase('showdown');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [mockSearching, state.players.length, actions]);

  const handleShowdownComplete = useCallback(() => {
    actions.setPhase('formation');
  }, [actions]);

  const handlePlayAgain = useCallback(() => {
    setMockSearching(true);
    actions.startGame(3);
    setTimeout(() => {
      setMockSearching(false);
      actions.setPhase('showdown');
    }, 2000);
  }, [actions]);

  const handleExit = useCallback(() => {
    router.push('/play');
  }, [router]);

  // Searching state
  if (mockSearching) {
    return <MockSearchingScreen />;
  }

  // Showdown
  if (state.phase === 'showdown') {
    return (
      <AuctionShowdownScreen
        players={state.players}
        humanPlayerId={humanPlayerId}
        onComplete={handleShowdownComplete}
      />
    );
  }

  // Game phases
  if (
    state.phase === 'formation' ||
    state.phase === 'clue-reveal' ||
    state.phase === 'bidding' ||
    state.phase === 'reveal' ||
    state.phase === 'solo-pick'
  ) {
    return (
      <AuctionGameScreen
        state={state}
        actions={actions}
        humanPlayerId={humanPlayerId}
      />
    );
  }

  // Results
  if (state.phase === 'results') {
    return (
      <AuctionResultsScreen
        state={state}
        humanPlayerId={humanPlayerId}
        onPlayAgain={handlePlayAgain}
        onExit={handleExit}
      />
    );
  }

  return <MockSearchingScreen />;
}

function AuctionRealtimeFlowScreen({ avatarSeed }: Omit<AuctionFlowScreenProps, 'mode'>) {
  const router = useRouter();
  const { locale, t } = useLocale();
  // Start matchmaking as soon as the screen opens — searching comes first, the
  // formation is shown later (briefly) once a match is found.
  const [auctionStarted, setAuctionStarted] = useState(true);
  // Once all 3 bidders are in we play a short "GET READY" countdown before the
  // formation reveal. Tracked so it only plays once per match.
  const [countdownDone, setCountdownDone] = useState(false);
  // Leave/forfeit confirmation while in an active match.
  const [showQuitModal, setShowQuitModal] = useState(false);
  const authUser = useAuthStore((store) => store.user);
  const authStatus = useAuthStore((store) => store.status);
  const connectionHealth = useRealtimeConnectionHealth();
  const authRequired =
    authStatus === 'anonymous' ||
    (authStatus === 'authenticated' && !authUser?.id);
  const realtimeEnabled = authStatus === 'authenticated' && Boolean(authUser?.id);
  const {
    state,
    actions,
    humanPlayerId,
    status,
    error,
    versionGapDetected,
    waitingForReady,
    pause,
    search,
  } = useRealtimeAuctionMatch({
    enabled: realtimeEnabled,
    autoStart: auctionStarted,
    matchmakingMode: 'search',
    selfUserId: authUser?.id ?? null,
    locale: locale === 'ka' ? 'ka' : 'en',
    formation: LIVE_AUCTION_FORMATION_NAME,
    humanAvatarSeed: avatarSeed,
  });

  const resolvedHumanPlayerId =
    humanPlayerId ?? state?.players.find((player) => !player.isBot)?.id ?? state?.players[0]?.id ?? null;
  const connectionWarning =
    connectionHealth.phase === 'reconnecting' || connectionHealth.phase === 'disconnected'
      ? t('common.reconnecting')
      : connectionHealth.phase === 'error'
        ? t('common.connectionBad')
        : null;
  const liveWarningMessage =
    error ??
    connectionWarning ??
    (waitingForReady ? t('auctionGame.waitingForPlayersReady') : null) ??
    (versionGapDetected ? 'Auction state changed while reconnecting. Latest event was applied.' : null);

  const handlePlayAgain = useCallback(() => {
    setAuctionStarted(true);
    actions.startGame(3);
  }, [actions]);

  const handleExit = useCallback(() => {
    router.push('/play');
  }, [router]);

  // Leaving an in-progress match asks for confirmation (like ranked): keep
  // playing / leave temporarily (rejoinable) / forfeit (match continues for the
  // others, this player gets their result screen).
  const handleLeaveTemporary = useCallback(() => {
    setShowQuitModal(false);
    router.push('/play');
  }, [router]);

  const handleForfeit = useCallback(() => {
    setShowQuitModal(false);
    actions.forfeit?.();
    router.push('/play');
  }, [actions, router]);

  const handleCancelSearch = useCallback(() => {
    actions.cancelSearch?.();
    router.push('/play');
  }, [actions, router]);

  if (!state || !resolvedHumanPlayerId || status === 'auth_required') {
    const searchError =
      status === 'auth_required' && authRequired ? 'Sign in to play Auction.' : error;
    // Error / auth states fall back to the plain screen (it shows the message);
    // the normal searching state shows the Lottie loaders that swap as bidders join.
    if (searchError) {
      return <MockSearchingScreen search={search} error={searchError} />;
    }
    return (
      <LottieSearch
        joined={Math.max(search?.queuedUserCount ?? 1, 1)}
        total={3}
        selfAvatarSeed={avatarSeed}
        onCancel={auctionStarted && !state ? handleCancelSearch : undefined}
        locale={locale === 'ka' ? 'ka' : 'en'}
      />
    );
  }

  // 'created' -> client 'matchmaking': a match exists and all players are
  // connecting. The SERVER has already chosen the formation (it's in `state`)
  // and holds the round behind its UI-ready gate until everyone is ready.
  // While that gate waits we play a short "GET READY" countdown, then the
  // server's formation reveal. The server — not these timers — decides when the
  // round actually starts (phase advances to 'clue-reveal').
  if (state.phase === 'matchmaking') {
    if (!countdownDone) {
      return (
        <MatchCountdown
          players={state.players}
          endsAtMs={search?.countdownEndsAtMs ?? null}
          locale={locale === 'ka' ? 'ka' : 'en'}
          onComplete={() => setCountdownDone(true)}
        />
      );
    }
    return <FormationReveal state={state} onContinue={() => {}} autoAdvanceMs={3000} />;
  }

  if (
    state.phase === 'clue-reveal' ||
    state.phase === 'bidding' ||
    state.phase === 'reveal' ||
    state.phase === 'solo-pick'
  ) {
    return (
      <>
        <AuctionGameScreen
          state={state}
          actions={actions}
          humanPlayerId={resolvedHumanPlayerId}
          serverDrivenTransitions
        />
        {/* Leave button — opens the quit/forfeit confirmation. */}
        <button
          type="button"
          onClick={() => setShowQuitModal(true)}
          aria-label={t('common.cancel')}
          className="fixed left-3 top-3 z-50 flex size-10 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur transition hover:bg-black/60 hover:text-white"
        >
          <X className="size-5" />
        </button>
        {liveWarningMessage && (
          <LiveAuctionWarning
            message={liveWarningMessage}
          />
        )}
        {pause && (
          <LiveAuctionPauseOverlay pause={pause} />
        )}
        <QuitMatchModal
          open={showQuitModal}
          onOpenChange={setShowQuitModal}
          onConfirm={handleForfeit}
          onSecondaryConfirm={handleLeaveTemporary}
          playerClubId={authUser?.favorite_club ?? null}
          theme={AUCTION_QUIT_MODAL_THEME}
        />
      </>
    );
  }

  if (state.phase === 'results') {
    return (
      <AuctionResultsScreen
        state={state}
        humanPlayerId={resolvedHumanPlayerId}
        onPlayAgain={handlePlayAgain}
        onExit={handleExit}
      />
    );
  }

  return <MockSearchingScreen error={error} />;
}

export function MockSearchingScreen({
  error,
  search,
  onCancel,
}: {
  error?: string | null;
  search?: AuctionSearchState | null;
  onCancel?: () => void;
}) {
  const { t } = useLocale();
  const detail = error
    ?? (search?.phase === 'match_found'
      ? t('auctionGame.connectingPlayers')
      : search && search.phase !== 'cancelled'
        ? t('auctionGame.searchStatus', {
            count: search.queuedUserCount,
          })
        : t('auctionGame.lookingForOpponents', { count: 2 }));

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-page">
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="relative">
          <div className="size-20 rounded-full border-[5px] border-white/10 border-t-brand-yellow animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/brand/goal-ball-small.webp"
              alt=""
              aria-hidden="true"
              draggable={false}
              width={28}
              height={28}
              className="block size-7 object-contain"
            />
          </div>
        </div>
        <div className="text-center">
          <h2
            className="font-poppins text-xl font-black uppercase text-white"
            style={poppins}
          >
            {error ? 'Auction unavailable' : t('auctionGame.findingPlayers')}
          </h2>
          <p
            className="mt-1.5 font-poppins text-xs font-semibold text-white/40 uppercase"
            style={poppins}
          >
            {detail}
          </p>
          {onCancel && !error && (
            <button
              type="button"
              onClick={onCancel}
              className="mt-5 rounded-full border border-white/20 bg-white/10 px-5 py-2 font-poppins text-xs font-black uppercase text-white shadow-lg transition hover:bg-white/15"
              style={poppins}
            >
              {t('common.cancel')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function LiveAuctionWarning({ message }: { message: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div
        className="max-w-sm rounded-[12px] border border-brand-yellow/40 bg-surface-deep/90 px-4 py-2 text-center font-poppins text-xs font-bold uppercase text-brand-yellow shadow-2xl backdrop-blur"
        style={poppins}
      >
        {message}
      </div>
    </div>
  );
}

function LiveAuctionPauseOverlay({ pause }: { pause: AuctionPauseState }) {
  const { t } = useLocale();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(intervalId);
  }, []);

  const seconds = Math.max(0, Math.ceil((pause.pauseUntilMs - nowMs) / 1000));
  const reconnectCopy =
    pause.remainingReconnects <= 0
      ? t('auctionGame.lastReconnect')
      : pause.remainingReconnects === 1
        ? t('auctionGame.reconnectsLeftOne', { count: pause.remainingReconnects })
        : t('auctionGame.reconnectsLeftMany', { count: pause.remainingReconnects });

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-surface-page-alt/75 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-[20px] bg-brand-blue px-6 py-6 text-center shadow-2xl">
        <div
          className="font-poppins text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60"
          style={poppins}
        >
          {t('auctionGame.auctionPaused')}
        </div>
        <div
          className="mt-2 font-poppins text-xl font-semibold uppercase text-white"
          style={poppins}
        >
          {t('auctionGame.playerDisconnected')}
        </div>
        <div
          className="mt-1 font-poppins text-sm font-semibold text-white/70"
          style={poppins}
        >
          {t('auctionGame.playerDisconnectedContinueIfNotReturn', { seconds })}
        </div>
        <div
          className="mt-4 inline-flex items-center justify-center rounded-full bg-black/30 px-6 py-2 font-poppins text-3xl font-semibold tabular-nums text-white"
          style={poppins}
        >
          {seconds}
        </div>
        <div
          className="mt-3 font-poppins text-xs font-semibold uppercase tracking-wide text-brand-yellow"
          style={poppins}
        >
          {reconnectCopy}
        </div>
      </div>
    </div>
  );
}

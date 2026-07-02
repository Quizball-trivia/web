'use client';

import { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuthStore } from '@/stores/auth.store';
import { QuitMatchModal } from '@/components/match/QuitMatchModal';
import { useRealtimeConnectionHealth } from '@/lib/realtime/connection-health';
import { poppins, AUCTION_QUIT_MODAL_THEME, AUCTION_PURPLE } from './constants/auction.constants';
import { useAuctionGame } from './hooks/useAuctionGame';
import { useRealtimeAuctionMatch, type AuctionPauseState } from './realtime/useRealtimeAuctionMatch';
import { AuctionShowdownScreen } from './components/AuctionShowdownScreen';
import { AuctionGameScreen } from './components/AuctionGameScreen';
import { AuctionResultsScreen } from './components/AuctionResultsScreen';
import { AuctionStatusOverlay } from './components/shared/AuctionStatusOverlay';
import { AuctionPrimaryButton } from './components/shared/AuctionPrimaryButton';
import { FormationReveal } from './components/screens/FormationReveal';
import { LottieSearch } from './components/screens/LottieSearch';
import { MatchCountdown } from './components/screens/MatchCountdown';
import type { AuctionFormationName } from '@/lib/realtime/socket.types';
import type { AvatarCustomization } from '@/types/game';

// The matchmaking search still sends a formation name (the hook requires one),
// but the SERVER picks the real formation randomly and ignores this value.
const LIVE_AUCTION_FORMATION_NAME: AuctionFormationName = '4-3-3';

interface AuctionFlowScreenProps {
  username: string;
  avatarSeed: string;
  /** Real logged-in user's layered avatar — rendered on the human seat. */
  avatarCustomization?: AvatarCustomization | null;
  mode?: 'mock' | 'live';
}

export function AuctionFlowScreen({ username, avatarSeed, avatarCustomization, mode = 'mock' }: AuctionFlowScreenProps) {
  if (mode === 'live') {
    return (
      <AuctionRealtimeFlowScreen
        username={username}
        avatarSeed={avatarSeed}
        avatarCustomization={avatarCustomization}
      />
    );
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

function AuctionRealtimeFlowScreen({ avatarSeed, avatarCustomization }: Omit<AuctionFlowScreenProps, 'mode'>) {
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
  // After forfeiting, show the results screen immediately (like ranked) with a
  // "you forfeited" state + no coins — instead of bouncing back to /play.
  const [forfeited, setForfeited] = useState(false);
  // Brief "Finalizing Match" beat before the results screen reveals (ranked
  // style). Gated so it plays once when the match first reaches 'results'.
  const [resultsRevealed, setResultsRevealed] = useState(false);
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
    rejoinAvailable,
    resumeCountdownEndsAtMs,
    search,
    coinsAwarded,
  } = useRealtimeAuctionMatch({
    enabled: realtimeEnabled,
    autoStart: auctionStarted,
    matchmakingMode: 'search',
    selfUserId: authUser?.id ?? null,
    locale: locale === 'ka' ? 'ka' : 'en',
    formation: LIVE_AUCTION_FORMATION_NAME,
    humanAvatarSeed: avatarSeed,
    humanAvatarCustomization: avatarCustomization,
  });

  const resolvedHumanPlayerId =
    humanPlayerId ?? state?.players.find((player) => !player.isBot)?.id ?? state?.players[0]?.id ?? null;
  const connectionWarning =
    connectionHealth.phase === 'reconnecting' || connectionHealth.phase === 'disconnected'
      ? t('common.reconnecting')
      : connectionHealth.phase === 'error'
        ? t('common.connectionBad')
        : null;
  // Non-blocking top warning strip. waiting-for-ready is the per-phase UI-ready
  // gate the server opens between rounds — it fires constantly during normal
  // play, so it must stay a thin strip, NOT a full-screen overlay (that would
  // flash over the live game). Only genuinely blocking moments (finalizing /
  // loading results) use the centered AuctionStatusOverlay.
  const liveWarningMessage =
    error ??
    connectionWarning ??
    (waitingForReady ? t('auctionGame.waitingForPlayersReady') : null) ??
    (versionGapDetected ? t('auctionGame.stateChangedReconnect') : null);

  const handlePlayAgain = useCallback(() => {
    setForfeited(false);
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
    // Show the results screen right away (forfeit = loss, no coins); the match
    // keeps going server-side for the remaining players.
    setForfeited(true);
  }, [actions]);

  const handleCancelSearch = useCallback(() => {
    actions.cancelSearch?.();
    router.push('/play');
  }, [actions, router]);

  const handleRejoin = useCallback(() => {
    if (rejoinAvailable) actions.rejoin?.(rejoinAvailable.matchId);
  }, [actions, rejoinAvailable]);

  // "Finalizing Match" beat: hold a short overlay the first time the match
  // reaches 'results', then reveal the results screen (ranked-style).
  const isResultsPhase = state?.phase === 'results';
  useEffect(() => {
    if (!isResultsPhase || resultsRevealed) return;
    const id = window.setTimeout(() => setResultsRevealed(true), 1400);
    return () => window.clearTimeout(id);
  }, [isResultsPhase, resultsRevealed]);

  // Forfeited: show the results screen immediately with the forfeit state (no
  // coins). Takes priority over every other branch once the player has left.
  if (forfeited && state && resolvedHumanPlayerId) {
    return (
      <AuctionResultsScreen
        state={state}
        humanPlayerId={resolvedHumanPlayerId}
        onPlayAgain={handlePlayAgain}
        onExit={handleExit}
        forfeited
      />
    );
  }

  // Reloaded into a paused match we were disconnected from: prompt to rejoin
  // (ranked-style handshake) instead of auto-joining.
  if (rejoinAvailable && !resumeCountdownEndsAtMs) {
    return (
      <AuctionRejoinPrompt
        graceMs={rejoinAvailable.graceMs}
        onRejoin={handleRejoin}
        onExit={handleExit}
      />
    );
  }

  // Resume "get ready" countdown after opting to rejoin, before the match
  // unpauses (server-authoritative end time).
  if (resumeCountdownEndsAtMs) {
    return (
      <MatchCountdown
        players={state?.players ?? []}
        endsAtMs={resumeCountdownEndsAtMs}
        onComplete={() => {}}
      />
    );
  }

  if (!state || !resolvedHumanPlayerId || status === 'auth_required') {
    const searchError =
      status === 'auth_required' && authRequired ? t('auctionGame.signInToPlay') : error;
    // Error / auth states fall back to the plain screen (it shows the message);
    // the normal searching state shows the Lottie loaders that swap as bidders join.
    if (searchError) {
      return <MockSearchingScreen error={searchError} />;
    }
    return (
      <LottieSearch
        joined={Math.max(search?.queuedUserCount ?? 1, 1)}
        total={3}
        selfAvatarSeed={avatarSeed}
        selfAvatarCustomization={avatarCustomization}
        onCancel={auctionStarted && !state ? handleCancelSearch : undefined}
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
    // Brief finalizing/loading beat before the standings reveal (ranked style).
    if (!resultsRevealed) {
      return (
        <AuctionStatusOverlay
          title={t('auctionGame.finalizingMatch')}
          subtitle={t('auctionGame.calculatingResults')}
        />
      );
    }
    return (
      <AuctionResultsScreen
        state={state}
        humanPlayerId={resolvedHumanPlayerId}
        onPlayAgain={handlePlayAgain}
        onExit={handleExit}
        coinsAwarded={coinsAwarded}
      />
    );
  }

  return <MockSearchingScreen error={error} />;
}

// Fallback searching screen: the mock flow's loader and the live flow's
// error/auth state. The happy-path live searching UI is owned by `LottieSearch`
// (this is only rendered when `error` is set or in the standalone mock flow).
export function MockSearchingScreen({ error }: { error?: string | null }) {
  const { t } = useLocale();
  const detail = error ?? t('auctionGame.lookingForOpponents', { count: 2 });

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
            {error ? t('auctionGame.auctionUnavailable') : t('auctionGame.findingPlayers')}
          </h2>
          <p
            className="mt-1.5 font-poppins text-xs font-semibold text-white/40 uppercase"
            style={poppins}
          >
            {detail}
          </p>
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

/**
 * Shown on reload into a paused match this player was disconnected from. Ranked-
 * style opt-in: the player taps Rejoin (→ resume countdown) before grace expires.
 */
function AuctionRejoinPrompt({
  graceMs,
  onRejoin,
  onExit,
}: {
  graceMs: number;
  onRejoin: () => void;
  onExit: () => void;
}) {
  const { t } = useLocale();
  const [endsAtMs] = useState(() => Date.now() + Math.max(0, graceMs));
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000)));

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds(Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000)));
    }, 250);
    return () => window.clearInterval(id);
  }, [endsAtMs]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-page-alt px-4">
      <div
        className="relative z-10 w-full max-w-sm rounded-[20px] px-6 py-7 text-center shadow-2xl"
        style={{ background: AUCTION_PURPLE }}
      >
        <div className="font-poppins text-xl font-black uppercase text-white" style={poppins}>
          {t('auctionGame.rejoinTitle')}
        </div>
        <div className="mt-1.5 font-poppins text-sm font-semibold text-white/75" style={poppins}>
          {t('auctionGame.rejoinSubtitle')}
        </div>
        <div
          className="mx-auto mt-4 inline-flex items-center justify-center rounded-full bg-black/30 px-6 py-2 font-poppins text-3xl font-black tabular-nums text-white"
          style={poppins}
        >
          {seconds}
        </div>
        <div className="mt-5 flex flex-col gap-3">
          <AuctionPrimaryButton onClick={onRejoin} size="wide">
            {t('auctionGame.rejoinButton')}
          </AuctionPrimaryButton>
          <AuctionPrimaryButton onClick={onExit} size="wide" variant="outline">
            {t('auctionGame.rejoinExit')}
          </AuctionPrimaryButton>
        </div>
      </div>
    </div>
  );
}

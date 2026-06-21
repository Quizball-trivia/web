'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuthStore } from '@/stores/auth.store';
import { poppins } from './constants/auction.constants';
import { useAuctionGame } from './hooks/useAuctionGame';
import { useRealtimeAuctionMatch } from './realtime/useRealtimeAuctionMatch';
import { AuctionShowdownScreen } from './components/AuctionShowdownScreen';
import { AuctionGameScreen } from './components/AuctionGameScreen';
import { AuctionResultsScreen } from './components/AuctionResultsScreen';

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
  const { locale } = useLocale();
  const authUser = useAuthStore((store) => store.user);
  const authStatus = useAuthStore((store) => store.status);
  const enabled = authStatus === 'authenticated' && Boolean(authUser?.id);
  const authRequired =
    authStatus === 'anonymous' ||
    (authStatus === 'authenticated' && !authUser?.id);
  const {
    state,
    actions,
    humanPlayerId,
    status,
    error,
    versionGapDetected,
  } = useRealtimeAuctionMatch({
    enabled,
    selfUserId: authUser?.id ?? null,
    locale: locale === 'ka' ? 'ka' : 'en',
    humanAvatarSeed: avatarSeed,
  });

  const resolvedHumanPlayerId =
    humanPlayerId ?? state?.players.find((player) => !player.isBot)?.id ?? state?.players[0]?.id ?? null;

  const handlePlayAgain = useCallback(() => {
    actions.startGame(3);
  }, [actions]);

  const handleExit = useCallback(() => {
    router.push('/play');
  }, [router]);

  if (!state || !resolvedHumanPlayerId || status === 'auth_required') {
    return (
      <MockSearchingScreen
        error={
          status === 'auth_required' && authRequired
            ? 'Sign in to play Auction.'
            : error
        }
      />
    );
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
        />
        {(error || versionGapDetected) && (
          <LiveAuctionWarning
            message={error ?? 'Auction state changed while reconnecting. Latest event was applied.'}
          />
        )}
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

function MockSearchingScreen({ error }: { error?: string | null }) {
  const { t } = useLocale();

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
            {error ?? t('auctionGame.lookingForOpponents', { count: 2 })}
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

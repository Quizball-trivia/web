'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuctionGame } from './hooks/useAuctionGame';
import { AuctionShowdownScreen } from './components/AuctionShowdownScreen';
import { AuctionGameScreen } from './components/AuctionGameScreen';
import { AuctionResultsScreen } from './components/AuctionResultsScreen';

interface AuctionFlowScreenProps {
  username: string;
  avatarSeed: string;
}

export function AuctionFlowScreen({ username, avatarSeed }: AuctionFlowScreenProps) {
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

function MockSearchingScreen() {
  const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-page">
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="relative">
          <div className="size-20 rounded-full border-[5px] border-white/10 border-t-brand-yellow animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">
            ⚽
          </div>
        </div>
        <div className="text-center">
          <h2
            className="font-poppins text-xl font-black uppercase text-white"
            style={poppins}
          >
            Finding Players
          </h2>
          <p
            className="mt-1.5 font-poppins text-xs font-semibold text-white/40 uppercase"
            style={poppins}
          >
            Looking for 2 opponents...
          </p>
        </div>
      </div>
    </div>
  );
}

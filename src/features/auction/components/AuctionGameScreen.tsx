'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { AuctionGameState } from '../types';
import type { AuctionActions } from '../hooks/useAuctionGame';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { PHASE_FADE } from '../constants/motion';
import { FormationReveal } from './screens/FormationReveal';
import { BiddingScreen } from './bidding/BiddingScreen';
import { StadiumBiddingScreen } from './bidding/StadiumBiddingScreen';
import { RevealScreen } from './screens/RevealScreen';
import { SoloPickScreen } from './screens/SoloPickScreen';

/**
 * Routes the active auction phase to its screen, with a smooth crossfade between
 * phases (they used to hard mount/unmount). clue-reveal and bidding share one
 * key so the bidding screen persists across that transition (no remount / lost
 * clue animation); every other phase gets its own key so it crossfades in.
 *
 * The 3-stadiums layout is a DESKTOP experience — three squads don't fit on a
 * phone — so mobile keeps the original BiddingScreen.
 */
export function AuctionGameScreen({
  state,
  actions,
  humanPlayerId,
  serverDrivenTransitions = false,
}: {
  state: AuctionGameState;
  actions: AuctionActions;
  humanPlayerId: string;
  serverDrivenTransitions?: boolean;
}) {
  const isDesktop = useIsDesktop();

  let key: string;
  let content: React.ReactNode;

  if (state.phase === 'formation') {
    key = 'formation';
    content = <FormationReveal state={state} onContinue={() => actions.setPhase('bidding')} />;
  } else if (state.phase === 'clue-reveal' || state.phase === 'bidding') {
    key = 'bidding';
    content = isDesktop ? (
      <StadiumBiddingScreen state={state} actions={actions} humanPlayerId={humanPlayerId} />
    ) : (
      <BiddingScreen state={state} actions={actions} humanPlayerId={humanPlayerId} />
    );
  } else if (state.phase === 'reveal') {
    key = 'reveal';
    content = (
      <RevealScreen
        state={state}
        actions={actions}
        humanPlayerId={humanPlayerId}
        serverDrivenTransitions={serverDrivenTransitions}
      />
    );
  } else if (state.phase === 'solo-pick') {
    key = 'solo';
    content = (
      <SoloPickScreen
        state={state}
        actions={actions}
        humanPlayerId={humanPlayerId}
        serverDrivenTransitions={serverDrivenTransitions}
      />
    );
  } else {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div key={key} className="h-full w-full" {...PHASE_FADE}>
        {content}
      </motion.div>
    </AnimatePresence>
  );
}

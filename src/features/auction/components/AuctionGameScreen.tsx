'use client';

import type { AuctionGameState } from '../types';
import type { AuctionActions } from '../hooks/useAuctionGame';
import { FormationReveal } from './screens/FormationReveal';
import { BiddingScreen } from './bidding/BiddingScreen';
import { RevealScreen } from './screens/RevealScreen';
import { SoloPickScreen } from './screens/SoloPickScreen';

/** Routes the active auction phase to its screen. */
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
  if (state.phase === 'formation') {
    return <FormationReveal state={state} onContinue={() => actions.setPhase('bidding')} />;
  }

  if (state.phase === 'clue-reveal' || state.phase === 'bidding') {
    return <BiddingScreen state={state} actions={actions} humanPlayerId={humanPlayerId} />;
  }

  if (state.phase === 'reveal') {
    return (
      <RevealScreen
        state={state}
        actions={actions}
        humanPlayerId={humanPlayerId}
        serverDrivenTransitions={serverDrivenTransitions}
      />
    );
  }

  if (state.phase === 'solo-pick') {
    return <SoloPickScreen state={state} actions={actions} humanPlayerId={humanPlayerId} />;
  }

  return null;
}

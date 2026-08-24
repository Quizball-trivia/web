'use client';

// Interactive, self-contained preview of the EXPERIMENTAL 3-stadium auction
// layout. Mock data + a floating pill row that switches between the round
// states. Rendered by BOTH the clean dev route (/dev/auction-stadium) and the
// live route's opt-in preview (/auction?stadium=1) so there is one source.

import { useState } from 'react';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { StadiumBiddingScreen } from './StadiumBiddingScreen';
import type { AuctionActions } from '../../hooks/useAuctionGame';
import type { AuctionGameState, AuctionPlayer, AuctionRound, Footballer, PositionGroup } from '../../types';
import {
  CLUE_STUDY_MS,
  FOOTBALLERS,
  FORMATIONS,
  OPENING_TURN_MS,
  RAISE_TURN_MS,
  STARTING_BUDGET,
  createEmptyTeam,
} from '../../data';

const HUMAN_ID = 'human-player';
const FORMATION = FORMATIONS[0];
const byPos = (pos: PositionGroup): Footballer[] => FOOTBALLERS.filter((f) => f.positionGroup === pos);

function makePlayer(id: string, username: string, isBot: boolean, filled: Partial<Record<PositionGroup, number>>, budget = STARTING_BUDGET): AuctionPlayer {
  const team = createEmptyTeam(FORMATION);
  (Object.keys(filled) as PositionGroup[]).forEach((pos) => {
    team.slots[pos] = byPos(pos).slice(0, filled[pos] ?? 0);
  });
  return { id, username, avatarSeed: 'avatar-1', budget, team, isBot, isEliminated: false };
}

// Partially-filled 2-2-2 squads (mid-auction) with an open FWD slot so the lot
// reads as live. Budgets reflect the 350M start minus early spending.
const players = (): AuctionPlayer[] => [
  makePlayer(HUMAN_ID, 'YouPlayer', false, { GK: 1, DEF: 2, MID: 2, FWD: 1 }, 190_000_000),
  makePlayer('bot-1', 'CarlosGol99', true, { GK: 1, DEF: 1, MID: 2 }, 210_000_000),
  makePlayer('bot-2', 'FutbolMaster', true, { GK: 1, DEF: 2, MID: 1 }, 160_000_000),
];

function makeRound(over: Partial<AuctionRound> = {}): AuctionRound {
  const f = byPos('FWD')[1];
  return {
    positionGroup: 'FWD', footballer: f, clues: f.clues, clueRevealIndex: f.clues.length,
    bids: [], highestBidderId: null, highestBid: 0, startingPrice: f.startingPrice,
    winnerId: null, winningBid: 0, revealed: false, countdownEndsAt: null,
    turnOrder: [HUMAN_ID, 'bot-1', 'bot-2'], currentTurnId: null, foldedIds: [],
    turnEndsAt: null, biddingStartsAt: null, ...over,
  };
}

function baseState(round: AuctionRound, phase: AuctionGameState['phase']): AuctionGameState {
  return {
    phase, players: players(), formation: FORMATION, currentRound: round,
    roundIndex: 3, totalRounds: 21, completedRounds: [], soloPick: null,
  };
}

const noop: AuctionActions = {
  startGame: () => {}, placeBid: () => {}, fold: () => {}, confirmReveal: () => {}, pickSoloOption: () => {}, setPhase: () => {},
};

const SCENARIOS: { key: string; label: string; make: () => AuctionGameState }[] = [
  { key: 'clue', label: 'Clues', make: () => baseState(makeRound({ clueRevealIndex: 2 }), 'clue-reveal') },
  { key: 'study', label: 'Study', make: () => baseState(makeRound({ biddingStartsAt: Date.now() + CLUE_STUDY_MS }), 'clue-reveal') },
  { key: 'open', label: 'Your turn', make: () => baseState(makeRound({ currentTurnId: HUMAN_ID, turnEndsAt: Date.now() + OPENING_TURN_MS }), 'bidding') },
  {
    key: 'raise', label: 'Raise',
    make: () => baseState(makeRound({ bids: [{ playerId: 'bot-1', amount: 70_000_000 }, { playerId: 'bot-2', amount: 90_000_000 }], highestBidderId: 'bot-2', highestBid: 90_000_000, currentTurnId: HUMAN_ID, turnEndsAt: Date.now() + RAISE_TURN_MS }), 'bidding'),
  },
  {
    key: 'waiting', label: 'Waiting',
    make: () => baseState(makeRound({ bids: [{ playerId: 'bot-1', amount: 120_000_000 }], highestBidderId: 'bot-1', highestBid: 120_000_000, currentTurnId: 'bot-2', turnEndsAt: Date.now() + RAISE_TURN_MS }), 'bidding'),
  },
];

export function StadiumBiddingPreview() {
  const [key, setKey] = useState('clue');
  const scenario = SCENARIOS.find((s) => s.key === key) ?? SCENARIOS[0];

  return (
    <LocaleProvider>
      <div className="relative">
        <StadiumBiddingScreen key={key} state={scenario.make()} actions={noop} humanPlayerId={HUMAN_ID} />
        {/* Floating scenario switcher (dev-only; top-left corner so it clears the
            stadium headers — the real game has no switcher). */}
        <div className="fixed left-2 top-2 z-50 flex gap-1 rounded-full border border-white/10 bg-black/70 p-1 backdrop-blur">
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setKey(s.key)}
              className={`rounded-full px-3 py-1 font-poppins text-[11px] font-black uppercase tracking-wide transition-colors ${
                s.key === key ? 'bg-brand-yellow text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </LocaleProvider>
  );
}

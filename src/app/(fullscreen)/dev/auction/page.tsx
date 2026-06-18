'use client';

/**
 * DEV HARNESS — step through every auction UI phase in isolation.
 *
 * Each scenario mounts the REAL auction screen component with a hand-built
 * mock state so you can iterate on a single phase's UI without playing a
 * whole game. Pick a scenario from the top toolbar; hit "Replay" to remount
 * (re-triggers entrance/staged animations). "Live (full flow)" runs the real
 * AuctionFlowScreen end-to-end.
 *
 * Dev-only: lives under /dev/* which bypasses AppAuthGate in development.
 */

import { useState, useCallback } from 'react';
import { AuctionFlowScreen } from '@/features/auction/AuctionFlowScreen';
import { AuctionGameScreen } from '@/features/auction/components/AuctionGameScreen';
import { AuctionShowdownScreen } from '@/features/auction/components/AuctionShowdownScreen';
import { AuctionResultsScreen } from '@/features/auction/components/AuctionResultsScreen';
import type { AuctionActions } from '@/features/auction/hooks/useAuctionGame';
import type {
  AuctionGameState,
  AuctionPlayer,
  AuctionRound,
  Footballer,
  Formation,
  PositionGroup,
} from '@/features/auction/types';
import {
  FOOTBALLERS,
  FORMATIONS,
  STARTING_BUDGET,
  BID_COUNTDOWN_MS,
  createEmptyTeam,
} from '@/features/auction/data';

const HUMAN_ID = 'human-player';
const FORMATION: Formation = FORMATIONS[0]; // 4-3-3

function byPos(pos: PositionGroup): Footballer[] {
  return FOOTBALLERS.filter((f) => f.positionGroup === pos);
}

/** A player with a partially-filled squad so pitches/squads aren't empty. */
function makePlayer(
  id: string,
  username: string,
  avatarSeed: string,
  isBot: boolean,
  filled: Partial<Record<PositionGroup, number>>,
  budget = STARTING_BUDGET,
): AuctionPlayer {
  const team = createEmptyTeam(FORMATION);
  (Object.keys(filled) as PositionGroup[]).forEach((pos) => {
    team.slots[pos] = byPos(pos).slice(0, filled[pos] ?? 0);
  });
  return { id, username, avatarSeed, budget, team, isBot, isEliminated: false };
}

function basePlayers(): AuctionPlayer[] {
  return [
    makePlayer(HUMAN_ID, 'YouPlayer', 'avatar-1', false, { GK: 1, DEF: 2, MID: 1 }, 720_000_000),
    makePlayer('bot-1', 'CarlosGol99', 'avatar-2', true, { DEF: 1, MID: 2 }, 540_000_000),
    makePlayer('bot-2', 'FutbolMaster', 'avatar-3', true, { GK: 1, FWD: 1 }, 610_000_000),
  ];
}

function makeRound(overrides: Partial<AuctionRound> = {}): AuctionRound {
  const footballer = byPos('FWD')[1]; // Messi-tier
  return {
    positionGroup: 'FWD',
    footballer,
    clues: footballer.clues,
    clueRevealIndex: footballer.clues.length,
    bids: [],
    highestBidderId: null,
    highestBid: 0,
    startingPrice: footballer.startingPrice,
    winnerId: null,
    winningBid: 0,
    revealed: false,
    countdownEndsAt: null,
    ...overrides,
  };
}

function baseState(overrides: Partial<AuctionGameState> = {}): AuctionGameState {
  return {
    phase: 'formation',
    players: basePlayers(),
    formation: FORMATION,
    currentRound: null,
    roundIndex: 3,
    totalRounds: 33,
    completedRounds: [],
    soloPick: null,
    ...overrides,
  };
}

// No-op actions; some scenarios override individual handlers.
function makeActions(over: Partial<AuctionActions> = {}): AuctionActions {
  return {
    startGame: () => {},
    placeBid: () => {},
    skipBid: () => {},
    confirmReveal: () => {},
    pickSoloOption: () => {},
    setPhase: () => {},
    ...over,
  };
}

type Scenario = {
  id: string;
  label: string;
  group: string;
  render: () => React.ReactNode;
};

function ShowdownScenario() {
  return (
    <AuctionShowdownScreen players={basePlayers()} humanPlayerId={HUMAN_ID} onComplete={() => {}} />
  );
}

function Game({ state }: { state: AuctionGameState }) {
  return <AuctionGameScreen state={state} actions={makeActions()} humanPlayerId={HUMAN_ID} />;
}

function ResultsScenario({ humanWins }: { humanWins: boolean }) {
  // Give the human the most valuable team when they win, else a bot.
  const players = basePlayers();
  if (humanWins) {
    players[0].team.slots.FWD = byPos('FWD').slice(0, 3);
    players[0].team.slots.MID = byPos('MID').slice(0, 3);
  } else {
    players[1].team.slots.FWD = byPos('FWD').slice(0, 3);
    players[1].team.slots.MID = byPos('MID').slice(0, 3);
    players[0].isEliminated = true;
  }
  return (
    <AuctionResultsScreen
      state={baseState({ phase: 'results', players })}
      humanPlayerId={HUMAN_ID}
      onPlayAgain={() => {}}
      onExit={() => {}}
    />
  );
}

const SCENARIOS: Scenario[] = [
  {
    id: 'matchmaking',
    label: 'Matchmaking (searching)',
    group: 'Flow',
    render: () => <AuctionFlowScreen username="YouPlayer" avatarSeed="avatar-1" />,
  },
  { id: 'showdown', label: 'Showdown (VS intros)', group: 'Flow', render: () => <ShowdownScenario /> },
  // One formation-reveal scenario per formation so you can preview slot placement.
  ...FORMATIONS.map((f) => ({
    id: `formation-${f.name}`,
    label: `Formation ${f.name}`,
    group: 'Formation',
    render: () => <Game state={baseState({ phase: 'formation', formation: f })} />,
  })),
  {
    id: 'clue-reveal',
    label: 'Clue reveal (clues appearing)',
    group: 'Round',
    render: () => (
      <Game
        state={baseState({
          phase: 'clue-reveal',
          currentRound: makeRound({ clueRevealIndex: 2 }),
        })}
      />
    ),
  },
  {
    id: 'bidding-open',
    label: 'Bidding — open, no bids yet',
    group: 'Round',
    render: () => (
      <Game
        state={baseState({
          phase: 'bidding',
          // Bidding opens with the 10s clock already running (matches the real hook).
          currentRound: makeRound({ countdownEndsAt: Date.now() + BID_COUNTDOWN_MS }),
        })}
      />
    ),
  },
  {
    id: 'bidding-active',
    label: 'Bidding — active war (you leading)',
    group: 'Round',
    render: () => (
      <Game
        state={baseState({
          phase: 'bidding',
          currentRound: makeRound({
            bids: [
              { playerId: 'bot-1', amount: 70_000_000 },
              { playerId: 'bot-2', amount: 90_000_000 },
              { playerId: HUMAN_ID, amount: 120_000_000 },
              { playerId: 'bot-1', amount: 150_000_000 },
              { playerId: HUMAN_ID, amount: 180_000_000 },
            ],
            highestBidderId: HUMAN_ID,
            highestBid: 180_000_000,
            countdownEndsAt: Date.now() + BID_COUNTDOWN_MS,
          }),
        })}
      />
    ),
  },
  {
    id: 'bidding-outbid',
    label: 'Bidding — you are OUTBID',
    group: 'Round',
    render: () => (
      <Game
        state={baseState({
          phase: 'bidding',
          currentRound: makeRound({
            bids: [
              { playerId: HUMAN_ID, amount: 120_000_000 },
              { playerId: 'bot-1', amount: 160_000_000 },
            ],
            highestBidderId: 'bot-1',
            highestBid: 160_000_000,
            countdownEndsAt: Date.now() + 3000,
          }),
        })}
      />
    ),
  },
  {
    id: 'reveal-win',
    label: 'Reveal — YOU won (steal)',
    group: 'Round',
    render: () => (
      <Game
        state={baseState({
          phase: 'reveal',
          currentRound: makeRound({
            bids: [{ playerId: HUMAN_ID, amount: 120_000_000 }],
            highestBidderId: HUMAN_ID,
            highestBid: 120_000_000,
            winnerId: HUMAN_ID,
            winningBid: 120_000_000,
            revealed: true,
          }),
        })}
      />
    ),
  },
  {
    id: 'reveal-lose',
    label: 'Reveal — bot won (overpaid)',
    group: 'Round',
    render: () => (
      <Game
        state={baseState({
          phase: 'reveal',
          currentRound: makeRound({
            bids: [{ playerId: 'bot-2', amount: 340_000_000 }],
            highestBidderId: 'bot-2',
            highestBid: 340_000_000,
            winnerId: 'bot-2',
            winningBid: 340_000_000,
            revealed: true,
          }),
        })}
      />
    ),
  },
  {
    id: 'solo-pick',
    label: 'Solo pick (you choose)',
    group: 'Round',
    render: () => {
      const opts = byPos('GK');
      return (
        <Game
          state={baseState({
            phase: 'solo-pick',
            soloPick: {
              playerId: HUMAN_ID,
              positionGroup: 'GK',
              optionA: { type: 'revealed', footballer: opts[0] },
              optionB: { type: 'mystery', footballer: opts[1], clues: opts[1].clues },
            },
          })}
        />
      );
    },
  },
  { id: 'results-win', label: 'Results — YOU win', group: 'End', render: () => <ResultsScenario humanWins /> },
  { id: 'results-lose', label: 'Results — you lose', group: 'End', render: () => <ResultsScenario humanWins={false} /> },
];

export default function DevAuctionPage() {
  const [activeId, setActiveId] = useState<string>('formation-4-3-3');
  const [nonce, setNonce] = useState(0); // bump to force remount (replay animations)

  const active = SCENARIOS.find((s) => s.id === activeId) ?? SCENARIOS[0];
  const replay = useCallback(() => setNonce((n) => n + 1), []);

  const groups = Array.from(new Set(SCENARIOS.map((s) => s.group)));

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-surface-page">
      {/* Toolbar */}
      <div className="shrink-0 z-[200] border-b border-white/10 bg-black/85 backdrop-blur px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-poppins text-xs font-bold uppercase tracking-wide text-brand-yellow">
            Auction UI harness
          </span>
          {groups.map((g) => (
            <div key={g} className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase text-white/35">{g}:</span>
              {SCENARIOS.filter((s) => s.group === g).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setActiveId(s.id);
                    setNonce((n) => n + 1);
                  }}
                  className={`rounded-md px-2 py-1 font-poppins text-[11px] font-semibold transition-colors ${
                    s.id === activeId
                      ? 'bg-brand-yellow text-black'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          ))}
          <button
            type="button"
            onClick={replay}
            className="ml-auto rounded-md bg-brand-green px-3 py-1 font-poppins text-[11px] font-bold uppercase text-white hover:bg-brand-green/90"
          >
            ↻ Replay
          </button>
        </div>
      </div>

      {/* Stage — fills remaining height; scrolls internally if a screen is taller.
          Remounts on scenario or replay change to re-trigger animations. */}
      <div key={`${active.id}-${nonce}`} className="relative flex-1 overflow-auto">
        {active.render()}
      </div>
    </div>
  );
}

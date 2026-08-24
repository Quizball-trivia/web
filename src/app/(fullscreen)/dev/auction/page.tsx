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

import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { QuitMatchModal } from '@/components/match/QuitMatchModal';
import { AUCTION_QUIT_MODAL_THEME } from '@/features/auction/constants/auction.constants';
import { AuctionGameScreen } from '@/features/auction/components/AuctionGameScreen';
import { StadiumBiddingScreen } from '@/features/auction/components/bidding/StadiumBiddingScreen';
import { AuctionShowdownScreen } from '@/features/auction/components/AuctionShowdownScreen';
import { AuctionResultsScreen } from '@/features/auction/components/AuctionResultsScreen';
import { LottieSearch, LottieSearchDemo } from '@/features/auction/components/screens/LottieSearch';
import { MatchCountdown } from '@/features/auction/components/screens/MatchCountdown';
import { AuctionStatusOverlay } from '@/features/auction/components/shared/AuctionStatusOverlay';
import { AuctionAudioControl } from '@/features/auction/components/shared/AuctionAudioControl';
import { AuctionLeaveControl } from '@/features/auction/components/shared/AuctionLeaveControl';
import { LocaleProvider, useLocale } from '@/contexts/LocaleContext';
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
  CLUE_STUDY_MS,
  FOOTBALLERS,
  FORMATIONS,
  OPENING_TURN_MS,
  RAISE_TURN_MS,
  STARTING_BUDGET,
  createEmptyTeam,
} from '@/features/auction/data';
import { randomBotAvatar } from '@/features/auction/data/botAvatars';

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
  return {
    id,
    username,
    avatarSeed,
    // Bots get a random layered avatar (like live); the human keeps its seed.
    avatarCustomization: isBot ? randomBotAvatar(id) : undefined,
    budget,
    team,
    isBot,
    isEliminated: false,
  };
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
    turnOrder: ['human-player', 'bot-1', 'bot-2'],
    currentTurnId: null,
    foldedIds: [],
    turnEndsAt: null,
    biddingStartsAt: null,
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
    fold: () => {},
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

/** Keep locale fixtures deterministic even when the tester has a different
 * app-wide language saved in local storage. */
function ForcedLocale({ locale, children }: { locale: 'en' | 'ka'; children: ReactNode }) {
  const { setLocale } = useLocale();

  useEffect(() => {
    setLocale(locale);
  }, [locale, setLocale]);

  return children;
}

function ShowdownScenario() {
  return (
    <AuctionShowdownScreen players={basePlayers()} humanPlayerId={HUMAN_ID} onComplete={() => {}} />
  );
}

function Game({
  state,
  disconnectedSeatIds = [],
}: {
  state: AuctionGameState;
  disconnectedSeatIds?: readonly string[];
}) {
  return (
    <>
      <AuctionGameScreen
        state={state}
        actions={makeActions()}
        humanPlayerId={HUMAN_ID}
        disconnectedSeatIds={disconnectedSeatIds}
      />
      <AuctionLeaveControl ariaLabel="Leave preview" onClick={() => {}} />
      <AuctionAudioControl />
    </>
  );
}

/** EXPERIMENTAL full-screen 3-stadium layout with the clue/bid overlay. */
function StadiumGame({
  state,
  disconnectedSeatIds = [],
}: {
  state: AuctionGameState;
  disconnectedSeatIds?: readonly string[];
}) {
  return (
    <StadiumBiddingScreen
      state={state}
      actions={makeActions()}
      humanPlayerId={HUMAN_ID}
      disconnectedSeatIds={disconnectedSeatIds}
    />
  );
}

/** The REAL quit/leave/forfeit modal currently used in matches (same as ranked).
 *  This is the one we'll modify. */
function QuitModalScenario() {
  const [open, setOpen] = useState(true);
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-surface-page-alt">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-white/20 bg-white/10 px-6 py-2 font-poppins text-xs font-black uppercase text-white"
      >
        Open quit modal
      </button>
      <QuitMatchModal
        open={open}
        onOpenChange={setOpen}
        onConfirm={() => setOpen(false)}
        onSecondaryConfirm={() => setOpen(false)}
        playerClubId="real-madrid"
        theme={AUCTION_QUIT_MODAL_THEME}
      />
    </div>
  );
}

function ResultsScenario({
  humanWins,
  coinsAwarded,
  apEarned,
  forfeited,
  /** Force the human into a specific finishing place (1/2/3) via the server
   *  ranking order, so the AP previews match the AP value being shown. */
  humanPlace,
}: {
  humanWins: boolean;
  coinsAwarded?: number | null;
  apEarned?: number | null;
  forfeited?: boolean;
  humanPlace?: 1 | 2 | 3;
}) {
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
  // The results screen prefers the server's ranking order when present, which
  // is what pins the human to the requested podium place.
  const rankings = humanPlace
    ? [
        ...['bot-1', 'bot-2'].slice(0, humanPlace - 1),
        HUMAN_ID,
        ...['bot-1', 'bot-2'].slice(humanPlace - 1),
      ]
    : undefined;
  return (
    <AuctionResultsScreen
      state={baseState({ phase: 'results', players, ...(rankings ? { rankings } : {}) })}
      humanPlayerId={HUMAN_ID}
      onPlayAgain={() => {}}
      onExit={() => {}}
      coinsAwarded={coinsAwarded}
      apEarned={apEarned}
      forfeited={forfeited}
    />
  );
}

const SCENARIOS: Scenario[] = [
  {
    id: 'lottie-cycle',
    label: 'Search — full cycle (1→2→3)',
    group: 'Auction search',
    render: () => <LottieSearchDemo />,
  },
  {
    id: 'lottie-cycle-ka',
    label: 'Search — full cycle (KA)',
    group: 'Auction search',
    render: () => (
      <LocaleProvider initialLocale="ka">
        <LottieSearchDemo />
      </LocaleProvider>
    ),
  },
  {
    id: 'lottie-1',
    label: 'Search — 1 alone (fifa)',
    group: 'Auction search',
    render: () => <LottieSearch joined={1} total={3} selfAvatarSeed="avatar-1" onCancel={() => {}} />,
  },
  {
    id: 'lottie-2',
    label: 'Search — smart bot joined (Shoes)',
    group: 'Auction search',
    render: () => (
      <LottieSearch
        joined={2}
        total={3}
        selfDisplayName="YouPlayer"
        selfAvatarSeed="avatar-1"
        botCount={1}
        botPlayers={[{ seatId: 'bot-1', displayName: 'CarlosGol99' }]}
        onCancel={() => {}}
      />
    ),
  },
  {
    id: 'lottie-3',
    label: 'Search — smart bots full (#3)',
    group: 'Auction search',
    render: () => (
      <LottieSearch
        joined={3}
        total={3}
        selfDisplayName="YouPlayer"
        selfAvatarSeed="avatar-1"
        botCount={2}
        botPlayers={[
          { seatId: 'bot-1', displayName: 'CarlosGol99' },
          { seatId: 'bot-2', displayName: 'FutbolMaster' },
        ]}
        onCancel={() => {}}
      />
    ),
  },
  {
    id: 'match-countdown',
    label: 'Match countdown (GET READY 5→1)',
    group: 'Auction search',
    render: () => <MatchCountdown players={basePlayers()} onComplete={() => {}} />,
  },
  {
    id: 'quit-modal',
    label: 'Quit modal (current — same as ranked)',
    group: 'Auction search',
    render: () => <QuitModalScenario />,
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
    id: 'bidding-your-turn-open',
    label: 'Bidding — your turn (open)',
    group: 'Round',
    render: () => (
      <Game
        state={baseState({
          phase: 'bidding',
          // Your turn, no bids yet — open at the starting price or fold.
          currentRound: makeRound({ currentTurnId: HUMAN_ID, turnEndsAt: Date.now() + OPENING_TURN_MS }),
        })}
      />
    ),
  },
  {
    id: 'bidding-your-turn-raise',
    label: 'Bidding — your turn (raise)',
    group: 'Round',
    render: () => (
      <Game
        state={baseState({
          phase: 'bidding',
          currentRound: makeRound({
            bids: [
              { playerId: 'bot-1', amount: 70_000_000 },
              { playerId: 'bot-2', amount: 90_000_000 },
            ],
            highestBidderId: 'bot-2',
            highestBid: 90_000_000,
            currentTurnId: HUMAN_ID,
            turnEndsAt: Date.now() + RAISE_TURN_MS,
          }),
        })}
      />
    ),
  },
  {
    id: 'bidding-waiting',
    label: 'Bidding — waiting (opponent turn)',
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
            currentTurnId: 'bot-2',
            turnEndsAt: Date.now() + RAISE_TURN_MS,
          }),
        })}
      />
    ),
  },
  {
    id: 'bidding-disconnected-en',
    label: 'Disconnected pitch (EN/mobile)',
    group: 'Reconnect UX',
    render: () => (
      <LocaleProvider initialLocale="en">
        <ForcedLocale locale="en">
          <Game
            disconnectedSeatIds={['bot-1']}
            state={baseState({
              phase: 'bidding',
              currentRound: makeRound({
                bids: [{ playerId: HUMAN_ID, amount: 120_000_000 }],
                highestBidderId: HUMAN_ID,
                highestBid: 120_000_000,
                currentTurnId: 'bot-2',
                turnEndsAt: Date.now() + RAISE_TURN_MS,
              }),
            })}
          />
        </ForcedLocale>
      </LocaleProvider>
    ),
  },
  {
    id: 'bidding-disconnected-ka',
    label: 'Disconnected pitch (KA/mobile)',
    group: 'Reconnect UX',
    render: () => (
      <LocaleProvider initialLocale="ka">
        <ForcedLocale locale="ka">
          <Game
            disconnectedSeatIds={['bot-1']}
            state={baseState({
              phase: 'bidding',
              currentRound: makeRound({
                currentTurnId: 'bot-2',
                turnEndsAt: Date.now() + RAISE_TURN_MS,
              }),
            })}
          />
        </ForcedLocale>
      </LocaleProvider>
    ),
  },
  {
    id: 'bidding-rival-folded',
    label: 'Bidding — a rival folded',
    group: 'Round',
    render: () => (
      <Game
        state={baseState({
          phase: 'bidding',
          currentRound: makeRound({
            bids: [
              { playerId: 'bot-1', amount: 90_000_000 },
              { playerId: HUMAN_ID, amount: 100_000_000 },
            ],
            highestBidderId: HUMAN_ID,
            highestBid: 100_000_000,
            foldedIds: ['bot-2'],
            currentTurnId: 'bot-1',
            turnEndsAt: Date.now() + RAISE_TURN_MS,
          }),
        })}
      />
    ),
  },
  {
    id: 'bidding-sitting-out',
    label: 'Bidding — you sit this lot out',
    group: 'Round',
    render: () => (
      <Game
        state={baseState({
          phase: 'bidding',
          currentRound: makeRound({
            // turnOrder omits the human: they already filled this position, so
            // they watch the whole lot and the UI has to say why.
            turnOrder: ['bot-1', 'bot-2'],
            bids: [{ playerId: 'bot-1', amount: 80_000_000 }],
            highestBidderId: 'bot-1',
            highestBid: 80_000_000,
            currentTurnId: 'bot-2',
            turnEndsAt: Date.now() + RAISE_TURN_MS,
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
  // ── EXPERIMENTAL: full-screen 3-stadium layout, clue/bid as an overlay ──
  {
    id: 'stadium-clue',
    label: 'Stadium — clue reveal',
    group: 'Stadium (new)',
    render: () => <StadiumGame state={baseState({ phase: 'clue-reveal', currentRound: makeRound({ clueRevealIndex: 2 }) })} />,
  },
  {
    id: 'stadium-study',
    label: 'Stadium — study window',
    group: 'Stadium (new)',
    render: () => (
      <StadiumGame state={baseState({ phase: 'clue-reveal', currentRound: makeRound({ biddingStartsAt: Date.now() + CLUE_STUDY_MS }) })} />
    ),
  },
  {
    id: 'stadium-open',
    label: 'Stadium — your turn (open)',
    group: 'Stadium (new)',
    render: () => (
      <StadiumGame state={baseState({ phase: 'bidding', currentRound: makeRound({ currentTurnId: HUMAN_ID, turnEndsAt: Date.now() + OPENING_TURN_MS }) })} />
    ),
  },
  {
    id: 'stadium-raise',
    label: 'Stadium — your turn (raise)',
    group: 'Stadium (new)',
    render: () => (
      <StadiumGame
        state={baseState({
          phase: 'bidding',
          currentRound: makeRound({
            bids: [
              { playerId: 'bot-1', amount: 70_000_000 },
              { playerId: 'bot-2', amount: 90_000_000 },
            ],
            highestBidderId: 'bot-2',
            highestBid: 90_000_000,
            currentTurnId: HUMAN_ID,
            turnEndsAt: Date.now() + RAISE_TURN_MS,
          }),
        })}
      />
    ),
  },
  {
    id: 'stadium-waiting',
    label: 'Stadium — waiting (opponent)',
    group: 'Stadium (new)',
    render: () => (
      <StadiumGame
        state={baseState({
          phase: 'bidding',
          currentRound: makeRound({
            bids: [{ playerId: 'bot-1', amount: 120_000_000 }],
            highestBidderId: 'bot-1',
            highestBid: 120_000_000,
            currentTurnId: 'bot-2',
            turnEndsAt: Date.now() + RAISE_TURN_MS,
          }),
        })}
      />
    ),
  },
  {
    id: 'stadium-disconnected-en',
    label: 'Disconnected pitch (EN/desktop)',
    group: 'Reconnect UX',
    render: () => (
      <LocaleProvider initialLocale="en">
        <ForcedLocale locale="en">
          <StadiumGame
            disconnectedSeatIds={['bot-1']}
            state={baseState({
              phase: 'bidding',
              currentRound: makeRound({
                currentTurnId: 'bot-2',
                turnEndsAt: Date.now() + RAISE_TURN_MS,
              }),
            })}
          />
        </ForcedLocale>
      </LocaleProvider>
    ),
  },
  {
    id: 'stadium-disconnected-ka',
    label: 'Disconnected pitch (KA/desktop)',
    group: 'Reconnect UX',
    render: () => (
      <LocaleProvider initialLocale="ka">
        <ForcedLocale locale="ka">
          <StadiumGame
            disconnectedSeatIds={['bot-1']}
            state={baseState({
              phase: 'bidding',
              currentRound: makeRound({
                currentTurnId: 'bot-2',
                turnEndsAt: Date.now() + RAISE_TURN_MS,
              }),
            })}
          />
        </ForcedLocale>
      </LocaleProvider>
    ),
  },
  { id: 'finalizing', label: 'Overlay — Finalizing match', group: 'End', render: () => <FinalizingOverlayScenario /> },
  { id: 'loading-results', label: 'Overlay — Loading results', group: 'End', render: () => <LoadingResultsOverlayScenario /> },
  { id: 'results-win', label: 'Results — YOU win (+500)', group: 'End', render: () => <ResultsScenario humanWins coinsAwarded={500} /> },
  { id: 'results-lose', label: 'Results — you finish (+300)', group: 'End', render: () => <ResultsScenario humanWins={false} coinsAwarded={300} /> },
  { id: 'results-forfeit', label: 'Results — you forfeited (no coins)', group: 'End', render: () => <ResultsScenario humanWins={false} forfeited /> },
  // ─── Auction Points (AP) previews — ranked auction pays 1st +50 / 2nd +30 /
  // 3rd +10; friendly-lobby matches pay none and must render no AP at all.
  {
    id: 'results-ap-1st',
    label: 'AP — 1st place (+50 AP)',
    group: 'Auction Points',
    render: () => <ResultsScenario humanWins coinsAwarded={500} apEarned={50} humanPlace={1} />,
  },
  {
    id: 'results-ap-2nd',
    label: 'AP — 2nd place (+30 AP)',
    group: 'Auction Points',
    render: () => <ResultsScenario humanWins={false} coinsAwarded={300} apEarned={30} humanPlace={2} />,
  },
  {
    id: 'results-ap-3rd',
    label: 'AP — 3rd place (+10 AP)',
    group: 'Auction Points',
    render: () => <ResultsScenario humanWins={false} coinsAwarded={300} apEarned={10} humanPlace={3} />,
  },
  {
    id: 'results-ap-friendly',
    label: 'AP — friendly lobby (no AP shown)',
    group: 'Auction Points',
    render: () => <ResultsScenario humanWins coinsAwarded={500} apEarned={null} humanPlace={1} />,
  },
  {
    id: 'results-ap-forfeit',
    label: 'AP — forfeited (no AP shown)',
    group: 'Auction Points',
    render: () => <ResultsScenario humanWins={false} apEarned={0} forfeited humanPlace={3} />,
  },
  {
    id: 'results-ap-1st-ka',
    label: 'AP — 1st place (KA)',
    group: 'Auction Points',
    render: () => (
      <LocaleProvider initialLocale="ka">
        <ResultsScenario humanWins coinsAwarded={500} apEarned={50} humanPlace={1} />
      </LocaleProvider>
    ),
  },
];

function FinalizingOverlayScenario() {
  const { t } = useLocale();
  return (
    <AuctionStatusOverlay
      title={t('auctionGame.finalizingMatch')}
      subtitle={t('auctionGame.calculatingResults')}
    />
  );
}

function LoadingResultsOverlayScenario() {
  const { t } = useLocale();
  return <AuctionStatusOverlay title={t('auctionGame.loadingResults')} />;
}

export default function DevAuctionPage() {
  const [activeId, setActiveId] = useState<string>('formation-4-3-3');
  const [nonce, setNonce] = useState(0); // bump to force remount (replay animations)

  useEffect(() => {
    const requestedScenario = new URLSearchParams(window.location.search).get('scenario');
    if (requestedScenario && SCENARIOS.some((scenario) => scenario.id === requestedScenario)) {
      queueMicrotask(() => setActiveId(requestedScenario));
    }
  }, []);

  const active = SCENARIOS.find((s) => s.id === activeId) ?? SCENARIOS[0];
  const replay = useCallback(() => setNonce((n) => n + 1), []);

  const groups = Array.from(new Set(SCENARIOS.map((s) => s.group)));

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-surface-page">
      {/* Toolbar */}
      <div className="shrink-0 z-[200] border-b border-white/10 bg-black/85 backdrop-blur px-3 py-2">
        <div className="flex items-center gap-2 md:hidden">
          <label htmlFor="auction-harness-scenario" className="shrink-0 font-poppins text-[10px] font-bold uppercase text-brand-yellow">
            Scenario
          </label>
          <select
            id="auction-harness-scenario"
            value={active.id}
            onChange={(event) => {
              setActiveId(event.target.value);
              setNonce((n) => n + 1);
            }}
            className="min-w-0 flex-1 rounded-md border border-white/15 bg-surface-page-alt px-2 py-1.5 font-poppins text-xs font-semibold text-white"
          >
            {groups.map((group) => (
              <optgroup key={group} label={group}>
                {SCENARIOS.filter((scenario) => scenario.group === group).map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            type="button"
            onClick={replay}
            className="shrink-0 rounded-md bg-brand-green px-2.5 py-1.5 font-poppins text-[11px] font-bold uppercase text-white"
            aria-label="Replay scenario"
          >
            ↻
          </button>
        </div>

        <div className="hidden flex-wrap items-center gap-2 md:flex">
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

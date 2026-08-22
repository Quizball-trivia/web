import { describe, expect, it, vi } from 'vitest';
import type {
  PublicAuctionFormation,
  PublicAuctionMatchState,
  PublicAuctionPlayer,
  PublicAuctionRoundState,
} from '@/lib/realtime/socket.types';
import {
  findMyAuctionSeatId,
  toClientAuctionState,
} from '../auction-realtime.adapter';
import {
  applyAuctionRealtimeEvent,
  EMPTY_AUCTION_REALTIME_STATE,
} from '../auction-realtime.reducer';

const formation: PublicAuctionFormation = {
  name: '2-2-2',
  required: { GK: 1, DEF: 2, MID: 2, FWD: 2 },
  rows: [
    { pos: 'FWD', count: 2 },
    { pos: 'MID', count: 2 },
    { pos: 'DEF', count: 2 },
    { pos: 'GK', count: 1 },
  ],
};

function player(seatId: string, displayName: string, userId: string | null): PublicAuctionPlayer {
  return {
    seatId,
    userId,
    displayName,
    isBot: userId === null,
    budget: 1_000_000_000,
    team: {
      formation,
      slots: { GK: [], DEF: [], MID: [], FWD: [] },
    },
    isEliminated: false,
  };
}

function round(overrides: Partial<PublicAuctionRoundState> = {}): PublicAuctionRoundState {
  return {
    roundId: 'round-1',
    roundIndex: 1,
    positionGroup: 'FWD',
    footballer: {
      positionGroup: 'FWD',
      startingPrice: 20_000_000,
      clues: ['Won a major European trophy'],
    },
    clueRevealIndex: 1,
    bids: [],
    highestBidderSeatId: null,
    highestBid: 0,
    startingPrice: 20_000_000,
    winnerSeatId: null,
    winningBid: 0,
    revealed: false,
    turnOrder: ['seat-human', 'seat-bot-1'],
    currentTurnSeatId: null,
    foldedSeatIds: [],
    turnEndsAt: null,
    biddingStartsAt: null,
    startedAt: '2026-06-20T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
    revealedClues: ['Won a major European trophy'],
    ...overrides,
  };
}

function matchState(overrides: Partial<PublicAuctionMatchState> = {}): PublicAuctionMatchState {
  return {
    matchId: 'match-1',
    version: 1,
    locale: 'en',
    phase: 'clue_reveal',
    formation: '2-2-2',
    seats: [
      player('seat-human', 'You', 'user-1'),
      player('seat-bot-1', 'Bot 1', null),
      player('seat-bot-2', 'Bot 2', null),
    ],
    currentRound: round(),
    completedRounds: [],
    soloPick: null,
    usedClueCardIds: [],
    rankings: null,
    createdAt: '2026-06-20T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
    ...overrides,
  };
}

describe('auction realtime adapter', () => {
  it('finds the current user seat and maps backend seats to client players', () => {
    const publicState = matchState();

    expect(findMyAuctionSeatId(publicState, 'user-1')).toBe('seat-human');

    const clientState = toClientAuctionState(publicState, {
      humanSeatId: 'seat-human',
      humanAvatarSeed: 'avatar-1',
    });

    expect(clientState.players[0]).toMatchObject({
      id: 'seat-human',
      username: 'You',
      avatarSeed: 'avatar-1',
      isBot: false,
    });
    expect(clientState.formation.name).toBe('2-2-2');
    expect(clientState.totalRounds).toBe(21);
  });

  it('carries the server ranking order through, best first', () => {
    // Coins are paid against the server's placings, so the results screen has to
    // render this exact order rather than re-sorting locally (a local tiebreak
    // can disagree and show two players different 2nd/3rd).
    const clientState = toClientAuctionState(matchState({
      phase: 'finished',
      rankings: [
        { seatId: 'seat-bot-2', displayName: 'Bot 2', rank: 3, isComplete: false, totalTrueValue: 10, budgetRemaining: 0 },
        { seatId: 'seat-human', displayName: 'You', rank: 1, isComplete: true, totalTrueValue: 90, budgetRemaining: 5 },
        { seatId: 'seat-bot-1', displayName: 'Bot 1', rank: 2, isComplete: true, totalTrueValue: 50, budgetRemaining: 2 },
      ] as PublicAuctionMatchState['rankings'],
    }));

    expect(clientState.rankings).toEqual(['seat-human', 'seat-bot-1', 'seat-bot-2']);
  });

  it('leaves rankings null while the match is still running', () => {
    expect(toClientAuctionState(matchState()).rankings).toBeNull();
  });

  it('pads hidden rounds to three clue slots while preserving revealed clue text', () => {
    const clientState = toClientAuctionState(matchState());

    expect(clientState.phase).toBe('clue-reveal');
    expect(clientState.currentRound?.clues).toEqual([
      'Won a major European trophy',
      '',
      '',
    ]);
    expect(clientState.currentRound?.clueRevealIndex).toBe(1);
  });

  it('clamps past turn deadlines and ignores invalid deadline strings', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-06-20T10:00:10.000Z'));
    try {
      const pastDeadlineState = toClientAuctionState(matchState({
        phase: 'bidding',
        currentRound: round({
          currentTurnSeatId: 'seat-human',
          turnEndsAt: '2026-06-20T10:00:05.000Z',
        }),
      }));
      expect(pastDeadlineState.currentRound?.turnEndsAt).toBe(Date.parse('2026-06-20T10:00:10.000Z'));

      const invalidDeadlineState = toClientAuctionState(matchState({
        phase: 'bidding',
        currentRound: round({
          currentTurnSeatId: 'seat-human',
          turnEndsAt: 'not-a-date',
        }),
      }));
      expect(invalidDeadlineState.currentRound?.turnEndsAt).toBeNull();
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('converts deadlines onto the client clock via the offset and clamps expired ones', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-06-20T09:59:50.000Z'));
    try {
      const clientState = toClientAuctionState(matchState({
        phase: 'bidding',
        currentRound: round({
          currentTurnSeatId: 'seat-human',
          turnEndsAt: '2026-06-20T10:00:05.000Z',
        }),
      }), {
        serverTimeOffsetMs: 20_000,
      });

      // Server truth: the 10:00:05 deadline already passed (server now =
      // 10:00:10). Converting onto the client clock (deadline − offset =
      // 09:59:45) lands in the past, so the clamp pins it at client-now —
      // the countdown reads zero instead of a phantom 20 extra seconds.
      expect(clientState.currentRound?.turnEndsAt).toBe(Date.parse('2026-06-20T09:59:50.000Z'));

      const futureState = toClientAuctionState(matchState({
        phase: 'bidding',
        currentRound: round({
          currentTurnSeatId: 'seat-human',
          turnEndsAt: '2026-06-20T10:00:30.000Z',
        }),
      }), {
        serverTimeOffsetMs: 20_000,
      });

      // True remaining is 20s (server 10:00:10 → 10:00:30); on this skewed
      // client clock that renders as 09:59:50 → 10:00:10.
      expect(futureState.currentRound?.turnEndsAt).toBe(Date.parse('2026-06-20T10:00:10.000Z'));
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('maps revealed rounds with player identity and true value', () => {
    const publicState = matchState({
      phase: 'reveal',
      currentRound: round({
        revealed: true,
        clueRevealIndex: 3,
        winnerSeatId: 'seat-human',
        winningBid: 45_000_000,
        highestBidderSeatId: 'seat-human',
        highestBid: 45_000_000,
        footballer: {
          id: 'card-1',
          name: 'Example Forward',
          positionGroup: 'FWD',
          trueValue: 80_000_000,
          startingPrice: 20_000_000,
          clues: ['Clue one', 'Clue two', 'Clue three'],
          nationality: 'Georgia',
          imageUrl: 'https://example.com/player.png',
        },
        revealedClues: ['Clue one', 'Clue two', 'Clue three'],
      }),
    });

    const clientState = toClientAuctionState(publicState);

    expect(clientState.phase).toBe('reveal');
    expect(clientState.currentRound?.footballer).toMatchObject({
      id: 'card-1',
      name: 'Example Forward',
      value: 80_000_000,
      nationality: 'Georgia',
      imageUrl: 'https://example.com/player.png',
    });
  });

  it('maps solo-pick snapshots with one revealed option and one mystery option', () => {
    const publicState = matchState({
      phase: 'solo_pick',
      currentRound: null,
      soloPick: {
        playerSeatId: 'seat-human',
        positionGroup: 'MID',
        optionA: {
          type: 'revealed',
          footballer: {
            id: 'card-a',
            name: 'Known Midfielder',
            positionGroup: 'MID',
            trueValue: 60_000_000,
            startingPrice: 20_000_000,
            clues: ['Won a continental final', 'Captained his club', 'Moved leagues in 2022'],
            nationality: 'Spain',
            imageUrl: 'https://example.com/known-midfielder.png',
          },
        },
        optionB: {
          type: 'mystery',
          footballer: {
            positionGroup: 'MID',
            startingPrice: 20_000_000,
            clues: ['Developed at a famous academy', 'Played in a European semifinal'],
          },
          clues: ['Developed at a famous academy', 'Played in a European semifinal'],
        },
        selectedOption: null,
        startedAt: '2026-06-20T10:01:00.000Z',
      },
    });

    const clientState = toClientAuctionState(publicState);

    expect(clientState.phase).toBe('solo-pick');
    expect(clientState.soloPick).toMatchObject({
      playerId: 'seat-human',
      positionGroup: 'MID',
      optionA: {
        type: 'revealed',
        footballer: {
          id: 'card-a',
          name: 'Known Midfielder',
          value: 60_000_000,
          imageUrl: 'https://example.com/known-midfielder.png',
        },
      },
      optionB: {
        type: 'mystery',
        footballer: {
          name: 'Mystery Player',
          value: 0,
          startingPrice: 20_000_000,
        },
      },
    });
    expect(clientState.soloPick?.optionB.clues).toEqual([
      'Developed at a famous academy',
      'Played in a European semifinal',
    ]);
  });

  it('maps finished snapshots to results with completed rounds and filled squads', () => {
    const completedRound = round({
      revealed: true,
      clueRevealIndex: 3,
      winnerSeatId: 'seat-human',
      winningBid: 45_000_000,
      footballer: {
        id: 'card-1',
        name: 'Example Forward',
        positionGroup: 'FWD',
        trueValue: 80_000_000,
        startingPrice: 20_000_000,
        clues: ['Clue one', 'Clue two', 'Clue three'],
      },
      revealedClues: ['Clue one', 'Clue two', 'Clue three'],
    });
    const human = player('seat-human', 'You', 'user-1');
    human.team.slots.FWD = [completedRound.footballer];

    const clientState = toClientAuctionState(matchState({
      phase: 'finished',
      seats: [human, player('seat-bot-1', 'Bot 1', null), player('seat-bot-2', 'Bot 2', null)],
      currentRound: null,
      completedRounds: [completedRound],
      rankings: [{
        seatId: 'seat-human',
        userId: 'user-1',
        displayName: 'You',
        rank: 1,
        isComplete: false,
        totalTrueValue: 80_000_000,
        budgetRemaining: 955_000_000,
        player: human,
      }],
    }));

    expect(clientState.phase).toBe('results');
    expect(clientState.currentRound).toBeNull();
    expect(clientState.completedRounds).toHaveLength(1);
    expect(clientState.players[0].team.slots.FWD[0]).toMatchObject({
      id: 'card-1',
      name: 'Example Forward',
      value: 80_000_000,
    });
  });
});

describe('auction realtime reducer', () => {
  it('ignores stale state versions', () => {
    const current = applyAuctionRealtimeEvent(EMPTY_AUCTION_REALTIME_STATE, {
      type: 'match_started',
      payload: { matchId: 'match-1', locale: 'en', state: matchState({ version: 3 }) },
    });

    const next = applyAuctionRealtimeEvent(current, {
      type: 'turn_started',
      payload: {
        matchId: 'match-1',
        roundId: 'round-1',
        currentTurnSeatId: 'seat-human',
        minBid: 20_000_000,
        maxBid: 900_000_000,
        turnEndsAt: null,
        round: round({ currentTurnSeatId: 'seat-human' }),
        stateVersion: 2,
      },
    });

    expect(next.publicState?.version).toBe(3);
    expect(next.publicState?.currentRound?.currentTurnSeatId).toBeNull();
  });

  it('appends a revealed round when the next round starts', () => {
    const revealedRound = round({
      revealed: true,
      winnerSeatId: 'seat-human',
      winningBid: 35_000_000,
    });
    const current = applyAuctionRealtimeEvent(EMPTY_AUCTION_REALTIME_STATE, {
      type: 'match_started',
      payload: {
        matchId: 'match-1',
        locale: 'en',
        state: matchState({ version: 4, phase: 'reveal', currentRound: revealedRound }),
      },
    });

    const nextRound = round({ roundId: 'round-2', roundIndex: 2, clueRevealIndex: 0, revealedClues: [], footballer: {
      positionGroup: 'MID',
      startingPrice: 25_000_000,
      clues: [],
    } });
    const next = applyAuctionRealtimeEvent(current, {
      type: 'round_started',
      payload: {
        matchId: 'match-1',
        round: nextRound,
        stateVersion: 5,
      },
    });

    expect(next.publicState?.phase).toBe('clue_reveal');
    expect(next.publicState?.completedRounds.map((entry) => entry.roundId)).toEqual(['round-1']);
    expect(next.publicState?.currentRound?.roundId).toBe('round-2');
  });

  it('tracks version gaps while still applying the latest event', () => {
    const current = applyAuctionRealtimeEvent(EMPTY_AUCTION_REALTIME_STATE, {
      type: 'match_started',
      payload: { matchId: 'match-1', locale: 'en', state: matchState({ version: 1 }) },
    });

    const next = applyAuctionRealtimeEvent(current, {
      type: 'bid_accepted',
      payload: {
        matchId: 'match-1',
        roundId: 'round-1',
        seatId: 'seat-human',
        amount: 40_000_000,
        round: round({
          bids: [{ seatId: 'seat-human', amount: 40_000_000, placedAt: '2026-06-20T10:00:01.000Z' }],
          highestBidderSeatId: 'seat-human',
          highestBid: 40_000_000,
        }),
        stateVersion: 4,
      },
    });

    expect(next.versionGapDetected).toBe(true);
    expect(next.publicState?.version).toBe(4);
    expect(next.publicState?.currentRound?.highestBid).toBe(40_000_000);
  });

  it('applies squad updates to the matching seat without replacing other seats', () => {
    const current = applyAuctionRealtimeEvent(EMPTY_AUCTION_REALTIME_STATE, {
      type: 'match_started',
      payload: { matchId: 'match-1', locale: 'en', state: matchState({ version: 1 }) },
    });
    const updatedHuman = player('seat-human', 'You', 'user-1');
    updatedHuman.budget = 955_000_000;
    updatedHuman.team.slots.FWD = [{
      id: 'card-1',
      name: 'Example Forward',
      positionGroup: 'FWD',
      trueValue: 80_000_000,
      startingPrice: 20_000_000,
      clues: ['Clue one', 'Clue two', 'Clue three'],
    }];

    const next = applyAuctionRealtimeEvent(current, {
      type: 'squad_updated',
      payload: {
        matchId: 'match-1',
        seatId: 'seat-human',
        player: updatedHuman,
        stateVersion: 2,
      },
    });

    expect(next.publicState?.seats.find((seat) => seat.seatId === 'seat-human')?.budget).toBe(955_000_000);
    expect(next.publicState?.seats.find((seat) => seat.seatId === 'seat-human')?.team.slots.FWD).toHaveLength(1);
    expect(next.publicState?.seats.find((seat) => seat.seatId === 'seat-bot-1')?.budget).toBe(1_000_000_000);
  });

  it('maps season snapshots through and pads snapshot lots to five clue slots', () => {
    const snapshots = [
      { season: '2020/21', league: 'La Liga', age: 19, apps: 20, goals: 3, valueEur: 5_000_000 },
      { season: '2022/23', league: 'La Liga', age: 21, apps: 36, goals: 11, valueEur: 30_000_000 },
      { season: '2025/26', league: 'Primeira Liga', age: null, apps: 31, goals: 3, valueEur: 0 },
    ];
    const clientState = toClientAuctionState(matchState({
      currentRound: round({
        footballer: {
          positionGroup: 'FWD',
          startingPrice: 20_000_000,
          clues: ['Goals'],
          snapshots,
        },
        clueRevealIndex: 1,
        revealedClues: ['Goals'],
      }),
    }));

    const footballer = clientState.currentRound!.footballer;
    expect(footballer.snapshots).toHaveLength(3);
    // Null age is preserved so the UI renders "—" instead of a fake 0.
    expect(footballer.snapshots![2].age).toBeNull();
    // Facet-unlock cadence is driven by clue count: snapshot lots pad to 5.
    expect(clientState.currentRound!.clues).toHaveLength(5);
  });
});

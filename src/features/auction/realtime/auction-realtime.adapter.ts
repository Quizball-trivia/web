import type {
  AuctionGameState,
  AuctionPhase,
  AuctionPlayer,
  AuctionRound,
  Footballer,
  Formation,
  PositionGroup,
  SoloPickOption,
} from '../types';
import type {
  PublicAuctionFootballer,
  PublicAuctionMatchState,
  PublicAuctionPlayer,
  PublicAuctionRoundState,
  PublicAuctionSoloPickOptionState,
} from '@/lib/realtime/socket.types';

const POSITION_GROUPS = ['GK', 'DEF', 'MID', 'FWD'] as const satisfies readonly PositionGroup[];
const DEFAULT_AUCTION_CLUE_COUNT = 3;

export interface AuctionStateAdapterOptions {
  humanSeatId?: string | null;
  humanAvatarSeed?: string;
}

export function findMyAuctionSeatId(
  publicState: PublicAuctionMatchState | null,
  selfUserId: string | null,
): string | null {
  if (!publicState || !selfUserId) return null;
  return publicState.seats.find((seat) => seat.userId === selfUserId)?.seatId ?? null;
}

export function toClientAuctionState(
  publicState: PublicAuctionMatchState,
  options: AuctionStateAdapterOptions = {},
): AuctionGameState {
  const formation = toClientFormation(
    publicState.seats[0]?.team.formation,
    publicState.formation,
  );
  const players = publicState.seats.map((seat, index) =>
    toClientPlayer(seat, formation, index, options),
  );

  return {
    phase: toClientPhase(publicState.phase),
    players,
    formation,
    currentRound: publicState.currentRound
      ? toClientRound(publicState.currentRound)
      : null,
    roundIndex: publicState.currentRound?.roundIndex ?? publicState.completedRounds.length,
    totalRounds: getTotalRounds(formation, publicState.seats.length),
    completedRounds: publicState.completedRounds.map(toClientRound),
    soloPick: publicState.soloPick
      ? {
          playerId: publicState.soloPick.playerSeatId,
          positionGroup: publicState.soloPick.positionGroup,
          optionA: toClientSoloPickOption(publicState.soloPick.optionA, 'solo-a'),
          optionB: toClientSoloPickOption(publicState.soloPick.optionB, 'solo-b'),
        }
      : null,
  };
}

function toClientPhase(phase: PublicAuctionMatchState['phase']): AuctionPhase {
  switch (phase) {
    case 'created':
      return 'matchmaking';
    case 'clue_reveal':
      return 'clue-reveal';
    case 'bidding':
      return 'bidding';
    case 'reveal':
      return 'reveal';
    case 'solo_pick':
      return 'solo-pick';
    case 'finished':
      return 'results';
  }
}

function toClientFormation(
  formation: PublicAuctionPlayer['team']['formation'] | undefined,
  fallbackName: string,
): Formation {
  if (formation) {
    return {
      name: formation.name,
      required: { ...formation.required },
      rows: formation.rows.map((row) => ({ ...row })),
    };
  }

  return {
    name: fallbackName,
    required: { GK: 1, DEF: 4, MID: 3, FWD: 3 },
    rows: [
      { pos: 'FWD', count: 3 },
      { pos: 'MID', count: 3 },
      { pos: 'DEF', count: 4 },
      { pos: 'GK', count: 1 },
    ],
  };
}

function toClientPlayer(
  player: PublicAuctionPlayer,
  formation: Formation,
  index: number,
  options: AuctionStateAdapterOptions,
): AuctionPlayer {
  const avatarSeed = player.seatId === options.humanSeatId
    ? options.humanAvatarSeed ?? 'avatar-1'
    : `avatar-${(index % 4) + 1}`;

  return {
    id: player.seatId,
    username: player.displayName,
    avatarSeed,
    budget: player.budget,
    team: {
      formation,
      slots: {
        GK: player.team.slots.GK.map((footballer, slotIndex) =>
          toClientFootballer(footballer, `slot-${player.seatId}-gk-${slotIndex}`),
        ),
        DEF: player.team.slots.DEF.map((footballer, slotIndex) =>
          toClientFootballer(footballer, `slot-${player.seatId}-def-${slotIndex}`),
        ),
        MID: player.team.slots.MID.map((footballer, slotIndex) =>
          toClientFootballer(footballer, `slot-${player.seatId}-mid-${slotIndex}`),
        ),
        FWD: player.team.slots.FWD.map((footballer, slotIndex) =>
          toClientFootballer(footballer, `slot-${player.seatId}-fwd-${slotIndex}`),
        ),
      },
    },
    isBot: player.isBot,
    isEliminated: player.isEliminated,
  };
}

function toClientRound(round: PublicAuctionRoundState): AuctionRound {
  return {
    positionGroup: round.positionGroup,
    footballer: toClientFootballer(round.footballer, round.roundId, round),
    clues: getRoundClues(round),
    clueRevealIndex: round.clueRevealIndex,
    bids: round.bids.map((bid) => ({
      playerId: bid.seatId,
      amount: bid.amount,
    })),
    highestBidderId: round.highestBidderSeatId,
    highestBid: round.highestBid,
    startingPrice: round.startingPrice,
    winnerId: round.winnerSeatId,
    winningBid: round.winningBid,
    revealed: round.revealed,
    countdownEndsAt: null,
    turnOrder: [...round.turnOrder],
    currentTurnId: round.currentTurnSeatId,
    foldedIds: [...round.foldedSeatIds],
    turnEndsAt: round.turnEndsAt ? Date.parse(round.turnEndsAt) : null,
  };
}

function toClientFootballer(
  footballer: PublicAuctionFootballer,
  fallbackId: string,
  round?: PublicAuctionRoundState,
): Footballer {
  return {
    id: footballer.id ?? footballer.clueCardId ?? fallbackId,
    name: footballer.name ?? 'Mystery Player',
    positionGroup: footballer.positionGroup,
    value: footballer.trueValue ?? 0,
    startingPrice: footballer.startingPrice,
    clues: round ? getRoundClues(round) : [...(footballer.clues ?? [])],
    nationality: footballer.nationality ?? '',
    imageUrl: footballer.imageUrl ?? undefined,
  };
}

function toClientSoloPickOption(
  option: PublicAuctionSoloPickOptionState,
  fallbackId: string,
): SoloPickOption {
  const footballer = toClientFootballer(option.footballer, fallbackId);
  return {
    type: option.type,
    footballer,
    clues: option.clues ? [...option.clues] : footballer.clues,
  };
}

function getRoundClues(round: PublicAuctionRoundState): string[] {
  const visibleClues = round.footballer.clues?.length
    ? [...round.footballer.clues]
    : [...round.revealedClues];

  if (round.revealed) return visibleClues;

  const clueCount = Math.max(DEFAULT_AUCTION_CLUE_COUNT, visibleClues.length);
  return [
    ...visibleClues,
    ...Array.from({ length: clueCount - visibleClues.length }, () => ''),
  ];
}

function getTotalRounds(formation: Formation, playerCount: number): number {
  const squadSize = POSITION_GROUPS.reduce((sum, positionGroup) => (
    sum + formation.required[positionGroup]
  ), 0);
  return squadSize * playerCount;
}

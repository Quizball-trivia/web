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
import type { AvatarCustomization } from '@/types/game';
import { randomBotAvatar } from '../data/botAvatars';
import { SOLO_PICK_MS } from '../data';

const POSITION_GROUPS = ['GK', 'DEF', 'MID', 'FWD'] as const satisfies readonly PositionGroup[];
const DEFAULT_AUCTION_CLUE_COUNT = 3;
const SNAPSHOT_CLUE_COUNT = 5;

export interface AuctionStateAdapterOptions {
  humanSeatId?: string | null;
  humanAvatarSeed?: string;
  /** The real logged-in user's layered avatar — used for the human seat. */
  humanAvatarCustomization?: AvatarCustomization | null;
  serverTimeOffsetMs?: number | null;
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
  // A reconnect/full-state response can arrive after the backend has already
  // moved the revealed lot into completedRounds. Keep that last revealed lot
  // mounted while the client is still in the reveal phase; otherwise the
  // reveal screen receives `null` and desktop renders an empty black frame.
  const activeRound = publicState.currentRound
    ?? (publicState.phase === 'reveal' ? publicState.completedRounds.at(-1) ?? null : null);
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
    currentRound: activeRound
      ? toClientRound(activeRound, options)
      : null,
    roundIndex: activeRound?.roundIndex ?? publicState.completedRounds.length,
    totalRounds: getTotalRounds(formation, publicState.seats.length),
    completedRounds: publicState.completedRounds.map((round) => toClientRound(round, options)),
    soloPick: publicState.soloPick
      ? {
          playerId: publicState.soloPick.playerSeatId,
          positionGroup: publicState.soloPick.positionGroup,
          optionA: toClientSoloPickOption(publicState.soloPick.optionA, 'solo-a'),
          optionB: toClientSoloPickOption(publicState.soloPick.optionB, 'solo-b'),
          selectedOption: publicState.soloPick.selectedOption,
          // Server auto-resolves the pick SOLO_PICK_MS after startedAt; the
          // derived deadline drives the countdown every seat can watch. The
          // past is NOT clamped to now (rejoining 6s into a pick must show the
          // remaining 4s, not a fresh 10s) and the server clock is converted
          // to this client's clock.
          endsAt: (() => {
            const startedMs = Date.parse(publicState.soloPick.startedAt);
            if (!Number.isFinite(startedMs)) return null;
            return startedMs - (options.serverTimeOffsetMs ?? 0) + SOLO_PICK_MS;
          })(),
        }
      : null,
    rankings: publicState.rankings
      ? [...publicState.rankings]
          .sort((a, b) => a.rank - b.rank)
          .map((entry) => entry.seatId)
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
    required: { GK: 1, DEF: 2, MID: 2, FWD: 2 },
    rows: [
      { pos: 'FWD', count: 2 },
      { pos: 'MID', count: 2 },
      { pos: 'DEF', count: 2 },
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
  const isHuman = player.seatId === options.humanSeatId;
  const avatarSeed = isHuman
    ? options.humanAvatarSeed ?? 'avatar-1'
    : `avatar-${(index % 4) + 1}`;

  // Every real seat prefers the server snapshot so all clients render the same
  // saved outfit. The local auth copy is only a rolling-deploy fallback for the
  // current user when an older server does not include avatarCustomization.
  // Bot / no data → a deterministic random avatar keyed by seatId.
  const avatarCustomization: AvatarCustomization = isHuman
    ? player.avatarCustomization ?? options.humanAvatarCustomization ?? { base: avatarSeed }
    : player.avatarCustomization ?? randomBotAvatar(player.seatId);

  return {
    id: player.seatId,
    username: player.displayName,
    avatarSeed,
    avatarCustomization,
    tier: player.tier ?? null,
    rp: player.rp ?? null,
    budget: player.budget,
    startingBudget: player.startingBudget ?? null,
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
    // Live payloads no longer carry isBot (bot concealment) — every live seat
    // renders as a human. The client `isBot` only drives MOCK-mode automation.
    isBot: player.isBot ?? false,
    isEliminated: player.isEliminated,
    forfeited: player.forfeited ?? false,
  };
}

function toClientRound(round: PublicAuctionRoundState, options: AuctionStateAdapterOptions): AuctionRound {
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
    turnEndsAt: toClientTurnEndsAt(round.turnEndsAt, options.serverTimeOffsetMs),
    biddingStartsAt: toClientTurnEndsAt(round.biddingStartsAt ?? null, options.serverTimeOffsetMs),
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
    club: footballer.currentClub ?? null,
    league: footballer.league ?? null,
    imageUrl: footballer.imageUrl ?? undefined,
    snapshots: footballer.snapshots?.map((snapshot) => ({
      ...snapshot,
      age: snapshot.age ?? null,
    })),
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

  // Snapshot lots reveal five stat facets; the padded length drives the
  // facet-unlock cadence, so it must match the full step count up front.
  const expectedCount = round.footballer.snapshots?.length
    ? SNAPSHOT_CLUE_COUNT
    : DEFAULT_AUCTION_CLUE_COUNT;
  const clueCount = Math.max(expectedCount, visibleClues.length);
  return [
    ...visibleClues,
    ...Array.from({ length: clueCount - visibleClues.length }, () => ''),
  ];
}

function toClientTurnEndsAt(turnEndsAt: string | null, serverTimeOffsetMs: number | null | undefined): number | null {
  if (!turnEndsAt) return null;
  const parsed = Date.parse(turnEndsAt);
  if (!Number.isFinite(parsed)) return null;
  // Convert the server-epoch instant onto THIS client's clock: consumers
  // subtract raw Date.now(), so returning the server-clock value made every
  // countdown drift by the device's skew (a phone 30s slow saw each turn run
  // ~30s long). Clamped so a just-started turn never renders negative.
  const offset = serverTimeOffsetMs ?? 0;
  return Math.max(Date.now(), parsed - offset);
}

function getTotalRounds(formation: Formation, playerCount: number): number {
  const squadSize = POSITION_GROUPS.reduce((sum, positionGroup) => (
    sum + formation.required[positionGroup]
  ), 0);
  return squadSize * playerCount;
}

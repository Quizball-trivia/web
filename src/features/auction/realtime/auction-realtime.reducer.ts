import type {
  AuctionBiddingStartedPayload,
  AuctionBidAcceptedPayload,
  AuctionClueRevealedPayload,
  AuctionFoldAcceptedPayload,
  AuctionMatchFinishedPayload,
  AuctionMatchStartedPayload,
  AuctionRoundRevealedPayload,
  AuctionRoundStartedPayload,
  AuctionSoloPickSelectedPayload,
  AuctionSoloPickStartedPayload,
  AuctionSquadUpdatedPayload,
  AuctionStatePayload,
  AuctionTurnStartedPayload,
  AuctionTurnTimeoutPayload,
  PublicAuctionMatchState,
  PublicAuctionPlayer,
  PublicAuctionRoundState,
} from '@/lib/realtime/socket.types';

export interface AuctionRealtimeState {
  publicState: PublicAuctionMatchState | null;
  versionGapDetected: boolean;
}

export type AuctionRealtimeEvent =
  | { type: 'match_started'; payload: AuctionMatchStartedPayload }
  | { type: 'state'; payload: AuctionStatePayload }
  | { type: 'round_started'; payload: AuctionRoundStartedPayload }
  | { type: 'clue_revealed'; payload: AuctionClueRevealedPayload }
  | { type: 'bidding_started'; payload: AuctionBiddingStartedPayload }
  | { type: 'turn_started'; payload: AuctionTurnStartedPayload }
  | { type: 'bid_accepted'; payload: AuctionBidAcceptedPayload }
  | { type: 'fold_accepted'; payload: AuctionFoldAcceptedPayload }
  | { type: 'turn_timeout'; payload: AuctionTurnTimeoutPayload }
  | { type: 'round_revealed'; payload: AuctionRoundRevealedPayload }
  | { type: 'squad_updated'; payload: AuctionSquadUpdatedPayload }
  | { type: 'solo_pick_started'; payload: AuctionSoloPickStartedPayload }
  | { type: 'solo_pick_selected'; payload: AuctionSoloPickSelectedPayload }
  | { type: 'match_finished'; payload: AuctionMatchFinishedPayload };

export const EMPTY_AUCTION_REALTIME_STATE: AuctionRealtimeState = {
  publicState: null,
  versionGapDetected: false,
};

export function applyAuctionRealtimeEvent(
  current: AuctionRealtimeState,
  event: AuctionRealtimeEvent,
): AuctionRealtimeState {
  if (event.type === 'match_started') {
    return withFullState(current, event.payload.state);
  }

  if (event.type === 'state') {
    return withFullState(current, event.payload.state);
  }

  if (event.type === 'match_finished') {
    return withFullState(current, {
      ...event.payload.state,
      rankings: event.payload.rankings,
      version: event.payload.stateVersion,
    });
  }

  if (!current.publicState) return current;

  const stateVersion = getEventStateVersion(event);
  if (stateVersion < current.publicState.version) return current;

  const nextVersionGapDetected =
    current.versionGapDetected || stateVersion > current.publicState.version + 1;

  switch (event.type) {
    case 'round_started':
      return withPatchedState(current, {
        ...appendCurrentRoundIfRevealed(current.publicState),
        version: stateVersion,
        phase: 'clue_reveal',
        currentRound: event.payload.round,
        soloPick: null,
      }, nextVersionGapDetected);

    case 'clue_revealed':
      return withPatchedRound(current, event.payload.round, 'clue_reveal', stateVersion, nextVersionGapDetected);

    case 'bidding_started':
    case 'turn_started':
    case 'bid_accepted':
    case 'fold_accepted':
    case 'turn_timeout':
      return withPatchedRound(current, event.payload.round, 'bidding', stateVersion, nextVersionGapDetected);

    case 'round_revealed':
      return withPatchedRound(current, event.payload.round, 'reveal', stateVersion, nextVersionGapDetected);

    case 'squad_updated':
      return withPatchedState(current, {
        ...current.publicState,
        version: stateVersion,
        seats: replaceSeat(current.publicState.seats, event.payload.player),
      }, nextVersionGapDetected);

    case 'solo_pick_started':
      return withPatchedState(current, {
        ...appendCurrentRoundIfRevealed(current.publicState),
        version: stateVersion,
        phase: 'solo_pick',
        currentRound: null,
        soloPick: event.payload.soloPick,
      }, nextVersionGapDetected);

    case 'solo_pick_selected':
      return withPatchedState(current, {
        ...current.publicState,
        version: stateVersion,
        phase: current.publicState.phase === 'solo_pick' ? 'created' : current.publicState.phase,
        seats: replaceSeat(current.publicState.seats, event.payload.player),
        soloPick: current.publicState.soloPick
          ? {
              ...current.publicState.soloPick,
              selectedOption: event.payload.option,
            }
          : current.publicState.soloPick,
      }, nextVersionGapDetected);
  }
}

function withFullState(
  current: AuctionRealtimeState,
  publicState: PublicAuctionMatchState,
): AuctionRealtimeState {
  if (current.publicState && publicState.version < current.publicState.version) {
    return current;
  }
  return {
    publicState,
    versionGapDetected: false,
  };
}

function withPatchedRound(
  current: AuctionRealtimeState,
  round: PublicAuctionRoundState,
  phase: PublicAuctionMatchState['phase'],
  version: number,
  versionGapDetected: boolean,
): AuctionRealtimeState {
  if (!current.publicState) return current;
  return withPatchedState(current, {
    ...current.publicState,
    version,
    phase,
    currentRound: round,
  }, versionGapDetected);
}

function withPatchedState(
  current: AuctionRealtimeState,
  publicState: PublicAuctionMatchState,
  versionGapDetected: boolean,
): AuctionRealtimeState {
  return {
    publicState,
    versionGapDetected,
  };
}

function appendCurrentRoundIfRevealed(
  publicState: PublicAuctionMatchState,
): PublicAuctionMatchState {
  const round = publicState.currentRound;
  if (!round?.revealed) return publicState;
  if (publicState.completedRounds.some((completed) => completed.roundId === round.roundId)) {
    return publicState;
  }
  return {
    ...publicState,
    completedRounds: [...publicState.completedRounds, round],
  };
}

function replaceSeat(
  seats: PublicAuctionPlayer[],
  nextSeat: PublicAuctionPlayer,
): PublicAuctionPlayer[] {
  return seats.map((seat) => (seat.seatId === nextSeat.seatId ? nextSeat : seat));
}

function getEventStateVersion(event: Exclude<AuctionRealtimeEvent, { type: 'match_started' | 'state' | 'match_finished' }>): number {
  return event.payload.stateVersion;
}

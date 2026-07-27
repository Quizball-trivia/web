import { create } from 'zustand';
import { logger } from '@/utils/logger';
import type {
  AuctionRejoinAvailablePayload,
  AuctionStatePayload,
  PublicAuctionMatchState,
} from '@/lib/realtime/socket.types';

/**
 * Out-of-match descriptor for a live auction the user is still seated in.
 *
 * The auction realtime layer (`useRealtimeAuctionMatch`) only mounts on the
 * `/auction` route, so nothing captures the server's connect-time handshake
 * (`auction:state` / `auction:rejoin_available`) once the user navigates away or
 * reloads onto home. This tiny store is populated by the app-wide socket
 * handlers and read by AppShell to render the "you're still in an auction —
 * rejoin" banner, giving auction the same out-of-match affordance as ranked.
 *
 * Kept separate from `useRealtimeMatchStore` on purpose: that store is
 * possession-shaped (single opponent, finalResults, remainingReconnects) and
 * doesn't map onto auction's multi-seat model.
 */

export interface AuctionActiveMatch {
  matchId: string;
  /** Best-effort opponent label for the banner ("Match still active against …"). */
  opponentName: string | null;
  /** `active` = auto-attachable state snapshot; `rejoin` = server prompted opt-in. */
  source: 'active' | 'rejoin';
}

interface AuctionActiveMatchState {
  activeAuctionMatch: AuctionActiveMatch | null;
  /**
   * Populate from an `auction:state` snapshot. A finished match clears instead
   * of showing a stale banner (covers "match ended while the user was away").
   */
  setFromState: (payload: AuctionStatePayload, selfUserId: string | null) => void;
  /** Populate from the server's `auction:rejoin_available` opt-in prompt. */
  setFromRejoinAvailable: (payload: AuctionRejoinAvailablePayload) => void;
  clear: () => void;
}

/** First human opponent seat (not this user, not a bot), for the banner label. */
function deriveOpponentName(
  state: PublicAuctionMatchState,
  selfUserId: string | null,
): string | null {
  const opponent = state.seats.find(
    (seat) => !seat.isBot && seat.userId && seat.userId !== selfUserId,
  );
  return opponent?.displayName ?? null;
}

export const useAuctionActiveMatchStore = create<AuctionActiveMatchState>((set) => ({
  activeAuctionMatch: null,
  setFromState: (payload, selfUserId) => {
    if (payload.state.phase === 'finished') {
      logger.info('Auction active-match store cleared (finished snapshot)', {
        matchId: payload.matchId,
      });
      set({ activeAuctionMatch: null });
      return;
    }
    set({
      activeAuctionMatch: {
        matchId: payload.matchId,
        opponentName: deriveOpponentName(payload.state, selfUserId),
        source: 'active',
      },
    });
  },
  setFromRejoinAvailable: (payload) => {
    set({
      activeAuctionMatch: {
        matchId: payload.matchId,
        opponentName: null,
        source: 'rejoin',
      },
    });
  },
  clear: () => {
    set({ activeAuctionMatch: null });
  },
}));

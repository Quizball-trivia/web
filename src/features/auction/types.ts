import type { AvatarCustomization } from '@/types/game';

export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface Footballer {
  id: string;
  name: string;
  positionGroup: PositionGroup;
  value: number;
  startingPrice: number;
  clues: string[];
  nationality: string;
  imageUrl?: string;
}

export interface AuctionPlayer {
  id: string;
  username: string;
  avatarSeed: string;
  /**
   * Layered avatar to render (real for the human, random for bots). Preferred
   * over avatarSeed by the avatar components; avatarSeed is the fallback when
   * absent (mock flow / tests). The live adapter always populates it.
   */
  avatarCustomization?: AvatarCustomization;
  budget: number;
  team: AuctionTeam;
  isBot: boolean;
  isEliminated: boolean;
  /** Quit / disconnect-forfeited out (ranks below everyone; no coins). */
  forfeited?: boolean;
  /**
   * Real profile details, shown on the showdown card when present. The auction
   * seat payload does not carry them yet, so they stay undefined and their
   * chips simply don't render — never substitute placeholders here, it shows
   * opponents a nationality and club they never picked.
   */
  country?: string | null;
  favoriteClub?: string | null;
}

export interface AuctionTeam {
  formation: Formation;
  slots: Record<PositionGroup, Footballer[]>;
}

export interface Formation {
  name: string;
  required: Record<PositionGroup, number>;
  /** Display-only pitch rows, top (FWD) → bottom (GK). Lets a position group
   *  span multiple visual bands (e.g. 4-2-3-1 has two MID rows: 2 then 3) while
   *  `required` keeps the single per-group totals the game logic relies on. */
  rows: { pos: PositionGroup; count: number }[];
}

export type AuctionPhase =
  | 'lobby'
  | 'matchmaking'
  | 'showdown'
  | 'formation'
  | 'clue-reveal'
  | 'bidding'
  | 'reveal'
  | 'solo-pick'
  | 'results';

export interface AuctionBid {
  playerId: string;
  amount: number;
}

export interface AuctionRound {
  positionGroup: PositionGroup;
  footballer: Footballer;
  clues: string[];
  // How many clues have been revealed: 0 = none, 1 = clue 1, 2 = clues 1+2, 3 = all.
  // Bidding can only start once this reaches clues.length.
  clueRevealIndex: number;
  bids: AuctionBid[];
  highestBidderId: string | null;
  highestBid: number;
  startingPrice: number;
  winnerId: string | null;
  winningBid: number;
  revealed: boolean;
  countdownEndsAt: number | null;
  // ── Turn-based bidding ──────────────────────────────────────────────
  /** Players (ids) eligible to bid this round, in turn order. */
  turnOrder: string[];
  /** Whose turn it is right now (null once the round is decided). */
  currentTurnId: string | null;
  /** Players who have folded out of this player's auction. */
  foldedIds: string[];
  /** When the current turn's timer expires (auto-fold). */
  turnEndsAt: number | null;
  /**
   * When the post-clue study window ends and the first turn opens. Set only
   * while all clues are on screen and nobody can bid yet; null otherwise.
   */
  biddingStartsAt: number | null;
}

export interface SoloPickOption {
  type: 'revealed' | 'mystery';
  footballer: Footballer;
  clues?: string[];
}

export interface AuctionGameState {
  phase: AuctionPhase;
  players: AuctionPlayer[];
  formation: Formation;
  currentRound: AuctionRound | null;
  roundIndex: number;
  totalRounds: number;
  completedRounds: AuctionRound[];
  soloPick: {
    playerId: string;
    positionGroup: PositionGroup;
    optionA: SoloPickOption;
    optionB: SoloPickOption;
  } | null;
  /**
   * Final placings as decided by the server, best first (player ids). Coins are
   * paid out against this order, so the results screen must render it rather
   * than re-sorting locally — a local tiebreak can disagree and show two
   * players different 2nd/3rd. Absent in mock mode.
   */
  rankings?: string[] | null;
}

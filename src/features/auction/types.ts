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
  budget: number;
  team: AuctionTeam;
  isBot: boolean;
  isEliminated: boolean;
}

export interface AuctionTeam {
  formation: Formation;
  slots: Record<PositionGroup, Footballer[]>;
}

export interface Formation {
  name: string;
  required: Record<PositionGroup, number>;
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
}

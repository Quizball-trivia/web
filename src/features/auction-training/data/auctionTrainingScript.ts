import type { PositionGroup } from '@/features/auction/types';

/** Seat ids are fixed so the script can name who bids when. */
export const AUCTION_TRAINING_HUMAN_ID = 'training-human';
export const AUCTION_TRAINING_BOT_A_ID = 'training-bot-a';
export const AUCTION_TRAINING_BOT_B_ID = 'training-bot-b';

/** Named moments the screen turns into tooltips (queued, in this order per lot). */
export type AuctionTrainingBeat =
  | 'matchmaking'
  | 'showdown'
  | 'formation'
  | 'clues'
  | 'starting-price'
  | 'your-turn'
  | 'won'
  | 'rival-opens'
  | 'raise'
  | 'outbid'
  | 'fold'
  | 'overpaid'
  | 'sit-out'
  | 'raise-to-win'
  | 'chemistry'
  | 'last-slot'
  | 'squad-complete'
  | 'results';

export type AuctionTrainingEvent =
  | { kind: 'bot-bid'; seat: string; amount: number; beat?: AuctionTrainingBeat }
  | { kind: 'bot-fold'; seat: string; beat?: AuctionTrainingBeat }
  /** The human's guided turn: only this control is enabled; the quick button's amount (the minimum bid) is accepted. */
  | { kind: 'human'; action: 'bid' | 'fold'; beat: AuctionTrainingBeat };

export interface AuctionTrainingLot {
  positionGroup: PositionGroup;
  /** Seats that can bid this lot, in turn order (a rival whose slot is filled sits out). */
  turnOrder: string[];
  events: AuctionTrainingEvent[];
  /** Fired once two clue pairs are visible / when the study window opens / once the reveal is readable. */
  beats: { clues?: AuctionTrainingBeat[]; study?: AuctionTrainingBeat; reveal: AuctionTrainingBeat };
}

const H = AUCTION_TRAINING_HUMAN_ID;
const A = AUCTION_TRAINING_BOT_A_ID;
const B = AUCTION_TRAINING_BOT_B_ID;

/**
 * Four lots, one per fixture index (see auctionTrainingFixtures):
 *  1. FWD — the player opens at the starting price, rivals pass → first signing, profit explained.
 *  2. MID — rivals open and raise; one guided raise, then a guided fold; the rival overpays.
 *  3. MID — a rival opens, one guided raise wins; same club as lot 1 → chemistry link.
 *  4. GK  — the player opens, rivals pass → squad complete (3/3).
 */
export const AUCTION_TRAINING_LOTS: AuctionTrainingLot[] = [
  {
    positionGroup: 'FWD',
    turnOrder: [H, A, B],
    events: [
      { kind: 'human', action: 'bid', beat: 'your-turn' },
      { kind: 'bot-fold', seat: A },
      { kind: 'bot-fold', seat: B },
    ],
    beats: { clues: ['clues', 'starting-price'], reveal: 'won' },
  },
  {
    positionGroup: 'MID',
    turnOrder: [A, B, H],
    events: [
      { kind: 'bot-bid', seat: A, amount: 75_000_000, beat: 'rival-opens' },
      { kind: 'bot-bid', seat: B, amount: 85_000_000 },
      { kind: 'human', action: 'bid', beat: 'raise' },
      { kind: 'bot-bid', seat: A, amount: 105_000_000, beat: 'outbid' },
      { kind: 'bot-fold', seat: B },
      { kind: 'human', action: 'fold', beat: 'fold' },
    ],
    beats: { reveal: 'overpaid' },
  },
  {
    positionGroup: 'MID',
    turnOrder: [B, H],
    events: [
      { kind: 'bot-bid', seat: B, amount: 12_000_000 },
      { kind: 'human', action: 'bid', beat: 'raise-to-win' },
      { kind: 'bot-fold', seat: B },
    ],
    beats: { study: 'sit-out', reveal: 'chemistry' },
  },
  {
    positionGroup: 'GK',
    turnOrder: [H, A, B],
    events: [
      { kind: 'human', action: 'bid', beat: 'last-slot' },
      { kind: 'bot-fold', seat: A },
      { kind: 'bot-fold', seat: B },
    ],
    beats: { reveal: 'squad-complete' },
  },
];

/** Shorter than the live 10 s study window — the tooltip already paces the beat. */
export const AUCTION_TRAINING_STUDY_MS = 6_000;
export const AUCTION_TRAINING_BOT_THINK_MS = 1_800;
/** RevealScreen has the whole card on screen at 1.6 s after its 0.3 s crossfade; explain once it has settled. */
export const AUCTION_TRAINING_REVEAL_BEAT_MS = 2_600;
export const AUCTION_TRAINING_RESULTS_BEAT_MS = 1_500;
export const AUCTION_TRAINING_SEARCH_MS = 2_500;

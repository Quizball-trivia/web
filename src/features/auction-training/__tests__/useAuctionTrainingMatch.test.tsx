import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUND_INTRO_MS } from '@/features/auction/components/screens/AuctionRoundIntro';
import { CLUE_REVEAL_INTERVAL_MS, OPENING_TURN_MS, STARTING_BUDGET, computeSquadChemistry, getAdjustedProfit, getMinBid, getSquadProfit } from '@/features/auction/data';
import { useAuctionTrainingMatch } from '../hooks/useAuctionTrainingMatch';
import {
  AUCTION_TRAINING_BOT_A_ID,
  AUCTION_TRAINING_BOT_B_ID,
  AUCTION_TRAINING_BOT_THINK_MS,
  AUCTION_TRAINING_HUMAN_ID,
  AUCTION_TRAINING_RESULTS_BEAT_MS,
  AUCTION_TRAINING_REVEAL_BEAT_MS,
  AUCTION_TRAINING_STUDY_MS,
} from '../data/auctionTrainingScript';

const M = 1_000_000;

describe('useAuctionTrainingMatch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function mount() {
    const onBeat = vi.fn();
    const rendered = renderHook(
      ({ paused }: { paused: boolean }) =>
        useAuctionTrainingMatch({ isPaused: paused, locale: 'en', human: { username: 'You', avatarSeed: 'avatar-1' }, onBeat }),
      { initialProps: { paused: false } },
    );
    const tick = async (ms: number) => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });
    };
    const cur = () => rendered.result.current;
    const setPaused = (paused: boolean) => rendered.rerender({ paused });
    /** intro + 3 clue pairs + last clue + study window → bidding opens */
    const driveLotToBidding = async () => {
      expect(cur().state.phase).toBe('clue-reveal');
      await tick(ROUND_INTRO_MS + 400);
      expect(cur().state.currentRound?.clueRevealIndex).toBe(2);
      await tick(CLUE_REVEAL_INTERVAL_MS * 3);
      expect(cur().state.currentRound?.clueRevealIndex).toBe(7);
      expect(cur().state.currentRound?.biddingStartsAt).not.toBeNull();
      await tick(AUCTION_TRAINING_STUDY_MS);
      expect(cur().state.phase).toBe('bidding');
    };
    const bidMin = () => act(() => cur().actions.placeBid(getMinBid(cur().state.currentRound!)));
    const reveal = async () => {
      expect(cur().state.phase).toBe('reveal');
      await tick(AUCTION_TRAINING_REVEAL_BEAT_MS);
      act(() => cur().actions.confirmReveal());
    };
    act(() => cur().actions.startGame());
    return { rendered, tick, cur, setPaused, driveLotToBidding, bidMin, reveal, onBeat };
  }

  it('plays the whole script: four lots, guided gating, budgets, chemistry and placings', async () => {
    const { cur, tick, driveLotToBidding, bidMin, reveal, onBeat } = mount();
    expect(cur().state.phase).toBe('matchmaking');
    expect(cur().state.players.map((p) => p.id)).toEqual([AUCTION_TRAINING_HUMAN_ID, AUCTION_TRAINING_BOT_A_ID, AUCTION_TRAINING_BOT_B_ID]);
    act(() => cur().actions.setPhase('showdown'));
    act(() => cur().actions.setPhase('formation'));
    act(() => cur().actions.setPhase('bidding'));

    // Lot 1 — the human opens at the starting price, both rivals pass.
    await driveLotToBidding();
    expect(cur().state.currentRound?.currentTurnId).toBe(AUCTION_TRAINING_HUMAN_ID);
    expect(cur().allowedAction?.kind).toBe('bid');
    act(() => cur().actions.fold()); // not the guided control
    expect(cur().state.currentRound?.foldedIds).toEqual([]);
    act(() => cur().actions.placeBid(getMinBid(cur().state.currentRound!) + 10 * M)); // not the quick amount
    expect(cur().state.currentRound?.bids).toEqual([]);
    bidMin();
    expect(cur().state.currentRound?.highestBid).toBe(26 * M);
    expect(cur().allowedAction).toBeNull();
    act(() => cur().actions.placeBid(26 * M)); // duplicate after the step closed
    expect(cur().state.currentRound?.bids).toHaveLength(1);
    await tick(AUCTION_TRAINING_BOT_THINK_MS * 2);
    expect(cur().state.currentRound?.winnerId).toBe(AUCTION_TRAINING_HUMAN_ID);
    expect(cur().state.players[0].budget).toBe(STARTING_BUDGET - 26 * M);
    await reveal();

    // Lot 2 — rivals open and raise; one guided raise, then a guided fold; CoachBot overpays.
    await driveLotToBidding();
    expect(cur().state.currentRound?.currentTurnId).toBe(AUCTION_TRAINING_BOT_A_ID);
    await tick(AUCTION_TRAINING_BOT_THINK_MS * 2);
    expect(cur().state.currentRound?.highestBid).toBe(85 * M);
    expect(cur().allowedAction?.kind).toBe('bid');
    bidMin();
    expect(cur().state.currentRound?.highestBid).toBe(95 * M);
    await tick(AUCTION_TRAINING_BOT_THINK_MS * 2);
    expect(cur().state.currentRound?.highestBid).toBe(105 * M);
    expect(cur().state.currentRound?.foldedIds).toEqual([AUCTION_TRAINING_BOT_B_ID]);
    expect(cur().allowedAction?.kind).toBe('fold');
    act(() => cur().actions.placeBid(115 * M));
    expect(cur().state.currentRound?.highestBid).toBe(105 * M);
    act(() => cur().actions.fold());
    expect(cur().state.currentRound?.winnerId).toBe(AUCTION_TRAINING_BOT_A_ID);
    expect(cur().state.players[1].budget).toBe(STARTING_BUDGET - 105 * M);
    await reveal();

    // Lot 3 — CoachBot sits out (midfielder filled); the rival opens, one guided raise wins.
    await driveLotToBidding();
    expect(cur().state.currentRound?.turnOrder).toEqual([AUCTION_TRAINING_BOT_B_ID, AUCTION_TRAINING_HUMAN_ID]);
    await tick(AUCTION_TRAINING_BOT_THINK_MS);
    expect(cur().state.currentRound?.highestBid).toBe(12 * M);
    bidMin();
    await tick(AUCTION_TRAINING_BOT_THINK_MS);
    expect(cur().state.currentRound?.winnerId).toBe(AUCTION_TRAINING_HUMAN_ID);
    expect(cur().state.currentRound?.winningBid).toBe(22 * M);
    await reveal();

    // Lot 4 — the human opens for the keeper, rivals pass → 3/3.
    await driveLotToBidding();
    bidMin();
    await tick(AUCTION_TRAINING_BOT_THINK_MS * 2);
    expect(cur().state.currentRound?.winnerId).toBe(AUCTION_TRAINING_HUMAN_ID);
    await reveal();

    expect(cur().state.phase).toBe('results');
    const [human, coach, rival] = cur().state.players;
    expect(human.budget).toBe(STARTING_BUDGET - (26 + 22 + 8) * M);
    expect(getSquadProfit(human)).toBe((120 + 60 + 45 - 56) * M);
    expect(computeSquadChemistry(human.team).total).toBe(7);
    expect(getAdjustedProfit(human)).toBe(Math.round(169 * M * 1.7));
    expect(getAdjustedProfit(coach)).toBe(-80 * M);
    expect(getAdjustedProfit(rival)).toBe(0);
    expect(cur().state.rankings).toEqual([AUCTION_TRAINING_HUMAN_ID, AUCTION_TRAINING_BOT_B_ID, AUCTION_TRAINING_BOT_A_ID]);
    await tick(AUCTION_TRAINING_RESULTS_BEAT_MS);

    expect(onBeat.mock.calls.map((c) => c[0])).toEqual([
      'clues', 'starting-price', 'your-turn', 'won',
      'rival-opens', 'raise', 'outbid', 'fold', 'overpaid',
      'sit-out', 'raise-to-win', 'chemistry',
      'last-slot', 'squad-complete',
      'results',
    ]);
  });

  it('never expires the guided turn: the clock re-arms instead of folding', async () => {
    const { cur, tick, driveLotToBidding } = mount();
    act(() => cur().actions.setPhase('formation'));
    act(() => cur().actions.setPhase('bidding'));
    await driveLotToBidding();
    const firstDeadline = cur().state.currentRound!.turnEndsAt!;
    await tick(OPENING_TURN_MS + 50);
    expect(cur().state.phase).toBe('bidding');
    expect(cur().state.currentRound?.currentTurnId).toBe(AUCTION_TRAINING_HUMAN_ID);
    expect(cur().state.currentRound?.foldedIds).toEqual([]);
    expect(cur().state.currentRound!.turnEndsAt!).toBeGreaterThan(firstDeadline);
    expect(cur().allowedAction?.kind).toBe('bid');
  });

  it('pausing freezes the pending timer and shifts every deadline on resume', async () => {
    const { cur, tick, setPaused, driveLotToBidding, bidMin } = mount();
    act(() => cur().actions.setPhase('formation'));
    act(() => cur().actions.setPhase('bidding'));
    // Pause during the study window: bidding must not open, biddingStartsAt shifts.
    await tick(ROUND_INTRO_MS + 400 + CLUE_REVEAL_INTERVAL_MS * 3);
    const studyEnds = cur().state.currentRound!.biddingStartsAt!;
    act(() => setPaused(true));
    expect(cur().clockPausedAt).not.toBeNull();
    await tick(AUCTION_TRAINING_STUDY_MS + 2_000);
    expect(cur().state.phase).toBe('clue-reveal');
    act(() => setPaused(false));
    expect(cur().clockPausedAt).toBeNull();
    expect(cur().state.currentRound!.biddingStartsAt!).toBe(studyEnds + AUCTION_TRAINING_STUDY_MS + 2_000);
    await tick(AUCTION_TRAINING_STUDY_MS);
    expect(cur().state.phase).toBe('bidding');
    // Pause during the human's turn: the turn clock holds.
    const deadline = cur().state.currentRound!.turnEndsAt!;
    act(() => setPaused(true));
    await tick(5_000);
    expect(cur().state.currentRound!.turnEndsAt).toBe(deadline);
    act(() => setPaused(false));
    expect(cur().state.currentRound!.turnEndsAt).toBe(deadline + 5_000);
    bidMin();
    // Pause during a bot's think: the bot waits for the tooltip.
    act(() => setPaused(true));
    await tick(AUCTION_TRAINING_BOT_THINK_MS * 3);
    expect(cur().state.currentRound?.foldedIds).toEqual([]);
    act(() => setPaused(false));
    await tick(AUCTION_TRAINING_BOT_THINK_MS);
    expect(cur().state.currentRound?.foldedIds).toEqual([AUCTION_TRAINING_BOT_A_ID]);
  });

  it('restarts cleanly for a replay', async () => {
    const { cur, tick, driveLotToBidding, bidMin } = mount();
    act(() => cur().actions.setPhase('formation'));
    act(() => cur().actions.setPhase('bidding'));
    await driveLotToBidding();
    bidMin();
    act(() => cur().actions.startGame());
    expect(cur().state.phase).toBe('matchmaking');
    expect(cur().state.completedRounds).toEqual([]);
    expect(cur().state.players.every((p) => p.budget === STARTING_BUDGET)).toBe(true);
    expect(cur().allowedAction).toBeNull();
    await tick(AUCTION_TRAINING_BOT_THINK_MS * 2);
    expect(cur().state.phase).toBe('matchmaking');
  });
});

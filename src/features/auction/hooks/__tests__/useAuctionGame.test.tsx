import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuctionGame } from '../useAuctionGame';
import { OPENING_TURN_MS, RAISE_TURN_MS } from '../../data';

// Regression guard for the timer lifecycle: a REJECTED bid/fold must leave the
// running turn timer alive. Clearing timers before validation used to freeze
// the local game — no auto-advance ever fired again after a stray tap.
describe('useAuctionGame rejected actions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function driveToBidding() {
    const rendered = renderHook(() => useAuctionGame('Human', 'avatar-1'));
    act(() => {
      rendered.result.current.actions.startGame(3);
    });
    act(() => {
      rendered.result.current.actions.setPhase('bidding');
    });
    // Round intro + staggered clue reveals + study window → bidding opens.
    for (let i = 0; i < 40 && rendered.result.current.state.phase !== 'bidding'; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000);
      });
    }
    expect(rendered.result.current.state.phase).toBe('bidding');
    expect(rendered.result.current.state.currentRound?.currentTurnId).toBeTruthy();
    return rendered;
  }

  it('keeps the turn timer alive when a bid is rejected', async () => {
    const { result } = await driveToBidding();
    const roundBefore = result.current.state.currentRound!;
    const turnBefore = roundBefore.currentTurnId;
    const bidsBefore = roundBefore.bids.length;

    // 1 is always below the minimum bid, and it's also rejected outright on a
    // bot's turn — either way this action must not touch the timers.
    act(() => {
      result.current.actions.placeBid(1);
    });
    expect(result.current.state.currentRound?.currentTurnId).toBe(turnBefore);
    expect(result.current.state.currentRound?.bids.length).toBe(bidsBefore);

    // The still-armed turn/bot timer must advance the round on its own.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(OPENING_TURN_MS + RAISE_TURN_MS + 10_000);
    });
    const after = result.current.state;
    const progressed =
      after.phase !== 'bidding' ||
      after.currentRound?.currentTurnId !== turnBefore ||
      (after.currentRound?.bids.length ?? 0) > bidsBefore ||
      (after.currentRound?.foldedIds.length ?? 0) > 0;
    expect(progressed).toBe(true);
  });

  it('accepts an opening pass on the human turn and keeps the match moving', async () => {
    const { result } = await driveToBidding();
    const roundBefore = result.current.state.currentRound!;
    const turnBefore = roundBefore.currentTurnId;

    // The opener may PASS now (the forced-open rule is gone). On the human's
    // turn the fold must be accepted and move the round along; on a bot's
    // turn the human's fold stays a pure no-op.
    act(() => {
      result.current.actions.fold();
    });
    const mid = result.current.state;
    if (turnBefore === 'human-player') {
      const acted =
        mid.phase !== 'bidding' ||
        (mid.currentRound?.foldedIds ?? []).includes('human-player') ||
        mid.currentRound?.currentTurnId !== turnBefore;
      expect(acted).toBe(true);
    } else {
      expect(mid.currentRound?.currentTurnId).toBe(turnBefore);
    }

    await act(async () => {
      await vi.advanceTimersByTimeAsync(OPENING_TURN_MS + RAISE_TURN_MS + 10_000);
    });
    const after = result.current.state;
    const progressed =
      after.phase !== 'bidding' ||
      after.currentRound?.currentTurnId !== turnBefore ||
      (after.currentRound?.bids.length ?? 0) > 0 ||
      (after.currentRound?.foldedIds.length ?? 0) > 0;
    expect(progressed).toBe(true);
  });
});

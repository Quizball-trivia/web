import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';
import { useTrainingCompletion } from '../useTrainingCompletion';

describe('useTrainingCompletion', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: { id: 'user-1' } as never });
  });

  it('keeps the ranked and auction flags apart, per user', () => {
    const ranked = renderHook(() => useTrainingCompletion());
    const auction = renderHook(() => useTrainingCompletion('auction'));
    const grid = renderHook(() => useTrainingCompletion('grid'));
    act(() => auction.result.current.markComplete());
    expect(auction.result.current.isComplete()).toBe(true);
    expect(ranked.result.current.isComplete()).toBe(false);
    expect(grid.result.current.isComplete()).toBe(false);
    act(() => useAuthStore.setState({ user: { id: 'user-2' } as never }));
    auction.rerender();
    expect(auction.result.current.isComplete()).toBe(false);
  });

  it('keeps guest completion away from members, and reset clears both games', () => {
    useAuthStore.setState({ user: null as never });
    const auction = renderHook(() => useTrainingCompletion('auction'));
    const ranked = renderHook(() => useTrainingCompletion('ranked'));
    act(() => {
      auction.result.current.markComplete();
      ranked.result.current.markComplete();
    });
    expect(auction.result.current.isComplete()).toBe(true);
    expect(ranked.result.current.isComplete()).toBe(true);
    // A member signing in on this browser still gets the offer.
    act(() => useAuthStore.setState({ user: { id: 'user-9' } as never }));
    auction.rerender();
    expect(auction.result.current.isComplete()).toBe(false);
    act(() => auction.result.current.markComplete());
    // ...and the guest slot survives the member's completion.
    act(() => useAuthStore.setState({ user: null as never }));
    auction.rerender();
    expect(auction.result.current.isComplete()).toBe(true);
    act(() => auction.result.current.resetTraining());
    expect(auction.result.current.isComplete()).toBe(false);
    expect(ranked.result.current.isComplete()).toBe(false);
  });

  it('treats the legacy boolean as complete for everyone', () => {
    localStorage.setItem('quizball_training_complete', JSON.stringify(true));
    const ranked = renderHook(() => useTrainingCompletion('ranked'));
    expect(ranked.result.current.isComplete()).toBe(true);
  });
});

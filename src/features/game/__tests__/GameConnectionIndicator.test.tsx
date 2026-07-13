import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDelayedDisconnectNotice } from '../GameConnectionIndicator';
import type { RealtimeConnectionPhase } from '@/lib/realtime/connection-health';

describe('useDelayedDisconnectNotice', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows only after a sustained disconnect and hides immediately on reconnect', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ phase }: { phase: RealtimeConnectionPhase }) => useDelayedDisconnectNotice(phase),
      { initialProps: { phase: 'connected' } },
    );

    rerender({ phase: 'disconnected' });
    act(() => vi.advanceTimersByTime(1_499));
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);

    rerender({ phase: 'connected' });
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(0));
    rerender({ phase: 'reconnecting' });
    act(() => vi.advanceTimersByTime(1_499));
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });

  it('cancels the pending notice when a connection blip recovers', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ phase }: { phase: RealtimeConnectionPhase }) => useDelayedDisconnectNotice(phase),
      { initialProps: { phase: 'reconnecting' } },
    );

    act(() => vi.advanceTimersByTime(1_000));
    rerender({ phase: 'connected' });
    act(() => vi.advanceTimersByTime(1_000));

    expect(result.current).toBe(false);
  });
});

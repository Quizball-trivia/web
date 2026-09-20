import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAuctionTrainingTooltips } from '../hooks/useAuctionTrainingTooltips';

describe('useAuctionTrainingTooltips', () => {
  it('queues beats behind the open tooltip, shows each once, and resets for a replay', () => {
    const { result } = renderHook(() => useAuctionTrainingTooltips());
    expect(result.current.isPaused).toBe(false);
    act(() => result.current.show('clues'));
    act(() => result.current.show('starting-price'));
    act(() => result.current.show('clues'));
    expect(result.current.active?.id).toBe('clues');
    expect(result.current.isPaused).toBe(true);
    act(() => result.current.dismiss());
    expect(result.current.active?.id).toBe('starting-price');
    act(() => result.current.dismiss());
    expect(result.current.active).toBeNull();
    act(() => result.current.show('clues'));
    expect(result.current.active).toBeNull();
    act(() => result.current.reset());
    act(() => result.current.show('clues'));
    expect(result.current.active?.id).toBe('clues');
  });
});

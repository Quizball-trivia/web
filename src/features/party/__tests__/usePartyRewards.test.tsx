import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({ api: vi.fn(), getMe: vi.fn(), patch: vi.fn(), memberId: 'member-a' as string | null }));
vi.mock('@/lib/api/client', () => ({ apiFetch: mocks.api }));
vi.mock('@/lib/api/endpoints', () => ({ getMe: mocks.getMe }));
vi.mock('@/stores/auth.store', () => ({ useAuthStore: Object.assign(
  (selector: (s: unknown) => unknown) => selector({ status: mocks.memberId ? 'authenticated' : 'anonymous', user: { id: mocks.memberId } }),
  { getState: () => ({ user: { id: mocks.memberId }, patchProgression: mocks.patch }) },
) }));
import { usePartyRewards } from '../usePartyRewards';

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
const tick = async (ms = 10) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); mocks.memberId = 'member-a';
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  mocks.getMe.mockResolvedValue({ id: 'member-a' });
});
afterEach(() => { cleanup(); client.clear(); vi.useRealTimers(); });

describe('usePartyRewards', () => {
  it('recovers a delayed save, displays only server amounts, and stops polling on completion', async () => {
    mocks.api.mockResolvedValueOnce({ matchId: 'match-a', status: 'pending', xpEarned: null })
      .mockResolvedValue({ matchId: 'match-a', status: 'complete', xpEarned: 37 });
    const { result } = renderHook(() => usePartyRewards('match-a', 'member-a', true), { wrapper });
    await tick();
    expect(result.current?.xpEarned).toBeNull();
    await tick(1_100);
    expect(result.current).toMatchObject({ status: 'complete', xpEarned: 37 });
    expect(mocks.api).toHaveBeenCalledTimes(2);
    await tick(60_000);
    expect(mocks.api).toHaveBeenCalledTimes(2);
  });
  it('does no work for guests or another game and cancels observation when the player leaves', async () => {
    mocks.api.mockResolvedValue({ matchId: 'match-a', status: 'pending', xpEarned: null });
    const { rerender, unmount } = renderHook(({ enabled }) => usePartyRewards('match-a', 'member-a', enabled), { wrapper, initialProps: { enabled: false } });
    await tick(); expect(mocks.api).not.toHaveBeenCalled();
    mocks.memberId = null; rerender({ enabled: true }); await tick(); expect(mocks.api).not.toHaveBeenCalled();
    mocks.memberId = 'member-a'; rerender({ enabled: true }); await tick(); expect(mocks.api).toHaveBeenCalledOnce();
    unmount(); await tick(60_000); expect(mocks.api).toHaveBeenCalledOnce();
  });
  it('keeps account caches separate and ignores a late response from a previous account', async () => {
    let resolve!: (v: unknown) => void;
    mocks.api.mockImplementationOnce(() => new Promise((r) => { resolve = r; }))
      .mockResolvedValue({ matchId: 'match-a', status: 'pending', xpEarned: null });
    const { result, rerender } = renderHook(({ userId }) => usePartyRewards('match-a', userId, true), { wrapper, initialProps: { userId: 'member-a' } });
    await tick();
    mocks.memberId = 'member-b'; rerender({ userId: 'member-b' }); await tick();
    resolve({ matchId: 'match-a', status: 'complete', xpEarned: 999 }); await tick();
    expect(result.current?.xpEarned).toBeNull();
    expect(mocks.patch).not.toHaveBeenCalled();
  });
  it('recovers a network error, but stops at a terminal failed job', async () => {
    mocks.api.mockRejectedValueOnce(Error('offline')).mockResolvedValue({ matchId: 'match-a', status: 'failed', xpEarned: null });
    const { result } = renderHook(() => usePartyRewards('match-a', 'member-a', true), { wrapper });
    await tick(); expect(result.current?.status).toBe('pending');
    await tick(1_100); expect(result.current?.status).toBe('failed');
    await tick(60_000); expect(mocks.api).toHaveBeenCalledTimes(2);
  });
});

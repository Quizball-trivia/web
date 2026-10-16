import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useMyAchievements, useUserAchievements } from '../users.queries';

const repos = vi.hoisted(() => ({
  getMyAchievements: vi.fn(), getUserAchievements: vi.fn(),
}));
vi.mock('@/lib/repositories/users.repo', () => ({ ...repos,
  getPublicProfile: vi.fn(), resolveNickname: vi.fn(),
}));

let client: QueryClient;
const validId = 'ed000000-0000-4000-8000-000000000001';
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  repos.getMyAchievements.mockResolvedValue({ achievements: [{ id: 'own' }] });
  repos.getUserAchievements.mockResolvedValue({ achievements: [{ id: 'public' }] });
  useAuthStore.setState({ status: 'authenticated' });
});
afterEach(() => { client.clear(); });

describe('achievement identity and auth guards', () => {
  it.each([undefined, '', '{userId}', 'undefined', 'nickname'])('cannot request an unresolved public identity, even on explicit refetch (%s)', async (userId) => {
    const { result } = renderHook(() => useUserAchievements(userId), { wrapper });
    await act(async () => { expect((await result.current.refetch()).data).toEqual([]); });
    expect(repos.getUserAchievements).not.toHaveBeenCalled();
  });

  it('keeps the own-profile query intact while a public nickname is resolving', async () => {
    const { result } = renderHook(() => ({ own: useMyAchievements(), pending: useUserAchievements() }), { wrapper });
    await waitFor(() => expect(result.current.own.data).toEqual([{ id: 'own' }]));
    await act(async () => { await client.refetchQueries({ type: 'active' }); });
    expect(repos.getUserAchievements).not.toHaveBeenCalled();
    expect(result.current.own.data).toEqual([{ id: 'own' }]);
    expect(client.getQueryCache().getAll()).toHaveLength(2);
  });

  it('loads the resolved public UUID without touching own-profile data', async () => {
    const { result, rerender } = renderHook(({ userId }) => useUserAchievements(userId), {
      initialProps: { userId: undefined as string | undefined }, wrapper,
    });
    rerender({ userId: validId });
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'public' }]));
    expect(repos.getUserAchievements).toHaveBeenCalledExactlyOnceWith(validId);
  });

  it.each(['loading', 'anonymous'] as const)('does not bypass %s auth through imperative refetch', async (status) => {
    useAuthStore.setState({ status });
    const { result } = renderHook(() => useUserAchievements(validId), { wrapper });
    await act(async () => { await result.current.refetch(); });
    expect(repos.getUserAchievements).not.toHaveBeenCalled();
  });

  it('does not replace member results when an anonymous refetch shares the public UUID', async () => {
    const { result } = renderHook(() => useUserAchievements(validId), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'public' }]));
    await act(async () => { useAuthStore.setState({ status: 'anonymous' }); });
    await act(async () => { expect((await result.current.refetch()).data).toEqual([]); });
    await act(async () => { useAuthStore.setState({ status: 'authenticated' }); });
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'public' }]));
    expect(repos.getUserAchievements).toHaveBeenCalledTimes(1);
  });
});

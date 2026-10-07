'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { ApiError } from '@/lib/api/api';
import type { paths } from '@/types/api.generated';
import { useAuthStore } from '@/stores/auth.store';
import { queryKeys } from '@/lib/queries/queryKeys';
import { getMe } from '@/lib/api/endpoints';
import { anySignal, timeoutSignal } from '@/lib/timeoutSignal';

export type PartyRewards = paths['/api/v1/stats/party-matches/{matchId}/rewards']['get']['responses']['200']['content']['application/json'];
export type PartyRewardsView = PartyRewards | { matchId: string; status: 'unavailable'; xpEarned: null };

/** Only mounted results are observed. The server owns payment, even after this hook unmounts. */
export function usePartyRewards(matchId: string | null, selfUserId: string, enabled: boolean): PartyRewardsView | null {
  const memberId = useAuthStore((state) => state.status === 'authenticated' ? state.user?.id : null);
  const active = enabled && Boolean(matchId) && memberId === selfUserId;
  const queryClient = useQueryClient();
  const refreshed = useRef<string | null>(null);
  const query = useQuery({
    queryKey: ['partyRewards', memberId, matchId],
    queryFn: ({ signal }) => apiFetch('get', '/api/v1/stats/party-matches/{matchId}/rewards', {
      params: { matchId: matchId! }, signal: anySignal([signal, timeoutSignal(8_000)]),
    }),
    enabled: active,
    retry: false,
    staleTime: (q) => q.state.data && q.state.data.status !== 'pending' ? Infinity : 0,
    refetchInterval: (q) => {
      if (!active || (q.state.data && q.state.data.status !== 'pending')) return false;
      if (q.state.error instanceof ApiError && [401, 403, 404].includes(q.state.error.status)) return false;
      // Fast initial confirmation, then back off during recovery. Never poll hidden tabs.
      const reads = q.state.dataUpdateCount + q.state.errorUpdateCount;
      return reads < 3 ? 1_000 : reads < 6 ? 5_000 : 30_000;
    },
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!active || !query.data || query.data.xpEarned === null) return;
    const version = `${memberId}:${matchId}:${query.data.xpEarned}:${query.data.status}`;
    if (refreshed.current === version) return;
    refreshed.current = version;
    // Refresh balances from their normal server readers; never increment them locally.
    void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.objectives.all });
    void getMe().then((user) => {
      const auth = useAuthStore.getState();
      if (auth.user?.id === memberId && user.id === memberId && user.progression
        && user.progression.totalXp >= (auth.user.progression?.totalXp ?? 0)) {
        auth.patchProgression(user.progression);
      }
    }).catch(() => { /* The normal profile refresh can retry; confirmed rewards remain visible. */ });
  }, [active, matchId, memberId, query.data, queryClient]);

  if (!active || !matchId) return null;
  if (query.error instanceof ApiError && [401, 403, 404].includes(query.error.status)) {
    return { matchId, status: 'unavailable', xpEarned: null };
  }
  return query.data ?? { matchId, status: 'pending', xpEarned: null };
}

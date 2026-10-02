import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as wlRewardsRepo from '@/lib/repositories/wlRewards.repo';
import { queryKeys } from '@/lib/queries/queryKeys';
import { useAuthStore } from '@/stores/auth.store';
import { rewardSession } from '@/features/weekend-league/rewards/rewardSession';
import type { WlRewardReceipt } from '@/features/weekend-league/rewards/wlRewards';

/** The viewer's granted Weekend League rewards. Keyed by account, so one
 *  player's receipts are never served to the next person on this browser. */
export function useMyWlRewards() {
  const userId = useAuthStore((state) => (state.status === 'authenticated' ? state.user?.id ?? null : null));
  return useQuery({
    queryKey: queryKeys.weekendLeague.rewards(userId ?? 'anonymous'),
    queryFn: wlRewardsRepo.getMyWlRewards,
    enabled: userId !== null,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAckWlReward() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const key = queryKeys.weekendLeague.rewards(userId ?? 'anonymous');
  return useMutation({
    mutationFn: (rewardId: string) => wlRewardsRepo.ackWlReward(rewardId),
    // Mark it seen in the cache at once: the player can reach another screen
    // before the request returns, and a stale "unseen" would replay the reveal.
    // A failed request deliberately does NOT undo this; the reveal stays
    // closed and the acknowledgement is retried on a later visit.
    onMutate: async (rewardId: string) => {
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<WlRewardReceipt[]>(key, (rewards) =>
        rewards?.map((reward) => (reward.id === rewardId ? { ...reward, seen: true } : reward)),
      );
    },
    onSuccess: (_result, rewardId) => {
      rewardSession.markAcknowledged(rewardId);
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

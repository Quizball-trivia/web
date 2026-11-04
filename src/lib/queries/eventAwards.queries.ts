import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as eventAwardsRepo from '@/lib/repositories/eventAwards.repo';
import { queryKeys } from '@/lib/queries/queryKeys';
import { useAuthStore } from '@/stores/auth.store';

export function useMyEventAwards() {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.eventAwards.mine(),
    queryFn: async () => {
      const { data, error } = await eventAwardsRepo.getMyEventAwards();
      if (error) throw new Error('Failed to fetch event awards');
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

const USER_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useUserEventAwards(userId: string | undefined) {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  // The player context holds a placeholder id until the real profile loads; the API rejects anything but a user id.
  const isUserId = !!userId && USER_ID_RE.test(userId);
  return useQuery({
    queryKey: queryKeys.eventAwards.user(userId ?? ''),
    queryFn: async () => {
      const { data, error } = await eventAwardsRepo.getUserEventAwards(userId!);
      if (error) throw new Error('Failed to fetch event awards');
      return data;
    },
    enabled: isAuthenticated && isUserId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAckEventAward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (awardId: string) => eventAwardsRepo.ackEventAward(awardId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.eventAwards.mine() });
    },
  });
}

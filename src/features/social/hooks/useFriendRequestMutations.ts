import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queries/queryKeys";
import {
  acceptFriendRequest,
  createFriendRequest,
  declineFriendRequest,
} from "@/lib/repositories/social.repo";

interface FriendRequestMutationCopy {
  success: string;
  error: string | ((error: unknown) => string);
}

interface UseFriendRequestMutationsOptions {
  send?: FriendRequestMutationCopy;
  accept: FriendRequestMutationCopy;
  decline: FriendRequestMutationCopy;
}

function resolveErrorMessage(copy: FriendRequestMutationCopy, error: unknown): string {
  return typeof copy.error === "function" ? copy.error(error) : copy.error;
}

/**
 * Send / accept / decline friend-request mutations with the shared
 * invalidate-social-queries + toast policy. Callers own any orchestration
 * around the returned mutations (pending guards, optimistic state).
 */
export function useFriendRequestMutations({ send, accept, decline }: UseFriendRequestMutationsOptions) {
  const queryClient = useQueryClient();

  const invalidateSocialQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.social.all });
  };

  const sendRequestMutation = useMutation({
    mutationFn: (targetUserId: string) => createFriendRequest({ targetUserId }),
    onSuccess: async () => {
      await invalidateSocialQueries();
      if (send) toast.success(send.success);
    },
    onError: (error) => {
      if (send) toast.error(resolveErrorMessage(send, error));
    },
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (requestId: string) => acceptFriendRequest(requestId),
    onSuccess: async () => {
      await invalidateSocialQueries();
      toast.success(accept.success);
    },
    onError: (error) => {
      toast.error(resolveErrorMessage(accept, error));
    },
  });

  const declineRequestMutation = useMutation({
    mutationFn: (requestId: string) => declineFriendRequest(requestId),
    onSuccess: async () => {
      await invalidateSocialQueries();
      toast.success(decline.success);
    },
    onError: (error) => {
      toast.error(resolveErrorMessage(decline, error));
    },
  });

  return {
    sendRequestMutation,
    acceptRequestMutation,
    declineRequestMutation,
    invalidateSocialQueries,
  };
}

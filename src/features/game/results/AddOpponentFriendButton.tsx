'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, UserPlus, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

import { useLocale } from '@/contexts/LocaleContext';
import { ApiError } from '@/lib/api/api';
import { queryKeys } from '@/lib/queries/queryKeys';
import { useFriendRequests, useSocialFriends } from '@/lib/queries/social.queries';
import { acceptFriendRequest, createFriendRequest } from '@/lib/repositories/social.repo';
import { cn } from '@/lib/utils';

import { deriveOpponentFriendState, type OpponentFriendRelationship } from './friendRelationship';

type OptimisticStatus = Extract<OpponentFriendRelationship['status'], 'sent' | 'friends'>;

const BASE_CLASS =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3 font-poppins text-[11px] font-semibold uppercase text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-default sm:h-9 sm:px-3.5 sm:text-xs';

function isConflictError(error: unknown) {
  return error instanceof ApiError && error.status === 409;
}

export function AddOpponentFriendButton({
  opponentId,
  opponentUsername,
}: {
  opponentId: string;
  opponentUsername: string;
}) {
  const normalizedOpponentId = opponentId.trim();
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const friendsQuery = useSocialFriends();
  const requestsQuery = useFriendRequests();
  const [optimisticStatus, setOptimisticStatus] = useState<OptimisticStatus | null>(null);

  const derivedRelationship = useMemo(
    () => deriveOpponentFriendState(normalizedOpponentId, friendsQuery.data, requestsQuery.data),
    [friendsQuery.data, normalizedOpponentId, requestsQuery.data],
  );

  useEffect(() => {
    setOptimisticStatus(null);
  }, [normalizedOpponentId]);

  useEffect(() => {
    if (!optimisticStatus) return;
    // Optimistic "friends" must hold until the cache agrees: right after an
    // accept the requests cache still says "received", and reverting there
    // would re-enable the accept button for an already-handled request.
    if (optimisticStatus === 'friends') {
      if (derivedRelationship.status === 'friends') {
        setOptimisticStatus(null);
      }
      return;
    }
    if (derivedRelationship.status !== 'none') {
      setOptimisticStatus(null);
    }
  }, [derivedRelationship.status, optimisticStatus]);

  const prevDerivedStatusRef = useRef(derivedRelationship.status);
  useEffect(() => {
    const prev = prevDerivedStatusRef.current;
    prevDerivedStatusRef.current = derivedRelationship.status;
    // The requests query polls every 60s but the friends query doesn't. When
    // the opponent accepts, the outgoing request vanishes on the next poll
    // while the cached friends list still lacks them — refetch it so the
    // button lands on "Friends" instead of reverting to "Add friend".
    if (derivedRelationship.status === 'none' && (prev === 'sent' || prev === 'received')) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.friends() });
    }
  }, [derivedRelationship.status, queryClient]);

  const relationship: OpponentFriendRelationship =
    optimisticStatus === 'sent'
      ? { status: 'sent' }
      : optimisticStatus === 'friends'
        ? { status: 'friends' }
        : derivedRelationship;

  const invalidateSocialQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.social.friends() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.social.requests() }),
    ]);
  };

  const sendRequestMutation = useMutation({
    mutationFn: (targetUserId: string) => createFriendRequest({ targetUserId }),
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (requestId: string) => acceptFriendRequest(requestId),
  });

  if (!normalizedOpponentId) {
    return null;
  }

  const opponentLabel = opponentUsername.trim();
  const addAriaLabel = opponentLabel
    ? `${t('results.addFriend')} ${opponentLabel}`
    : t('results.addFriend');

  const spring = { type: 'spring' as const, stiffness: 420, damping: 28 };
  const motionProps = {
    initial: { opacity: 0, scale: 0.92, y: 2 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: spring,
  };

  const handleSendRequest = async () => {
    if (sendRequestMutation.isPending || relationship.status !== 'none') return;
    setOptimisticStatus('sent');
    try {
      await sendRequestMutation.mutateAsync(normalizedOpponentId);
      await invalidateSocialQueries();
    } catch (error) {
      if (isConflictError(error)) {
        // 409 covers "already sent", "they already sent you one", and "already
        // friends" — refetch and let the derived state pick the right button.
        await invalidateSocialQueries();
        setOptimisticStatus(null);
        return;
      }
      setOptimisticStatus(null);
      toast.error(t('results.friendRequestError'));
    }
  };

  const handleAcceptRequest = async () => {
    if (acceptRequestMutation.isPending || relationship.status !== 'received') return;
    try {
      await acceptRequestMutation.mutateAsync(relationship.requestId);
      setOptimisticStatus('friends');
      await invalidateSocialQueries();
    } catch {
      await invalidateSocialQueries();
      toast.error(t('results.friendRequestError'));
    }
  };

  return (
    <motion.div layout className="inline-flex" aria-live="polite">
      {relationship.status === 'none' && (
        <motion.button
          key="add"
          type="button"
          aria-label={addAriaLabel}
          onClick={handleSendRequest}
          className={cn(BASE_CLASS, 'bg-brand-green hover:bg-brand-green-deep')}
          {...motionProps}
        >
          <UserPlus className="size-3.5 sm:size-4" />
          {t('results.addFriend')}
        </motion.button>
      )}

      {relationship.status === 'sent' && (
        <motion.button
          key="sent"
          type="button"
          disabled
          className={cn(BASE_CLASS, 'bg-white/10 text-white/70 ring-1 ring-white/15')}
          {...motionProps}
        >
          <Check className="size-3.5 text-brand-green-light sm:size-4" />
          {t('results.friendRequestSent')}
        </motion.button>
      )}

      {relationship.status === 'received' && (
        <motion.button
          key="accept"
          type="button"
          onClick={handleAcceptRequest}
          disabled={acceptRequestMutation.isPending}
          className={cn(BASE_CLASS, 'bg-brand-orange hover:bg-brand-orange-deep disabled:opacity-70')}
          {...motionProps}
        >
          {acceptRequestMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin sm:size-4" />
          ) : (
            <Check className="size-3.5 sm:size-4" />
          )}
          {t('results.acceptFriendRequest')}
        </motion.button>
      )}

      {relationship.status === 'friends' && (
        <motion.span
          key="friends"
          className={cn(BASE_CLASS, 'bg-brand-blue text-white')}
          {...motionProps}
        >
          <Users className="size-3.5 sm:size-4" />
          {t('results.friends')}
        </motion.span>
      )}
    </motion.div>
  );
}

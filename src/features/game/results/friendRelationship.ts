import type {
  FriendRequestsDTO,
  SocialPlayer,
} from '@/lib/queries/social.queries';

export type OpponentFriendRelationship =
  | { status: 'none' }
  | { status: 'sent' }
  | { status: 'received'; requestId: string }
  | { status: 'friends' };

export function deriveOpponentFriendState(
  opponentId: string | null | undefined,
  friends: SocialPlayer[] | undefined,
  requests: FriendRequestsDTO | undefined,
): OpponentFriendRelationship {
  const normalizedOpponentId = opponentId?.trim();
  if (!normalizedOpponentId) {
    return { status: 'none' };
  }

  if (friends?.some((friend) => friend.id === normalizedOpponentId)) {
    return { status: 'friends' };
  }

  if (requests?.outgoing.some((request) => request.user.id === normalizedOpponentId)) {
    return { status: 'sent' };
  }

  const incomingRequest = requests?.incoming.find((request) => request.user.id === normalizedOpponentId);
  if (incomingRequest) {
    return { status: 'received', requestId: incomingRequest.requestId };
  }

  return { status: 'none' };
}

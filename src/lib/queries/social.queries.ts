import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/queryKeys";
import {
  getFriends,
  getFriendRequests,
  searchUsers,
  type FriendRequestListItemResponse,
  type SocialPlayerResponse,
} from "@/lib/repositories/social.repo";

export interface SocialPlayer {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
  rp: number;
  level: number;
  friendStatus: SocialPlayerResponse["friendStatus"];
}

export interface FriendRequestListItem {
  requestId: string;
  createdAt: string;
  user: SocialPlayer;
}

export interface FriendRequestsDTO {
  incoming: FriendRequestListItem[];
  outgoing: FriendRequestListItem[];
  incomingCount: number;
}

function toSocialPlayer(player: SocialPlayerResponse): SocialPlayer {
  return {
    id: player.id,
    nickname: player.nickname,
    avatarUrl: player.avatarUrl,
    rp: player.rp,
    level: player.level,
    friendStatus: player.friendStatus,
  };
}

function toFriendRequestItem(item: FriendRequestListItemResponse): FriendRequestListItem {
  return {
    requestId: item.requestId,
    createdAt: item.createdAt,
    user: toSocialPlayer(item.user),
  };
}

export function useSocialFriends() {
  return useQuery({
    queryKey: queryKeys.social.friends(),
    queryFn: async (): Promise<SocialPlayer[]> => {
      const data = await getFriends();
      return data.friends.map(toSocialPlayer);
    },
    staleTime: 60_000,
    gcTime: 15 * 60_000,
  });
}

export function useFriendRequests() {
  return useQuery({
    queryKey: queryKeys.social.requests(),
    queryFn: async (): Promise<FriendRequestsDTO> => {
      const data = await getFriendRequests();
      return {
        incoming: data.incoming.map(toFriendRequestItem),
        outgoing: data.outgoing.map(toFriendRequestItem),
        incomingCount: data.incomingCount,
      };
    },
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchInterval: 60_000,
  });
}

export function useIncomingFriendRequestCount() {
  return useQuery({
    queryKey: queryKeys.social.requests(),
    queryFn: async (): Promise<FriendRequestsDTO> => {
      const data = await getFriendRequests();
      return {
        incoming: data.incoming.map(toFriendRequestItem),
        outgoing: data.outgoing.map(toFriendRequestItem),
        incomingCount: data.incomingCount,
      };
    },
    select: (data) => data.incomingCount,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchInterval: 60_000,
  });
}

export function useSocialSearch(query?: string) {
  const normalizedQuery = query?.trim() ?? "";

  return useQuery({
    queryKey: queryKeys.social.search(normalizedQuery),
    queryFn: async (): Promise<SocialPlayer[]> => {
      const data = await searchUsers(normalizedQuery);
      return data.results.map(toSocialPlayer);
    },
    enabled: normalizedQuery.length > 0,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/queryKeys";
import {
  getFriends,
  getFriendRequests,
  searchUsers,
  type FriendRequestListItemResponse,
  type SocialPlayerResponse,
} from "@/lib/repositories/social.repo";
import { useAuthStore } from "@/stores/auth.store";
import type { AvatarCustomization } from "@/types/game";

export interface SocialPlayer {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
  avatarCustomization: AvatarCustomization | null;
  level: number;
  pendingDeletion: boolean;
  ranked: SocialPlayerResponse["ranked"];
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
    avatarCustomization: player.avatarCustomization,
    level: player.level,
    pendingDeletion: player.pendingDeletion,
    ranked: player.ranked,
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
  // Auth-only polling: only fetch (and only keep the 60s timer running) while the
  // session is authenticated. A logged-out / loading / terminally-failed session
  // would otherwise poll forever, each tick firing a 401→refresh→400 cycle.
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated");
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
    enabled: isAuthenticated,
    refetchInterval: () => (isAuthenticated ? 60_000 : false),
  });
}

export function useIncomingFriendRequestCount() {
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated");
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
    enabled: isAuthenticated,
    refetchInterval: () => (isAuthenticated ? 60_000 : false),
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

import { apiFetch } from "@/lib/api/client";
import type { paths } from "@/types/api.generated";

export type UserSearchResponse =
  paths["/api/v1/users/search"]["get"]["responses"][200]["content"]["application/json"];
export type SocialPlayerResponse = UserSearchResponse["results"][number];
export type FriendsResponse =
  paths["/api/v1/friends"]["get"]["responses"][200]["content"]["application/json"];
export type FriendRequestsResponse =
  paths["/api/v1/friends/requests"]["get"]["responses"][200]["content"]["application/json"];
export type FriendRequestListItemResponse = FriendRequestsResponse["incoming"][number];
export type CreateFriendRequestBody =
  paths["/api/v1/friends/requests"]["post"]["requestBody"]["content"]["application/json"];
export type CreateFriendRequestResponse =
  paths["/api/v1/friends/requests"]["post"]["responses"][201]["content"]["application/json"];

export async function searchUsers(query: string) {
  return apiFetch("get", "/api/v1/users/search", {
    query: { q: query },
  });
}

export async function getFriends() {
  return apiFetch("get", "/api/v1/friends");
}

export async function getFriendRequests() {
  return apiFetch("get", "/api/v1/friends/requests");
}

export async function createFriendRequest(body: CreateFriendRequestBody) {
  return apiFetch("post", "/api/v1/friends/requests", { body });
}

export async function acceptFriendRequest(requestId: string) {
  return apiFetch("post", "/api/v1/friends/requests/{requestId}/accept", {
    params: { requestId },
  });
}

export async function declineFriendRequest(requestId: string) {
  return apiFetch("post", "/api/v1/friends/requests/{requestId}/decline", {
    params: { requestId },
  });
}

/**
 * TODO: Remove friend feature — planned for future implementation.
 * Endpoint exists in backend but UI/feature not yet implemented.
 * When implementing, ensure proper confirmation flow and state updates.
 */
export async function removeFriend(friendUserId: string) {
  return apiFetch("delete", "/api/v1/friends/{friendUserId}", {
    params: { friendUserId },
  });
}

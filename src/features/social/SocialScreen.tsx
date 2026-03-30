"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Check,
  Clock3,
  Loader2,
  Search,
  Swords,
  UserPlus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/api";
import { queryKeys } from "@/lib/queries/queryKeys";
import {
  useFriendRequests,
  useSocialFriends,
  useSocialSearch,
  type FriendRequestListItem,
  type SocialPlayer,
} from "@/lib/queries/social.queries";
import {
  acceptFriendRequest,
  createFriendRequest,
  declineFriendRequest,
  removeFriend,
} from "@/lib/repositories/social.repo";

type Tab = "friends" | "find";

function getRankedDisplay(player: SocialPlayer) {
  const level = Number.isFinite(player.level) ? player.level : 1;
  const ranked = player.ranked;

  if (!ranked) {
    return {
      level,
      tierLabel: "Unranked",
      rpLabel: "0 RP",
      highlightClass: "text-[#56707A]",
    };
  }

  if (ranked.placementStatus !== "placed") {
    return {
      level,
      tierLabel: `Placement ${ranked.placementPlayed}/${ranked.placementRequired}`,
      rpLabel: "0 RP",
      highlightClass: "text-[#58CC02]",
    };
  }

  return {
    level,
    tierLabel: ranked.tier,
    rpLabel: `${ranked.rp} RP`,
    highlightClass: "text-[#CE82FF]",
  };
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const payload = error.data;
    if (
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof payload.message === "string"
    ) {
      return payload.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function PlayerCard({
  player,
  index,
  onSendRequest,
  onRespond,
  onChallenge,
  onRemove,
  isPending,
  isRemoving,
}: {
  player: SocialPlayer;
  index: number;
  onSendRequest?: (id: string) => void;
  onRespond?: () => void;
  onChallenge?: (id: string) => void;
  onRemove?: (id: string) => void;
  isPending?: boolean;
  isRemoving?: boolean;
}) {
  const rankedDisplay = getRankedDisplay(player);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-4 py-3"
    >
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-[#1CB0F6]/20 bg-[#243B44]">
        {player.avatarUrl ? (
          <img src={player.avatarUrl} alt={player.nickname ?? ""} className="size-full object-cover" />
        ) : (
          <UserRound className="size-6 text-[#56707A]" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-white">{player.nickname ?? "Unknown"}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#56707A]">Lvl {rankedDisplay.level}</span>
          <span className="text-[11px] font-bold text-[#56707A]">·</span>
          <span className={`text-[11px] font-bold ${rankedDisplay.highlightClass}`}>{rankedDisplay.tierLabel}</span>
          <span className="text-[11px] font-bold text-[#56707A]">·</span>
          <span className="text-[11px] font-bold text-[#FFD700]">{rankedDisplay.rpLabel}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {onChallenge && player.friendStatus === "friends" && (
          <button
            type="button"
            onClick={() => onChallenge(player.id)}
            className="flex items-center gap-1.5 rounded-xl border border-[#1CB0F6]/25 bg-[#1CB0F6]/15 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-[#7FD8FF] transition-colors hover:bg-[#1CB0F6]/25"
          >
            <Swords className="size-3.5" />
            Challenge
          </button>
        )}

        {onRemove && player.friendStatus === "friends" && (
          <button
            type="button"
            onClick={() => onRemove(player.id)}
            disabled={isRemoving}
            className="flex items-center justify-center rounded-xl border border-[#FF4B4B]/25 bg-[#FF4B4B]/15 px-2.5 py-2 text-[11px] font-black uppercase tracking-wide text-[#FF9999] transition-colors hover:bg-[#FF4B4B]/25 disabled:opacity-50"
            title="Remove friend"
          >
            {isRemoving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <X className="size-3.5" />
            )}
          </button>
        )}

        {player.friendStatus === "none" && onSendRequest && (
          <button
            type="button"
            onClick={() => onSendRequest(player.id)}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-xl border border-[#58CC02]/25 bg-[#58CC02]/15 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-[#58CC02] transition-colors hover:bg-[#58CC02]/25 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UserPlus className="size-3.5" />
            )}
            Add
          </button>
        )}

        {player.friendStatus === "pending_sent" && (
          <span className="rounded-xl border border-[#FFD700]/20 bg-[#FFD700]/10 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-[#FFD700]">
            Sent
          </span>
        )}

        {player.friendStatus === "pending_received" && (
          <button
            type="button"
            onClick={onRespond}
            className="rounded-xl border border-[#FF8A3D]/20 bg-[#FF8A3D]/10 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-[#FFB37D] transition-colors hover:bg-[#FF8A3D]/20"
          >
            Respond
          </button>
        )}

        {player.friendStatus === "friends" && !onChallenge && (
          <span className="rounded-xl border border-[#56707A]/20 bg-[#56707A]/15 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-[#56707A]">
            Friends
          </span>
        )}
      </div>
    </motion.div>
  );
}

function RequestCard({
  item,
  index,
  type,
  onAccept,
  onDecline,
  isPending,
}: {
  item: FriendRequestListItem;
  index: number;
  type: "incoming" | "outgoing";
  onAccept?: (requestId: string) => void;
  onDecline?: (requestId: string) => void;
  isPending?: boolean;
}) {
  const rankedDisplay = getRankedDisplay(item.user);
  const isIncoming = type === "incoming";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-4 py-3"
    >
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-[#1CB0F6]/20 bg-[#243B44]">
        {item.user.avatarUrl ? (
          <img src={item.user.avatarUrl} alt={item.user.nickname ?? ""} className="size-full object-cover" />
        ) : (
          <UserRound className="size-6 text-[#56707A]" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-black text-white">{item.user.nickname ?? "Unknown"}</p>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
              isIncoming
                ? "bg-[#FF8A3D]/15 text-[#FFB37D]"
                : "bg-[#FFD700]/10 text-[#FFD700]"
            }`}
          >
            {isIncoming ? "Incoming" : "Sent"}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#56707A]">Lvl {rankedDisplay.level}</span>
          <span className="text-[11px] font-bold text-[#56707A]">·</span>
          <span className={`text-[11px] font-bold ${rankedDisplay.highlightClass}`}>{rankedDisplay.tierLabel}</span>
          <span className="text-[11px] font-bold text-[#56707A]">·</span>
          <span className="text-[11px] font-bold text-[#FFD700]">{rankedDisplay.rpLabel}</span>
        </div>
      </div>

      {isIncoming ? (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onAccept?.(item.requestId)}
            disabled={isPending}
            className="flex items-center gap-1 rounded-xl border border-[#58CC02]/25 bg-[#58CC02]/15 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-[#58CC02] transition-colors hover:bg-[#58CC02]/25 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Accept
          </button>
          <button
            type="button"
            onClick={() => onDecline?.(item.requestId)}
            disabled={isPending}
            className="rounded-xl border border-[#FF4B4B]/20 bg-[#FF4B4B]/10 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-[#FF8E8E] transition-colors hover:bg-[#FF4B4B]/20 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-1 rounded-xl border border-[#FFD700]/20 bg-[#FFD700]/10 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-[#FFD700]">
          <Clock3 className="size-3.5" />
          Pending
        </div>
      )}
    </motion.div>
  );
}

function SocialSection({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: "blue" | "orange" | "gold";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "orange"
      ? "bg-[#FF8A3D]/15 text-[#FFB37D]"
      : tone === "gold"
        ? "bg-[#FFD700]/10 text-[#FFD700]"
        : "bg-[#1CB0F6]/15 text-[#7FD8FF]";

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-black uppercase tracking-[0.18em] text-[#8CB7C7]">{title}</h2>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${toneClass}`}>{count}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function SocialScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>("friends");
  const [query, setQuery] = useState("");
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null);
  const [pendingRequestAction, setPendingRequestAction] = useState<{
    requestId: string;
    action: "accept" | "decline";
  } | null>(null);

  const debouncedQuery = useDebounce(query.trim(), 400);

  const friendsQuery = useSocialFriends();
  const requestsQuery = useFriendRequests();
  const searchQuery = useSocialSearch(debouncedQuery);

  const invalidateSocialQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.social.all });
  };

  const sendRequestMutation = useMutation({
    mutationFn: (targetUserId: string) => createFriendRequest({ targetUserId }),
    onSuccess: async () => {
      await invalidateSocialQueries();
      toast.success("Friend request sent");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to send request"));
    },
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (requestId: string) => acceptFriendRequest(requestId),
    onSuccess: async () => {
      await invalidateSocialQueries();
      toast.success("Friend request accepted");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to accept request"));
    },
  });

  const declineRequestMutation = useMutation({
    mutationFn: (requestId: string) => declineFriendRequest(requestId),
    onSuccess: async () => {
      await invalidateSocialQueries();
      toast.success("Friend request declined");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to decline request"));
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: (friendUserId: string) => removeFriend(friendUserId),
    onSuccess: async () => {
      await invalidateSocialQueries();
      toast.success("Friend removed");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to remove friend"));
    },
  });

  const handleSendRequest = async (targetUserId: string) => {
    if (pendingTargetId || sendRequestMutation.isPending) return;
    setPendingTargetId(targetUserId);
    try {
      await sendRequestMutation.mutateAsync(targetUserId);
    } finally {
      setPendingTargetId(null);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (pendingRequestAction) return;
    setPendingRequestAction({ requestId, action: "accept" });
    try {
      await acceptRequestMutation.mutateAsync(requestId);
    } finally {
      setPendingRequestAction(null);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (pendingRequestAction) return;
    setPendingRequestAction({ requestId, action: "decline" });
    try {
      await declineRequestMutation.mutateAsync(requestId);
    } finally {
      setPendingRequestAction(null);
    }
  };

  const friends = friendsQuery.data ?? [];
  const incomingRequests = requestsQuery.data?.incoming ?? [];
  const outgoingRequests = requestsQuery.data?.outgoing ?? [];
  const incomingCount = requestsQuery.data?.incomingCount ?? 0;
  const searchResults = searchQuery.data ?? [];
  const friendsLoading = friendsQuery.isLoading || requestsQuery.isLoading;
  const friendsError =
    friendsQuery.isError || requestsQuery.isError
      ? "Failed to load friends. Please try again."
      : null;
  const isSearching = debouncedQuery.length > 0 && searchQuery.isLoading;
  const searchError = searchQuery.isError ? "Search failed. Please try again." : null;
  const hasNoSocialData =
    friendsQuery.isSuccess &&
    requestsQuery.isSuccess &&
    friends.length === 0 &&
    incomingRequests.length === 0 &&
    outgoingRequests.length === 0;

  return (
    <div className="min-h-screen font-fun">
      <div className="sticky top-0 z-20 border-b-2 border-[#1B2F36] backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-3 py-3 md:max-w-3xl md:px-4 md:py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border-2 border-[#1CB0F6]/30 bg-[#1CB0F6]/15 md:size-10">
              <Users className="size-4 text-[#1CB0F6] md:size-5" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black uppercase tracking-wide text-white md:text-xl">Social</h1>
              {incomingCount > 0 && (
                <span className="rounded-full bg-[#FF4B4B] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                  {incomingCount} new
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-3 py-4 md:max-w-3xl md:px-4 md:py-6">
        <div className="flex gap-2 rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] p-1.5">
          {(["friends", "find"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-black uppercase tracking-wide transition-all ${
                activeTab === tab
                  ? "bg-[#1CB0F6] text-white shadow-sm"
                  : "text-[#56707A] hover:text-white"
              }`}
            >
              {tab === "friends" ? (
                <>
                  <Users className="size-4" />
                  Friends
                  {friends.length > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${activeTab === tab ? "bg-white/20" : "bg-[#243B44]"}`}>
                      {friends.length}
                    </span>
                  )}
                  {incomingCount > 0 && (
                    <span className="rounded-full bg-[#FF4B4B] px-1.5 py-0.5 text-[10px] font-black text-white">
                      {incomingCount}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Search className="size-4" />
                  Find Players
                </>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "friends" ? (
            <motion.div
              key="friends"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {friendsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-8 animate-spin text-[#1CB0F6]" />
                </div>
              ) : friendsError ? (
                <div className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] p-6 text-center">
                  <p className="text-sm font-bold text-[#FF4B4B]">{friendsError}</p>
                </div>
              ) : hasNoSocialData ? (
                <div className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] p-8 text-center">
                  <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border-2 border-[#56707A]/20 bg-[#243B44]">
                    <Users className="size-8 text-[#56707A]" />
                  </div>
                  <h3 className="mb-2 text-base font-black uppercase text-white">No friends yet</h3>
                  <p className="mb-5 text-sm font-semibold text-[#56707A]">
                    Search for players and send them a friend request.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("find")}
                    className="rounded-xl border-b-[3px] border-[#14627F] bg-[#1CB0F6] px-5 py-2.5 text-sm font-black uppercase tracking-wide text-white transition-all hover:bg-[#1A9FE0] active:translate-y-[2px] active:border-b-[1px]"
                  >
                    Find Players
                  </button>
                </div>
              ) : (
                <>
                  {incomingRequests.length > 0 && (
                    <SocialSection title="Incoming Requests" count={incomingRequests.length} tone="orange">
                      {incomingRequests.map((item, index) => (
                        <RequestCard
                          key={item.requestId}
                          item={item}
                          index={index}
                          type="incoming"
                          onAccept={handleAcceptRequest}
                          onDecline={handleDeclineRequest}
                          isPending={pendingRequestAction?.requestId === item.requestId}
                        />
                      ))}
                    </SocialSection>
                  )}

                  {outgoingRequests.length > 0 && (
                    <SocialSection title="Sent Requests" count={outgoingRequests.length} tone="gold">
                      {outgoingRequests.map((item, index) => (
                        <RequestCard
                          key={item.requestId}
                          item={item}
                          index={index}
                          type="outgoing"
                        />
                      ))}
                    </SocialSection>
                  )}

                  {friends.length > 0 && (
                    <SocialSection title="Your Friends" count={friends.length} tone="blue">
                      {friends.map((friend, index) => (
                        <PlayerCard
                          key={friend.id}
                          player={friend}
                          index={index}
                          onChallenge={(id) => router.push(`/profile/${id}`)}
                          onRemove={(id) => removeFriendMutation.mutate(id)}
                          isRemoving={removeFriendMutation.isPending}
                        />
                      ))}
                    </SocialSection>
                  )}
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="find"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#56707A]" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by username..."
                  className="w-full rounded-2xl border-2 border-[#243B44] bg-[#1B2F36] py-3 pl-10 pr-10 text-sm font-semibold text-white outline-none transition-colors placeholder:text-[#56707A] focus:border-[#1CB0F6]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#56707A] transition-colors hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {isSearching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-7 animate-spin text-[#1CB0F6]" />
                </div>
              ) : searchError ? (
                <div className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] p-6 text-center">
                  <p className="text-sm font-bold text-[#FF4B4B]">{searchError}</p>
                </div>
              ) : debouncedQuery && searchResults.length === 0 ? (
                <div className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] p-8 text-center">
                  <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl border-2 border-[#56707A]/20 bg-[#243B44]">
                    <UserRound className="size-7 text-[#56707A]" />
                  </div>
                  <p className="mb-1 text-sm font-black uppercase text-white">No players found</p>
                  <p className="text-xs font-semibold text-[#56707A]">Try a different username</p>
                </div>
              ) : !debouncedQuery ? (
                <div className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] p-8 text-center">
                  <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl border-2 border-[#1CB0F6]/25 bg-[#1CB0F6]/15">
                    <Search className="size-7 text-[#1CB0F6]" />
                  </div>
                  <p className="mb-1 text-sm font-black uppercase text-white">Find your rivals</p>
                  <p className="text-xs font-semibold text-[#56707A]">
                    Search for a player to add them as a friend
                  </p>
                </div>
              ) : (
                searchResults.map((player, index) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    index={index}
                    onSendRequest={handleSendRequest}
                    onRespond={() => setActiveTab("friends")}
                    isPending={pendingTargetId === player.id}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

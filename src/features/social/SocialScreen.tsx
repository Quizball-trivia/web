"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { useProfileNavigation } from "@/lib/hooks/useProfileNavigation";
import { useLocale } from "@/contexts/LocaleContext";
import type { MessageKey } from "@/lib/i18n/messages";
import {
  Bell,
  Check,
  Clock3,
  Loader2,
  Search,
  Swords,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/api";
import { TierFrameAvatar } from "@/components/TierFrameAvatar";
import { getSocket } from "@/lib/realtime/socket-client";
import type { ErrorPayload, LobbyChallengeCreatedPayload } from "@/lib/realtime/socket.types";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { queryKeys } from "@/lib/queries/queryKeys";
import { trackChallengeInviteSent } from "@/lib/analytics/game-events";
import {
  useFriendRequests,
  useSocialFriends,
  useSocialSearch,
  SEARCH_MIN_CHARS,
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

type TranslateFn = (key: MessageKey, params?: Record<string, string | number>) => string;

function getRankedDisplay(player: SocialPlayer, t: TranslateFn) {
  const level = Number.isFinite(player.level) ? player.level : 1;
  const ranked = player.ranked;

  if (!ranked) {
    return {
      level,
      tierLabel: t("notifications.tierUnranked"),
      rpLabel: t("notifications.rpLabel", { rp: 0 }),
      highlightClass: "text-brand-slate",
    };
  }

  if (ranked.placementStatus !== "placed") {
    return {
      level,
      tierLabel: t("notifications.tierPlacement", { played: ranked.placementPlayed, required: ranked.placementRequired }),
      rpLabel: t("notifications.rpLabel", { rp: 0 }),
      highlightClass: "text-brand-green-light",
    };
  }

  // Translate well-known tier names via the `tiers` namespace; falls back to
  // the raw API-supplied tier name if not yet in the dictionary.
  const tierKey = `tiers.${ranked.tier}` as MessageKey;
  const tierLabel = (() => {
    try {
      const translated = t(tierKey);
      return translated === tierKey ? ranked.tier : translated;
    } catch {
      return ranked.tier;
    }
  })();

  return {
    level,
    tierLabel,
    rpLabel: t("notifications.rpLabel", { rp: ranked.rp }),
    highlightClass: "text-brand-purple",
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

const CARD_BASE =
  "flex items-center gap-3 rounded-2xl border-2 bg-transparent px-3 py-3";

const PILL_BASE =
  "flex shrink-0 items-center justify-center gap-1.5 rounded-full h-9 w-9 px-0 sm:w-auto sm:px-3.5 font-poppins text-[11px] font-semibold uppercase text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40";

const PILL_LABEL = "hidden sm:inline";

function CardShell({
  variant = "default",
  children,
  index,
}: {
  variant?: "default" | "alert";
  children: React.ReactNode;
  index: number;
}) {
  const borderClass = variant === "alert" ? "border-brand-red" : "border-brand-green";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
      className={`${CARD_BASE} ${borderClass}`}
    >
      {children}
    </motion.div>
  );
}

function CardAvatar({ player }: { player: SocialPlayer }) {
  const tier = player.ranked?.tier ?? 'Academy';
  return (
    <div className="shrink-0">
      <div className="block sm:hidden">
        <TierFrameAvatar
          tier={tier}
          avatarCustomization={player.avatarCustomization ?? { base: player.avatarUrl ?? undefined }}
          size="sm"
        />
      </div>
      <div className="hidden sm:block">
        <TierFrameAvatar
          tier={tier}
          avatarCustomization={player.avatarCustomization ?? { base: player.avatarUrl ?? undefined }}
          size="md"
        />
      </div>
    </div>
  );
}

function CardIdentity({ player }: { player: SocialPlayer }) {
  const { t } = useLocale();
  const rankedDisplay = getRankedDisplay(player, t);
  const isPendingDeletion = player.pendingDeletion === true;

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <p className="truncate font-poppins text-sm font-semibold uppercase text-white">
          {player.nickname ?? "Unknown"}
        </p>
        {isPendingDeletion && (
          <span className="shrink-0 rounded-full bg-brand-red/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-brand-red">
            {t("social.pendingDeletion")}
          </span>
        )}
      </div>
      <div className="mt-0.5 flex items-center gap-2">
        <span className="text-[11px] font-bold text-brand-slate">Lvl {rankedDisplay.level}</span>
        <span className="text-[11px] font-bold text-brand-slate">·</span>
        <span className={`text-[11px] font-bold ${rankedDisplay.highlightClass}`}>{rankedDisplay.tierLabel}</span>
        <span className="text-[11px] font-bold text-brand-slate">·</span>
        <span className="text-[11px] font-bold text-brand-gold">{rankedDisplay.rpLabel}</span>
      </div>
    </div>
  );
}

// Avatar + name region that links to the player's profile. The card's action
// buttons (challenge/add/accept/…) sit OUTSIDE this wrapper so they aren't
// swallowed by the navigation click.
function CardPersonLink({ player }: { player: SocialPlayer }) {
  const nav = useProfileNavigation(player.id);
  return (
    <div
      {...nav.handlers}
      className={cn("flex min-w-0 flex-1 items-center gap-3 rounded-xl", nav.className)}
    >
      <CardAvatar player={player} />
      <CardIdentity player={player} />
    </div>
  );
}

function PlayerCard({
  player,
  index,
  onSendRequest,
  onRespond,
  onChallenge,
  onRemove,
  isPending,
  isChallenging,
  isRemoving,
}: {
  player: SocialPlayer;
  index: number;
  onSendRequest?: (id: string) => void;
  onRespond?: () => void;
  onChallenge?: (id: string) => void;
  onRemove?: (id: string) => void;
  isPending?: boolean;
  isChallenging?: boolean;
  isRemoving?: boolean;
}) {
  const { t } = useLocale();
  const isPendingDeletion = player.pendingDeletion === true;
  const variant = isPendingDeletion ? "alert" : "default";

  return (
    <CardShell variant={variant} index={index}>
      <CardPersonLink player={player} />

      <div className="flex shrink-0 items-center gap-2">
        {onChallenge && player.friendStatus === "friends" && (
          <button
            type="button"
            onClick={() => onChallenge(player.id)}
            disabled={isPendingDeletion || isChallenging}
            className={`${PILL_BASE} bg-brand-cyan`}
          >
            {isChallenging ? <Loader2 className="size-3.5 animate-spin" /> : <Swords className="size-3.5" />}
            <span className={PILL_LABEL}>{t("socialScreen.challenge")}</span>
          </button>
        )}

        {onRemove && player.friendStatus === "friends" && (
          <button
            type="button"
            onClick={() => onRemove(player.id)}
            disabled={isRemoving}
            className={`${PILL_BASE} bg-brand-red sm:w-9! sm:px-0!`}
            title={t("socialScreen.removeFriend")}
          >
            {isRemoving ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
          </button>
        )}

        {player.friendStatus === "none" && onSendRequest && (
          <button
            type="button"
            onClick={() => onSendRequest(player.id)}
            disabled={isPending || isPendingDeletion}
            className={`${PILL_BASE} bg-brand-green`}
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
            <span className={PILL_LABEL}>{t("socialScreen.add")}</span>
          </button>
        )}

        {player.friendStatus === "pending_sent" && (
          <span className={`${PILL_BASE} bg-brand-gold text-black!`}>
            <Clock3 className="size-3.5" />
            <span className={PILL_LABEL}>{t("socialScreen.sent")}</span>
          </span>
        )}

        {player.friendStatus === "pending_received" && (
          <button
            type="button"
            onClick={onRespond}
            className={`${PILL_BASE} bg-brand-orange`}
          >
            <Bell className="size-3.5" />
            <span className={PILL_LABEL}>{t("socialScreen.respond")}</span>
          </button>
        )}

        {player.friendStatus === "friends" && !onChallenge && (
          <span className={`${PILL_BASE} bg-brand-slate`}>
            <UserCheck className="size-3.5" />
            <span className={PILL_LABEL}>{t("socialScreen.friends")}</span>
          </span>
        )}
      </div>
    </CardShell>
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
  const { t } = useLocale();
  const isIncoming = type === "incoming";
  const isPendingDeletion = item.user.pendingDeletion === true;
  const variant = isPendingDeletion ? "alert" : "default";

  return (
    <CardShell variant={variant} index={index}>
      <CardPersonLink player={item.user} />

      {isIncoming ? (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onAccept?.(item.requestId)}
            disabled={isPending || isPendingDeletion}
            className={`${PILL_BASE} bg-brand-green`}
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            <span className={PILL_LABEL}>{t("socialScreen.accept")}</span>
          </button>
          <button
            type="button"
            onClick={() => onDecline?.(item.requestId)}
            disabled={isPending}
            className={`${PILL_BASE} bg-brand-red`}
          >
            <X className="size-3.5" />
            <span className={PILL_LABEL}>{t("socialScreen.decline")}</span>
          </button>
        </div>
      ) : (
        <span className={`${PILL_BASE} bg-brand-gold !text-black`}>
          <Clock3 className="size-3.5" />
          <span className={PILL_LABEL}>{t("socialScreen.pending")}</span>
        </span>
      )}
    </CardShell>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="font-poppins text-base md:text-lg font-semibold uppercase text-white">
      {title}
    </h2>
  );
}

export function SocialScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>("friends");
  const [query, setQuery] = useState("");
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [pendingChallengeId, setPendingChallengeId] = useState<string | null>(null);
  const suppressLobbyBanner = useRealtimeMatchStore((state) => state.suppressLobbyBanner);
  const clearLobbyBannerSuppression = useRealtimeMatchStore((state) => state.clearLobbyBannerSuppression);
  const beginLobbyHandoff = useRealtimeMatchStore((state) => state.beginLobbyHandoff);
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
      toast.success(t('social.toastRequestSent'));
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, t('social.toastFailedSend')));
    },
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (requestId: string) => acceptFriendRequest(requestId),
    onSuccess: async () => {
      await invalidateSocialQueries();
      toast.success(t('social.toastRequestAccepted'));
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, t('social.toastFailedAccept')));
    },
  });

  const declineRequestMutation = useMutation({
    mutationFn: (requestId: string) => declineFriendRequest(requestId),
    onSuccess: async () => {
      await invalidateSocialQueries();
      toast.success(t('social.toastRequestDeclined'));
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, t('social.toastFailedDecline')));
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: (friendUserId: string) => removeFriend(friendUserId),
    onSuccess: async () => {
      await invalidateSocialQueries();
      toast.success(t('social.toastFriendRemoved'));
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, t('social.toastFailedRemove')));
    },
  });

  useEffect(() => {
    const socket = getSocket();
    const handleChallengeCreated = (payload: LobbyChallengeCreatedPayload) => {
      if (pendingChallengeId !== payload.toUserId) return;
      beginLobbyHandoff(payload.inviteCode);
      suppressLobbyBanner(8000, "challenge");
      setPendingChallengeId(null);
      router.push(`/friend/room/${payload.inviteCode}`);
    };
    const handleChallengeError = (payload: ErrorPayload) => {
      if (!payload.code.startsWith("LOBBY_CHALLENGE") && payload.code !== "TRANSITION_IN_PROGRESS") {
        return;
      }
      setPendingChallengeId(null);
      clearLobbyBannerSuppression();
      toast.error(payload.message || t("socialScreen.challengeFailed"));
    };

    socket.on("lobby:challenge_created", handleChallengeCreated);
    socket.on("error", handleChallengeError);
    return () => {
      socket.off("lobby:challenge_created", handleChallengeCreated);
      socket.off("error", handleChallengeError);
    };
  }, [beginLobbyHandoff, clearLobbyBannerSuppression, pendingChallengeId, router, suppressLobbyBanner, t]);

  const handleRemoveFriend = async (friendUserId: string) => {
    if (pendingRemoveId) return;
    setPendingRemoveId(friendUserId);
    try {
      await removeFriendMutation.mutateAsync(friendUserId);
    } catch {
      // Error toast is shown by the mutation's onError; swallow here so
      // the rejection doesn't bubble past the click handler as an
      // unhandled rejection (visible in tests + the browser console).
    } finally {
      setPendingRemoveId(null);
    }
  };

  const handleChallenge = (friendUserId: string) => {
    if (pendingChallengeId) return;
    setPendingChallengeId(friendUserId);
    suppressLobbyBanner(8000, "challenge");
    trackChallengeInviteSent(friendUserId);
    getSocket().emit("lobby:challenge", { toUserId: friendUserId });
    toast.info(t("socialScreen.challengeSending"));
  };

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
      ? t('social.errorFriendsLoad')
      : null;
  const searchActive = debouncedQuery.length >= SEARCH_MIN_CHARS;
  const isSearching = searchActive && searchQuery.isLoading;
  const searchError = searchQuery.isError ? t('social.errorSearchFailed') : null;
  const hasNoSocialData =
    friendsQuery.isSuccess &&
    requestsQuery.isSuccess &&
    friends.length === 0 &&
    incomingRequests.length === 0 &&
    outgoingRequests.length === 0;

  const TABS: Array<{ id: Tab; label: string; icon: typeof Users }> = [
    { id: "friends", label: t("socialScreen.friends"), icon: Users },
    { id: "find", label: t("socialScreen.findFriends"), icon: Search },
  ];

  return (
    <div className="min-h-screen font-fun">
      <div className="mx-auto w-full max-w-2xl px-3 py-4 md:max-w-3xl md:px-4 md:py-6">
        <h1 className="font-poppins text-xl md:text-2xl font-semibold uppercase text-white">
          {t("socialScreen.title")}
        </h1>

        {/* Tab pill — Figma styling at original compact size */}
        <div className="mt-3 rounded-2xl border-2 border-brand-green p-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              const tabIncomingBadge = tab.id === "friends" && incomingCount > 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex h-10 items-center justify-center gap-2 rounded-xl font-poppins text-sm font-semibold uppercase transition-colors ${
                    isActive ? "bg-brand-green text-white" : "text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="size-4" />
                  {tab.label}
                  {tabIncomingBadge && (
                    <span className="rounded-full bg-brand-red px-1.5 py-0.5 text-[10px] font-black text-white">
                      {incomingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <AnimatePresence mode="wait">
            {activeTab === "friends" ? (
              <motion.div
                key="friends"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                {friendsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="size-8 animate-spin text-brand-green" />
                  </div>
                ) : friendsError ? (
                  <div className="rounded-2xl border-2 border-brand-red p-6 text-center">
                    <p className="font-poppins text-sm font-semibold text-brand-red-light">{friendsError}</p>
                  </div>
                ) : hasNoSocialData ? (
                  <div className="rounded-2xl border-2 border-brand-green p-8 text-center">
                    <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-brand-blue">
                      <Users className="size-7 text-white" />
                    </div>
                    <h3 className="mb-1 font-poppins text-base font-semibold uppercase text-white">
                      {t("socialScreen.noFriendsYet")}
                    </h3>
                    <p className="mb-4 font-poppins text-xs font-semibold uppercase text-white/50">
                      {t("socialScreen.searchPrompt")}
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("find")}
                      className="rounded-xl bg-brand-green px-5 py-2.5 font-poppins text-sm font-semibold uppercase text-white hover:brightness-110 transition-all"
                    >
                      {t("socialScreen.findFriends")}
                    </button>
                  </div>
                ) : (
                  <>
                    {incomingRequests.length > 0 && (
                      <section className="space-y-3">
                        <SectionHeader title={t("socialScreen.incomingRequests", { count: incomingRequests.length })} />
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
                      </section>
                    )}

                    {outgoingRequests.length > 0 && (
                      <section className="space-y-3">
                        <SectionHeader title={t("socialScreen.sentRequests", { count: outgoingRequests.length })} />
                        {outgoingRequests.map((item, index) => (
                          <RequestCard
                            key={item.requestId}
                            item={item}
                            index={index}
                            type="outgoing"
                          />
                        ))}
                      </section>
                    )}

                    {friends.length > 0 && (
                      <section className="space-y-3">
                        <SectionHeader title={t("socialScreen.friendsList", { count: friends.length })} />
                        {friends.map((friend, index) => (
                          <PlayerCard
                            key={friend.id}
                            player={friend}
                            index={index}
                            onChallenge={handleChallenge}
                            onRemove={handleRemoveFriend}
                            isChallenging={pendingChallengeId === friend.id}
                            isRemoving={pendingRemoveId === friend.id}
                          />
                        ))}
                      </section>
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
                {!searchActive && !isSearching && (
                  <div className="pt-8 md:pt-12 pb-5 text-center">
                    <h2 className="font-poppins text-3xl md:text-4xl font-semibold uppercase text-white">
                      {t("socialScreen.findYourRivals")}
                    </h2>
                    <p className="mt-2 font-poppins text-xs md:text-sm font-semibold uppercase text-white/50">
                      {t("socialScreen.searchPlayerToAdd")}
                    </p>
                  </div>
                )}

                <div className="relative mx-auto w-full max-w-md">
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t("socialScreen.searchByUsername")}
                    className="h-11 w-full rounded-[10px] bg-brand-blue px-10 text-center font-poppins text-sm font-semibold uppercase text-white outline-none placeholder:text-white/50 focus:ring-2 focus:ring-white"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 transition-colors hover:text-white"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                {isSearching ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-7 animate-spin text-brand-green" />
                  </div>
                ) : searchError ? (
                  <p className="pt-8 text-center font-poppins text-sm font-semibold uppercase text-brand-red-light">{searchError}</p>
                ) : searchActive && searchResults.length === 0 ? (
                  <div className="pt-8 text-center">
                    <h2 className="font-poppins text-xl md:text-2xl font-semibold uppercase text-white">{t("socialScreen.noPlayersFound")}</h2>
                    <p className="mt-2 font-poppins text-[11px] md:text-xs font-semibold uppercase text-white/50">{t("socialScreen.tryDifferentUsername")}</p>
                  </div>
                ) : !searchActive ? null : (
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
    </div>
  );
}

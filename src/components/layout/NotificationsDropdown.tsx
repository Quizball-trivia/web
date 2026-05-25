"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { queryKeys } from "@/lib/queries/queryKeys";
import {
  useFriendRequests,
  type FriendRequestListItem,
  type SocialPlayer,
} from "@/lib/queries/social.queries";
import {
  acceptFriendRequest,
  declineFriendRequest,
} from "@/lib/repositories/social.repo";
import { useLocale } from "@/contexts/LocaleContext";
import { getSocket } from "@/lib/realtime/socket-client";
import type { ErrorPayload, LobbyChallengeStatusPayload } from "@/lib/realtime/socket.types";
import { useRealtimeMatchStore, type LobbyChallengeInvite } from "@/stores/realtimeMatch.store";
import type { MessageKey } from "@/lib/i18n/messages";
import { trackChallengeInviteAccepted, trackChallengeInviteDeclined } from "@/lib/analytics/game-events";

type TranslateFn = (key: MessageKey, params?: Record<string, string | number>) => string;

function getRankedDisplay(player: SocialPlayer, t: TranslateFn) {
  const level = Number.isFinite(player.level) ? player.level : 1;
  const ranked = player.ranked;

  if (!ranked) {
    return { level, tierLabel: t("notifications.tierUnranked"), rpLabel: t("notifications.rpLabel", { rp: 0 }), highlightClass: "text-brand-slate" };
  }
  if (ranked.placementStatus !== "placed") {
    return {
      level,
      tierLabel: t("notifications.tierPlacement", { played: ranked.placementPlayed, required: ranked.placementRequired }),
      rpLabel: t("notifications.rpLabel", { rp: 0 }),
      highlightClass: "text-brand-green-light",
    };
  }
  return { level, tierLabel: ranked.tier, rpLabel: t("notifications.rpLabel", { rp: ranked.rp }), highlightClass: "text-brand-purple" };
}

function RequestRow({
  item,
  index,
  onAccept,
  onDecline,
  pendingAction,
  t,
}: {
  item: FriendRequestListItem;
  index: number;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  pendingAction: "accept" | "decline" | null;
  t: TranslateFn;
}) {
  const ranked = getRankedDisplay(item.user, t);
  const displayName = item.user.nickname ?? t("notifications.unknownUser");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2, delay: index * 0.04, ease: "easeOut" }}
      className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-white/10"
    >
      {/* Avatar */}
      <div className="size-9 shrink-0 overflow-hidden rounded-lg">
        <AvatarDisplay
          customization={item.user.avatarCustomization ?? { base: item.user.avatarUrl ?? undefined }}
          size="xs"
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-poppins text-xs font-semibold text-white">
          {displayName}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="font-poppins text-[10px] font-medium text-white/70">{t("notifications.level", { level: ranked.level })}</span>
          <span className="text-[10px] text-white/50">&middot;</span>
          <span className="font-poppins text-[10px] font-semibold text-white/85">
            {ranked.tierLabel}
          </span>
          <span className="text-[10px] text-white/50">&middot;</span>
          <span className="font-poppins text-[10px] font-semibold text-brand-yellow">{ranked.rpLabel}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => onAccept(item.requestId)}
          disabled={pendingAction !== null}
          className="flex size-9 items-center justify-center rounded-[12px] border-0 bg-brand-green text-white transition-colors hover:bg-brand-green-deep disabled:opacity-50"
          aria-label={t("notifications.acceptRequest", { name: displayName })}
        >
          {pendingAction === "accept" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" strokeWidth={3} />
          )}
        </button>
        <button
          type="button"
          onClick={() => onDecline(item.requestId)}
          disabled={pendingAction !== null}
          className="flex size-9 items-center justify-center rounded-[12px] border-0 bg-brand-red text-white transition-colors hover:bg-brand-red/90 disabled:opacity-50"
          aria-label={t("notifications.declineRequest", { name: displayName })}
        >
          {pendingAction === "decline" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <X className="size-4" strokeWidth={3} />
          )}
        </button>
      </div>
    </motion.div>
  );
}

function ChallengeRow({
  invite,
  index,
  pendingAction,
  onAccept,
  onDecline,
  t,
}: {
  invite: LobbyChallengeInvite;
  index: number;
  pendingAction: "accept" | "decline" | null;
  onAccept: (invite: LobbyChallengeInvite) => void;
  onDecline: (invite: LobbyChallengeInvite) => void;
  t: TranslateFn;
}) {
  const displayName = invite.fromUser.username ?? t("notifications.unknownUser");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2, delay: index * 0.04, ease: "easeOut" }}
      className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-white/10"
    >
      <div className="size-9 shrink-0 overflow-hidden rounded-lg">
        <AvatarDisplay
          customization={invite.fromUser.avatarCustomization ?? { base: invite.fromUser.avatarUrl ?? undefined }}
          size="xs"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-poppins text-xs font-semibold text-white">
          {t("notifications.challengeFrom", { name: displayName })}
        </p>
        <p className="mt-0.5 truncate font-poppins text-[10px] font-semibold uppercase text-brand-yellow">
          {t("notifications.challengeInviteTitle")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => onAccept(invite)}
          disabled={pendingAction !== null}
          className="flex size-9 items-center justify-center rounded-[12px] border-0 bg-brand-green text-white transition-colors hover:bg-brand-green-deep disabled:opacity-50"
          aria-label={t("notifications.challengeAcceptAction")}
        >
          {pendingAction === "accept" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" strokeWidth={3} />}
        </button>
        <button
          type="button"
          onClick={() => onDecline(invite)}
          disabled={pendingAction !== null}
          className="flex size-9 items-center justify-center rounded-[12px] border-0 bg-brand-red text-white transition-colors hover:bg-brand-red/90 disabled:opacity-50"
          aria-label={t("notifications.challengeDeclineAction")}
        >
          {pendingAction === "decline" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" strokeWidth={3} />}
        </button>
      </div>
    </motion.div>
  );
}

export function NotificationsDropdown({ badgeCount }: { badgeCount: number }) {
  const router = useRouter();
  const { t } = useLocale();
  const badgeDisplay = badgeCount > 99 ? "99+" : String(badgeCount);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ requestId: string; action: "accept" | "decline" } | null>(null);
  const [pendingChallengeAction, setPendingChallengeAction] = useState<{ invitationId: string; action: "accept" | "decline" } | null>(null);
  const challengeInvites = useRealtimeMatchStore((state) => state.challengeInvites);
  const removeChallengeInvite = useRealtimeMatchStore((state) => state.removeChallengeInvite);
  const beginLobbyHandoff = useRealtimeMatchStore((state) => state.beginLobbyHandoff);
  const { data: requests } = useFriendRequests();
  const incoming = requests?.incoming ?? [];
  const totalIncoming = incoming.length + challengeInvites.length;

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.social.all });
  };

  const acceptMutation = useMutation({
    mutationFn: (requestId: string) => acceptFriendRequest(requestId),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("notifications.friendRequestAccepted"));
    },
    onError: () => toast.error(t("notifications.acceptFailed")),
  });

  const declineMutation = useMutation({
    mutationFn: (requestId: string) => declineFriendRequest(requestId),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("notifications.friendRequestDeclined"));
    },
    onError: () => toast.error(t("notifications.declineFailed")),
  });

  const handleAccept = async (requestId: string) => {
    if (pendingAction) return;
    setPendingAction({ requestId, action: "accept" });
    try {
      await acceptMutation.mutateAsync(requestId);
    } finally {
      setPendingAction(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    if (pendingAction) return;
    setPendingAction({ requestId, action: "decline" });
    try {
      await declineMutation.mutateAsync(requestId);
    } finally {
      setPendingAction(null);
    }
  };

  useEffect(() => {
    if (!pendingChallengeAction || pendingChallengeAction.action !== "accept") return;
    const socket = getSocket();
    const handleStatus = (payload: LobbyChallengeStatusPayload) => {
      if (payload.invitationId !== pendingChallengeAction.invitationId) return;
      if (payload.status === "accepted" && payload.inviteCode) {
        setOpen(false);
        beginLobbyHandoff(payload.inviteCode);
        router.push(`/friend/room/${payload.inviteCode}`);
      }
      setPendingChallengeAction(null);
    };
    const handleError = (payload: ErrorPayload) => {
      if (!payload.code.startsWith("LOBBY_CHALLENGE") && payload.code !== "TRANSITION_IN_PROGRESS") return;
      setPendingChallengeAction(null);
    };

    socket.on("lobby:challenge_status", handleStatus);
    socket.on("error", handleError);
    return () => {
      socket.off("lobby:challenge_status", handleStatus);
      socket.off("error", handleError);
    };
  }, [beginLobbyHandoff, pendingChallengeAction, router, setOpen]);

  const handleAcceptChallenge = (invite: LobbyChallengeInvite) => {
    if (pendingChallengeAction) return;
    setPendingChallengeAction({ invitationId: invite.invitationId, action: "accept" });
    try {
      trackChallengeInviteAccepted(invite.invitationId);
    } catch (error) {
      console.error('Analytics trackChallengeInviteAccepted failed', error);
    }
    getSocket().emit("lobby:challenge_accept", { invitationId: invite.invitationId });
  };

  const handleDeclineChallenge = (invite: LobbyChallengeInvite) => {
    if (pendingChallengeAction) return;
    setPendingChallengeAction({ invitationId: invite.invitationId, action: "decline" });
    try {
      trackChallengeInviteDeclined(invite.invitationId);
    } catch (error) {
      console.error('Analytics trackChallengeInviteDeclined failed', error);
    }
    getSocket().emit("lobby:challenge_decline", { invitationId: invite.invitationId });
    removeChallengeInvite(invite.invitationId);
    setPendingChallengeAction(null);
  };

  return (
    <>
    {pendingChallengeAction?.action === "accept" && (
      <LoadingScreen text={t("notifications.challengeJoining")} fullScreen className="z-[120]" />
    )}
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            badgeCount > 0
              ? t("notifications.ariaLabelWithCount", { count: badgeCount })
              : t("notifications.ariaLabel")
          }
          className="relative rounded-full hover:bg-white/5"
        >
          <Image
            src="/assets/bell.png"
            alt=""
            width={24}
            height={24}
            className="size-6"
          />
          {badgeCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-red-500 px-1 py-0.5 text-center text-[10px] font-black text-white">
              {badgeDisplay}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[340px] overflow-hidden rounded-[20px] border-0 p-0 font-poppins shadow-[0_18px_48px_rgba(0,0,0,0.45)]"
        style={{ backgroundColor: '#1645FF' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/15 px-4 py-3">
          <h3 className="font-poppins text-sm font-semibold text-white">
            {t("notifications.title")}
          </h3>
          {totalIncoming > 0 && (
            <span className="rounded-full bg-brand-yellow px-2 py-0.5 font-poppins text-[10px] font-bold text-black">
              {totalIncoming}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[320px] overflow-y-auto overscroll-contain">
          {totalIncoming === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-white/15">
                <Bell className="size-5 text-white/80" />
              </div>
              <p className="font-poppins text-xs font-medium text-white/80">{t("notifications.empty")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 p-2">
              <AnimatePresence mode="popLayout">
                {challengeInvites.map((invite, index) => (
                  <ChallengeRow
                    key={invite.invitationId}
                    invite={invite}
                    index={index}
                    pendingAction={
                      pendingChallengeAction?.invitationId === invite.invitationId
                        ? pendingChallengeAction.action
                        : null
                    }
                    onAccept={handleAcceptChallenge}
                    onDecline={handleDeclineChallenge}
                    t={t}
                  />
                ))}
                {incoming.map((item, index) => (
                  <RequestRow
                    key={item.requestId}
                    item={item}
                    index={challengeInvites.length + index}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    pendingAction={pendingAction?.requestId === item.requestId ? pendingAction.action : null}
                    t={t}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>


      </PopoverContent>

      {/* Screen reader announcement */}
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {badgeCount > 0
          ? t(
              badgeCount === 1
                ? "notifications.unreadAnnouncementSingular"
                : "notifications.unreadAnnouncementPlural",
              { count: badgeCount },
            )
          : ""}
      </span>
    </Popover>
    </>
  );
}

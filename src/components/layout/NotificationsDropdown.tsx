"use client";

import Image from "next/image";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { AvatarDisplay } from "@/components/AvatarDisplay";
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
import type { MessageKey } from "@/lib/i18n/messages";

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
      className="flex items-center gap-2.5 rounded-xl border-b-[3px] border-surface-card-deep bg-surface-card px-3 py-2.5"
    >
      {/* Avatar */}
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border-2 border-brand-cyan/20 bg-surface-card-tint">
        <AvatarDisplay
          customization={item.user.avatarCustomization ?? { base: item.user.avatarUrl ?? undefined }}
          size="xs"
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-black text-white">
          {displayName}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-brand-slate">{t("notifications.level", { level: ranked.level })}</span>
          <span className="text-[10px] text-brand-slate">&middot;</span>
          <span className={`text-[10px] font-bold ${ranked.highlightClass}`}>
            {ranked.tierLabel}
          </span>
          <span className="text-[10px] text-brand-slate">&middot;</span>
          <span className="text-[10px] font-bold text-brand-gold">{ranked.rpLabel}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => onAccept(item.requestId)}
          disabled={pendingAction !== null}
          className="flex size-8 items-center justify-center rounded-lg border border-brand-green-light/25 bg-brand-green-light/15 text-brand-green-light transition-colors hover:bg-brand-green-light/25 disabled:opacity-50"
          aria-label={t("notifications.acceptRequest", { name: displayName })}
        >
          {pendingAction === "accept" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" strokeWidth={3} />
          )}
        </button>
        <button
          type="button"
          onClick={() => onDecline(item.requestId)}
          disabled={pendingAction !== null}
          className="flex size-8 items-center justify-center rounded-lg border border-brand-red-soft/20 bg-brand-red-soft/10 text-brand-red-light transition-colors hover:bg-brand-red-soft/20 disabled:opacity-50"
          aria-label={t("notifications.declineRequest", { name: displayName })}
        >
          {pendingAction === "decline" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <X className="size-3.5" strokeWidth={3} />
          )}
        </button>
      </div>
    </motion.div>
  );
}

export function NotificationsDropdown({ badgeCount }: { badgeCount: number }) {
  const { t } = useLocale();
  const badgeDisplay = badgeCount > 99 ? "99+" : String(badgeCount);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ requestId: string; action: "accept" | "decline" } | null>(null);
  const { data: requests } = useFriendRequests();
  const incoming = requests?.incoming ?? [];

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

  return (
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
          {incoming.length > 0 && (
            <span className="rounded-full bg-brand-yellow px-2 py-0.5 font-poppins text-[10px] font-bold text-black">
              {incoming.length}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[320px] overflow-y-auto overscroll-contain">
          {incoming.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-white/15">
                <Bell className="size-5 text-white/80" />
              </div>
              <p className="font-poppins text-xs font-medium text-white/80">{t("notifications.empty")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 p-2">
              <AnimatePresence mode="popLayout">
                {incoming.map((item, index) => (
                  <RequestRow
                    key={item.requestId}
                    item={item}
                    index={index}
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
  );
}

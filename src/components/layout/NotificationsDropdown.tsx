"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Loader2, UserRound, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
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

function getRankedDisplay(player: SocialPlayer) {
  const level = Number.isFinite(player.level) ? player.level : 1;
  const ranked = player.ranked;

  if (!ranked) {
    return { level, tierLabel: "Unranked", rpLabel: "0 RP", highlightClass: "text-[#56707A]" };
  }
  if (ranked.placementStatus !== "placed") {
    return {
      level,
      tierLabel: `Placement ${ranked.placementPlayed}/${ranked.placementRequired}`,
      rpLabel: "0 RP",
      highlightClass: "text-[#58CC02]",
    };
  }
  return { level, tierLabel: ranked.tier, rpLabel: `${ranked.rp} RP`, highlightClass: "text-[#CE82FF]" };
}

function RequestRow({
  item,
  index,
  onAccept,
  onDecline,
  pendingAction,
}: {
  item: FriendRequestListItem;
  index: number;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  pendingAction: "accept" | "decline" | null;
}) {
  const ranked = getRankedDisplay(item.user);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2, delay: index * 0.04, ease: "easeOut" }}
      className="flex items-center gap-2.5 rounded-xl border-b-[3px] border-[#0D1B21] bg-[#1B2F36] px-3 py-2.5"
    >
      {/* Avatar */}
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-[#1CB0F6]/20 bg-[#243B44]">
        {item.user.avatarUrl ? (
          <img
            src={item.user.avatarUrl}
            alt={item.user.nickname ?? ""}
            className="size-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <UserRound className={`size-4 text-[#56707A]${item.user.avatarUrl ? " hidden" : ""}`} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-black text-white">
          {item.user.nickname ?? "Unknown"}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-[#56707A]">Lvl {ranked.level}</span>
          <span className="text-[10px] text-[#56707A]">&middot;</span>
          <span className={`text-[10px] font-bold ${ranked.highlightClass}`}>
            {ranked.tierLabel}
          </span>
          <span className="text-[10px] text-[#56707A]">&middot;</span>
          <span className="text-[10px] font-bold text-[#FFD700]">{ranked.rpLabel}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => onAccept(item.requestId)}
          disabled={pendingAction !== null}
          className="flex size-8 items-center justify-center rounded-lg border border-[#58CC02]/25 bg-[#58CC02]/15 text-[#58CC02] transition-colors hover:bg-[#58CC02]/25 disabled:opacity-50"
          aria-label={`Accept request from ${item.user.nickname}`}
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
          className="flex size-8 items-center justify-center rounded-lg border border-[#FF4B4B]/20 bg-[#FF4B4B]/10 text-[#FF8E8E] transition-colors hover:bg-[#FF4B4B]/20 disabled:opacity-50"
          aria-label={`Decline request from ${item.user.nickname}`}
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
      toast.success("Friend request accepted");
    },
    onError: () => toast.error("Failed to accept request"),
  });

  const declineMutation = useMutation({
    mutationFn: (requestId: string) => declineFriendRequest(requestId),
    onSuccess: async () => {
      await invalidate();
      toast.success("Friend request declined");
    },
    onError: () => toast.error("Failed to decline request"),
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
              ? `Notifications, ${badgeCount} unread`
              : "Notifications"
          }
          className="relative rounded-full text-muted-foreground hover:text-foreground"
        >
          <Bell className="size-5" />
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
        className="w-[340px] overflow-hidden rounded-2xl border border-[#243B44] bg-[#131F24] p-0 shadow-xl shadow-black/40"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#243B44] px-4 py-3">
          <h3 className="text-xs font-black uppercase tracking-[0.18em] text-[#8CB7C7]">
            Notifications
          </h3>
          {incoming.length > 0 && (
            <span className="rounded-full bg-[#FF8A3D]/15 px-2 py-0.5 text-[10px] font-black text-[#FFB37D]">
              {incoming.length}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[320px] overflow-y-auto overscroll-contain">
          {incoming.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-[#243B44]">
                <Bell className="size-5 text-[#56707A]" />
              </div>
              <p className="text-xs font-bold text-[#56707A]">No notifications</p>
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
          ? `You have ${badgeCount} new notification${badgeCount === 1 ? "" : "s"}`
          : ""}
      </span>
    </Popover>
  );
}

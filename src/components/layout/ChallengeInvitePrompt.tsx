"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Swords, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { getSocket } from "@/lib/realtime/socket-client";
import type { ErrorPayload, LobbyChallengeStatusPayload } from "@/lib/realtime/socket.types";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";

export function ChallengeInvitePrompt() {
  const router = useRouter();
  const { t } = useLocale();
  const invites = useRealtimeMatchStore((state) => state.challengeInvites);
  const beginLobbyHandoff = useRealtimeMatchStore((state) => state.beginLobbyHandoff);
  const [pendingAction, setPendingAction] = useState<"accept" | null>(null);
  const [pendingAcceptId, setPendingAcceptId] = useState<string | null>(null);
  const [dismissedInviteIds, setDismissedInviteIds] = useState<Set<string>>(() => new Set());
  const invite = invites.find((item) => !dismissedInviteIds.has(item.invitationId)) ?? null;
  const fromName = invite?.fromUser.username ?? t("notifications.unknownUser");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!invite) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [invite]);
  const expiresLabel = useMemo(() => {
    if (!invite) return "";
    const ms = new Date(invite.expiresAt).getTime() - now;
    const minutes = Math.max(1, Math.ceil(ms / 60000));
    return t("notifications.challengeExpiresIn", { minutes });
  }, [invite, now, t]);

  useEffect(() => {
    if (!pendingAcceptId) return;
    const socket = getSocket();
    const handleStatus = (payload: LobbyChallengeStatusPayload) => {
      if (payload.invitationId !== pendingAcceptId) return;
      if (payload.status === "accepted" && payload.inviteCode) {
        beginLobbyHandoff(payload.inviteCode);
        router.push(`/friend/room/${payload.inviteCode}`);
      }
      setPendingAction(null);
      setPendingAcceptId(null);
    };
    const handleError = (payload: ErrorPayload) => {
      if (!payload.code.startsWith("LOBBY_CHALLENGE") && payload.code !== "TRANSITION_IN_PROGRESS") return;
      setPendingAction(null);
      setPendingAcceptId(null);
    };

    socket.on("lobby:challenge_status", handleStatus);
    socket.on("error", handleError);
    return () => {
      socket.off("lobby:challenge_status", handleStatus);
      socket.off("error", handleError);
    };
  }, [beginLobbyHandoff, pendingAcceptId, router]);

  const handleAccept = () => {
    if (!invite || pendingAction) return;
    setPendingAction("accept");
    setPendingAcceptId(invite.invitationId);
    getSocket().emit("lobby:challenge_accept", { invitationId: invite.invitationId });
  };

  const handleDismiss = () => {
    if (!invite || pendingAction) return;
    setDismissedInviteIds((current) => {
      const next = new Set(current);
      next.add(invite.invitationId);
      return next;
    });
  };

  return (
    <>
      {pendingAcceptId && (
        <LoadingScreen text={t("notifications.challengeJoining")} fullScreen className="z-[120]" />
      )}
      <AnimatePresence>
        {invite && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-x-3 bottom-20 z-[80] mx-auto max-w-md rounded-[20px] border-0 p-4 font-poppins shadow-[0_18px_48px_rgba(0,0,0,0.45)] md:bottom-5 md:right-5 md:left-auto md:mx-0"
            style={{ backgroundColor: '#1645FF' }}
          >
            <div className="flex items-center gap-3">
              <div className="size-12 shrink-0 overflow-hidden rounded-xl">
                <AvatarDisplay
                  customization={invite.fromUser.avatarCustomization ?? { base: invite.fromUser.avatarUrl ?? undefined }}
                  size="sm"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-poppins text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-yellow">
                  <Swords className="size-3" />
                  {t("notifications.challengeInviteTitle")}
                </div>
                <p className="mt-1 truncate font-poppins text-sm font-semibold uppercase text-white">
                  {t("notifications.challengeFrom", { name: fromName })}
                </p>
                <p className="mt-0.5 font-poppins text-[11px] font-medium uppercase text-white/70">{expiresLabel}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={handleDismiss}
                disabled={pendingAction !== null}
                className="h-11 rounded-[16px] border-0 bg-brand-yellow font-poppins text-xs font-semibold uppercase tracking-wide text-black shadow-none hover:bg-brand-yellow/90 hover:shadow-none focus-visible:ring-0"
              >
                <X className="mr-1.5 size-4" />
                {t("notifications.challengeDismissAction")}
              </Button>
              <Button
                type="button"
                onClick={handleAccept}
                disabled={pendingAction !== null}
                className="h-11 rounded-[16px] border-0 bg-brand-green from-brand-green to-brand-green font-poppins text-xs font-semibold uppercase tracking-wide text-white shadow-none hover:bg-brand-green-deep hover:from-brand-green-deep hover:to-brand-green-deep hover:shadow-none focus-visible:ring-0"
              >
                {pendingAction === "accept" ? <Loader2 className="size-4 animate-spin" /> : <Check className="mr-1.5 size-4" />}
                {t("notifications.challengeAcceptAction")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

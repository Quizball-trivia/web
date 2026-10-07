"use client";

import type { ReactNode } from "react";
import { AlertCircle, ArrowLeft, Flag, Hourglass, Plus, RotateCcw, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import type { MessageKey } from "@/lib/i18n/messages";
import type { LobbyJoinRoomInfo } from "@/lib/realtime/socket.types";

export interface InviteFailureView {
  inviteCode: string;
  reasonCode: string;
  messageKey: MessageKey;
  retryable: boolean;
  room: LobbyJoinRoomInfo | null;
}

type Kind = "account" | "full" | "ended" | "in_progress" | "expired" | "failed";

export function inviteFailureKind(failure: Pick<InviteFailureView, "reasonCode" | "room">): Kind {
  if (failure.reasonCode === "LOBBY_MODE_REQUIRES_ACCOUNT") return "account";
  if (failure.reasonCode === "LOBBY_FULL") return "full";
  if (failure.reasonCode === "LOBBY_NOT_FOUND") {
    if (failure.room?.roomState === "ended") return "ended";
    if (failure.room?.roomState === "in_progress") return "in_progress";
    return "expired";
  }
  return "failed";
}

const poppins = "'Poppins', sans-serif";

function ActionButton({ onClick, icon, children, primary = false }: { onClick: () => void; icon: ReactNode; children: ReactNode; primary?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("flex h-12 items-center justify-center gap-2 rounded-[16px] px-5 uppercase transition-all active:scale-[0.98]",
        primary ? "bg-brand-green text-white hover:bg-brand-green-deep" : "bg-white/10 text-white hover:bg-white/15")}
      style={{ fontFamily: poppins, fontWeight: 600, fontSize: 13, letterSpacing: "0.04em" }}>
      {icon}
      {children}
    </button>
  );
}

/**
 * A friend-room invite that could not be joined, with a way forward for each reason: a guest refused by an
 * account-only mode signs up and comes back; an ended, full or mid-game room offers a new room (or trying again).
 */
export function InviteFailureScreen({ failure, code, onRetry, onBack, onSignUp, onNewRoom, onTryAgain }: {
  failure: InviteFailureView;
  code: string;
  onRetry: () => void;
  onBack: () => void;
  onSignUp: () => void;
  onNewRoom: () => void;
  onTryAgain: () => void;
}) {
  const { t } = useLocale();
  const kind = inviteFailureKind(failure);
  const host = failure.room?.hostNickname?.trim() || t("friend.inviteHostFallback");
  const isError = kind === "failed" || kind === "expired";
  const Icon = kind === "account" ? UserPlus : kind === "ended" ? Flag : kind === "in_progress" ? Hourglass : kind === "full" ? Users : AlertCircle;

  const title =
    kind === "account" ? t("friend.inviteAccountTitle", { host })
      : kind === "full" ? t("friend.inviteFullTitle")
        : kind === "ended" ? t("friend.inviteEndedTitle")
          : kind === "in_progress" ? t("friend.inviteInProgressTitle", { host })
            : kind === "expired" ? t("friend.inviteExpiredTitle")
              : t("friend.inviteJoinFailedTitle");
  const description =
    kind === "account" ? t("friend.inviteAccountDescription")
      : kind === "full" ? t("friend.inviteFullDescription", { code })
        : kind === "ended" ? t("friend.inviteEndedDescription", { host })
          : kind === "in_progress" ? t("friend.inviteInProgressDescription")
            : kind === "expired" ? t("friend.inviteExpiredDescription")
              : t("friend.inviteJoinFailedDescription", { code });

  const back = <ActionButton onClick={onBack} icon={<ArrowLeft className="size-4" />}>{t("friend.backToFriendHub")}</ActionButton>;

  return (
    <div className="container mx-auto max-w-5xl px-3 py-6 animate-in fade-in lg:px-0">
      <div className={cn("flex min-h-[420px] flex-col items-center justify-center gap-5 rounded-[20px] border px-6 text-center",
        isError ? "border-brand-red/40 bg-brand-red/10" : "border-white/10 bg-white/[0.04]")}>
        <Icon className={cn("size-10", isError ? "text-brand-red" : kind === "account" ? "text-brand-yellow" : "text-white/70")} aria-hidden />
        <div className="max-w-md space-y-3">
          <h1 className="text-white uppercase" style={{ fontFamily: poppins, fontWeight: 700, fontSize: 24, letterSpacing: "0.04em" }}>{title}</h1>
          <p className="text-white/65" style={{ fontFamily: poppins, fontWeight: 500, fontSize: 14, lineHeight: 1.45 }}>{description}</p>
          {kind === "failed" && (
            <p className="text-white/45 uppercase" style={{ fontFamily: poppins, fontWeight: 600, fontSize: 11, letterSpacing: "0.08em" }}>
              {t(failure.messageKey)}
            </p>
          )}
        </div>
        <div className="flex w-full max-w-md flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
          {kind === "account" && <ActionButton primary onClick={onSignUp} icon={<UserPlus className="size-4" />}>{t("friend.inviteCreateAccount")}</ActionButton>}
          {kind === "in_progress" && <ActionButton primary onClick={onTryAgain} icon={<RotateCcw className="size-4" />}>{t("friend.inviteTryAgain")}</ActionButton>}
          {(kind === "ended" || kind === "expired") && <ActionButton primary onClick={onNewRoom} icon={<Plus className="size-4" />}>{t("friend.inviteNewRoom")}</ActionButton>}
          {(kind === "full" || kind === "in_progress") && <ActionButton primary={kind === "full"} onClick={onNewRoom} icon={<Plus className="size-4" />}>{t("friend.inviteOwnRoom")}</ActionButton>}
          {kind === "failed" && failure.retryable && <ActionButton primary onClick={onRetry} icon={<RotateCcw className="size-4" />}>{t("friend.retry")}</ActionButton>}
          {back}
        </div>
      </div>
    </div>
  );
}

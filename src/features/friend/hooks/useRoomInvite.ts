"use client";

import { useCallback, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";
import { trackFriendInviteSent } from "@/lib/analytics/game-events";
import { buildFriendInviteUrl } from "@/lib/auth/postAuthRedirect";
import { copyToClipboard } from "@/utils/clipboard";

const subscribeNoop = () => () => {};
/** The Web Share API (phones, Safari, Chrome on Mac/Windows). Read after hydration so server and client HTML agree. */
const hasWebShare = () => typeof navigator !== "undefined" && typeof navigator.share === "function";

function track(method: "link_copy" | "code_copy" | "social_share", lobbyId?: string) {
  try {
    trackFriendInviteSent(method, lobbyId);
  } catch (error) {
    console.error("Analytics trackFriendInviteSent failed", error);
  }
}

/**
 * Invite actions for a friend room: copy the code, copy the full link, or open the
 * device's share sheet. Shared by the room header and the "you're alone" prompt.
 */
export function useRoomInvite(lobbyCode: string | null, lobbyId?: string | null) {
  const { t } = useLocale();
  const canShare = useSyncExternalStore(subscribeNoop, hasWebShare, () => false);
  const inviteUrl = lobbyCode ? buildFriendInviteUrl(lobbyCode) : null;
  /** The link as people read it: no protocol, so `quizball.io/friend/room/AB12CD`. */
  const displayUrl = inviteUrl ? inviteUrl.replace(/^https?:\/\//, "") : null;

  const copyCode = useCallback(async () => {
    if (!lobbyCode) return;
    if (await copyToClipboard(lobbyCode)) {
      track("code_copy", lobbyId ?? undefined);
      toast.success(t("friend.roomCodeCopied"));
    }
  }, [lobbyCode, lobbyId, t]);

  const copyLink = useCallback(async () => {
    if (!inviteUrl) return;
    if (await copyToClipboard(inviteUrl)) {
      track("link_copy", lobbyId ?? undefined);
      toast.success(t("friend.inviteLinkCopied"));
    }
  }, [inviteUrl, lobbyId, t]);

  /** Opens the share sheet; falls back to copying the link where there is none (or it fails for a reason other than cancel). */
  const share = useCallback(async () => {
    if (!inviteUrl || !lobbyCode) return;
    if (!hasWebShare()) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title: "QuizBall", text: t("friend.shareText", { code: lobbyCode }), url: inviteUrl });
      track("social_share", lobbyId ?? undefined);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copyLink();
    }
  }, [copyLink, inviteUrl, lobbyCode, lobbyId, t]);

  return { inviteUrl, displayUrl, canShare, copyCode, copyLink, share };
}

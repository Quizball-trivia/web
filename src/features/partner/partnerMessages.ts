import type { PartnerSessionEndedReason } from "./api/partnerApi.types";
import { partnerParentOrigins } from "./partnerOrigins";

// API contract v1.1 §5.4.
export type PartnerLaunchFailedReason = "token_expired" | "token_used" | "token_unknown" | "player_blocked" | "error";
export type PartnerSessionEndReason = "reloaded" | PartnerSessionEndedReason;

export type PartnerParentMessage =
  | { type: "quizball:ready" }
  | { type: "quizball:launch_failed"; reason: PartnerLaunchFailedReason }
  | { type: "quizball:relaunch_required"; reason: PartnerSessionEndReason }
  | { type: "quizball:close" };

/** Posts to the parent frame; a no-op when the page is not embedded. Never targets "*". */
export function postToPartnerParent(message: PartnerParentMessage, origins = partnerParentOrigins()): void {
  if (typeof window === "undefined") return;
  const parent = window.parent;
  if (!parent || parent === window) return;
  const envelope = { source: "quizball", version: 1, ...message };
  // A target origin that is not the parent's is dropped by the browser, so listing test + production is safe.
  for (const origin of origins) {
    try {
      parent.postMessage(envelope, origin);
    } catch {
      // A malformed target origin throws; the other origins still get the message.
    }
  }
}

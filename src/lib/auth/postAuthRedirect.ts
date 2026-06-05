import type { User } from "@/lib/types";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import {
  extractFriendInviteCodeFromPath,
  normalizeFriendInviteCode,
} from "@/lib/friend/inviteCode";
import { isOnboardingComplete } from "./onboarding";

export function buildFriendInvitePath(code: string): string | null {
  const normalized = normalizeFriendInviteCode(code);
  return normalized ? `/friend/room/${normalized}` : null;
}

export function buildFriendInviteUrl(code: string, origin?: string): string | null {
  const path = buildFriendInvitePath(code);
  if (!path) return null;
  const baseOrigin = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return baseOrigin ? `${baseOrigin}${path}` : path;
}

export function normalizePostAuthRedirect(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const code = extractFriendInviteCodeFromPath(pathname);
  return code ? buildFriendInvitePath(code) : null;
}

export function rememberPostAuthRedirect(pathname: string | null | undefined): void {
  const redirect = normalizePostAuthRedirect(pathname);
  if (!redirect) return;
  storage.set(STORAGE_KEYS.POST_AUTH_REDIRECT, redirect);
}

export function consumePostAuthRedirect(): string | null {
  const redirect = normalizePostAuthRedirect(storage.get(STORAGE_KEYS.POST_AUTH_REDIRECT, ""));
  storage.remove(STORAGE_KEYS.POST_AUTH_REDIRECT);
  return redirect;
}

export function peekPostAuthRedirect(): string | null {
  return normalizePostAuthRedirect(storage.get(STORAGE_KEYS.POST_AUTH_REDIRECT, ""));
}

export function getPostAuthEntryRoute(user: User | null | undefined): "/play" | "/onboarding" | string {
  if (!isOnboardingComplete(user)) return "/onboarding";
  return consumePostAuthRedirect() ?? "/play";
}

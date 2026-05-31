const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/g;
const FRIEND_INVITE_CODE_RE = /^[A-Z0-9]{3,12}$/;
const FRIEND_ROOM_PATH_RE = /^\/friend\/room\/([A-Za-z0-9]{3,12})\/?$/;
const FRIEND_ROOM_LINK_RE =
  /(?:^|[\s"'(<])(?:https?:\/\/)?(?:[A-Za-z0-9.-]+(?::\d+)?\/)?friend\/room\/([A-Za-z0-9]{3,12})(?=$|[/?#\s"')>.,])/i;

function cleanInviteInput(input: string): string {
  return input.replace(ZERO_WIDTH_RE, "").trim();
}

export function normalizeFriendInviteCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const normalized = cleanInviteInput(code).toUpperCase();
  return FRIEND_INVITE_CODE_RE.test(normalized) ? normalized : null;
}

export function extractFriendInviteCodeFromPath(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const match = FRIEND_ROOM_PATH_RE.exec(cleanInviteInput(pathname));
  return match ? normalizeFriendInviteCode(match[1]) : null;
}

export function extractFriendInviteCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = cleanInviteInput(input);
  const rawCode = normalizeFriendInviteCode(cleaned);
  if (rawCode) return rawCode;

  try {
    const url = new URL(cleaned);
    const fromUrlPath = extractFriendInviteCodeFromPath(url.pathname);
    if (fromUrlPath) return fromUrlPath;
  } catch {
    // Not a standalone URL. Try a copied path/link embedded in text below.
  }

  const pathCode = extractFriendInviteCodeFromPath(cleaned);
  if (pathCode) return pathCode;

  const linkMatch = FRIEND_ROOM_LINK_RE.exec(cleaned);
  return linkMatch ? normalizeFriendInviteCode(linkMatch[1]) : null;
}

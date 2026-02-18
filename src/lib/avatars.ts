/** Default avatar seed for the current user / primary player */
export const DEFAULT_AVATAR_PRIMARY = "avatar-2";

/** Default avatar seed for opponents / secondary players */
export const DEFAULT_AVATAR_SECONDARY = "avatar-1";

export const avatarSeeds = [
  "striker",
  "goalkeeper",
  "defender",
  "midfielder",
  "captain",
  "coach",
  "ronaldo",
  "messi",
  "neymar",
  "mbappe",
  "haaland",
  "benzema",
  "liverpool",
  "barcelona",
  "madrid",
  "bayern",
  "arsenal",
  "chelsea",
  "legend",
  "rookie",
  "veteran",
  "champion",
  "winner",
  "pro",
];

const DEFAULT_BG = "b6e3f4,c0aede,d1d4f9";

export function getDiceBearAvatarUrl(seed: string, size = 128, background = DEFAULT_BG) {
  const encodedSeed = encodeURIComponent(seed);
  const encodedBackground = encodeURIComponent(background);
  return `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodedSeed}&backgroundColor=${encodedBackground}&size=${size}`;
}

/**
 * Resolve an avatar value to a renderable URL.
 * Supports http(s), data:image, and path URLs; falls back to DiceBear for seeds/emoji.
 */
export function resolveAvatarUrl(value: string | null | undefined, fallbackSeed: string, size = 96): string {
  const raw = value?.trim();
  if (!raw) return getDiceBearAvatarUrl(fallbackSeed, size);
  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('data:image/') ||
    raw.startsWith('/')
  ) {
    return raw;
  }
  return getDiceBearAvatarUrl(raw, size);
}

/** Check whether a string looks like a renderable URL (for `<img>`) vs an emoji/text literal. */
export function isAvatarUrl(avatar: string): boolean {
  return avatar.startsWith('http') || avatar.startsWith('/') || avatar.startsWith('data:image/');
}

export function isGoogleAvatarUrl(url: string | null | undefined) {
  if (!url) return false;
  return /googleusercontent\.com/i.test(url);
}

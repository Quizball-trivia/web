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

export function isGoogleAvatarUrl(url: string | null | undefined) {
  if (!url) return false;
  return /googleusercontent\.com/i.test(url);
}

import type { AvatarCustomization } from "@/types/game";
import { DEFAULT_HAIR_ID, DEFAULT_JERSEY_ID, DEFAULT_SKIN_ID, getSkinPart } from "@/lib/avatars/parts";

/** Available avatar color keys (kept for legacy callers — used only by the picker swatch hint). */
export const AVATAR_COLORS = ["green", "blue", "yellow", "red", "violet", "pink"] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

/** Hex swatches used in the picker (matches the body of the rendered jersey). */
export const AVATAR_COLOR_SWATCHES: Record<AvatarColor, string> = {
  green: "#21B41B",
  blue: "#1F2DAB",
  yellow: "#FFEC1F",
  red: "#FB3101",
  violet: "#BA02E8",
  pink: "#E933A6",
};

/** Default avatar id used by legacy code paths that read a single string. */
export const DEFAULT_AVATAR_PRIMARY = DEFAULT_SKIN_ID;
export const DEFAULT_AVATAR_SECONDARY = DEFAULT_SKIN_ID;

/** Custom URI scheme used to round-trip layered avatar customizations through `avatar_url`. */
const AVATAR_URI_PREFIX = "qb-avatar:";

/** Whether a value is a known free avatar color key. */
export function isAvatarColor(value: string | null | undefined): value is AvatarColor {
  return typeof value === "string" && (AVATAR_COLORS as readonly string[]).includes(value);
}

/**
 * Get the local asset path for the avatar base. Always returns the default skin's bald body
 * (callers that need a different skin should use `getSkinPart(id).asset` directly).
 * Kept tolerant of legacy 1-arg call sites.
 */
export function getAvatarAsset(_legacy?: string | null | undefined): string {
  void _legacy;
  return getSkinPart(DEFAULT_SKIN_ID).asset;
}

/**
 * Resolve any avatar value (URL, color key, or qb-avatar URI) to a renderable URL.
 * - http/data/path URLs pass through
 * - everything else maps to the default skin asset
 */
export function resolveAvatarUrl(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return getSkinPart(DEFAULT_SKIN_ID).asset;
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:image/") ||
    raw.startsWith("/")
  ) {
    return raw;
  }
  // Try decoding qb-avatar URI → return the underlying skin asset
  const decoded = decodeAvatarCustomization(raw);
  if (decoded) return getSkinPart(decoded.skin).asset;
  return getSkinPart(DEFAULT_SKIN_ID).asset;
}

/** Whether a string looks like a renderable URL (for `<img>`) vs a key / seed. */
export function isAvatarUrl(avatar: string): boolean {
  return avatar.startsWith("http") || avatar.startsWith("/") || avatar.startsWith("data:image/");
}

export function isGoogleAvatarUrl(url: string | null | undefined) {
  if (!url) return false;
  return /googleusercontent\.com/i.test(url);
}

/* ───────── Customization encoding (qb-avatar URI) ───────── */

/**
 * Encode a customization to a `qb-avatar:` URI for storage in `avatar_url`.
 *   { skin: 'skin_male_white', jersey: 'jersey_green', hair: 'hair_boy_basic' }
 *   → 'qb-avatar:skin_male_white?jersey=jersey_green&hair=hair_boy_basic'
 */
export function encodeAvatarCustomization(c: AvatarCustomization): string {
  const params = new URLSearchParams();
  if (c.jersey) params.set("jersey", c.jersey);
  if (c.hair) params.set("hair", c.hair);
  if (c.glasses) params.set("glasses", c.glasses);
  if (c.facialHair) params.set("facial", c.facialHair);
  const qs = params.toString();
  return `${AVATAR_URI_PREFIX}${c.skin}${qs ? `?${qs}` : ""}`;
}

/**
 * Decode a `qb-avatar:` URI back into a customization. Returns null for non-encoded values
 * (URLs, asset paths, raw color strings).
 */
export function decodeAvatarCustomization(value: string | null | undefined): AvatarCustomization | null {
  if (!value || !value.startsWith(AVATAR_URI_PREFIX)) return null;
  const tail = value.slice(AVATAR_URI_PREFIX.length);
  const [skin, query] = tail.split("?", 2);
  const params = new URLSearchParams(query ?? "");
  return {
    skin: skin || DEFAULT_SKIN_ID,
    jersey: params.get("jersey") ?? undefined,
    hair: params.get("hair") ?? undefined,
    glasses: params.get("glasses") ?? undefined,
    facialHair: params.get("facial") ?? undefined,
  };
}

/**
 * Resolve any avatar value to a normalized customization.
 *
 * Behavior:
 *  - If value is a `qb-avatar:` URI → decode and respect each slot literally (a missing slot stays
 *    missing, so users who explicitly removed an item keep it removed).
 *  - If value is an external URL (Google) → return defaults plus the URL via `base`.
 *  - Otherwise (no saved value at all) → fresh-user defaults: light skin + green jersey + boy hair.
 */
export function customizationFromAvatarValue(value: string | null | undefined): AvatarCustomization {
  const decoded = decodeAvatarCustomization(value);
  if (decoded) {
    return {
      skin: decoded.skin || DEFAULT_SKIN_ID,
      jersey: decoded.jersey,
      hair: decoded.hair,
      glasses: decoded.glasses,
      facialHair: decoded.facialHair,
    };
  }
  if (typeof value === "string" && isAvatarUrl(value)) {
    return {
      skin: DEFAULT_SKIN_ID,
      jersey: DEFAULT_JERSEY_ID,
      hair: DEFAULT_HAIR_ID,
      base: value,
    };
  }
  return {
    skin: DEFAULT_SKIN_ID,
    jersey: DEFAULT_JERSEY_ID,
    hair: DEFAULT_HAIR_ID,
  };
}

import { getDiceBearAvatarUrl } from "@/lib/avatars";

export interface AvatarStoreProductLike {
  slug: string;
  name: Record<string, string>;
  metadata: unknown;
}

const KNOWN_PREMIUM_AVATAR_SEEDS = new Set<string>([
  "ronaldo",
  "messi",
  "neymar",
  "mbappe",
]);

export function isKnownPremiumAvatarSeed(seed: string): boolean {
  return KNOWN_PREMIUM_AVATAR_SEEDS.has(seed.toLowerCase());
}

export function readAvatarMetadata(
  metadata: unknown
): { avatarKey?: string; assetUrl?: string } {
  if (!metadata || typeof metadata !== "object") return {};
  const raw = metadata as Record<string, unknown>;
  return {
    avatarKey: typeof raw.avatarKey === "string" ? raw.avatarKey : undefined,
    assetUrl: typeof raw.assetUrl === "string" ? raw.assetUrl : undefined,
  };
}

export function getAvatarSeed(product: AvatarStoreProductLike): string {
  const { avatarKey } = readAvatarMetadata(product.metadata);
  return avatarKey ?? product.slug;
}

export function getAvatarLabel(product: AvatarStoreProductLike): string {
  const seed = getAvatarSeed(product);
  return product.name.en ?? seed.replace(/[_-]/g, " ");
}

export function isJerseyAvatarProduct(product: AvatarStoreProductLike): boolean {
  const seed = getAvatarSeed(product).toLowerCase();
  const slug = product.slug.toLowerCase();
  const name = (product.name.en ?? "").toLowerCase();

  return (
    slug.includes("jersey") ||
    slug.includes("kit") ||
    seed.includes("jersey") ||
    seed.includes("kit") ||
    name.includes("jersey") ||
    name.includes("kit")
  );
}

export function getAvatarImage(
  product: AvatarStoreProductLike,
  size = 256
): string {
  const parsed = readAvatarMetadata(product.metadata);
  const seed = parsed.avatarKey ?? product.slug;
  const assetUrl = parsed.assetUrl;

  // Legacy seed data used /avatars/* paths that no longer exist.
  if (assetUrl && !assetUrl.startsWith("/avatars/")) {
    return assetUrl;
  }

  return getDiceBearAvatarUrl(seed, size);
}

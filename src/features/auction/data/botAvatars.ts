import type { AvatarCustomization } from '@/types/game';
import {
  SKIN_IDS,
  JERSEY_IDS,
  HAIR_IDS,
  GLASSES_IDS,
  FACIAL_HAIR_IDS,
} from '@/lib/avatars/parts';

// Deterministic string hash → stable pseudo-random per seed (seatId). Stable so
// a bot keeps the same look across re-renders / reconnects within a match.
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(list: readonly T[], n: number): T {
  return list[n % list.length];
}

/**
 * Build a deterministic random layered avatar (skin + jersey + hair, with
 * occasional glasses / facial hair) for an AI bidder, keyed by its seatId so
 * the look is stable. Real users always render their own avatarCustomization;
 * this is only for bots / seats with no real avatar.
 */
export function randomBotAvatar(seed: string): AvatarCustomization {
  const h = hashSeed(seed);
  const avatar: AvatarCustomization = {
    skin: pick(SKIN_IDS, h),
    jersey: pick(JERSEY_IDS, h >> 3),
    hair: pick(HAIR_IDS, h >> 7),
  };
  // ~40% of bots wear glasses, ~40% have facial hair — varied but not on everyone.
  if (GLASSES_IDS.length && (h >> 11) % 10 < 4) {
    avatar.glasses = pick(GLASSES_IDS, h >> 13);
  }
  if (FACIAL_HAIR_IDS.length && (h >> 17) % 10 < 4) {
    avatar.facialHair = pick(FACIAL_HAIR_IDS, h >> 19);
  }
  return avatar;
}

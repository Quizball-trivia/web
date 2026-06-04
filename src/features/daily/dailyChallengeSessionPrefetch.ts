import { createDailyChallengeSession } from "@/lib/repositories/dailyChallenges.repo";
import { toDailyChallengeSession } from "@/lib/mappers/dailyChallenge.mapper";
import type { DailyChallengeSession, DailyChallengeType } from "@/lib/domain/dailyChallenge";
import type { Locale } from "@/lib/i18n/messages";

type PrefetchKey = `${DailyChallengeType}:${string}`;

interface PrefetchEntry {
  promise: Promise<DailyChallengeSession>;
  createdAt: number;
}

// Sessions are created by a POST (side-effecting), so we deliberately keep ONE
// in-flight/resolved session per challenge+locale and hand it to the challenge
// page when it mounts — instead of the page POSTing a second time. This is what
// makes "start the request on tap-down" safe: the page consumes the same
// session the press kicked off, never a duplicate.
const cache = new Map<PrefetchKey, PrefetchEntry>();

// A prefetched session is only considered fresh for a short window. Past this,
// the page creates a new one (the user may have sat on the hub for a while).
const TTL_MS = 60_000;

function keyFor(challengeType: DailyChallengeType, locale: Locale): PrefetchKey {
  return `${challengeType}:${locale}`;
}

/**
 * Kick off (or reuse) a daily-challenge session for this challenge. Call on
 * pointer-down from the hub card so the network round-trip overlaps the
 * navigation. Returns the in-flight/resolved promise; safe to call repeatedly.
 */
export function prefetchDailyChallengeSession(
  challengeType: DailyChallengeType,
  locale: Locale,
  now: number,
): Promise<DailyChallengeSession> {
  const key = keyFor(challengeType, locale);
  const existing = cache.get(key);
  if (existing && now - existing.createdAt < TTL_MS) {
    return existing.promise;
  }

  const promise = createDailyChallengeSession(challengeType, locale)
    .then(toDailyChallengeSession)
    .catch((error) => {
      // Drop a failed prefetch so the page's own fetch can retry cleanly.
      cache.delete(key);
      throw error;
    });

  cache.set(key, { promise, createdAt: now });
  return promise;
}

/**
 * Consume a prefetched session if one is fresh, removing it so it's used once.
 * Returns null when there's nothing fresh to reuse (the page should fetch).
 */
export function consumeDailyChallengeSession(
  challengeType: DailyChallengeType,
  locale: Locale,
  now: number,
): Promise<DailyChallengeSession> | null {
  const key = keyFor(challengeType, locale);
  const entry = cache.get(key);
  if (!entry) return null;
  cache.delete(key);
  if (now - entry.createdAt >= TTL_MS) return null;
  return entry.promise;
}

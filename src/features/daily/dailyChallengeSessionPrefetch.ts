import { createDailyChallengeSession } from "@/lib/repositories/dailyChallenges.repo";
import { toDailyChallengeSession } from "@/lib/mappers/dailyChallenge.mapper";
import type { DailyChallengeSession, DailyChallengeType } from "@/lib/domain/dailyChallenge";
import type { Locale } from "@/lib/i18n/messages";

type PrefetchKey = `${DailyChallengeType}:${string}`;

interface PrefetchEntry {
  promise: Promise<DailyChallengeSession>;
  // Mutable resolution timestamp — null while still in flight, set when the POST
  // resolves. Freshness is measured from this, not from when the request started,
  // so a slow request is never treated as stale mid-flight (which would trigger a
  // duplicate POST). A box so the .then closure can stamp it after construction.
  resolved: { at: number | null };
}

// True when this entry should still be reused: a pending request is ALWAYS
// reusable; a resolved one only within the TTL of when it resolved.
function isFresh(entry: PrefetchEntry, now: number): boolean {
  return entry.resolved.at === null || now - entry.resolved.at < TTL_MS;
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
  if (existing && isFresh(existing, now)) {
    return existing.promise;
  }

  const resolved: { at: number | null } = { at: null };
  const promise = createDailyChallengeSession(challengeType, locale)
    .then((raw) => {
      // Stamp resolution time so the TTL counts from when the POST finished,
      // not when it started.
      resolved.at = Date.now();
      return toDailyChallengeSession(raw);
    })
    .catch((error) => {
      // Drop a failed prefetch so the page's own fetch can retry cleanly.
      cache.delete(key);
      throw error;
    });

  cache.set(key, { promise, resolved });
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
  // A still-pending request is always reusable; a resolved one only within TTL.
  if (!isFresh(entry, now)) return null;
  return entry.promise;
}

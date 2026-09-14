"use client";

import { getGeorgianPhoneAuthAvailability } from "@/lib/auth/auth.service";

/**
 * One probe per tab for "is Georgian phone sign-in available for this visitor".
 *
 * The backend answers from the visitor's IP; the answer is stable for a visit, yet
 * the hook used to fetch on every mount (the sign-in dialog mounts on every page for
 * every guest). This resolver shares one in-flight request across subscribers,
 * keeps the result in memory and in sessionStorage for an hour (so a reload does
 * not probe again), never caches a failure, and never stores anything beyond the
 * country code, the flag and a timestamp.
 */
export interface PhoneAuthAvailabilityResult {
  country: string | null;
  isAvailable: boolean;
}

interface CachedResult extends PhoneAuthAvailabilityResult {
  resolvedAt: number;
}

export const PHONE_AVAILABILITY_TTL_MS = 60 * 60 * 1000;
/** After a failed probe, mounts within this window do not retry (one bad network moment ≠ a storm). */
export const PHONE_AVAILABILITY_FAILURE_COOLDOWN_MS = 30 * 1000;
export const PHONE_AVAILABILITY_TIMEOUT_MS = 8 * 1000;
const STORAGE_KEY = "qb.phoneAuthAvailability.v1";

type Listener = (result: PhoneAuthAvailabilityResult | null) => void;

let memory: CachedResult | null = null;
let inFlight: Promise<PhoneAuthAvailabilityResult | null> | null = null;
let failedAt = 0;
let restoredFromStorage = false;

function readStorage(now: number): CachedResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const v = parsed as Record<string, unknown>;
    if (v.version !== 1 || typeof v.resolvedAt !== "number" || typeof v.isAvailable !== "boolean") return null;
    if (v.country !== null && typeof v.country !== "string") return null;
    if (now - v.resolvedAt > PHONE_AVAILABILITY_TTL_MS || v.resolvedAt > now) return null;
    return { country: v.country as string | null, isAvailable: v.isAvailable, resolvedAt: v.resolvedAt };
  } catch {
    return null;
  }
}

function writeStorage(result: CachedResult): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...result }));
  } catch {
    // Storage blocked or full: memory still serves this page.
  }
}

/** Cached result if it is still fresh, else null. */
export function peekPhoneAuthAvailability(now = Date.now()): PhoneAuthAvailabilityResult | null {
  if (!restoredFromStorage) {
    restoredFromStorage = true;
    if (!memory) memory = readStorage(now);
  }
  if (memory && now - memory.resolvedAt <= PHONE_AVAILABILITY_TTL_MS) return memory;
  return null;
}

function isValidResponse(value: unknown): value is { country: string | null; phone_auth_available: boolean } {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.phone_auth_available === "boolean" && (v.country === null || v.country === undefined || typeof v.country === "string");
}

function probe(now: number): Promise<PhoneAuthAvailabilityResult | null> {
  if (inFlight) return inFlight;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PHONE_AVAILABILITY_TIMEOUT_MS);
  inFlight = getGeorgianPhoneAuthAvailability(controller.signal)
    .then((response) => {
      if (!isValidResponse(response)) throw new Error("Unexpected phone availability payload");
      const result: CachedResult = { country: response.country ?? null, isAvailable: response.phone_auth_available, resolvedAt: now };
      memory = result;
      failedAt = 0;
      writeStorage(result);
      return result as PhoneAuthAvailabilityResult;
    })
    .catch((error: unknown) => {
      failedAt = Date.now();
      console.warn("Unable to resolve Georgian phone auth availability", error);
      return null;
    })
    .finally(() => {
      clearTimeout(timeout);
      inFlight = null;
    });
  return inFlight;
}

/**
 * Resolve for one subscriber. Returns the cached result synchronously through the
 * promise when fresh; otherwise shares the single in-flight probe. `null` means
 * the probe failed (or is in its cooldown) — callers keep the phone option hidden
 * and stop loading; nothing is cached for it.
 */
export function resolvePhoneAuthAvailability(now = Date.now()): Promise<PhoneAuthAvailabilityResult | null> {
  const cached = peekPhoneAuthAvailability(now);
  if (cached) return Promise.resolve(cached);
  if (inFlight) return inFlight;
  if (failedAt && now - failedAt < PHONE_AVAILABILITY_FAILURE_COOLDOWN_MS) return Promise.resolve(memory ?? null);
  return probe(now);
}

/** Subscribe without owning the request: unmounting one subscriber never aborts the others. */
export function subscribePhoneAuthAvailability(listener: Listener, now = Date.now()): () => void {
  let active = true;
  void resolvePhoneAuthAvailability(now).then((result) => { if (active) listener(result); });
  return () => { active = false; };
}

export function __resetPhoneAuthAvailabilityForTests(): void {
  memory = null;
  inFlight = null;
  failedAt = 0;
  restoredFromStorage = false;
}

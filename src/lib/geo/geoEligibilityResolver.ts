"use client";

import type { GeoApiResponse } from "./vercelGeo";

export const GEO_CACHE_TTL_MS = 5 * 60_000;
export const GEO_FAILURE_COOLDOWN_MS = 30_000;
const GEO_TIMEOUT_MS = 8_000;
type Listener = (geo: GeoApiResponse | null) => void;
type Entry = {
  result: GeoApiResponse | null;
  expiresAt: number;
  retryAt: number;
  pending: boolean;
  listeners: Set<Listener>;
};

// Browser memory only: never share IP-based eligibility across visitors or
// persist promotion decisions in storage. Preview overrides have separate keys.
const entries = new Map<string, Entry>();

function isGeoApiResponse(value: unknown): value is GeoApiResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (typeof v.countryCode === "string" || v.countryCode === null)
    && typeof v.isGeorgia === "boolean"
    && typeof v.isGeoExperimentEnabled === "boolean"
    && typeof v.showBetson === "boolean"
    && (v.source === "header" || v.source === "override" || v.source === "unknown");
}

export function geoEligibilityUrl(): string {
  const override = new URLSearchParams(window.location.search).get("geo");
  const params = new URLSearchParams();
  if (override) params.set("geo", override);
  return `/api/geo${params.size ? `?${params}` : ""}`;
}

export function peekGeoEligibility(url: string): GeoApiResponse | null {
  // Keep an already mounted event/quiz stable while a later subscriber
  // refreshes an expired answer. A failed refresh clears it for everyone.
  return entries.get(url)?.result ?? null;
}

export function subscribeGeoEligibility(url: string, listener: Listener): () => void {
  let entry = entries.get(url);
  if (!entry) {
    entry = { result: null, expiresAt: 0, retryAt: 0, pending: false, listeners: new Set() };
    entries.set(url, entry);
  }
  const current = entry;
  current.listeners.add(listener);
  if (current.result && Date.now() < current.expiresAt) {
    listener(current.result);
  } else if (!current.pending && Date.now() >= current.retryAt) {
    current.pending = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);
    void fetch(url, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Geo check failed with ${response.status}`);
        const result: unknown = await response.json();
        if (!isGeoApiResponse(result)) throw new Error("Unexpected geo eligibility payload");
        current.result = result;
        current.expiresAt = Date.now() + GEO_CACHE_TTL_MS;
        current.retryAt = 0;
      })
      .catch((error: unknown) => {
        current.result = null;
        current.expiresAt = 0;
        current.retryAt = Date.now() + GEO_FAILURE_COOLDOWN_MS;
        console.warn("Unable to resolve geo eligibility", error);
      })
      .finally(() => {
        clearTimeout(timeout);
        current.pending = false;
        for (const subscriber of current.listeners) subscriber(current.result);
      });
  } else if (!current.pending) {
    listener(null);
  }
  // A component leaving must not cancel the shared request for other screens.
  return () => { current.listeners.delete(listener); };
}

export function __resetGeoEligibilityForTests(): void {
  entries.clear();
}

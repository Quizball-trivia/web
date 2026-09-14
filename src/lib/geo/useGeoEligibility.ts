"use client";

import { useEffect, useState } from "react";
import type { GeoApiResponse } from "@/lib/geo/vercelGeo";

const INITIAL_GEO: GeoApiResponse = {
  countryCode: null,
  isGeorgia: false,
  source: "unknown",
};

export const GEO_TTL_MS = 60 * 60 * 1000;
const GEO_FAILURE_COOLDOWN_MS = 30 * 1000;
const GEO_TIMEOUT_MS = 8 * 1000;

// The only consumer is the Georgia event layer (useActiveEventMode), whose output
// does not depend on geo while the event flag is off — so no request at all then.
// Same direct env read and exact rule as useActiveEventMode (baked in at build time);
// not imported from there to avoid a circular dependency.
const GEO_CONSUMER_ENABLED = process.env.NEXT_PUBLIC_GEORGIA_WC_EVENT_ENABLED === "true";

// Validate the /api/geo payload shape before trusting it.
function isGeoApiResponse(value: unknown): value is GeoApiResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (typeof v.countryCode === "string" || v.countryCode === null) &&
    typeof v.isGeorgia === "boolean" &&
    (v.source === "header" || v.source === "override" || v.source === "unknown")
  );
}

let memory: { geo: GeoApiResponse; resolvedAt: number } | null = null;
let inFlight: Promise<GeoApiResponse | null> | null = null;
let failedAt = 0;
const listeners = new Set<(geo: GeoApiResponse | null) => void>();

function inFailureCooldown(now: number): boolean {
  return failedAt > 0 && now - failedAt < GEO_FAILURE_COOLDOWN_MS;
}

function probe(now: number): Promise<GeoApiResponse | null> {
  if (inFlight) return inFlight;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);
  inFlight = fetch("/api/geo", { cache: "no-store", signal: controller.signal })
    .then((response) => {
      if (!response.ok) throw new Error(`Geo check failed with ${response.status}`);
      return response.json() as Promise<unknown>;
    })
    .then((result) => {
      if (!isGeoApiResponse(result)) throw new Error("Unexpected geo payload");
      memory = { geo: result, resolvedAt: now };
      failedAt = 0;
      return result;
    })
    .catch((error: unknown) => {
      failedAt = Date.now();
      console.warn("Unable to resolve geo eligibility", error);
      return null;
    })
    .finally(() => {
      clearTimeout(timeout);
      inFlight = null;
    });
  void inFlight.then((geo) => { for (const listener of Array.from(listeners)) listener(geo); });
  return inFlight;
}

/** One shared, memory-cached fetch per page for all consumers; failures and expired entries are never served. */
export function resolveGeoEligibility(now = Date.now()): Promise<GeoApiResponse | null> {
  if (memory && now - memory.resolvedAt <= GEO_TTL_MS) return Promise.resolve(memory.geo);
  if (inFlight) return inFlight;
  if (inFailureCooldown(now)) return Promise.resolve(null);
  return probe(now);
}

/** Mount-long subscription: current answer now, plus every later settled fetch (recovery after a failure). */
export function subscribeGeoEligibility(listener: (geo: GeoApiResponse | null) => void, now = Date.now()): () => void {
  listeners.add(listener);
  if (memory && now - memory.resolvedAt <= GEO_TTL_MS) listener(memory.geo);
  else if (inFlight) { /* broadcast on settle */ }
  else if (inFailureCooldown(now)) listener(null);
  else void probe(now);
  return () => { listeners.delete(listener); };
}

export function __resetGeoEligibilityForTests(): void {
  memory = null;
  inFlight = null;
  failedAt = 0;
  listeners.clear();
}

export function useGeoEligibility(): GeoApiResponse {
  const [geo, setGeo] = useState<GeoApiResponse>(INITIAL_GEO);

  useEffect(() => {
    if (!GEO_CONSUMER_ENABLED) return;
    return subscribeGeoEligibility((result) => { if (result) setGeo(result); });
  }, []);

  return geo;
}

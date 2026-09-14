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

/** One shared, memory-cached fetch per page for all consumers; failures are not cached. */
export function resolveGeoEligibility(now = Date.now()): Promise<GeoApiResponse | null> {
  if (memory && now - memory.resolvedAt <= GEO_TTL_MS) return Promise.resolve(memory.geo);
  if (inFlight) return inFlight;
  if (failedAt && now - failedAt < GEO_FAILURE_COOLDOWN_MS) return Promise.resolve(memory?.geo ?? null);
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
  return inFlight;
}

export function __resetGeoEligibilityForTests(): void {
  memory = null;
  inFlight = null;
  failedAt = 0;
}

export function useGeoEligibility(): GeoApiResponse {
  const [geo, setGeo] = useState<GeoApiResponse>(INITIAL_GEO);

  useEffect(() => {
    if (!GEO_CONSUMER_ENABLED) return;
    let mounted = true;
    void resolveGeoEligibility().then((result) => { if (mounted && result) setGeo(result); });
    return () => { mounted = false; };
  }, []);

  return geo;
}

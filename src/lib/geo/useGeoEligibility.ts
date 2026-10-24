"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { GeoApiResponse } from "@/lib/geo/vercelGeo";
import { geoEligibilityUrl, peekGeoEligibility, subscribeGeoEligibility } from "./geoEligibilityResolver";

const INITIAL_GEO: GeoApiResponse = {
  countryCode: null,
  isGeorgia: false,
  isGeoExperimentEnabled: false,
  showBetson: false,
  source: "unknown",
};

export function useGeoEligibility({ enabled = true }: { enabled?: boolean } = {}): GeoApiResponse {
  const url = typeof window === "undefined" ? "/api/geo" : geoEligibilityUrl();
  const subscribe = useCallback((notify: () => void) => {
    if (!enabled) return () => {};
    return subscribeGeoEligibility(url, notify);
  }, [enabled, url]);
  const snapshot = useCallback(() => enabled ? peekGeoEligibility(url) ?? INITIAL_GEO : INITIAL_GEO, [enabled, url]);
  return useSyncExternalStore(subscribe, snapshot, () => INITIAL_GEO);
}

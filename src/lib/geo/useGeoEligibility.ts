"use client";

import { useEffect, useState } from "react";
import type { GeoApiResponse } from "@/lib/geo/vercelGeo";

const INITIAL_GEO: GeoApiResponse = {
  countryCode: null,
  isGeorgia: false,
  isGeoExperimentEnabled: false,
  showBetson: false,
  source: "unknown",
};

function geoUrl(): string {
  const params = typeof window === "undefined" ? "" : window.location.search;
  return params ? `/api/geo${params}` : "/api/geo";
}

export function useGeoEligibility(): GeoApiResponse {
  const [geo, setGeo] = useState<GeoApiResponse>(INITIAL_GEO);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    fetch(geoUrl(), {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Geo check failed with ${response.status}`);
        }
        return response.json() as Promise<GeoApiResponse>;
      })
      .then((result) => {
        if (mounted) {
          setGeo(result);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.warn("Unable to resolve geo eligibility", error);
        }
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  return geo;
}

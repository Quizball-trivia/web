"use client";

import { useEffect, useState } from "react";
import { PHONE_AUTH_ENABLED } from "@/lib/config";
import { peekPhoneAuthAvailability, subscribePhoneAuthAvailability } from "@/lib/auth/phoneAuthAvailabilityResolver";

interface GeorgianPhoneAuthAvailabilityState {
  country: string | null;
  isAvailable: boolean;
  isLoading: boolean;
}

const INITIAL_STATE: GeorgianPhoneAuthAvailabilityState = {
  country: null,
  isAvailable: false,
  isLoading: true,
};

const DISABLED_STATE: GeorgianPhoneAuthAvailabilityState = {
  country: null,
  isAvailable: false,
  isLoading: false,
};

// In local dev the GeoIP probe resolves to a non-GE country (localhost), which
// would hide the phone option. Force it available so phone sign-in can be tested
// locally. Production/staging keep the real Georgia-only gate via the backend.
const DEV_FORCE_AVAILABLE = process.env.NODE_ENV === "development";

const DEV_AVAILABLE_STATE: GeorgianPhoneAuthAvailabilityState = {
  country: "GE",
  isAvailable: true,
  isLoading: false,
};

/**
 * Georgian phone sign-in availability for this visitor. One backend probe per
 * tab (see phoneAuthAvailabilityResolver); the initial render is server-safe
 * (loading) and a cached answer settles in the first effect. A mounted screen
 * never sees availability flip from true to false — a phone flow in progress
 * (OTP sent, linking) must not be closed under the user; a later "false" only
 * reaches screens mounted after it.
 */
export function useGeorgianPhoneAuthAvailability(): GeorgianPhoneAuthAvailabilityState {
  const [state, setState] = useState<GeorgianPhoneAuthAvailabilityState>(
    !PHONE_AUTH_ENABLED
      ? DISABLED_STATE
      : DEV_FORCE_AVAILABLE
        ? DEV_AVAILABLE_STATE
        : INITIAL_STATE,
  );

  useEffect(() => {
    // Feature-flagged off: never probe the backend or surface the phone tab.
    if (!PHONE_AUTH_ENABLED) return;
    // Local dev: skip the GeoIP probe and keep phone forced-available.
    if (DEV_FORCE_AVAILABLE) return;

    const apply = (result: { country: string | null; isAvailable: boolean } | null) => {
      setState((current) => {
        if (current.isAvailable && !current.isLoading) return current; // sticky for this mount
        if (!result) return current.isLoading ? { country: current.country, isAvailable: current.isAvailable, isLoading: false } : current;
        return { country: result.country, isAvailable: result.isAvailable, isLoading: false };
      });
    };
    const cached = peekPhoneAuthAvailability();
    if (cached) { apply(cached); return; }
    return subscribePhoneAuthAvailability(apply);
  }, []);

  return state;
}

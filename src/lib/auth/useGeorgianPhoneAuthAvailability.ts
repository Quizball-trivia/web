"use client";

import { useEffect, useState } from "react";
import { getGeorgianPhoneAuthAvailability } from "@/lib/auth/auth.service";
import { PHONE_AUTH_ENABLED } from "@/lib/config";

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
    if (!PHONE_AUTH_ENABLED) {
      return;
    }

    // Local dev: skip the GeoIP probe and keep phone forced-available.
    if (DEV_FORCE_AVAILABLE) {
      return;
    }

    const controller = new AbortController();
    let mounted = true;

    getGeorgianPhoneAuthAvailability(controller.signal)
      .then((result) => {
        if (!mounted) {
          return;
        }
        setState({
          country: result.country,
          isAvailable: result.phone_auth_available,
          isLoading: false,
        });
      })
      .catch((error) => {
        if (controller.signal.aborted || !mounted) {
          return;
        }
        console.warn("Unable to resolve Georgian phone auth availability", error);
        setState({
          country: null,
          isAvailable: false,
          isLoading: false,
        });
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  return state;
}

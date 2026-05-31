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

export function useGeorgianPhoneAuthAvailability(): GeorgianPhoneAuthAvailabilityState {
  const [state, setState] = useState<GeorgianPhoneAuthAvailabilityState>(
    PHONE_AUTH_ENABLED ? INITIAL_STATE : DISABLED_STATE,
  );

  useEffect(() => {
    // Feature-flagged off: never probe the backend or surface the phone tab.
    if (!PHONE_AUTH_ENABLED) {
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

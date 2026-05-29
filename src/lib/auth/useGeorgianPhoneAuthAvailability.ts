"use client";

import { useEffect, useState } from "react";
import { getGeorgianPhoneAuthAvailability } from "@/lib/auth/auth.service";

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

export function useGeorgianPhoneAuthAvailability(): GeorgianPhoneAuthAvailabilityState {
  const [state, setState] = useState<GeorgianPhoneAuthAvailabilityState>(INITIAL_STATE);

  useEffect(() => {
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

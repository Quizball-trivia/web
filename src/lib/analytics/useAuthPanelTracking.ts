'use client';

import { useEffect, useRef } from 'react';
import { trackAuthPanelShown, trackSignupPageView } from './game-events';

/** One panel exposure per opening; signup-tab views remain a separate event. */
export function useAuthPanelTracking(open: boolean, mode: string): void {
  const panelTracked = useRef(false);
  const signupTracked = useRef(false);
  useEffect(() => {
    if (!open) {
      panelTracked.current = false;
      signupTracked.current = false;
      return;
    }
    if (!panelTracked.current) {
      panelTracked.current = true;
      trackAuthPanelShown(mode);
    }
    if (mode === 'signup' && !signupTracked.current) {
      signupTracked.current = true;
      trackSignupPageView();
    }
  }, [open, mode]);
}

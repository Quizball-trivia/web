import * as React from "react";

const DESKTOP_BREAKPOINT = 1024;
const QUERY = `(min-width: ${DESKTOP_BREAKPOINT}px)`;

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

// useSyncExternalStore instead of effect-driven state: the media query is read
// during the first client render (no mobile-layout flash on desktop) and there
// is no set-state-in-effect.
export function useIsDesktop() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

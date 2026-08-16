import { useSyncExternalStore } from "react";

const DESKTOP_BREAKPOINT = 1024;
const QUERY = `(min-width: ${DESKTOP_BREAKPOINT}px)`;

function subscribe(callback: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

// SSR/first hydration render as mobile; the client snapshot settles it in the
// same commit, so a real desktop never mounts the mobile bidding layout first.
function getServerSnapshot(): boolean {
  return false;
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

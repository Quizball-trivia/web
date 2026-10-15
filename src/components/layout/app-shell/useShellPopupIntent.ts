"use client";

import { useEffect, useRef, useState } from "react";

export type PopupFocusIntent = "pointer" | "first" | "last";

/** An import is not permission to open: every late result needs its live intent. */
export function useShellPopupIntent<T>(loader: { load: () => Promise<T> }) {
  const [ready, setReady] = useState<{ module: T; focus: PopupFocusIntent } | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const generation = useRef(0);
  const listeners = useRef<AbortController | null>(null);

  useEffect(() => () => { generation.current++; listeners.current?.abort(); }, []);

  const preload = () => { void loader.load().catch(() => { /* A later activation retries. */ }); };
  const activate = (button: HTMLElement, focus: PopupFocusIntent = "pointer") => {
    // Repeated taps/held keys are the same intent while loading, not a
    // request to close a popup that has not appeared yet.
    if (listeners.current) return;
    const token = ++generation.current;
    const pathname = window.location.pathname;
    const controller = new AbortController();
    listeners.current = controller;
    setPending(true);
    setFailed(false);
    const cancel = () => {
      if (generation.current !== token) return;
      generation.current++;
      controller.abort();
      listeners.current = null;
      setPending(false);
    };
    document.addEventListener("keydown", event => { if (event.key === "Escape") cancel(); }, { signal: controller.signal, capture: true });
    document.addEventListener("pointerdown", event => { if (!button.contains(event.target as Node)) cancel(); }, { signal: controller.signal, capture: true });
    document.addEventListener("focusin", event => { if (!button.contains(event.target as Node)) cancel(); }, { signal: controller.signal, capture: true });
    window.addEventListener("popstate", cancel, { signal: controller.signal });
    void loader.load().then(module => {
      if (generation.current !== token) return;
      controller.abort();
      listeners.current = null;
      setPending(false);
      if (window.location.pathname === pathname && button.isConnected) setReady({ module, focus });
    }).catch(() => {
      if (generation.current !== token) return;
      controller.abort();
      listeners.current = null;
      setPending(false);
      setFailed(true);
    });
  };
  return { ready, pending, failed, activate, preload };
}

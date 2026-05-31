"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { API_BASE_URL } from "@/lib/config";

const PING_INTERVAL_MS = 30_000;

interface SiteOnlineState {
  siteOnline: number | null;
  setSiteOnline: (n: number) => void;
}

/**
 * Standalone store for the site-wide "online now" count (anonymous + logged-in
 * visitors), kept separate from the in-game realtime store. Fed by the
 * heartbeat ping in `usePresencePing`.
 */
export const useSiteOnlineStore = create<SiteOnlineState>((set) => ({
  siteOnline: null,
  setSiteOnline: (n) => set({ siteOnline: n }),
}));

async function sendPing(): Promise<number | null> {
  try {
    // No headers/body on purpose: a bare POST is a CORS "simple request", so the
    // 30s heartbeat skips the preflight OPTIONS round-trip. `credentials: include`
    // carries/sets the qb_presence_id cookie.
    const res = await fetch(`${API_BASE_URL}/api/v1/presence/ping`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { online?: number };
    return typeof data.online === "number" ? data.online : null;
  } catch {
    return null; // presence is best-effort; never surface errors
  }
}

/**
 * Heartbeat presence: pings the backend on mount and every 30s so this visitor
 * counts toward the site-wide "online" number, and stores the returned count.
 * Mount once app-wide (see PresencePingMount). Relies on server-side TTL for
 * "left the site" — no explicit leave needed.
 */
export function usePresencePing(): void {
  const setSiteOnline = useSiteOnlineStore((s) => s.setSiteOnline);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const online = await sendPing();
      if (!cancelled && online !== null) setSiteOnline(online);
    };

    void tick();
    const id = setInterval(() => void tick(), PING_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [setSiteOnline]);
}

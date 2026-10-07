"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PARTNER_QUERY_ROOT, usePartnerSession } from "../PartnerSessionProvider";

export const partnerGamesQueryKey = [...PARTNER_QUERY_ROOT, "me", "games"] as const;

export function usePartnerGames() {
  const { api, state } = usePartnerSession();
  return useQuery({
    queryKey: partnerGamesQueryKey,
    queryFn: () => api.getMyGames(),
    enabled: state.status === "ready",
    // Plays left change when the player plays in another tab, and a replaced or blocked session is only noticed on
    // the next request: refresh when the tab is shown again and once a minute.
    refetchOnWindowFocus: "always",
    // Back from a game (browser Back skips the game's exit) must not show plays it already used.
    refetchOnMount: "always",
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

function formatRemaining(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * "5h 12m" until the partner day resets (resetsAt = next Tbilisi midnight from the API), refreshed every 30 s.
 * When the reset passes, the plays are refetched so the counters roll over without a reload.
 * Empty until mounted, so server and client markup match.
 */
export function usePartnerResetLabel(resetsAt: string | undefined): string {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");

  useEffect(() => {
    const target = resetsAt ? Date.parse(resetsAt) : Number.NaN;
    if (!Number.isFinite(target)) return;
    let refetched = false;
    const tick = () => {
      const remaining = target - Date.now();
      setLabel(formatRemaining(remaining));
      if (remaining <= 0 && !refetched) {
        refetched = true;
        void queryClient.invalidateQueries({ queryKey: partnerGamesQueryKey });
      }
    };
    queueMicrotask(tick);
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [queryClient, resetsAt]);

  return label;
}

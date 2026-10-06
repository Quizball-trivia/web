"use client";

import { useQuery } from "@tanstack/react-query";
import { PARTNER_QUERY_ROOT, usePartnerSession } from "../../PartnerSessionProvider";
import type { PartnerRankedState } from "./PartnerRankedScreen";

const rankedStateQueryKey = [...PARTNER_QUERY_ROOT, "ranked", "state"] as const;

/** The ranked match this player is in right now (after a relaunch or reload), whatever plays are left today. */
export function usePartnerRankedResume(enabled: boolean): { matchId: string } | null {
  const { api, state } = usePartnerSession();
  const query = useQuery({
    queryKey: rankedStateQueryKey,
    queryFn: () => api.game<PartnerRankedState>("ranked", "state", "GET"),
    enabled: enabled && state.status === "ready",
    refetchOnWindowFocus: "always",
  });
  const play = query.data?.activePlay;
  return play?.state === "playing" && play.matchId ? { matchId: play.matchId } : null;
}

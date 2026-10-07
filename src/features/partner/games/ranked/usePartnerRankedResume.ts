"use client";

import { useQuery } from "@tanstack/react-query";
import { PARTNER_QUERY_ROOT, usePartnerSession } from "../../PartnerSessionProvider";
import type { PartnerRankedState } from "./PartnerRankedScreen";

const rankedStateQueryKey = [...PARTNER_QUERY_ROOT, "ranked", "state"] as const;

/** The ranked play this player has open right now (after a relaunch or reload), whatever plays are left today: a match,
 *  or a search that already took a play (opening the screen rejoins it; the server reuses that play). */
export function usePartnerRankedResume(enabled: boolean): { matchId: string | null } | null {
  const { api, state } = usePartnerSession();
  const query = useQuery({
    queryKey: rankedStateQueryKey,
    queryFn: () => api.game<PartnerRankedState>("ranked", "state", "GET"),
    enabled: enabled && state.status === "ready",
    refetchOnWindowFocus: "always",
  });
  const play = query.data?.activePlay;
  if (play?.state === "playing" && play.matchId) return { matchId: play.matchId };
  return play?.state === "searching" ? { matchId: null } : null;
}

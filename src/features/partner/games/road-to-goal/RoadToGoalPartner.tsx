"use client";

import { useEffect, useMemo } from "react";
import { RoadToGoal } from "@/features/mini-games/components/RoadToGoal";
import { useLocale } from "@/contexts/LocaleContext";
import { toPartnerLocale } from "../../partnerCopy";
import type { PartnerGameScreenProps } from "../../game-kit/types";
import { createPartnerRoadToGoalClient } from "./partnerRoadToGoalClient";
import { PARTNER_ROAD_TO_GOAL_COPY } from "./partnerRoadToGoalCopy";

/** Freecroco Road to Goal: the site's live screen on the partner endpoints (contract §7.5). */
export function RoadToGoalPartner({
  api,
  onFinished,
  onExit,
}: PartnerGameScreenProps) {
  const { locale } = useLocale();
  const client = useMemo(() => createPartnerRoadToGoalClient(api), [api]);
  // A play cancelled by a block has no result: leave for the home, which shows the account state.
  useEffect(() => client.onCancelled(onExit), [client, onExit]);
  const text = PARTNER_ROAD_TO_GOAL_COPY[toPartnerLocale(locale)];

  return (
    // The game shell's own header sits at z-90; isolating it keeps the sticky Freecroco header on top when scrolled.
    <div className="isolate">
      <RoadToGoal
        partner={{
          client,
          ...text,
          onFinished: () => {
            const run = client.last();
            // Only a scored run has a score event; a cancelled one is never reported as points.
            if (run && run.status !== "active" && run.status !== "cancelled" && run.score !== null) {
              onFinished({ playId: run.play_id, score: run.score });
            }
          },
          onExit: () => {
            const run = client.last();
            // Leaving settles at once (question → 0, decision → cash-out); the sweeper would do the same later.
            if (run?.status === "active")
              void client
                .leave(run.run_id)
                .catch(() => undefined)
                .finally(onExit);
            else onExit();
          },
        }}
      />
    </div>
  );
}

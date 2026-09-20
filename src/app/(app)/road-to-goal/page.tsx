"use client";

import { useCallback } from "react";
import { RoadToGoal } from "@/features/mini-games/components/RoadToGoal";
import { MiniGameIntro } from "@/features/mini-games/components/MiniGameIntro";
import { roadToGoalApi } from "@/lib/repositories/roadToGoal.repo";
import { isRoadToGoalEnabled } from "@/lib/features/roadToGoal";
import { useLocale } from "@/contexts/LocaleContext";

/** Authenticated Road to Goal mode backed by the server-authoritative game API. */
export default function RoadToGoalPage() {
  const { t } = useLocale();
  const resume = useCallback(async () => Boolean(await roadToGoalApi.current()), []);
  return (
    <MiniGameIntro
      resume={resume}
      config={{
        slug: "mini-road-to-goal",
        title: t("play.roadToGoalTitle"),
        tagline: t("miniGames.roadToGoalModalDescription"),
        chips: [t("miniGames.chipSoloCoins"), t("miniGames.chipStakeFixed", { stakes: "10 · 25 · 50" })],
        steps: [t("miniGames.roadToGoalRule1"), t("miniGames.roadToGoalRule2"), t("miniGames.roadToGoalRule3"), t("miniGames.roadToGoalRule4")],
      }}
    >
      <RoadToGoal backHref="/play" live newRunsEnabled={isRoadToGoalEnabled} />
    </MiniGameIntro>
  );
}

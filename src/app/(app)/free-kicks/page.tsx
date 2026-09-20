"use client";

import { useCallback } from "react";
import { FinalThird } from "@/features/mini-games/components/FinalThird";
import { MiniGameIntro } from "@/features/mini-games/components/MiniGameIntro";
import { freeKicksApi } from "@/lib/repositories/freeKicks.repo";
import { useLocale } from "@/contexts/LocaleContext";

/** Free Kicks — LIVE: real coins from the store wallet, server-authoritative outcomes via /api/v1/free-kicks. */
export default function FreeKicksPage() {
  const { t } = useLocale();
  const resume = useCallback(async () => Boolean(await freeKicksApi.current()), []);
  return (
    <MiniGameIntro
      resume={resume}
      config={{
        slug: "mini-final-third",
        title: t("play.freeKicksTitle"),
        tagline: t("miniGames.freeKicksModalDescription"),
        chips: [t("miniGames.chipSoloCoins"), t("miniGames.chipStakeRange", { min: "5", max: "500" })],
        steps: [t("miniGames.freeKicksRule1"), t("miniGames.freeKicksRule2"), t("miniGames.freeKicksRule3"), t("miniGames.freeKicksRule4")],
      }}
    >
      <FinalThird backHref="/play" live />
    </MiniGameIntro>
  );
}

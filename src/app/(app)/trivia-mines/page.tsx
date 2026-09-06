"use client";

import { useCallback } from "react";
import { TriviaMinesLive } from "@/features/trivia-mines/TriviaMinesLive";
import { MiniGameIntro } from "@/features/mini-games/components/MiniGameIntro";
import { triviaMinesApi } from "@/lib/repositories/triviaMines.repo";
import { useLocale } from "@/contexts/LocaleContext";

/** Trivia Mines — LIVE: real coins from the store wallet, server-held board via /api/v1/trivia-mines. */
export default function TriviaMinesPage() {
  const { t } = useLocale();
  const resume = useCallback(async () => Boolean(await triviaMinesApi.current()), []);
  return (
    <MiniGameIntro
      resume={resume}
      config={{
        slug: "mini-trivia-mines",
        title: t("triviaMines.title"),
        tagline: t("triviaMines.modalDescription"),
        chips: [t("miniGames.chipSoloCoins"), t("miniGames.chipStakeRange", { min: "5", max: "500" })],
        steps: [t("triviaMines.rule1"), t("triviaMines.rule2"), t("triviaMines.rule3"), t("triviaMines.rule4")],
      }}
    >
      <TriviaMinesLive backHref="/play" />
    </MiniGameIntro>
  );
}

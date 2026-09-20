"use client";

import { useCallback } from "react";
import { SquadSpinLive } from "@/features/squad-spin/SquadSpinLive";
import { MiniGameIntro } from "@/features/mini-games/components/MiniGameIntro";
import { squadSpinApi } from "@/lib/repositories/squadSpin.repo";
import { useLocale } from "@/contexts/LocaleContext";

/** Squad Spin — LIVE: real coins from the store wallet, server-held reels and answers via /api/v1/squad-spin. */
export default function SquadSpinPage() {
  const { t } = useLocale();
  const resume = useCallback(async () => Boolean(await squadSpinApi.current()), []);
  return (
    <MiniGameIntro
      resume={resume}
      config={{
        slug: "mini-squad-spin",
        title: t("squadSpin.title"),
        tagline: t("squadSpin.modalDescription"),
        chips: [t("miniGames.chipSoloCoins"), t("miniGames.chipStakeRange", { min: "5", max: "500" })],
        steps: [t("squadSpin.rule1"), t("squadSpin.rule2"), t("squadSpin.rule3"), t("squadSpin.rule4")],
      }}
    >
      <SquadSpinLive backHref="/play" />
    </MiniGameIntro>
  );
}

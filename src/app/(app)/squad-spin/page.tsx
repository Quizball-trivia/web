"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { SquadSpinLive } from "@/features/squad-spin/SquadSpinLive";
import { MiniGameIntro } from "@/features/mini-games/components/MiniGameIntro";
import { squadSpinApi } from "@/lib/repositories/squadSpin.repo";
import { useLocale } from "@/contexts/LocaleContext";

// The practice pool ships a frozen combo snapshot; load it only when someone opens practice.
const SquadSpinPractice = dynamic(() => import("@/features/squad-spin/SquadSpinPractice").then((m) => m.SquadSpinPractice), { ssr: false });

/** Squad Spin — LIVE: real coins from the store wallet, server-held reels and answers via /api/v1/squad-spin. */
export default function SquadSpinPage() {
  const { t } = useLocale();
  const [practice, setPractice] = useState(false);
  const resume = useCallback(async () => Boolean(await squadSpinApi.current()), []);
  const openPractice = useCallback(() => setPractice(true), []);
  const closePractice = useCallback(() => setPractice(false), []);
  return (
    <MiniGameIntro
      resume={resume}
      config={{
        slug: "mini-squad-spin",
        title: t("squadSpin.title"),
        tagline: t("squadSpin.modalDescription"),
        chips: [t("miniGames.chipSoloCoins"), t("miniGames.chipStakeRange", { min: "5", max: "500" })],
        steps: [t("squadSpin.rule1"), t("squadSpin.rule2"), t("squadSpin.ruleCareer"), t("squadSpin.rule3"), t("squadSpin.rule4")],
      }}
    >
      {practice ? <SquadSpinPractice onExit={closePractice} /> : <SquadSpinLive backHref="/play" onPractice={openPractice} />}
    </MiniGameIntro>
  );
}

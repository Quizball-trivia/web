"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { DailyChallengeIntro } from "@/features/daily/components/DailyChallengeIntro";
import { GuessTheCardDailyGame } from "@/features/daily/GuessTheCardDailyGame";
import { GuessCardDailyResult } from "@/features/daily/GuessCardDailyResult";
import { useGuessCardDailyStatus } from "@/features/daily/guessCardDaily";
import { useMiniT } from "@/features/mini-games/lib/i18n";

const BG = "bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat";

export default function GuessCardDailyPage() {
  const router = useRouter();
  const t = useMiniT();
  const { ready, completedToday, record } = useGuessCardDailyStatus();
  const [phase, setPhase] = useState<"intro" | "play">("intro");
  const goHub = () => router.push("/daily/challenges");

  if (!ready) return <LoadingScreen className={BG} />;

  // Already played today — show today's result instead of letting them replay.
  if (completedToday && record) {
    return (
      <div className={`fixed inset-0 z-40 ${BG}`}>
        <GuessCardDailyResult record={record} onDone={goHub} alreadyPlayed />
      </div>
    );
  }

  if (phase === "intro") {
    return <DailyChallengeIntro title={t("FIFA Cards")} onDone={() => setPhase("play")} />;
  }

  return <GuessTheCardDailyGame onExit={goHub} />;
}

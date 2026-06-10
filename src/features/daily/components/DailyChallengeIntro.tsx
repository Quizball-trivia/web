"use client";

import { useEffect } from "react";
import { RoundTransitionOverlay } from "@/components/game/RoundTransitionOverlay";
import { useLocale } from "@/contexts/LocaleContext";

const INTRO_DURATION_MS = 3000;

interface DailyChallengeIntroProps {
  /** The challenge name shown big in the middle (e.g. "Money Drop"). */
  title: string;
  /** Called once the intro has played for its full duration. */
  onDone: () => void;
}

/**
 * "Get ready" intro shown before every daily challenge starts. Reuses the
 * ranked match's RoundTransitionOverlay (transparent, animated text) over a
 * full-screen stadium backdrop, then auto-dismisses after ~2s so the game —
 * and its timer — only begins once the player has seen the challenge name.
 */
export function DailyChallengeIntro({ title, onDone }: DailyChallengeIntroProps) {
  const { t } = useLocale();

  useEffect(() => {
    const timeout = window.setTimeout(onDone, INTRO_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-40 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat">
      <RoundTransitionOverlay
        title={title}
        categoryName={t("dailyGames.introTag")}
        subtitle={t("dailyGames.introGetReady")}
      />
    </div>
  );
}

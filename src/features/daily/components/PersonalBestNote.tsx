"use client";

import { motion } from "motion/react";
import { Sparkles, Target } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

export type PersonalBestOutcome = "unknown" | "first" | "new" | "matched" | "short";

/** How today's score compares with the best of earlier days (`undefined` = history not available). */
export function personalBestOutcome(score: number, previous: number | null | undefined): PersonalBestOutcome {
  if (previous === undefined) return "unknown";
  if (previous === null) return "first";
  if (score > previous) return "new";
  if (score === previous) return "matched";
  return "short";
}

/** Result-screen line for games with a personal-best target (Money Drop bank, Stat Sniper accuracy).
 *  Renders nothing when the player's history is unavailable (guests, older backends). */
export function PersonalBestNote({
  score,
  previous,
  format,
}: {
  score: number;
  previous: number | null | undefined;
  format: (value: number) => string;
}) {
  const { t } = useLocale();
  const outcome = personalBestOutcome(score, previous);
  if (outcome === "unknown") return null;

  if (outcome === "new") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.2 }}
        className="rounded-[16px] border-2 border-brand-yellow/60 bg-brand-yellow/15 px-4 py-3 text-center"
        data-testid="personal-best-new"
      >
        <p className="flex items-center justify-center gap-1.5 font-poppins text-base font-black uppercase text-brand-yellow">
          <Sparkles className="size-4" aria-hidden /> {t("dailyGames.personalBestNew")}
        </p>
        {previous !== null && previous !== undefined && (
          <p className="mt-0.5 font-poppins text-xs font-semibold text-white/75">
            {t("dailyGames.personalBestPrevious", { value: format(previous) })}
          </p>
        )}
      </motion.div>
    );
  }

  const text =
    outcome === "first"
      ? t("dailyGames.personalBestFirst")
      : outcome === "matched"
        ? t("dailyGames.personalBestMatched", { value: format(previous as number) })
        : t("dailyGames.personalBestShort", { value: format(previous as number), diff: format((previous as number) - score) });

  return (
    <p className="flex items-center justify-center gap-1.5 rounded-[16px] bg-black/18 px-4 py-2.5 text-center font-poppins text-xs font-semibold text-white/80">
      <Target className="size-3.5 shrink-0 text-brand-yellow" aria-hidden /> {text}
    </p>
  );
}

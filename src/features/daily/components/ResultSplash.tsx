"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLocale } from "@/contexts/LocaleContext";

export type SplashVerdict = "correct" | "wrong";

/**
 * Daily result splash — mirrors the ranked ArenaScoreSplash: the word pops up
 * from centre (scale-in, rises, fades out), tilted from `from`. Shows
 * "CORRECT!" (green) or "WRONG!" (red) instead of a points value. `triggerKey`
 * bumps each fire so the animation re-runs for repeated verdicts.
 */
export function ResultSplash({
  show,
  verdict,
  from,
  triggerKey,
  points = null,
  forcePoints = false,
  tone = "daily",
  align = "center",
}: {
  show: boolean;
  verdict: SplashVerdict;
  from: "left" | "right";
  triggerKey: number;
  /** When set on a correct verdict, the splash IS the score — "+150", the
   *  ranked ArenaScoreSplash treatment — instead of the word. */
  points?: number | null;
  /** Show the points even at 0 / on a wrong verdict (partial-credit kinds:
   *  a red "+0" beats a "WRONG!" that ignores earned points). */
  forcePoints?: boolean;
  /** "ranked" scores in ArenaScoreSplash yellow (#FFE500) rather than daily's
   *  green, so a WL match reads like a ranked one. Misses stay red either way. */
  tone?: "daily" | "ranked";
  /** "center" is the daily treatment (fixed, viewport-centred). "edge" drops
   *  the fixed wrapper and positions the splash against the left/right edge of
   *  the nearest positioned ancestor — the ranked ArenaScoreSplash anchoring,
   *  which keeps "+N" off the answer grid. The parent must be `relative`. */
  align?: "center" | "edge";
}) {
  const { t } = useLocale();
  const correct = verdict === "correct";
  const isLeft = from === "left";
  const color = correct ? (tone === "ranked" ? "#FFE500" : "#58CC02") : "#FB3101";
  const label = forcePoints && points != null
    ? `+${points}`
    : correct
      ? (points != null && points > 0 ? `+${points}` : t("dailyGames.correctExclaim"))
      : t("dailyGames.wrong");

  return (
    <div
      className={
        align === "edge"
          ? `pointer-events-none absolute top-1/2 z-[60] -translate-y-1/2 ${
              isLeft ? "left-[-12px]" : "right-[-12px]"
            }`
          : "pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
      }
    >
      <AnimatePresence>
        {show && (
          <motion.div
            key={triggerKey}
            initial={{ opacity: 0, scale: 0.4, rotate: isLeft ? 12 : -12 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.4, 1.15, 1, 0.95],
              y: [0, -10, -14, -22],
              rotate: isLeft ? 6.8 : -6.8,
            }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
            transition={{ duration: 1.0, times: [0, 0.2, 0.7, 1], ease: "easeOut" }}
            className="select-none"
            style={{
              color,
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 900,
              fontSize: "clamp(36px, 5vw, 64px)",
              textTransform: "uppercase",
              WebkitTextStroke: "2px #000000",
              paintOrder: "stroke fill",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

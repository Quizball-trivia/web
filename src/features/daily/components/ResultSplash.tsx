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
}: {
  show: boolean;
  verdict: SplashVerdict;
  from: "left" | "right";
  triggerKey: number;
}) {
  const { t } = useLocale();
  const correct = verdict === "correct";
  const isLeft = from === "left";
  const color = correct ? "#58CC02" : "#FB3101";
  const label = correct ? t("dailyGames.correctExclaim") : t("dailyGames.wrong");

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center">
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

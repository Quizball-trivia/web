"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useCountUp } from "@/features/weekend-league/rewards/useCountUp";
import { cn } from "@/lib/utils";
import type { PartnerLocale } from "../partnerCopy";

/**
 * "+N" Freecroco points, counted up from 0 with a pop when it lands. `data-points` holds the final number and
 * `data-counting` flips to "false" once the shown number is final (the e2e scripts read it then).
 */
export function PartnerPointsCount({
  score,
  locale,
  delayMs = 0,
  className,
}: {
  score: number;
  locale: PartnerLocale;
  delayMs?: number;
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const [started, setStarted] = useState(delayMs <= 0);
  useEffect(() => {
    if (delayMs <= 0) return;
    const timer = window.setTimeout(() => setStarted(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);
  const value = useCountUp(started || reduced ? score : 0, { instant: reduced });
  const landed = value === score;

  return (
    <motion.p
      data-testid="partner-result-points"
      data-points={score}
      data-counting={landed ? "false" : "true"}
      className={cn("font-poppins font-bold tabular-nums text-brand-yellow", className)}
      animate={landed && score > 0 && !reduced ? { scale: [1, 1.15, 1] } : undefined}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      +{value.toLocaleString(locale === "ka" ? "ka-GE" : "en-US")}
    </motion.p>
  );
}

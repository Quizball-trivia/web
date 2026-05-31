"use client";

import { useCallback, useEffect, useState } from "react";
import { playSfx } from "@/lib/sounds/gameSounds";
import type { SplashVerdict } from "./ResultSplash";

// Match the ResultSplash keyframe duration (1.0s) plus a small tail so the
// element finishes its rise-and-fade before unmounting — otherwise it gets
// hidden mid-animation and visibly lingers half-faded.
const SPLASH_DURATION_MS = 1100;

/**
 * Shared controller for the fly-in result splash used across daily games.
 * `fire(verdict, from)` shows the splash (and plays the correct sound on a
 * correct verdict only); it auto-hides after ~0.9s. Returns the props the
 * <ResultSplash /> needs.
 */
export function useResultSplash() {
  const [show, setShow] = useState(false);
  const [verdict, setVerdict] = useState<SplashVerdict>("correct");
  const [from, setFrom] = useState<"left" | "right">("right");
  const [triggerKey, setTriggerKey] = useState(0);

  const fire = useCallback((nextVerdict: SplashVerdict, fromSide: "left" | "right") => {
    setVerdict(nextVerdict);
    setFrom(fromSide);
    setTriggerKey((k) => k + 1);
    setShow(true);
    if (nextVerdict === "correct") {
      playSfx("dailyCorrect");
    }
  }, []);

  useEffect(() => {
    if (!show) return;
    const timeout = window.setTimeout(() => setShow(false), SPLASH_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [show, triggerKey]);

  return { splashProps: { show, verdict, from, triggerKey }, fire };
}

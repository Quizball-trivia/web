"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { GridTrainingScreen } from "@/features/grid-training/GridTrainingScreen";

/** The public Tic Tac Toe page's practice round: the guided training board, played as a guest. */
export function DemoGridTraining({ backHref = "/demos", onExit }: { backHref?: string; onExit?: () => void } = {}) {
  const router = useRouter();
  const handleComplete = useCallback(() => {
    if (onExit) onExit();
    else router.push(backHref);
  }, [onExit, backHref, router]);
  return <GridTrainingScreen variant="guest" onComplete={handleComplete} />;
}

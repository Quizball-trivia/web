"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { AuctionTrainingScreen } from "@/features/auction-training/AuctionTrainingScreen";

/** The public Auction page's practice round: the guided training auction, played as a guest. */
export function DemoAuctionTraining({ backHref = "/demos", onExit }: { backHref?: string; onExit?: () => void } = {}) {
  const router = useRouter();
  const handleComplete = useCallback(() => {
    if (onExit) onExit();
    else router.push(backHref);
  }, [onExit, backHref, router]);
  return <AuctionTrainingScreen variant="guest" onComplete={handleComplete} />;
}

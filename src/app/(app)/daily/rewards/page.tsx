"use client";

import { useRouter } from "next/navigation";

import { RewardsWheel } from "@/features/daily/RewardsWheel";
import { logger } from "@/utils/logger";

export default function DailyRewardsPage() {
  const router = useRouter();

  return (
    <RewardsWheel
      onBack={() => router.push("/")}
      onRewardWon={(reward) => {
        // TODO: Actually credit the reward to the player's account
        logger.info("Reward won", { reward });
      }}
    />
  );
}

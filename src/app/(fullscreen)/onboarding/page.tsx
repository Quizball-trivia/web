"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { toast } from "sonner";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { logger } from "@/utils/logger";

export default function OnboardingPage() {
  const router = useRouter();

  type OnboardingData = Parameters<ComponentProps<typeof OnboardingFlow>["onComplete"]>[0];

  const handleComplete = (data: OnboardingData) => {
    logger.info("Onboarding completed", { data });
    storage.set(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
    router.replace("/");
    toast.success("Welcome to QuizBall!", {
      description: "Your football trivia journey begins now!",
    });
  };

  return <OnboardingFlow onComplete={handleComplete} />;
}

"use client";

import { useRouter } from "next/navigation";
import { useState, type ComponentProps } from "react";
import { toast } from "sonner";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { logger } from "@/utils/logger";
import { updateMe } from "@/lib/api/endpoints";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth.store";

export default function OnboardingPage() {
  const router = useRouter();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const [isSubmitting, setIsSubmitting] = useState(false);

  type OnboardingData = Parameters<ComponentProps<typeof OnboardingFlow>["onComplete"]>[0];

  const handleComplete = async (data: OnboardingData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      logger.info("Onboarding completed", { data });

      // Save profile data to backend
      await updateMe({
        nickname: data.username?.trim() || undefined,
        avatar_url: data.avatar
          ? `https://api.dicebear.com/7.x/big-smile/svg?seed=${data.avatar}&backgroundColor=b6e3f4,c0aede,d1d4f9&size=128`
          : undefined,
        favorite_club: data.favoriteClub === undefined ? undefined : data.favoriteClub,
        preferred_language: data.preferredLanguage === undefined ? undefined : data.preferredLanguage,
      });

      // Mark onboarding complete
      const completedUser = await apiFetch("post", "/api/v1/users/me/complete-onboarding");
      setAuthenticated(completedUser);

      storage.set(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
      router.replace("/");
      toast.success("Welcome to QuizBall!", {
        description: "Your football trivia journey begins now!",
      });
    } catch (error) {
      logger.error("Failed to save onboarding data", error);
      toast.error("Failed to save your preferences", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return <OnboardingFlow onComplete={handleComplete} />;
}

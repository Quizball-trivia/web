"use client";

import { useRouter } from "next/navigation";
import { useState, type ComponentProps } from "react";
import { toast } from "sonner";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { logger } from "@/utils/logger";
import { useLocale } from "@/contexts/LocaleContext";
import { updateMe } from "@/lib/api/endpoints";
import { apiFetch } from "@/lib/api/client";
import { isNicknameTakenError } from "@/lib/api/nicknameErrors";
import { useAuthStore } from "@/stores/auth.store";
import { DEFAULT_HAIR_ID, DEFAULT_JERSEY_ID, DEFAULT_SKIN_ID } from "@/lib/avatars/parts";
import type { AvatarCustomization } from "@/types/game";
import { trackOnboardingCompleted } from "@/lib/analytics/game-events";
import { consumePostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import { useGeorgianPhoneAuthAvailability } from "@/lib/auth/useGeorgianPhoneAuthAvailability";
import { loadMobileVerificationExperimentVariant } from "@/lib/experiments/mobileVerificationExperiment";
import { MobileVerificationStep } from "@/features/onboarding/MobileVerificationStep";

type OnboardingData = Parameters<ComponentProps<typeof OnboardingFlow>["onComplete"]>[0];

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useLocale();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const user = useAuthStore((state) => state.user);
  const phoneAuthAvailability = useGeorgianPhoneAuthAvailability();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [showMobileVerification, setShowMobileVerification] = useState(false);

  const completeOnboarding = async () => {
    const completedUser = await apiFetch("post", "/api/v1/users/me/complete-onboarding");
    setAuthenticated(completedUser);

    storage.set(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
    try {
      trackOnboardingCompleted();
    } catch (error) {
      logger.error('Analytics trackOnboardingCompleted failed', error);
    }
    router.replace(consumePostAuthRedirect() ?? "/play");
    toast.success(t('onboarding.toastWelcome'), {
      description: t('onboarding.toastWelcomeDescription'),
    });
  };

  const handleComplete = async (data: OnboardingData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setUsernameError(null);

    try {
      logger.info("Onboarding completed", { data });
      const selectedAvatarCustomization: AvatarCustomization = {
        skin: DEFAULT_SKIN_ID,
        jersey: data.avatar ? `jersey_${data.avatar}` as AvatarCustomization["jersey"] : DEFAULT_JERSEY_ID,
        hair: DEFAULT_HAIR_ID,
      };

      // Save profile data to backend
      await updateMe({
        nickname: data.username?.trim() || undefined,
        avatar_url: null,
        avatar_customization: selectedAvatarCustomization,
        favorite_club: data.favoriteClub === undefined ? undefined : data.favoriteClub,
        preferred_language: data.preferredLanguage === undefined ? undefined : data.preferredLanguage,
      });

      const eligibleForMobileVerification = Boolean(
        user &&
        !user.phone_verified_at &&
        phoneAuthAvailability.isAvailable &&
        !phoneAuthAvailability.isLoading
      );

      if (eligibleForMobileVerification && user) {
        const variant = await loadMobileVerificationExperimentVariant(user);
        if (variant === 'test') {
          setShowMobileVerification(true);
          return;
        }
      }

      await completeOnboarding();
    } catch (error) {
      logger.error("Failed to save onboarding data", error);
      if (isNicknameTakenError(error)) {
        const message = t('onboarding.usernameTaken');
        setUsernameError(message);
        toast.error(t('onboarding.toastSaveFailed'), {
          description: message,
        });
        return;
      }

      toast.error(t('onboarding.toastSaveFailed'), {
        description: t('onboarding.toastSaveFailedDescription'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMobileVerificationContinue = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await completeOnboarding();
    } catch (error) {
      logger.error("Failed to complete onboarding after mobile verification", error);
      toast.error(t('onboarding.toastSaveFailed'), {
        description: t('onboarding.toastSaveFailedDescription'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showMobileVerification) {
    return (
      <MobileVerificationStep
        isCompleting={isSubmitting}
        onContinue={handleMobileVerificationContinue}
      />
    );
  }

  return (
    <OnboardingFlow
      onComplete={handleComplete}
      isSubmitting={isSubmitting}
      usernameError={usernameError}
      onUsernameChange={() => setUsernameError(null)}
    />
  );
}

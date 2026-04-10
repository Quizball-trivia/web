import type { User } from "@/lib/types";

export function isOnboardingComplete(user: User | null | undefined): boolean {
  return Boolean(user?.onboarding_complete);
}

export function getAuthenticatedEntryRoute(user: User | null | undefined): "/play" | "/onboarding" {
  return isOnboardingComplete(user) ? "/play" : "/onboarding";
}

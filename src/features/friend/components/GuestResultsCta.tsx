"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { useRealtimePrincipal } from "@/lib/realtime/realtime-principal";
import { useAuthPromptStore } from "@/stores/authPrompt.store";

/**
 * Results screens of the guest-playable modes end with a sign-up nudge for
 * guests: nothing they did was saved (fresh account on sign-up, by design).
 */
export function GuestResultsCta({ className = "" }: { className?: string }) {
  const { t } = useLocale();
  const principal = useRealtimePrincipal();
  const openAuthPrompt = useAuthPromptStore((state) => state.open);
  if (principal.kind !== "guest") return null;
  return (
    <button
      type="button"
      onClick={openAuthPrompt}
      data-testid="guest-results-cta"
      className={`w-full rounded-2xl bg-brand-yellow px-6 py-4 font-poppins text-sm font-black uppercase tracking-wide text-black transition-colors hover:bg-brand-yellow-deep ${className}`}
    >
      {t("friend.guestKeepResults")}
    </button>
  );
}

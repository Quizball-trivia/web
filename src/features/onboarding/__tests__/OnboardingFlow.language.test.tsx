import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { messages } from "@/lib/i18n/messages";
import { OnboardingFlow } from "../OnboardingFlow";

const mocks = vi.hoisted(() => ({ user: null as { preferred_language: string; onboarding_complete: boolean; favorite_club: string | null } | null, inferred: "en" }));

vi.mock("next/navigation", () => ({ usePathname: () => "/onboarding" }));
vi.mock("@/stores/auth.store", () => ({
  useAuthStore: (selector?: (state: { user: typeof mocks.user }) => unknown) => (selector ? selector({ user: mocks.user }) : { user: mocks.user }),
}));
vi.mock("@/lib/i18n/infer-locale", () => ({ inferLocaleFromBrowser: () => mocks.inferred }));
vi.mock("@/lib/analytics/game-events", () => ({ trackOnboardingStarted: vi.fn(), trackOnboardingStepCompleted: vi.fn() }));
vi.mock("../ClubSelect", () => ({ default: ({ onChange }: { onChange: (club: string) => void }) => <button type="button" onClick={() => onChange("Northwick Rovers")}>pick club</button> }));

async function submitted(locale: "fr" | "de") {
  const onComplete = vi.fn();
  const user = userEvent.setup();
  render(<LocaleProvider><OnboardingFlow onComplete={onComplete} /></LocaleProvider>);
  const go = messages[locale].onboarding.letsGo;
  // The first use of a language loads its messages, which a busy test run can make slow.
  await user.click(await screen.findByRole("button", { name: go }, { timeout: 15_000 }));
  await user.click(await screen.findByRole("button", { name: "pick club" }));
  await user.click(await screen.findByRole("button", { name: go }));
  await user.type(await screen.findByRole("textbox"), "Tester");
  await user.click(screen.getAllByRole("button", { pressed: false })[0]);
  await user.click(await screen.findByRole("button", { name: go }));
  await waitFor(() => expect(onComplete).toHaveBeenCalled());
  return onComplete.mock.calls[0][0].preferredLanguage;
}

describe("the language onboarding submits", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.inferred = "en";
    mocks.user = { preferred_language: "en", onboarding_complete: false, favorite_club: null };
  });

  it.each(["fr", "de"] as const)("a new signup from /%s submits that language", async (locale) => {
    localStorage.setItem("quizball_signup_locale", JSON.stringify({ locale, at: Date.now() }));
    await expect(submitted(locale)).resolves.toBe(locale);
  }, 30_000);

  it("resuming with a saved German profile on a French browser submits German, not French", async () => {
    mocks.user = { preferred_language: "de", onboarding_complete: false, favorite_club: "Northwick Rovers" };
    mocks.inferred = "fr";
    await expect(submitted("de")).resolves.toBe("de");
  }, 30_000);

  it("resuming with a saved German profile after another account's Georgian submits German", async () => {
    mocks.user = { preferred_language: "de", onboarding_complete: false, favorite_club: "Northwick Rovers" };
    localStorage.setItem("quizball_locale", JSON.stringify("ka"));
    await expect(submitted("de")).resolves.toBe("de");
  }, 30_000);
});

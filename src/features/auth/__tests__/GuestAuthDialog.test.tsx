import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ handleAuthModeChange: vi.fn() }));
vi.mock("@/features/welcome/useWelcomeAuthController", () => ({
  useWelcomeAuthController: () => new Proxy({ handleAuthModeChange: auth.handleAuthModeChange, authMode: "signin" }, {
    get: (target, prop) => (prop in target ? target[prop as keyof typeof target] : vi.fn()),
  }),
}));
vi.mock("@/features/welcome/WelcomeLoginDialog", () => ({ WelcomeLoginDialog: () => null }));
vi.mock("@/lib/auth/useGeorgianPhoneAuthAvailability", () => ({ useGeorgianPhoneAuthAvailability: () => ({ available: false }) }));

const { GuestAuthDialog } = await import("../GuestAuthDialog");
const { useAuthPromptStore } = await import("@/stores/authPrompt.store");

describe("GuestAuthDialog", () => {
  beforeEach(() => { auth.handleAuthModeChange.mockClear(); act(() => useAuthPromptStore.getState().close()); });

  it("review 2026-10-06 W1: opens on whatever the button asked for, every time (create account, then a plain sign-in)", () => {
    render(<GuestAuthDialog />);
    act(() => useAuthPromptStore.getState().open("signup"));
    expect(auth.handleAuthModeChange).toHaveBeenLastCalledWith("signup");
    act(() => useAuthPromptStore.getState().close());
    act(() => useAuthPromptStore.getState().open());
    expect(auth.handleAuthModeChange).toHaveBeenLastCalledWith("signin");
  });
});

import { create } from "zustand";

/**
 * Opens the guest sign-in dialog from anywhere on a guest-visible screen (the
 * Play page in its non-authenticated state). Any tap that needs an account —
 * ranked, find-opponent, friend rooms, real-coin games — calls `open()` and the
 * mounted GuestAuthDialog takes it from there.
 */
interface AuthPromptState {
  isOpen: boolean;
  /** Which panel the dialog opens on: a "create account" button opens registration. */
  intent: "signin" | "signup";
  open: (intent?: "signin" | "signup") => void;
  close: () => void;
}

export const useAuthPromptStore = create<AuthPromptState>((set) => ({
  isOpen: false,
  intent: "signin",
  open: (intent = "signin") => set({ isOpen: true, intent }),
  close: () => set({ isOpen: false }),
}));

import { create } from "zustand";

/**
 * Opens the guest sign-in dialog from anywhere on a guest-visible screen (the
 * Play page in its non-authenticated state). Any tap that needs an account —
 * ranked, find-opponent, friend rooms, real-coin games — calls `open()` and the
 * mounted GuestAuthDialog takes it from there.
 */
interface AuthPromptState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useAuthPromptStore = create<AuthPromptState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

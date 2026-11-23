import { create } from "zustand";

/**
 * A screen inside the app shell that takes over the whole viewport (e.g. the live show once the host starts it)
 * hides the shell's header and nav while mounted, as a ranked match's route does. A counter, so nested or
 * overlapping takeovers release cleanly.
 */
type ImmersiveState = { count: number; enter: () => void; leave: () => void };

export const useImmersiveStore = create<ImmersiveState>((set) => ({
  count: 0,
  enter: () => set((s) => ({ count: s.count + 1 })),
  leave: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}));

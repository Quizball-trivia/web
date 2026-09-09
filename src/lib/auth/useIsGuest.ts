import { useAuthStore } from "@/stores/auth.store";

/**
 * Public presentation flag. Auth starts in `loading`, so anything keyed on
 * `anonymous` renders the member chrome on the server. Guest-visible routes
 * are the only ones rendered before the session resolves, and there the
 * server HTML must be the guest page (crawlable, no member placeholders).
 */
export const useIsGuest = (): boolean => useAuthStore((state) => state.status) !== "authenticated";

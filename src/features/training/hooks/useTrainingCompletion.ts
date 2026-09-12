import { useCallback } from "react";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { useAuthStore } from "@/stores/auth.store";

// Stored value is either the legacy boolean (pre user-scoping — treated as
// complete for everyone on this browser) or a per-user-id map. Guests get
// their own slot so public practice never hides the offer from an account
// that signs in later on the same browser.
type TrainingCompleteValue = boolean | Record<string, boolean>;
const GUEST_SLOT = "guest";

export type TrainingGame = "ranked" | "auction";

const KEY_BY_GAME = {
  ranked: STORAGE_KEYS.TRAINING_COMPLETE,
  auction: STORAGE_KEYS.TRAINING_AUCTION_COMPLETE,
} as const;

/**
 * Whether this user has played (or explicitly skipped) a training match.
 * Scoped per user id so a shared browser still offers training to a brand-new
 * account, and per game so finishing the ranked tutorial never hides the
 * auction one (or the reverse).
 */
export function useTrainingCompletion(game: TrainingGame = "ranked") {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const key = KEY_BY_GAME[game];

  const slot = userId ?? GUEST_SLOT;

  const isComplete = useCallback(() => {
    const value = storage.get<TrainingCompleteValue>(key, false);
    if (typeof value === "boolean") return value;
    return Boolean(value[slot]);
  }, [key, slot]);

  const markComplete = useCallback(() => {
    const value = storage.get<TrainingCompleteValue>(key, false);
    const map = typeof value === "boolean" ? {} : value;
    storage.set(key, { ...map, [slot]: true });
  }, [key, slot]);

  /** Dev reset: clears every training flag, not just this game's. */
  const resetTraining = useCallback(() => {
    storage.remove(STORAGE_KEYS.TRAINING_COMPLETE);
    storage.remove(STORAGE_KEYS.TRAINING_AUCTION_COMPLETE);
  }, []);

  return { isComplete, markComplete, resetTraining };
}

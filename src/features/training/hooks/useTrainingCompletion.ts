import { useCallback } from "react";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { useAuthStore } from "@/stores/auth.store";

// Stored value is either the legacy boolean (pre user-scoping — treated as
// complete for everyone on this browser) or a per-user-id map.
type TrainingCompleteValue = boolean | Record<string, boolean>;

/**
 * Whether this user has played (or explicitly skipped) the training match.
 * Scoped per user id so a shared browser still offers training to a brand-new
 * account.
 */
export function useTrainingCompletion() {
  const userId = useAuthStore((state) => state.user?.id ?? null);

  const isComplete = useCallback(() => {
    const value = storage.get<TrainingCompleteValue>(STORAGE_KEYS.TRAINING_COMPLETE, false);
    if (typeof value === "boolean") return value;
    return Boolean(userId && value[userId]);
  }, [userId]);

  const markComplete = useCallback(() => {
    if (!userId) {
      storage.set(STORAGE_KEYS.TRAINING_COMPLETE, true);
      return;
    }
    const value = storage.get<TrainingCompleteValue>(STORAGE_KEYS.TRAINING_COMPLETE, false);
    const map = typeof value === "boolean" ? {} : value;
    storage.set(STORAGE_KEYS.TRAINING_COMPLETE, { ...map, [userId]: true });
  }, [userId]);

  const resetTraining = useCallback(() => {
    storage.remove(STORAGE_KEYS.TRAINING_COMPLETE);
  }, []);

  return { isComplete, markComplete, resetTraining };
}

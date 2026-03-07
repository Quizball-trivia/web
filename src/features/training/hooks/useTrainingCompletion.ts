import { useCallback } from "react";
import { storage, STORAGE_KEYS } from "@/utils/storage";

export function useTrainingCompletion() {
  const isComplete = useCallback(() => {
    return storage.get<boolean>(STORAGE_KEYS.TRAINING_COMPLETE, false);
  }, []);

  const markComplete = useCallback(() => {
    storage.set(STORAGE_KEYS.TRAINING_COMPLETE, true);
  }, []);

  const resetTraining = useCallback(() => {
    storage.remove(STORAGE_KEYS.TRAINING_COMPLETE);
  }, []);

  return { isComplete, markComplete, resetTraining };
}

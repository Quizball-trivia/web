'use client';

import { useSyncExternalStore } from 'react';
import { storage, STORAGE_KEYS } from '@/utils/storage';

export interface UserPreferences {
  soundEnabled: boolean;
  musicEnabled: boolean;
  invitesEnabled: boolean;
  questAlertsEnabled: boolean;
  pingIndicatorEnabled: boolean;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  soundEnabled: true,
  musicEnabled: true,
  invitesEnabled: true,
  questAlertsEnabled: true,
  pingIndicatorEnabled: false,
};

const USER_PREFERENCES_CHANGED = 'quizball:user_preferences_changed';

let cachedRawPreferences: string | null | undefined;
let cachedPreferences: UserPreferences = DEFAULT_USER_PREFERENCES;

function normalizePreferences(saved: unknown): UserPreferences {
  return {
    ...DEFAULT_USER_PREFERENCES,
    ...(saved && typeof saved === 'object' ? saved : {}),
  };
}

export function getUserPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_USER_PREFERENCES;

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    if (raw === cachedRawPreferences) return cachedPreferences;

    cachedRawPreferences = raw;
    if (!raw) {
      cachedPreferences = DEFAULT_USER_PREFERENCES;
      return cachedPreferences;
    }

    try {
      cachedPreferences = normalizePreferences(JSON.parse(raw));
    } catch {
      cachedPreferences = DEFAULT_USER_PREFERENCES;
    }
    return cachedPreferences;
  } catch {
    return cachedPreferences;
  }
}

export function setUserPreferences(next: Partial<UserPreferences>): UserPreferences {
  const preferences = {
    ...getUserPreferences(),
    ...next,
  };
  storage.set(STORAGE_KEYS.USER_PREFERENCES, preferences);
  cachedRawPreferences = JSON.stringify(preferences);
  cachedPreferences = preferences;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(USER_PREFERENCES_CHANGED));
  }
  return preferences;
}

function subscribeUserPreferences(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEYS.USER_PREFERENCES) listener();
  };
  window.addEventListener(USER_PREFERENCES_CHANGED, listener);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(USER_PREFERENCES_CHANGED, listener);
    window.removeEventListener('storage', handleStorage);
  };
}

export function useUserPreferences(): UserPreferences {
  return useSyncExternalStore(
    subscribeUserPreferences,
    getUserPreferences,
    () => DEFAULT_USER_PREFERENCES,
  );
}

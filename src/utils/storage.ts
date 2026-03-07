// Typed storage keys - single source of truth
export const STORAGE_KEYS = {
  // Auth
  AUTH_TOKEN: 'quizball_auth_token',
  REFRESH_TOKEN: 'quizball_refresh_token',

  // User
  LOCALE: 'quizball_locale',
  ONBOARDING_COMPLETE: 'quizball_onboarding_complete',
  WALKTHROUGH_COMPLETE: 'quizball_walkthrough_complete',
  PLAYER_STATE: 'quizball_player_state',
  USER_PREFERENCES: 'quizball_user_preferences',

  // Game state
  DAILY_CHALLENGE_STATE: 'quizball_daily_challenge',
  WHEEL_SPIN_TIMESTAMP: 'quizball_wheel_spin',

  TRAINING_COMPLETE: 'quizball_training_complete',
  DEV_MODE: 'quizball_dev_mode',
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// Migration map: old key -> new key
const MIGRATIONS: Partial<Record<string, StorageKey>> = {
  'quizball-locale': STORAGE_KEYS.LOCALE,
  'onboardingCompleted': STORAGE_KEYS.ONBOARDING_COMPLETE,
  'walkthroughCompleted': STORAGE_KEYS.WALKTHROUGH_COMPLETE,
  'lastWheelSpin': STORAGE_KEYS.WHEEL_SPIN_TIMESTAMP,
};

// Run migrations once eagerly rather than on every get() call
let _migrated = false;
function runMigrations() {
  if (_migrated) return;
  _migrated = true;
  try {
    for (const [legacyKey, newKey] of Object.entries(MIGRATIONS)) {
      if (!newKey) continue;
      const val = localStorage.getItem(legacyKey);
      if (val) {
        localStorage.setItem(newKey, val);
        localStorage.removeItem(legacyKey);
      }
    }
  } catch {
    // Storage unavailable
  }
}

export const storage = {
  get<T>(key: StorageKey, defaultValue: T): T {
    try {
      runMigrations();
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      try {
        return JSON.parse(item);
      } catch {
        return item as T; // Raw string fallback (e.g. legacy auth tokens)
      }
    } catch {
      return defaultValue;
    }
  },

  set<T>(key: StorageKey, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable
    }
  },

  remove(key: StorageKey): void {
    localStorage.removeItem(key);
  },

  clear(): void {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  },
};

import { API_BASE_URL } from "@/lib/config";

const LEGACY_ACCESS_TOKEN_KEY = "qb_access_token";
const LEGACY_REFRESH_TOKEN_KEY = "qb_refresh_token";
const TOKEN_SCOPE_KEY = "qb_token_scope";

function normalizeTokenScope(rawBaseUrl: string): string {
  try {
    const fallbackOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    return new URL(rawBaseUrl, fallbackOrigin).origin;
  } catch {
    return rawBaseUrl;
  }
}

const TOKEN_SCOPE = normalizeTokenScope(API_BASE_URL);
const ACCESS_TOKEN_KEY = `${LEGACY_ACCESS_TOKEN_KEY}:${encodeURIComponent(TOKEN_SCOPE)}`;
const REFRESH_TOKEN_KEY = `${LEGACY_REFRESH_TOKEN_KEY}:${encodeURIComponent(TOKEN_SCOPE)}`;

let accessToken: string | null = null;
let refreshToken: string | null = null;
let hydrated = false;

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function isStagingApiScope(scope: string): boolean {
  try {
    const hostname = new URL(scope).hostname.toLowerCase();
    return hostname.includes("staging");
  } catch {
    return scope.toLowerCase().includes("staging");
  }
}

function shouldMigrateLegacyTokens(): boolean {
  // Old builds used one localStorage token pair regardless of backend. Those
  // legacy tokens cannot be trusted for staging APIs because they may have come
  // from another backend environment. Prod/non-staging APIs may migrate so
  // existing production users are not forced to sign in again.
  return !isStagingApiScope(TOKEN_SCOPE);
}

function removeTokenKeys(storage: Storage): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (
      key === LEGACY_ACCESS_TOKEN_KEY ||
      key === LEGACY_REFRESH_TOKEN_KEY ||
      key?.startsWith(`${LEGACY_ACCESS_TOKEN_KEY}:`) ||
      key?.startsWith(`${LEGACY_REFRESH_TOKEN_KEY}:`)
    ) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.push(TOKEN_SCOPE_KEY);
  keysToRemove.forEach((key) => storage.removeItem(key));
}

function clearAuthCookies(): void {
  if (!hasWindow()) return;
  const options = [
    'path=/',
    `domain=${window.location.hostname}`,
  ];
  for (const name of [LEGACY_ACCESS_TOKEN_KEY, LEGACY_REFRESH_TOKEN_KEY]) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
    document.cookie = `${name}=; Max-Age=0; ${options.join('; ')}`;
  }
}

export function clearLegacyAuthState(): void {
  accessToken = null;
  refreshToken = null;
  hydrated = true;
  if (!hasWindow()) return;
  try {
    removeTokenKeys(window.localStorage);
  } catch {
    // Ignore storage access issues.
  }
  try {
    removeTokenKeys(window.sessionStorage);
  } catch {
    // Ignore storage access issues.
  }
  clearAuthCookies();
}

function hydrateFromStorage(): void {
  if (hydrated || !hasWindow()) return;
  hydrated = true;
  try {
    const storedScope = window.localStorage.getItem(TOKEN_SCOPE_KEY);
    if (storedScope && storedScope !== TOKEN_SCOPE) {
      removeTokenKeys(window.localStorage);
      window.localStorage.setItem(TOKEN_SCOPE_KEY, TOKEN_SCOPE);
      return;
    }

    if (!storedScope) {
      if (shouldMigrateLegacyTokens()) {
        accessToken = window.localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);
        refreshToken = window.localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
      }
      removeTokenKeys(window.localStorage);
      window.localStorage.setItem(TOKEN_SCOPE_KEY, TOKEN_SCOPE);
      if (accessToken) {
        window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      }
      if (refreshToken) {
        window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      return;
    }

    accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    // Ignore storage access issues (private mode, blocked storage, etc).
  }
}

function syncFromStorage(): void {
  if (!hasWindow()) return;
  try {
    accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    // Ignore storage access issues (private mode, blocked storage, etc).
  }
}

function persistToStorage(): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(TOKEN_SCOPE_KEY, TOKEN_SCOPE);
    window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    if (accessToken) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
    if (refreshToken) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch {
    // Ignore storage write failures.
  }
}

export function getAccessToken(): string | null {
  hydrateFromStorage();
  syncFromStorage();
  return accessToken;
}

export function getRefreshToken(): string | null {
  hydrateFromStorage();
  syncFromStorage();
  return refreshToken;
}

export function setTokens(tokens: {
  accessToken: string;
  refreshToken: string;
}): void {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  hydrated = true;
  persistToStorage();
}

export function clearTokens(): void {
  clearLegacyAuthState();
}

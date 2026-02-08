const ACCESS_TOKEN_KEY = "qb_access_token";
const REFRESH_TOKEN_KEY = "qb_refresh_token";

let accessToken: string | null = null;
let refreshToken: string | null = null;
let hydrated = false;

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function hydrateFromStorage(): void {
  if (hydrated || !hasWindow()) return;
  hydrated = true;
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
  return accessToken;
}

export function getRefreshToken(): string | null {
  hydrateFromStorage();
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
  accessToken = null;
  refreshToken = null;
  hydrated = true;
  persistToStorage();
}

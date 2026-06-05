import { clearTokens, getRefreshToken, setTokens } from "@/lib/auth/tokenStorage";
import { api, ApiError } from "@/lib/api/api";
import { normalizeEmail } from "@/lib/auth/validation";
import { logger } from "@/utils/logger";
import type { components, paths } from "@/types/api.generated";

type AuthResponse = components["schemas"]["AuthResponse"];
type SocialLoginResponse = components["schemas"]["SocialLoginResponse"];

type LoginPayload =
  NonNullable<
    paths["/api/v1/auth/login"]["post"]["requestBody"]
  >["content"]["application/json"];

type RegisterPayload =
  NonNullable<
    paths["/api/v1/auth/register"]["post"]["requestBody"]
  >["content"]["application/json"];

type RefreshPayload =
  NonNullable<
    paths["/api/v1/auth/refresh"]["post"]["requestBody"]
  >["content"]["application/json"];

type RestorePendingDeletionPayload = {
  refresh_token?: string;
};

type ForgotPasswordPayload =
  NonNullable<
    paths["/api/v1/auth/forgot-password"]["post"]["requestBody"]
  >["content"]["application/json"];

type ResetPasswordPayload =
  NonNullable<
    paths["/api/v1/auth/reset-password"]["post"]["requestBody"]
  >["content"]["application/json"];

type SocialLoginPayload =
  NonNullable<
    paths["/api/v1/auth/social-login"]["post"]["requestBody"]
  >["content"]["application/json"];

type GeorgianPhoneOtpStartPayload =
  NonNullable<
    paths["/api/v1/auth/phone/ge/start"]["post"]["requestBody"]
  >["content"]["application/json"];

export type GeorgianPhoneAvailabilityResponse =
  paths["/api/v1/auth/phone/ge/availability"]["get"]["responses"][200]["content"]["application/json"];

type GeorgianPhoneOtpVerifyPayload =
  NonNullable<
    paths["/api/v1/auth/phone/ge/verify"]["post"]["requestBody"]
  >["content"]["application/json"];

type GeorgianPhoneLinkStartPayload =
  NonNullable<
    paths["/api/v1/auth/phone/ge/link/start"]["post"]["requestBody"]
  >["content"]["application/json"];

type GeorgianPhoneLinkStartResponse =
  paths["/api/v1/auth/phone/ge/link/start"]["post"]["responses"][200]["content"]["application/json"];

type GeorgianPhoneLinkVerifyPayload =
  NonNullable<
    paths["/api/v1/auth/phone/ge/link/verify"]["post"]["requestBody"]
  >["content"]["application/json"];

type UserResponse = components["schemas"]["UserResponse"];
type RedirectOAuthProvider = Extract<SocialLoginPayload["provider"], "google" | "facebook">;

const REDIRECT_OAUTH_PROVIDER_KEY = "quizball_oauth_provider";

function rememberRedirectOAuthProvider(provider: SocialLoginPayload["provider"]): void {
  if (provider !== "google" && provider !== "facebook") {
    return;
  }
  try {
    window.sessionStorage.setItem(REDIRECT_OAUTH_PROVIDER_KEY, provider);
  } catch {
    // Best-effort; analytics can still be skipped if storage is unavailable.
  }
}

export function consumeRedirectOAuthProvider(): RedirectOAuthProvider | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const provider = window.sessionStorage.getItem(REDIRECT_OAUTH_PROVIDER_KEY);
    window.sessionStorage.removeItem(REDIRECT_OAUTH_PROVIDER_KEY);
    return provider === "google" || provider === "facebook" ? provider : null;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<AuthResponse["user"] | null> {
  const normalizedEmail = normalizeEmail(email);
  logger.info("Auth login start", { email: normalizedEmail });
  const data = await api.POST("/api/v1/auth/login", {
    body: { email: normalizedEmail, password } satisfies LoginPayload,
    auth: false,
  });
  const response = data as AuthResponse;
  if (response?.access_token && response?.refresh_token) {
    storeAuthTokens({ accessToken: response.access_token, refreshToken: response.refresh_token });
  }
  logger.info("Auth login success");
  return response.user ?? null;
}

export async function restorePendingDeletionWithLogin(
  email: string,
  password: string,
): Promise<AuthResponse["user"] | null> {
  const normalizedEmail = normalizeEmail(email);
  logger.info("Auth pending deletion restore with login start", { email: normalizedEmail });
  const data = await api.POST("/api/v1/auth/login/restore", {
    body: { email: normalizedEmail, password } satisfies LoginPayload,
    auth: false,
  });
  const response = data as AuthResponse;
  if (response?.access_token && response?.refresh_token) {
    storeAuthTokens({ accessToken: response.access_token, refreshToken: response.refresh_token });
  }
  logger.info("Auth pending deletion restore with login success");
  return response.user ?? null;
}

export type RegisterResult = {
  user: AuthResponse["user"] | null;
  tokensSet: boolean;
  /** True when the email already belongs to an existing account (no email sent). */
  alreadyRegistered: boolean;
  /** True when the existing account is inside the deletion grace period. */
  pendingDeletion: boolean;
};

export async function register(payload: RegisterPayload): Promise<RegisterResult> {
  logger.info("Auth register start", { email: payload.email });
  const data = await api.POST("/api/v1/auth/register", {
    body: payload,
    auth: false,
  });
  logger.info("Auth register success");
  const response = data as AuthResponse;
  if (response?.access_token && response?.refresh_token) {
    storeAuthTokens({ accessToken: response.access_token, refreshToken: response.refresh_token });
  }
  const hasTokens = Boolean(response?.access_token);
  return {
    user: response.user ?? null,
    tokensSet: hasTokens,
    alreadyRegistered: Boolean(
      (response as AuthResponse & { already_registered?: boolean })?.already_registered,
    ),
    pendingDeletion: Boolean(
      (response as AuthResponse & { pending_deletion?: boolean })?.pending_deletion,
    ),
  };
}

export function isPendingDeletionAuthError(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }
  const details = error.data && typeof error.data === "object" && "details" in error.data
    ? (error.data as { details?: unknown }).details
    : null;
  return Boolean(
    details &&
      typeof details === "object" &&
      "reason" in details &&
      (details as { reason?: unknown }).reason === "pending_deletion",
  );
}

/**
 * Result of a refresh attempt.
 * - `{ ok: true }` — a new session was obtained.
 * - `{ ok: false, terminal: true }` — the refresh token is dead (hard 400/401).
 *   Tokens have been cleared; the caller must treat the session as ended and
 *   must NOT retry. This is what stops the refresh-loop error storm.
 * - `{ ok: false, terminal: false }` — transient failure (network/5xx); the
 *   tokens are left intact and a later attempt may succeed.
 */
export type RefreshResult =
  | { ok: true }
  | { ok: false; terminal: boolean };

// Single-flight guard: many requests can 401 at once (stats, ranked, store,
// /users/me all fire on load). Without this, each would kick off its own
// /auth/refresh, amplifying the storm. They all await the same attempt.
let refreshInFlight: Promise<RefreshResult> | null = null;
let refreshTerminalDisabled = false;

function storeAuthTokens(tokens: { accessToken: string; refreshToken: string }): void {
  refreshTerminalDisabled = false;
  setTokens(tokens);
}

function isTerminalAuthError(error: unknown): boolean {
  // A 400 from /auth/refresh means the refresh token itself was rejected; a
  // 401 means authentication is no longer valid. Both are terminal — retrying
  // with the same token only reproduces the failure.
  return error instanceof ApiError && (error.status === 400 || error.status === 401);
}

async function performRefresh(): Promise<RefreshResult> {
  const storedRefreshToken = getRefreshToken();
  if (refreshTerminalDisabled && !storedRefreshToken) {
    logger.warn("Auth refresh skipped after terminal failure");
    return { ok: false, terminal: true };
  }
  if (storedRefreshToken) {
    refreshTerminalDisabled = false;
  }

  try {
    logger.info("Auth refresh start");
    const data = storedRefreshToken
      ? await api.POST("/api/v1/auth/refresh", {
          body: { refresh_token: storedRefreshToken } satisfies RefreshPayload,
          auth: false,
        })
      : await api.POST("/api/v1/auth/refresh", { auth: false });

    const response = data as AuthResponse;
    if (response?.access_token && response?.refresh_token) {
      storeAuthTokens({ accessToken: response.access_token, refreshToken: response.refresh_token });
      logger.info("Auth refresh success");
      return { ok: true };
    }

    // 2xx but no tokens returned — treat as terminal so we don't loop on it.
    logger.warn("Auth refresh returned no tokens");
    refreshTerminalDisabled = true;
    clearTokens();
    return { ok: false, terminal: true };
  } catch (error) {
    const terminal = isTerminalAuthError(error);
    if (terminal) {
      // Clear the local tokens. The backend also clears the httpOnly cookies on
      // this same failed /auth/refresh response, so the bad cookie isn't replayed.
      logger.warn("Auth refresh failed (terminal) — clearing tokens", error);
      refreshTerminalDisabled = true;
      clearTokens();
    } else {
      logger.warn("Auth refresh failed (transient)", error);
    }
    return { ok: false, terminal };
  }
}

/**
 * Refresh the session. Returns a structured {@link RefreshResult}. All callers
 * share a single in-flight attempt (single-flight) to avoid a refresh stampede.
 */
export async function refreshSession(): Promise<RefreshResult> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/**
 * Boolean-compatible wrapper for existing callers. Returns true only on success.
 * Tokens are still cleared on a terminal failure inside {@link refreshSession}.
 */
export async function refresh(): Promise<boolean> {
  const result = await refreshSession();
  return result.ok;
}

/**
 * Refresh using an explicit token (e.g. one just received out-of-band).
 * Shares the same single-flight guard via {@link refreshSession} is not used
 * here because the token is caller-supplied; it still clears tokens on terminal
 * failure so a dead token never survives.
 */
export async function refreshWithToken(refreshToken: string): Promise<boolean> {
  const result = await refreshWithTokenDetailed(refreshToken);
  return result.ok;
}

export type RefreshWithTokenResult =
  | { ok: true }
  | { ok: false; pendingDeletion: boolean };

export async function refreshWithTokenDetailed(refreshToken: string): Promise<RefreshWithTokenResult> {
  try {
    logger.info("Auth refresh with token start");
    const data = await api.POST("/api/v1/auth/refresh", {
      body: { refresh_token: refreshToken } satisfies RefreshPayload,
      auth: false,
    });
    const response = data as AuthResponse;
    if (response?.access_token && response?.refresh_token) {
      storeAuthTokens({ accessToken: response.access_token, refreshToken: response.refresh_token });
      logger.info("Auth refresh with token success");
      return { ok: true };
    }
    refreshTerminalDisabled = true;
    clearTokens();
    return { ok: false, pendingDeletion: false };
  } catch (error) {
    const pendingDeletion = isPendingDeletionAuthError(error);
    if (isTerminalAuthError(error)) {
      logger.warn("Auth refresh with token failed (terminal) — clearing tokens", error);
      refreshTerminalDisabled = true;
      clearTokens();
    } else {
      logger.warn("Auth refresh with token failed (transient)", error);
    }
    return { ok: false, pendingDeletion };
  }
}

export async function restorePendingDeletionWithToken(refreshToken?: string): Promise<AuthResponse["user"] | null> {
  logger.info("Auth pending deletion restore with token start");
  const data = await api.POST("/api/v1/auth/restore-pending-deletion", {
    body: (refreshToken ? { refresh_token: refreshToken } : {}) satisfies RestorePendingDeletionPayload,
    auth: false,
  });
  const response = data as AuthResponse;
  if (response?.access_token && response?.refresh_token) {
    storeAuthTokens({ accessToken: response.access_token, refreshToken: response.refresh_token });
  }
  logger.info("Auth pending deletion restore with token success");
  return response.user ?? null;
}

export async function logout(): Promise<void> {
  try {
    logger.info("Auth logout start");
    await api.POST("/api/v1/auth/logout");
    logger.info("Auth logout success");
  } catch {
    // Best-effort; continue to clear tokens.
    logger.warn("Auth logout failed");
  } finally {
    refreshTerminalDisabled = true;
    clearTokens();
  }
}

export async function forgotPassword(email: string, redirectTo: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  logger.info("Auth forgot password", { email: normalizedEmail });
  await api.POST("/api/v1/auth/forgot-password", {
    body: { email: normalizedEmail, redirect_to: redirectTo } satisfies ForgotPasswordPayload,
    auth: false,
  });
}

/**
 * Update the password for the currently-authenticated Supabase session.
 * Used by both the reset-password page (after a recovery link establishes a
 * session) and the Settings change/add-password modal. The api client injects
 * the Bearer token automatically; an explicit accessToken can override it
 * (e.g. immediately after parsing a recovery link, before token storage
 * settles).
 */
export async function resetPassword(newPassword: string, accessToken?: string): Promise<void> {
  logger.info("Auth reset password start");
  await api.POST("/api/v1/auth/reset-password", {
    body: { new_password: newPassword } satisfies ResetPasswordPayload,
    ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
  });
  logger.info("Auth reset password success");
}

export async function socialLogin(
  provider: SocialLoginPayload["provider"],
  redirectTo: SocialLoginPayload["redirect_to"],
): Promise<void> {
  logger.info("Auth social login start", { provider, redirectTo });
  const data = (await api.POST("/api/v1/auth/social-login", {
    body: { provider, redirect_to: redirectTo } satisfies SocialLoginPayload,
    auth: false,
  })) as SocialLoginResponse;
  if (typeof window === "undefined") return;
  if (!data.url) {
    logger.warn("Auth social login missing redirect URL");
    throw new Error("Missing redirect URL from social login");
  }
  rememberRedirectOAuthProvider(provider);
  logger.info("Auth social login redirect");
  window.location.href = data.url;
}

/**
 * Exchange a Google ID token (from GIS) for a Quizball session.
 * Bypasses the classic OAuth redirect (which is blocked inside in-app
 * browsers like Messenger/Instagram) by posting the JWT credential
 * directly to our backend, which verifies it with Supabase server-side.
 */
export async function socialLoginWithIdToken(
  provider: "google" | "apple",
  idToken: string,
  nonce?: string,
  options?: { restorePendingDeletion?: boolean },
): Promise<AuthResponse["user"] | null> {
  logger.info("Auth social login token start", { provider });
  const data = await api.POST("/api/v1/auth/social-login-token", {
    body: {
      provider,
      id_token: idToken,
      ...(nonce ? { nonce } : {}),
      ...(options?.restorePendingDeletion ? { restore_pending_deletion: true } : {}),
    },
    auth: false,
  });
  const response = data as AuthResponse;
  if (response?.access_token && response?.refresh_token) {
    storeAuthTokens({ accessToken: response.access_token, refreshToken: response.refresh_token });
  }
  logger.info("Auth social login token success");
  return response.user ?? null;
}

export async function startGeorgianPhoneOtp(phone: string): Promise<void> {
  logger.info("Auth Georgian phone OTP start");
  await api.POST("/api/v1/auth/phone/ge/start", {
    body: { phone } satisfies GeorgianPhoneOtpStartPayload,
    auth: false,
  });
}

export async function getGeorgianPhoneAuthAvailability(
  signal?: AbortSignal,
): Promise<GeorgianPhoneAvailabilityResponse> {
  return api.GET("/api/v1/auth/phone/ge/availability", {
    auth: false,
    signal,
  }) as Promise<GeorgianPhoneAvailabilityResponse>;
}

export async function verifyGeorgianPhoneOtp(
  phone: string,
  token: string,
  options?: { restorePendingDeletion?: boolean },
): Promise<AuthResponse["user"] | null> {
  logger.info("Auth Georgian phone OTP verify");
  const data = await api.POST("/api/v1/auth/phone/ge/verify", {
    body: {
      phone,
      token,
      ...(options?.restorePendingDeletion ? { restore_pending_deletion: true } : {}),
    } satisfies GeorgianPhoneOtpVerifyPayload,
    auth: false,
  });
  const response = data as AuthResponse;
  if (response?.access_token && response?.refresh_token) {
    storeAuthTokens({ accessToken: response.access_token, refreshToken: response.refresh_token });
  }
  return response.user ?? null;
}

export async function startGeorgianPhoneLink(phone: string): Promise<GeorgianPhoneLinkStartResponse> {
  logger.info("Auth Georgian phone link start");
  return api.POST("/api/v1/auth/phone/ge/link/start", {
    body: { phone } satisfies GeorgianPhoneLinkStartPayload,
  }) as Promise<GeorgianPhoneLinkStartResponse>;
}

export async function verifyGeorgianPhoneLink(phone: string, token: string): Promise<UserResponse> {
  logger.info("Auth Georgian phone link verify");
  return api.POST("/api/v1/auth/phone/ge/link/verify", {
    body: { phone, token } satisfies GeorgianPhoneLinkVerifyPayload,
  }) as Promise<UserResponse>;
}

export function parseOAuthHash(
  hash: string,
): { accessToken: string; refreshToken: string } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  logger.info("Auth parse OAuth hash", {
    hasAccessToken: Boolean(accessToken),
    hasRefreshToken: Boolean(refreshToken),
    hashLength: hash.length,
  });
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

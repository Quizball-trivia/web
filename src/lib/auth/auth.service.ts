import type { Provider } from "@supabase/supabase-js";
import { clearTokens } from "@/lib/auth/tokenStorage";
import { api, ApiError } from "@/lib/api/api";
import { normalizeEmail } from "@/lib/auth/validation";
import { logger } from "@/utils/logger";
import type { components, paths } from "@/types/api.generated";
import {
  getSupabaseClient,
  setSupabaseSession,
  signOutLocal,
} from "@/lib/auth/supabase";

type AuthResponse = components["schemas"]["AuthResponse"];

type LoginPayload =
  NonNullable<
    paths["/api/v1/auth/login"]["post"]["requestBody"]
  >["content"]["application/json"];

type RegisterPayload =
  NonNullable<
    paths["/api/v1/auth/register"]["post"]["requestBody"]
  >["content"]["application/json"];

type RestorePendingDeletionPayload = {
  refresh_token?: string;
};

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

async function provisionCurrentSession(): Promise<void> {
  // Provisioning the backend user record is required for a usable login: a
  // failure here means the user is authenticated in Supabase but has no backend
  // record. api.GET already throws on HTTP errors (so the login still fails),
  // but log + rethrow with context so the provisioning step is identifiable
  // upstream instead of surfacing as a bare request error.
  try {
    await api.GET("/api/v1/users/me");
  } catch (error) {
    logger.error("Session provisioning failed", { error });
    throw error;
  }
}

async function applyAuthResponseSession(response: AuthResponse): Promise<void> {
  await setSupabaseSession({
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
  });
}

export async function login(email: string, password: string): Promise<AuthResponse["user"] | null> {
  const normalizedEmail = normalizeEmail(email);
  logger.info("Auth login start", { email: normalizedEmail });
  const { error } = await getSupabaseClient().auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });
  if (error) throw error;
  await provisionCurrentSession();
  logger.info("Auth login success");
  return null;
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
  await applyAuthResponseSession(response);
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
  const normalizedEmail = normalizeEmail(payload.email);
  logger.info("Auth register start", { email: normalizedEmail });
  const { data, error } = await getSupabaseClient().auth.signUp({
    email: normalizedEmail,
    password: payload.password,
    options: {
      emailRedirectTo: payload.redirect_to,
      data: payload.locale ? { locale: payload.locale } : undefined,
    },
  });
  if (error) throw error;

  const identities = (data.user as { identities?: unknown[] } | null)?.identities;
  const hasSession = Boolean(data.session?.access_token);
  if (hasSession) {
    await provisionCurrentSession();
  }

  logger.info("Auth register success");
  return {
    user: null,
    tokensSet: hasSession,
    alreadyRegistered: !hasSession && Array.isArray(identities) && identities.length === 0,
    pendingDeletion: false,
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
 * Result of a session check.
 * - `{ ok: true }` — Supabase currently has a browser session.
 * - `{ ok: false, terminal: true }` — there is no browser session.
 * - `{ ok: false, terminal: false }` — transient read failure.
 */
export type RefreshResult =
  | { ok: true }
  | { ok: false; terminal: boolean };

export async function refreshSession(): Promise<RefreshResult> {
  try {
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error) {
      logger.warn("Supabase session check failed", error);
      return { ok: false, terminal: false };
    }
    if (data.session?.access_token) {
      return { ok: true };
    }
    clearTokens();
    return { ok: false, terminal: true };
  } catch (error) {
    logger.warn("Supabase session check threw", error);
    return { ok: false, terminal: false };
  }
}

export async function refresh(): Promise<boolean> {
  const result = await refreshSession();
  return result.ok;
}

export async function refreshWithToken(refreshToken: string): Promise<boolean> {
  const result = await refreshWithTokenDetailed(refreshToken);
  return result.ok;
}

export type RefreshWithTokenResult =
  | { ok: true }
  | { ok: false; pendingDeletion: boolean };

export async function refreshWithTokenDetailed(refreshToken: string): Promise<RefreshWithTokenResult> {
  logger.info("Supabase refresh with explicit token start");
  const { data, error } = await getSupabaseClient().auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    logger.warn("Supabase refresh with explicit token failed", error);
    clearTokens();
    return { ok: false, pendingDeletion: false };
  }
  logger.info("Supabase refresh with explicit token success");
  return { ok: true };
}

export async function restorePendingDeletionWithToken(refreshToken?: string): Promise<AuthResponse["user"] | null> {
  logger.info("Auth pending deletion restore with token start");
  const data = await api.POST("/api/v1/auth/restore-pending-deletion", {
    body: (refreshToken ? { refresh_token: refreshToken } : {}) satisfies RestorePendingDeletionPayload,
    auth: false,
  });
  const response = data as AuthResponse;
  await applyAuthResponseSession(response);
  logger.info("Auth pending deletion restore with token success");
  return response.user ?? null;
}

export async function logout(): Promise<void> {
  try {
    logger.info("Auth logout start");
    await signOutLocal();
    logger.info("Auth logout success");
  } catch {
    // Best-effort; continue to clear legacy tokens.
    logger.warn("Auth logout failed");
  } finally {
    clearTokens();
  }
}

export async function forgotPassword(email: string, redirectTo: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  logger.info("Auth forgot password", { email: normalizedEmail });
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });
  if (error) throw error;
}

export async function resetPassword(newPassword: string, accessToken?: string): Promise<void> {
  logger.info("Auth reset password start");
  if (accessToken) {
    await api.POST("/api/v1/auth/reset-password", {
      body: { new_password: newPassword } satisfies ResetPasswordPayload,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } else {
    const { error } = await getSupabaseClient().auth.updateUser({ password: newPassword });
    if (error) throw error;
  }
  logger.info("Auth reset password success");
}

export async function socialLogin(
  provider: SocialLoginPayload["provider"],
  redirectTo: SocialLoginPayload["redirect_to"],
): Promise<void> {
  logger.info("Auth social login start", { provider, redirectTo });
  if (typeof window === "undefined") return;
  rememberRedirectOAuthProvider(provider);
  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: provider as Provider,
    options: { redirectTo },
  });
  if (error) throw error;
}

/**
 * Exchange a Google ID token (from GIS) for a Supabase session.
 * Used for embedded webviews where classic OAuth redirect is blocked.
 */
export async function socialLoginWithIdToken(
  provider: "google" | "apple",
  idToken: string,
  nonce?: string,
  options?: { restorePendingDeletion?: boolean },
): Promise<AuthResponse["user"] | null> {
  logger.info("Auth social login token start", { provider });
  if (options?.restorePendingDeletion) {
    const data = await api.POST("/api/v1/auth/social-login-token", {
      body: {
        provider,
        id_token: idToken,
        ...(nonce ? { nonce } : {}),
        restore_pending_deletion: true,
      },
      auth: false,
    });
    const response = data as AuthResponse;
    await applyAuthResponseSession(response);
    logger.info("Auth social login token restore success");
    return response.user ?? null;
  }

  const { error } = await getSupabaseClient().auth.signInWithIdToken({
    provider,
    token: idToken,
    nonce,
  });
  if (error) throw error;
  await provisionCurrentSession();
  logger.info("Auth social login token success");
  return null;
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
  await applyAuthResponseSession(response);
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
  const user = await api.POST("/api/v1/auth/phone/ge/link/verify", {
    body: { phone, token } satisfies GeorgianPhoneLinkVerifyPayload,
  }) as UserResponse;
  await getSupabaseClient().auth.refreshSession();
  return user;
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

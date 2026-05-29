import { clearTokens, getRefreshToken, setTokens } from "@/lib/auth/tokenStorage";
import { api } from "@/lib/api/api";
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

export async function login(email: string, password: string): Promise<AuthResponse["user"] | null> {
  const normalizedEmail = normalizeEmail(email);
  logger.info("Auth login start", { email: normalizedEmail });
  const data = await api.POST("/api/v1/auth/login", {
    body: { email: normalizedEmail, password } satisfies LoginPayload,
    auth: false,
  });
  const response = data as AuthResponse;
  if (response?.access_token && response?.refresh_token) {
    setTokens({ accessToken: response.access_token, refreshToken: response.refresh_token });
  }
  logger.info("Auth login success");
  return response.user ?? null;
}

export type RegisterResult = {
  user: AuthResponse["user"] | null;
  tokensSet: boolean;
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
    setTokens({ accessToken: response.access_token, refreshToken: response.refresh_token });
  }
  const hasTokens = Boolean(response?.access_token);
  return { user: response.user ?? null, tokensSet: hasTokens };
}

export async function refresh(): Promise<boolean> {
  try {
    logger.info("Auth refresh start");
    const storedRefreshToken = getRefreshToken();
    if (storedRefreshToken) {
      return await refreshWithToken(storedRefreshToken);
    }
    const data = await api.POST("/api/v1/auth/refresh", { auth: false });
    const response = data as AuthResponse;
    if (response?.access_token && response?.refresh_token) {
      setTokens({ accessToken: response.access_token, refreshToken: response.refresh_token });
    }
    logger.info("Auth refresh success");
    return true;
  } catch (error) {
    logger.warn("Auth refresh failed", error);
    return false;
  }
}

export async function refreshWithToken(refreshToken: string): Promise<boolean> {
  try {
    logger.info("Auth refresh with token start");
    const data = await api.POST("/api/v1/auth/refresh", {
      body: { refresh_token: refreshToken } satisfies RefreshPayload,
      auth: false,
    });
    const response = data as AuthResponse;
    if (response?.access_token && response?.refresh_token) {
      setTokens({ accessToken: response.access_token, refreshToken: response.refresh_token });
    }
    logger.info("Auth refresh with token success");
    return true;
  } catch (error) {
    logger.warn("Auth refresh with token failed", error);
    return false;
  }
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
): Promise<AuthResponse["user"] | null> {
  logger.info("Auth social login token start", { provider });
  const data = await api.POST("/api/v1/auth/social-login-token", {
    body: { provider, id_token: idToken, ...(nonce ? { nonce } : {}) },
    auth: false,
  });
  const response = data as AuthResponse;
  if (response?.access_token && response?.refresh_token) {
    setTokens({ accessToken: response.access_token, refreshToken: response.refresh_token });
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

export async function verifyGeorgianPhoneOtp(
  phone: string,
  token: string,
): Promise<AuthResponse["user"] | null> {
  logger.info("Auth Georgian phone OTP verify");
  const data = await api.POST("/api/v1/auth/phone/ge/verify", {
    body: { phone, token } satisfies GeorgianPhoneOtpVerifyPayload,
    auth: false,
  });
  const response = data as AuthResponse;
  if (response?.access_token && response?.refresh_token) {
    setTokens({ accessToken: response.access_token, refreshToken: response.refresh_token });
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

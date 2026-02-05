import { clearTokens, getRefreshToken, setTokens } from "@/lib/auth/tokenStorage";
import { api } from "@/lib/api/api";
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

type SocialLoginPayload =
  NonNullable<
    paths["/api/v1/auth/social-login"]["post"]["requestBody"]
  >["content"]["application/json"];

export async function login(email: string, password: string): Promise<AuthResponse["user"] | null> {
  logger.info("Auth login start", { email });
  const data = await api.POST("/api/v1/auth/login", {
    body: { email, password } satisfies LoginPayload,
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

export async function forgotPassword(email: string): Promise<void> {
  logger.info("Auth forgot password", { email });
  await api.POST("/api/v1/auth/forgot-password", {
    body: { email } satisfies ForgotPasswordPayload,
    auth: false,
  });
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

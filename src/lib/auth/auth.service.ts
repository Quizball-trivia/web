import { clearTokens, getRefreshToken, setTokens } from "@/lib/auth/tokenStorage";
import { api } from "@/utils/api";
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

function extractTokens(data: AuthResponse | null) {
  if (!data) return null;
  const accessToken = data.access_token ?? undefined;
  const refreshToken = data.refresh_token ?? undefined;
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function login(email: string, password: string): Promise<AuthResponse["user"] | null> {
  const data = await api.POST("/api/v1/auth/login", {
    body: { email, password } satisfies LoginPayload,
    auth: false,
  });
  const tokens = extractTokens(data as AuthResponse | null);
  if (!tokens) {
    throw new Error("Missing tokens in login response");
  }
  setTokens(tokens);
  return (data as AuthResponse).user ?? null;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse["user"] | null> {
  const data = await api.POST("/api/v1/auth/register", {
    body: payload,
    auth: false,
  });
  const tokens = extractTokens(data as AuthResponse | null);
  if (!tokens) {
    throw new Error("Missing tokens in register response");
  }
  setTokens(tokens);
  return (data as AuthResponse).user ?? null;
}

export async function refresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const data = await api.POST("/api/v1/auth/refresh", {
      body: { refresh_token: refreshToken } satisfies RefreshPayload,
      auth: false,
    });
    const tokens = extractTokens(data as AuthResponse | null);
    if (!tokens) return false;
    setTokens(tokens);
    return true;
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  try {
    await api.POST("/api/v1/auth/logout");
  } catch {
    // Best-effort; continue to clear tokens.
  } finally {
    clearTokens();
  }
}

export async function forgotPassword(email: string): Promise<void> {
  await api.POST("/api/v1/auth/forgot-password", {
    body: { email } satisfies ForgotPasswordPayload,
    auth: false,
  });
}

export async function socialLogin(
  provider: SocialLoginPayload["provider"],
  redirectTo: SocialLoginPayload["redirect_to"],
): Promise<void> {
  const data = (await api.POST("/api/v1/auth/social-login", {
    body: { provider, redirect_to: redirectTo } satisfies SocialLoginPayload,
    auth: false,
  })) as SocialLoginResponse;
  if (typeof window === "undefined") return;
  if (!data.url) {
    throw new Error("Missing redirect URL from social login");
  }
  window.location.href = data.url;
}

export function parseOAuthHash(
  hash: string,
): { accessToken: string; refreshToken: string } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

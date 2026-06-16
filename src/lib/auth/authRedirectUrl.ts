'use client';

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

function getConfiguredOrigin(): string | null {
  if (!configuredSiteUrl) return null;
  try {
    return new URL(configuredSiteUrl).origin;
  } catch {
    return null;
  }
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export function getAuthRedirectUrl(path: string): string {
  const origin = getConfiguredOrigin() ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return origin ? `${origin}${normalizePath(path)}` : normalizePath(path);
}

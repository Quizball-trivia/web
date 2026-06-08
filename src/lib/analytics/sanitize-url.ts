import type { CaptureResult, Properties } from 'posthog-js';

const SENSITIVE_PARAM_KEYS = new Set([
  'access_token',
  'auth_token',
  'code',
  'code_verifier',
  'confirmation_token',
  'email_otp',
  'id_token',
  'otp',
  'provider_token',
  'refresh_token',
  'reset_token',
  'state',
  'token',
]);

const URL_PROPERTY_KEY_PARTS = [
  'callbackurl',
  'current_url',
  'href',
  'redirect',
  'referrer',
  'returnurl',
  'url',
];

function isSensitiveParamKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return (
    SENSITIVE_PARAM_KEYS.has(normalized) ||
    normalized.includes('token') ||
    normalized.includes('otp') ||
    normalized.includes('secret')
  );
}

function shouldSanitizeProperty(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9_$]/g, '');
  return (
    normalized === '$current_url' ||
    normalized === '$referrer' ||
    URL_PROPERTY_KEY_PARTS.some((part) => normalized.includes(part))
  );
}

function stringLooksLikeSensitiveUrl(value: string): boolean {
  const lower = value.toLowerCase();
  if (!(lower.includes('://') || lower.startsWith('/') || lower.includes('?') || lower.includes('#'))) {
    return false;
  }
  return Array.from(SENSITIVE_PARAM_KEYS).some((key) =>
    lower.includes(`${key}=`) || lower.includes(`${encodeURIComponent(key)}=`)
  ) || lower.includes('token=') || lower.includes('_token=');
}

function removeSensitiveSearchParams(url: URL): void {
  const keysToDelete: string[] = [];
  url.searchParams.forEach((_value, key) => {
    if (isSensitiveParamKey(key)) {
      keysToDelete.push(key);
    }
  });
  for (const key of keysToDelete) {
    url.searchParams.delete(key);
  }
}

function hashContainsSensitiveParams(hash: string): boolean {
  if (!hash) return false;
  let lower = hash.toLowerCase();
  try {
    lower = decodeURIComponent(hash).toLowerCase();
  } catch {
    // Keep the raw lower-cased hash if it is not valid percent-encoded text.
  }
  return Array.from(SENSITIVE_PARAM_KEYS).some((key) => lower.includes(`${key}=`)) ||
    lower.includes('token=') ||
    lower.includes('_token=') ||
    lower.includes('otp=');
}

export function sanitizeAnalyticsUrl(value: string): string {
  if (!value) return value;

  const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(value);
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://quizball.io';

  try {
    const url = new URL(value, base);
    // Preserve the input's original form so sanitizing doesn't reshape the
    // analytics value: protocol-relative ("//host/x") stays protocol-relative,
    // root-relative ("/x") stays root-relative, and path-relative ("x") stays
    // path-relative. Only absolute URLs are returned in absolute form.
    const isProtocolRelative = value.startsWith('//');
    const isRootRelative = value.startsWith('/') && !isProtocolRelative;
    const isPathRelative = !isAbsolute && !isProtocolRelative && !isRootRelative;

    removeSensitiveSearchParams(url);
    if (hashContainsSensitiveParams(url.hash)) {
      url.hash = '';
    }

    if (isRootRelative) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
    if (isPathRelative) {
      return `${url.pathname.replace(/^\//, '')}${url.search}${url.hash}`;
    }
    if (isProtocolRelative) {
      return `//${url.host}${url.pathname}${url.search}${url.hash}`;
    }
    return url.toString();
  } catch {
    return value.replace(
      /([?&#][^=&#]*?(?:token|otp|secret|code|state)[^=&#]*=)[^&#]*/gi,
      '$1[redacted]'
    );
  }
}

export function sanitizeAnalyticsProperties<T extends Properties | undefined>(properties: T): T {
  if (!properties) return properties;

  const sanitized: Properties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (
      typeof value === 'string' &&
      (shouldSanitizeProperty(key) || stringLooksLikeSensitiveUrl(value))
    ) {
      sanitized[key] = sanitizeAnalyticsUrl(value);
      continue;
    }
    sanitized[key] = value;
  }

  return sanitized as T;
}

export function sanitizePostHogCapture(result: CaptureResult | null): CaptureResult | null {
  if (!result) return result;

  return {
    ...result,
    properties: sanitizeAnalyticsProperties(result.properties),
    $set: sanitizeAnalyticsProperties(result.$set),
    $set_once: sanitizeAnalyticsProperties(result.$set_once),
  };
}

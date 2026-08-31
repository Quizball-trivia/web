'use client';

/**
 * First-touch UTM capture for signup attribution.
 *
 * `account_created` is emitted by the BACKEND (gated on the DB insert), so it
 * cannot see the browser URL. PostHog's person-level `$initial_utm_*` does not
 * fill the gap either — we run `person_profiles: 'identified_only'`, so an
 * anonymous visitor has no person profile to hold those properties. Result: a
 * campaign click was visible, but the signup it produced was not attributable.
 *
 * So: capture the UTM triplet on the first tagged landing, keep it for 30 days,
 * and send it as a header on the auth bootstrap request (the same request that
 * already carries campaign-quiz attribution). Analytics only.
 */

const STORAGE_KEY = 'quizball_utm_attribution';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
// Mirrors the backend validation in src/core/utm-attribution.ts.
const VALUE_RE = /^[A-Za-z0-9._\-|]{1,64}$/;

export interface UtmAttribution {
  utm_source: string;
  utm_medium?: string;
  utm_campaign?: string;
  captured_at: string;
}

function isValid(value: unknown, nowMs = Date.now()): value is UtmAttribution {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<UtmAttribution>;
  if (typeof item.utm_source !== 'string' || !VALUE_RE.test(item.utm_source)) return false;
  for (const optional of [item.utm_medium, item.utm_campaign]) {
    if (optional !== undefined && (typeof optional !== 'string' || !VALUE_RE.test(optional))) return false;
  }
  const capturedAtMs = typeof item.captured_at === 'string' ? Date.parse(item.captured_at) : NaN;
  return Number.isFinite(capturedAtMs) && nowMs - capturedAtMs <= MAX_AGE_MS;
}

function readStored(): UtmAttribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValid(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persist the UTM triplet from a tagged landing URL. FIRST-touch wins: an
 * existing (non-expired) value is never overwritten, so a campaign click keeps
 * credit even if the visitor later arrives through another tagged link before
 * signing up.
 */
export function rememberUtmFromUrl(url: URL): void {
  if (typeof window === 'undefined') return;
  const source = url.searchParams.get('utm_source');
  if (!source || !VALUE_RE.test(source)) return;
  if (readStored()) return;

  const medium = url.searchParams.get('utm_medium');
  const campaign = url.searchParams.get('utm_campaign');
  const attribution: UtmAttribution = {
    utm_source: source,
    ...(medium && VALUE_RE.test(medium) ? { utm_medium: medium } : {}),
    ...(campaign && VALUE_RE.test(campaign) ? { utm_campaign: campaign } : {}),
    captured_at: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Storage unavailable (private mode / quota) — attribution is best-effort.
  }
}

/** Base64url-encoded payload for the `x-quizball-utm` header, or null. */
export function getUtmAttributionHeader(): string | null {
  const attribution = readStored();
  if (!attribution) return null;
  try {
    const json = JSON.stringify(attribution);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return null;
  }
}

'use client';

import { posthog } from '@/lib/posthog';

export type CampaignCtaPlacement = 'header' | 'score' | 'footer' | 'rating' | 'hero';
export type CampaignAuthMethod = 'google' | 'facebook' | 'apple' | 'email' | 'phone';

export type CampaignAttribution = {
  source: 'campaign_quiz';
  quiz_slug: string;
  cta_placement: CampaignCtaPlacement;
  captured_at: string;
  anonymous_distinct_id: string;
  auth_method?: CampaignAuthMethod;
  quiz_score?: number;
  quiz_total_questions?: number;
};

const STORAGE_KEY = 'quizball_campaign_attribution';
const URL_PARAM = 'campaign_attribution';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PLACEMENTS = new Set<CampaignCtaPlacement>([
  'header',
  'score',
  'footer',
  'rating',
  'hero',
]);

function isValid(value: unknown, nowMs = Date.now()): value is CampaignAttribution {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<CampaignAttribution>;
  const capturedAtMs = typeof item.captured_at === 'string' ? Date.parse(item.captured_at) : NaN;
  return (
    item.source === 'campaign_quiz' &&
    typeof item.quiz_slug === 'string' &&
    item.quiz_slug.length <= 100 &&
    SLUG_RE.test(item.quiz_slug) &&
    typeof item.cta_placement === 'string' &&
    PLACEMENTS.has(item.cta_placement as CampaignCtaPlacement) &&
    typeof item.anonymous_distinct_id === 'string' &&
    item.anonymous_distinct_id.length > 0 &&
    item.anonymous_distinct_id.length <= 200 &&
    Number.isFinite(capturedAtMs) &&
    capturedAtMs >= nowMs - MAX_AGE_MS &&
    capturedAtMs <= nowMs + 5 * 60 * 1000 &&
    (item.quiz_score === undefined ||
      (Number.isInteger(item.quiz_score) && item.quiz_score >= 0 && item.quiz_score <= 1000)) &&
    (item.quiz_total_questions === undefined ||
      (Number.isInteger(item.quiz_total_questions) &&
        item.quiz_total_questions >= 1 &&
        item.quiz_total_questions <= 1000)) &&
    (item.quiz_score === undefined ||
      item.quiz_total_questions === undefined ||
      item.quiz_score <= item.quiz_total_questions)
  );
}

function readStored(): CampaignAttribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isValid(parsed)) return parsed;
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage is best-effort. The URL copy still covers redirect callbacks.
  }
  return null;
}

function store(attribution: CampaignAttribution): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Auth still works when storage is blocked; only attribution is omitted.
  }
}

function encode(attribution: CampaignAttribution): string {
  return window
    .btoa(JSON.stringify(attribution))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decode(encoded: string): CampaignAttribution | null {
  if (encoded.length > 2048) return null;
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const parsed: unknown = JSON.parse(window.atob(padded));
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getAnonymousDistinctId(): string | null {
  try {
    const distinctId = posthog.get_distinct_id();
    return typeof distinctId === 'string' && distinctId.trim() ? distinctId : null;
  } catch {
    return null;
  }
}

export function rememberCampaignAttribution(input: {
  quizSlug: string;
  placement: CampaignCtaPlacement;
  score?: number;
  totalQuestions?: number;
}): CampaignAttribution | null {
  const anonymousDistinctId = getAnonymousDistinctId();
  if (!anonymousDistinctId || !SLUG_RE.test(input.quizSlug)) return null;

  const attribution: CampaignAttribution = {
    source: 'campaign_quiz',
    quiz_slug: input.quizSlug,
    cta_placement: input.placement,
    captured_at: new Date().toISOString(),
    anonymous_distinct_id: anonymousDistinctId,
    ...(input.score !== undefined ? { quiz_score: input.score } : {}),
    ...(input.totalQuestions !== undefined
      ? { quiz_total_questions: input.totalQuestions }
      : {}),
  };
  if (!isValid(attribution)) return null;
  store(attribution);
  return attribution;
}

export function rememberCampaignAttributionFromSignupUrl(url: URL): void {
  const encoded = url.searchParams.get(URL_PARAM);
  if (encoded) {
    const decoded = decode(encoded);
    if (decoded) store(decoded);
    return;
  }

  const source = url.searchParams.get('source');
  if (!source) return;
  const suffixes: Array<[string, CampaignCtaPlacement]> = [
    ['-quiz-header', 'header'],
    ['-quiz-footer', 'footer'],
    ['-quiz-rating', 'rating'],
    ['-quiz', 'score'],
  ];
  const match = suffixes.find(([suffix]) => source.endsWith(suffix));
  if (!match) return;
  const quizSlug = source.slice(0, -match[0].length);
  rememberCampaignAttribution({ quizSlug, placement: match[1] });
}

export function hydrateCampaignAttributionFromUrl(url: URL): CampaignAttribution | null {
  const encoded = url.searchParams.get(URL_PARAM);
  if (!encoded) return readStored();
  const attribution = decode(encoded);
  if (attribution) store(attribution);
  return attribution;
}

export function setCampaignAuthMethod(method: CampaignAuthMethod): void {
  const current = readStored();
  if (current) store({ ...current, auth_method: method });
}

export function getCampaignAttributionHeader(): string | null {
  const attribution = readStored();
  return attribution ? encode(attribution) : null;
}

export function appendCampaignAttribution(url: string): string {
  const attribution = readStored();
  if (!attribution) return url;
  const parsed = new URL(url, window.location.origin);
  parsed.searchParams.set(URL_PARAM, encode(attribution));
  return parsed.toString();
}

export function getCampaignAttributionAnalyticsProperties(): Record<string, string | number> {
  const attribution = readStored();
  if (!attribution) return {};
  return {
    source: attribution.source,
    quiz_type: 'campaign',
    quiz_slug: attribution.quiz_slug,
    cta_placement: attribution.cta_placement,
    ...(attribution.quiz_score !== undefined ? { quiz_score: attribution.quiz_score } : {}),
    ...(attribution.quiz_total_questions !== undefined
      ? { quiz_total_questions: attribution.quiz_total_questions }
      : {}),
  };
}

export function clearCampaignAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // No-op when storage is unavailable.
  }
}

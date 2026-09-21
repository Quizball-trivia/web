import { API_BASE_URL } from '@/lib/config';
import { getGuestToken, peekGuestToken, retireGuestToken } from './guestSession';
import { getSupabaseAccessToken } from '@/lib/auth/supabase';

type Props = Record<string, string | number | boolean | null | undefined>;
const STARTS = new Set(['game_start', 'match_started', 'daily_challenge_started', 'mini_game_round_started', 'road_to_goal_run_started', 'ggt_session_started', 'quiz_start', 'training_started', 'party_quiz_started']);
const COMPLETES = new Set(['game_complete', 'match_completed', 'daily_challenge_completed', 'mini_game_round_completed', 'road_to_goal_run_settled', 'ggt_session_completed', 'quiz_complete', 'training_completed', 'party_quiz_completed']);
const QUEUE_KEY = 'qb_guest_journey_pending_v1';
type Item = { id: string; token?: string; memberId?: string; step: string; mode: string; createdAt: number };
let memoryPending: Item[] = [];
let work: Promise<void> = Promise.resolve();
let retry: ReturnType<typeof setTimeout> | undefined;
let memberId: string | null = null;
let generation = 0;
function pending(): Item[] {
  try { const rows: unknown = JSON.parse(sessionStorage.getItem(QUEUE_KEY) ?? JSON.stringify(memoryPending)); return Array.isArray(rows) ? rows.filter(row => typeof row?.id === 'string' && typeof row?.createdAt === 'number') as Item[] : memoryPending; } catch { return memoryPending; }
}
function save(items: Item[]): void {
  memoryPending = items.slice(-100);
  try { sessionStorage.setItem(QUEUE_KEY, JSON.stringify(memoryPending)); } catch { /* best effort when storage is unavailable */ }
}
async function send(path: string, body: unknown, token?: string, member = false, expectedMember?: string): Promise<Response> {
  const auth = member ? await getSupabaseAccessToken() : null;
  if (member && !auth) throw new Error('No member session');
  return fetch(`${API_BASE_URL}/api/v1/guest/journey/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'x-guest-token': token } : {}), ...(auth ? { Authorization: `Bearer ${auth}`, 'x-journey-member-id': expectedMember ?? '' } : {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(5000),
  });
}
function scheduleRetry(): void {
  if (retry) return;
  retry = setTimeout(() => { retry = undefined; void flushGuestJourney(); }, 15_000);
}
async function drain(): Promise<void> {
  for (const item of pending()) {
    if (Date.now() - item.createdAt > 24 * 60 * 60 * 1000) {
      save(pending().filter(p => p.id !== item.id)); continue;
    }
    if (item.memberId && !memberId) continue;
    if (item.memberId && item.memberId !== memberId) { save(pending().filter(p => p.id !== item.id)); continue; }
    try {
      const res = await send(item.memberId ? 'member-activity' : 'activity', { event_id: item.id, step: item.step, mode: item.mode }, item.token, Boolean(item.memberId), item.memberId);
      if (!res.ok && ![400, 401, 403, 404].includes(res.status)) throw new Error('Retry guest activity');
      if (res.status === 401 && item.token) retireGuestToken(item.token);
      save(pending().filter(p => p.id !== item.id));
    } catch { scheduleRetry(); break; }
  }
}
export function flushGuestJourney(): Promise<void> {
  work = work.then(drain, drain);
  return work;
}
export function resetGuestJourneyMember(): void { memberId = null; generation++; }
/** Does not block sign-in. Retry uses the same token; server ownership never changes. */
export function linkGuestJourney(userId: string): void {
  memberId = userId;
  const capturedGeneration = generation;
  work = work.then(async () => {
    await drain();
    const token = peekGuestToken();
    if (!token || memberId !== userId || generation !== capturedGeneration) return;
    try {
      const res = await send('link', {}, token, true, userId);
      if (!res.ok) throw new Error('Retry guest link');
      retireGuestToken(token);
    } catch {
      setTimeout(() => { if (memberId === userId && generation === capturedGeneration) linkGuestJourney(userId); }, 15_000);
    }
  }).catch(() => undefined);
}
export function journeyStep(event: string, props: Props, access: string): { step: string; mode: string } | null {
  const step = STARTS.has(event) ? 'play_started' : COMPLETES.has(event) ? 'play_completed'
    : event === 'auth_started' && props.auth_mode === 'signup' ? 'signup_started'
      : event === 'onboarding_completed' && access === 'member' ? 'onboarding_completed' : null;
  if (!step) return null;
  const raw = props.mode_id ?? props.game ?? props.challenge_type ?? props.mode ?? (event.startsWith('quiz_') ? 'public_quiz' : event.startsWith('ggt_') ? 'guess_the_goal' : event.startsWith('party_') ? 'party_quiz' : 'unknown');
  const mode = String(raw).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'unknown';
  return { step, mode };
}
/** Same call sites as normal game analytics; works on staging without a PostHog browser key. */
export function recordGuestJourney(event: string, props: Props, access: string): void {
  if (typeof window === 'undefined' || window.location.pathname.includes('/demos') || !['guest', 'member'].includes(access)) return;
  const activity = journeyStep(event, props, access);
  if (!activity || (activity.step === 'signup_started' && !peekGuestToken())) return;
  const id = crypto.randomUUID();
  const capturedMember = memberId;
  const capturedGeneration = generation;
  work = work.then(async () => {
    if (access === 'member') {
      if (!capturedMember || memberId !== capturedMember || generation !== capturedGeneration) return;
      // Member mapping is resolved by verified JWT, never by a browser-supplied user ID.
      save([...pending(), { id, memberId: capturedMember, ...activity, createdAt: Date.now() }]);
      await drain();
      return;
    }
    const token = await getGuestToken(document.documentElement.lang || 'en');
    save([...pending(), { id, token, ...activity, createdAt: Date.now() }]);
    await drain();
  }).catch(() => undefined);
}

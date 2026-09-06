/** Prototype-local persistence (localStorage) for the Table Derby shell:
 *  daily tickets, Weekend League qualification points, daily-challenge
 *  completion. The real product moves all of this server-side; day
 *  boundaries follow Georgia time (UTC+4) like the Quizball backend. */

export const TICKETS_PER_DAY = 5;
export const QP_WIN = 25;
export const QP_LOSS = 10;
export const QP_TARGET = 200;

const GE_OFFSET_MS = 4 * 60 * 60 * 1000;

export function geDayKey(now = Date.now()): string {
  return new Date(now + GE_OFFSET_MS).toISOString().slice(0, 10);
}

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be blocked */
  }
}

/* ── Tickets: 5 per Georgian day ────────────────────────────────── */

interface TicketState {
  day: string;
  count: number;
}

export function getTickets(): number {
  const s = read<TicketState>('td.tickets');
  if (!s || s.day !== geDayKey()) return TICKETS_PER_DAY;
  return Math.max(0, s.count);
}

/** Dev helper: refill today's tickets. */
export function resetTickets(): number {
  write('td.tickets', { day: geDayKey(), count: TICKETS_PER_DAY } satisfies TicketState);
  return TICKETS_PER_DAY;
}

export function spendTicket(): number {
  const next = Math.max(0, getTickets() - 1);
  write('td.tickets', { day: geDayKey(), count: next } satisfies TicketState);
  return next;
}

/* ── Weekend League qualification points ────────────────────────── */

export function getQp(): number {
  return read<number>('td.qp') ?? 0;
}

export function addQp(delta: number): number {
  // Losses subtract (ranked-style results screen); floor at 0 like RP.
  const next = Math.max(0, getQp() + delta);
  write('td.qp', next);
  return next;
}

/* ── Daily challenge: one attempt per Georgian day ──────────────── */

interface DailyState {
  day: string;
  score: number;
}

export function getDailyResult(): number | null {
  const s = read<DailyState>('td.daily');
  return s && s.day === geDayKey() ? s.score : null;
}

export function setDailyResult(score: number) {
  write('td.daily', { day: geDayKey(), score } satisfies DailyState);
}

/* ── Avatar: the user's chosen sticker variant ──────────────────── */

let avatarListeners: (() => void)[] = [];

export function subscribeAvatar(cb: () => void): () => void {
  avatarListeners.push(cb);
  return () => {
    avatarListeners = avatarListeners.filter((l) => l !== cb);
  };
}

const AVATAR_COLOR_KEYS = ['green', 'blue', 'yellow', 'red', 'violet', 'pink'] as const;
export type TdAvatarColor = (typeof AVATAR_COLOR_KEYS)[number];

export function getAvatarColor(): TdAvatarColor {
  const v = read<unknown>('td.avatar');
  if (typeof v === 'string' && (AVATAR_COLOR_KEYS as readonly string[]).includes(v)) return v as TdAvatarColor;
  if (typeof v === 'number') return AVATAR_COLOR_KEYS[((v % 6) + 6) % 6]; // legacy sticker index
  return 'green';
}

export function setAvatarColor(v: TdAvatarColor) {
  write('td.avatar', v);
  avatarListeners.forEach((l) => l());
}

/* ── First-run onboarding (avatar + favorite club) ─────────────── */

export function isOnboarded(): boolean {
  return read<boolean>('td.onboarded') ?? false;
}

export function setOnboarded() {
  write('td.onboarded', true);
}

export function resetOnboarding() {
  try {
    window.localStorage.removeItem('td.onboarded');
    window.localStorage.removeItem('td.club');
  } catch {
    /* storage may be blocked */
  }
}

export function getFavClub(): string | null {
  return read<string>('td.club');
}

export function setFavClub(id: string) {
  write('td.club', id);
}

/** Next Saturday 20:00 Georgia time, epoch ms (WL countdown target). */
export function nextSaturdayMs(now = Date.now()): number {
  const ge = new Date(now + GE_OFFSET_MS);
  const day = ge.getUTCDay(); // 0 Sun ... 6 Sat
  const daysAhead = (6 - day + 7) % 7;
  const target = Date.UTC(ge.getUTCFullYear(), ge.getUTCMonth(), ge.getUTCDate() + daysAhead, 20, 0, 0) - GE_OFFSET_MS;
  if (target <= now) return target + 7 * 86400_000;
  return target;
}

/** Deterministic per-day category index for the daily challenge. */
export function dailyCategoryIndex(total: number): number {
  const day = geDayKey();
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % total;
}

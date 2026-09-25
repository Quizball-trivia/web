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

export function addTicket(): number {
  const next = getTickets() + 1;
  write('td.tickets', { day: geDayKey(), count: next } satisfies TicketState);
  return next;
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

/** Daily-challenge reward: first completion per challenge per Georgian
 *  day grants +1 ticket. Returns whether the reward was granted. */
export function claimDailyReward(game: string): boolean {
  const state = read<{ day: string; games: string[] }>('td.dailyReward');
  const today = geDayKey();
  const games = state && state.day === today ? state.games : [];
  if (games.includes(game)) return false;
  write('td.dailyReward', { day: today, games: [...games, game] });
  addTicket();
  return true;
}

export function clearFavClub() {
  try {
    window.localStorage.removeItem('td.club');
  } catch {
    /* storage may be blocked */
  }
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

/* ── Match history + stats (prototype: last 50 on this device) ────── */

export interface MatchRecord {
  at: number;
  mode: 'ranked' | 'solo';
  won: boolean;
  me: number; // match points
  op: number;
  opponent: string;
  rpDelta: number;
  penalties: boolean; // decided on penalties
}

const MATCHES_KEY = 'td.matches';
const MATCHES_MAX = 50;

export function getMatches(): MatchRecord[] {
  const v = read<MatchRecord[]>(MATCHES_KEY);
  return Array.isArray(v) ? v : [];
}

export function recordMatch(m: MatchRecord) {
  write(MATCHES_KEY, [m, ...getMatches()].slice(0, MATCHES_MAX));
}

export interface MatchStats {
  played: number;
  wins: number;
  winRate: number; // 0–100
  streak: number; // current ranked win streak
  bestStreak: number;
}

/** Ranked only — solo is practice and never counts. */
export function matchStats(matches: MatchRecord[]): MatchStats {
  const ranked = matches.filter((m) => m.mode === 'ranked');
  const wins = ranked.filter((m) => m.won).length;
  let streak = 0;
  for (const m of ranked) {
    if (!m.won) break;
    streak++;
  }
  let best = 0;
  let run = 0;
  for (const m of [...ranked].reverse()) {
    run = m.won ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return {
    played: ranked.length,
    wins,
    winRate: ranked.length ? Math.round((wins / ranked.length) * 100) : 0,
    streak,
    bestStreak: best,
  };
}

/** Dev helper: a plausible recent history for the profile screen. */
export function seedMatches() {
  const names = ['ლუკა წ.', 'ნიკა კ.', 'გიორგი მ.', 'სანდრო ბ.', 'დათო ხ.', 'თორნიკე გ.'];
  const now = Date.now();
  const rows: MatchRecord[] = [
    [true, 3, 1, 'ranked', false], [true, 2, 2, 'ranked', true], [true, 4, 0, 'ranked', false],
    [false, 1, 3, 'ranked', false], [true, 3, 1, 'solo', false], [true, 3, 1, 'ranked', false],
    [false, 2, 2, 'ranked', true], [true, 4, 0, 'ranked', false],
  ].map(([won, me, op, mode, pen], i) => ({
    at: now - (i * 7 + 2) * 3600_000,
    mode: mode as 'ranked' | 'solo',
    won: won as boolean,
    me: me as number,
    op: op as number,
    opponent: names[i % names.length],
    rpDelta: mode === 'solo' ? 0 : won ? QP_WIN : -QP_LOSS,
    penalties: pen as boolean,
  }));
  write(MATCHES_KEY, rows);
}

/* ── Practice streak (prototype: local only) ──────────────────────── */

export interface StreakRecord {
  best: number;
  last: number | null;
  lastAt: number | null;
}

const STREAK_KEY = 'td.streak';

export function getStreakRecord(): StreakRecord {
  const v = read<StreakRecord>(STREAK_KEY);
  return v && typeof v.best === 'number' ? v : { best: 0, last: null, lastAt: null };
}

/** Saves a finished run; returns whether it set a new best. */
export function saveStreakRun(score: number): boolean {
  const prev = getStreakRecord();
  const isRecord = score > prev.best;
  write(STREAK_KEY, { best: Math.max(prev.best, score), last: score, lastAt: Date.now() } satisfies StreakRecord);
  return isRecord;
}

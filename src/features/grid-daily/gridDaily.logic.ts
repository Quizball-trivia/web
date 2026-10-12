/** Same calendar as the backend (grid-daily.days.ts): boards land at Argentine midnight, never ahead of time. */
export const RELEASE_TIME_ZONE = "America/Argentina/Buenos_Aires";
export const CONTENT_START = "2026-10-07";
export const RANKED_START = "2026-10-10";
export const PUBLISHED_DAYS = 90;
export const TOTAL_CELLS = 9;
export const SPEED_CAP_SECONDS = 3_600;

const DAY_MS = 86_400_000;

export function releaseDay(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: RELEASE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(day: string, delta: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + delta * DAY_MS).toISOString().slice(0, 10);
}

export const LAST_DAY = addDays(CONTENT_START, PUBLISHED_DAYS - 1);

export const puzzleNumber = (day: string): number =>
  Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${CONTENT_START}T00:00:00Z`)) / DAY_MS) + 1;

/**
 * The days a visitor may be given, best first. The server lists only days that have begun, so its latest day is
 * today by its own clock (this device's clock is not asked): a member gets that one; a guest, who may only play
 * days already over, gets the one before, then older ones should the server still refuse.
 */
export function candidateDays(days: Readonly<Record<string, number>>, member: boolean): string[] {
  const listed = Object.keys(days).sort().reverse();
  return member ? listed : [...listed.slice(1), ...listed.slice(0, 1)];
}

/** Seconds a finished run took, from the board's `speed` (seconds left of the hour); null when it ran past the hour. */
export function elapsedFromSpeed(speed: number): number | null {
  return speed > 0 ? SPEED_CAP_SECONDS - speed : null;
}

export function formatClock(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1_000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Three rows of squares in board order: one line per row fits a chat message. */
export function shareGrid(cells: ReadonlyArray<unknown | null>): string {
  return [0, 1, 2].map((row) => cells.slice(row * 3, row * 3 + 3).map((cell) => (cell ? "🟩" : "⬛")).join("")).join("\n");
}

/**
 * Ticket refill schedule, mirrored from the backend `refill-tickets-every-4h`
 * pg_cron job (quizball-backend `20260620000000_global_ticket_refill_cron.sql`):
 * every user below the cap gets +1 ticket at UTC 00/04/08/12/16/20, which is
 * 04/08/12/16/20/00 Georgia time. The schedule is global and fixed, so the
 * next refill can be computed on the client without an API field.
 */
export const TICKET_CAP = 5;
export const TICKET_REFILL_INTERVAL_HOURS = 4;

const INTERVAL_MS = TICKET_REFILL_INTERVAL_HOURS * 60 * 60 * 1000;

/** The next refill tick strictly after `nowMs` (epoch ms). */
export function nextTicketRefillAt(nowMs: number): number {
  // UTC midnight is a refill tick and the interval divides 24h evenly, so the
  // grid is simply every multiple of 4h since the epoch.
  return (Math.floor(nowMs / INTERVAL_MS) + 1) * INTERVAL_MS;
}

/** Whole seconds until the next refill tick (always > 0). */
export function secondsUntilTicketRefill(nowMs: number): number {
  return Math.max(1, Math.ceil((nextTicketRefillAt(nowMs) - nowMs) / 1000));
}

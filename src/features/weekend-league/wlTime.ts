import { useCallback, useContext, useMemo, useState, useSyncExternalStore } from 'react';
import { QueryClientContext, type QueryClient } from '@tanstack/react-query';
import type { getWeekendLeagueCurrent } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/queries/queryKeys';
import { getMilestones } from './mock-data';

// Weekend League times are printed on the VIEWER's clock, from the tournament's
// own timestamps. The league used to print a fixed "Sat 14:00" (Georgia time)
// to everyone, which players abroad read as their own 14:00 and missed the
// kickoff (owner report 2026-10-02).

export const GEORGIA_TIME_ZONE = 'Asia/Tbilisi';

// Explicit weekday names instead of Intl: a runtime without Georgian ICU data
// (server rendering, slim Node builds) silently falls back to English, which
// put "Fri. 24:00" on the Georgian page (owner report 2026-08-29).
const WEEKDAYS: Record<string, readonly string[]> = {
  ka: ['კვ.', 'ორშ.', 'სამ.', 'ოთხ.', 'ხუთ.', 'პარ.', 'შაბ.'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  tr: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
};

/** Weekday index (0 = Sunday) and 'HH:MM' of an instant in `timeZone`
 *  (the device's zone when omitted). */
function wallClock(ms: number, timeZone?: string): { weekday: number; time: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(ms);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { weekday: WEEKDAYS.en.indexOf(part('weekday')), time: `${part('hour')}:${part('minute')}` };
}

/** 'HH:MM' of an instant on the viewer's clock. */
export function formatWlTime(ms: number, timeZone?: string): string {
  return wallClock(ms, timeZone).time;
}

/**
 * "პარ. 24:00" / "Sat 15:00" for a stage: weekday and hour always travel
 * together, because the same instant is another weekday further east. A
 * midnight deadline is "Friday 24:00" to a player, not "Saturday 00:00", so an
 * exact-midnight instant borrows the previous day's weekday.
 */
export function formatStageWhen(ms: number, locale: string, timeZone?: string): string {
  const exact = wallClock(ms, timeZone);
  const midnight = exact.time === '00:00' && ms % 60_000 === 0;
  const { weekday } = midnight ? wallClock(ms - 1, timeZone) : exact;
  return `${(WEEKDAYS[locale] ?? WEEKDAYS.en)[weekday]} ${midnight ? '24:00' : exact.time}`;
}

/** True when the viewer's clock reads differently from Georgia's at `ms`. */
export function differsFromGeorgiaClock(ms: number, timeZone?: string): boolean {
  return formatWlTime(ms, timeZone) !== formatWlTime(ms, GEORGIA_TIME_ZONE);
}

const subscribeNever = () => () => {};

/**
 * The zone to print Weekend League times in: the device's (undefined) once
 * mounted, Georgia during server render and hydration so the first client
 * paint matches the server's markup.
 */
export function useWlTimeZone(): string | undefined {
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  return mounted ? undefined : GEORGIA_TIME_ZONE;
}

type WlCurrent = Awaited<ReturnType<typeof getWeekendLeagueCurrent>>;

export interface WlKickoffTimes {
  entryClosesMs: number;
  qualifierMs: number;
  finalMs: number;
  /** True when the times come from a cached tournament row. False means the
   *  fixed weekly calendar: right for a normal week, unknown for a moved one,
   *  so a screen that may never load the row should not print an hour from it. */
  fromRow: boolean;
}

/**
 * Entry close, qualifier and final start of the event on screen: the live row
 * when the query cache already holds it, the fixed weekly calendar otherwise
 * (same rule as use-weekend-league-live: a cancelled or voided row yields to
 * the calendar). It only reads the cache — it never issues a request, and it
 * works without a QueryClientProvider (component previews, public pages).
 */
function useQueryCacheSubscription(client: QueryClient | undefined) {
  return useCallback(
    (onChange: () => void) => (client ? client.getQueryCache().subscribe(onChange) : subscribeNever()),
    [client],
  );
}

/** The tournament row already in the query cache, if any. Never fetches. */
function useCachedWlTournament() {
  const client = useContext(QueryClientContext);
  const subscribe = useQueryCacheSubscription(client);
  return useSyncExternalStore(
    subscribe,
    () => client?.getQueryData<WlCurrent>(queryKeys.weekendLeague.current())?.tournament ?? null,
    () => null,
  );
}

export function useWlKickoffTimes(): WlKickoffTimes {
  const cached = useCachedWlTournament();
  const [nowMs] = useState(() => Date.now());
  const live = cached && cached.status !== 'cancelled' && cached.status !== 'voided' ? cached : null;
  const entryClosesAt = live?.entry_closes_at;
  const qualifierAt = live?.qualifier_starts_at;
  const finalAt = live?.final_starts_at;
  return useMemo(() => {
    const calendar = getMilestones(nowMs);
    const parsed = (iso: string | null | undefined) => {
      const ms = iso ? Date.parse(iso) : Number.NaN;
      return Number.isFinite(ms) ? ms : null;
    };
    const qualifierMs = parsed(qualifierAt);
    return {
      entryClosesMs: parsed(entryClosesAt) ?? calendar.entry.targetMs,
      qualifierMs: qualifierMs ?? calendar.qualifier.targetMs,
      finalMs: parsed(finalAt) ?? calendar.playoffs.targetMs,
      fromRow: qualifierMs != null,
    };
  }, [entryClosesAt, qualifierAt, finalAt, nowMs]);
}

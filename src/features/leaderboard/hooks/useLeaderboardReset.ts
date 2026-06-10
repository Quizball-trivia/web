"use client";

import { useEffect, useState } from "react";

// The leaderboard resets daily at 12:00 PM Georgia time (Asia/Tbilisi, UTC+4,
// no DST). We derive the countdown to the next noon-Tbilisi boundary live on the
// client, independent of the viewer's own timezone.

const TBILISI_TZ = "Asia/Tbilisi";
const RESET_HOUR = 12; // 12:00 noon Tbilisi

// Current wall-clock parts in Tbilisi, derived via Intl so it's correct in any
// viewer timezone.
function tbilisiParts(now: Date): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TBILISI_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  // Intl can emit hour "24" at midnight in some engines — normalize to 0.
  const hour = get("hour") % 24;
  return { year: get("year"), month: get("month"), day: get("day"), hour, minute: get("minute"), second: get("second") };
}

// Milliseconds remaining until the next 12:00 PM Tbilisi.
function msUntilNextReset(now: Date): number {
  const p = tbilisiParts(now);
  const secondsNow = p.hour * 3600 + p.minute * 60 + p.second;
  const resetSeconds = RESET_HOUR * 3600;
  let remaining = resetSeconds - secondsNow;
  if (remaining <= 0) remaining += 24 * 3600; // already past noon → next day's noon
  return remaining * 1000;
}

export interface LeaderboardReset {
  hours: number;
  minutes: number;
  seconds: number;
  /** Zero-padded HH:MM:SS, e.g. "07:04:21". */
  formatted: string;
  totalMs: number;
}

function toReset(totalMs: number): LeaderboardReset {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { hours, minutes, seconds, formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`, totalMs };
}

export function useLeaderboardReset(): LeaderboardReset {
  const [reset, setReset] = useState<LeaderboardReset>(() => toReset(msUntilNextReset(new Date())));

  useEffect(() => {
    const tick = () => setReset(toReset(msUntilNextReset(new Date())));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return reset;
}

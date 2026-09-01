"use client";

import { useEffect, useState } from "react";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { ROUND_SIZE } from "@/features/mini-games/lib/guessCardConstants";

/**
 * Frontend-only daily lock for the "Guess the Card" daily.
 *
 * The backend has no challenge type for this yet, so the once-a-day gate lives
 * in localStorage and the game awards score only — no coins or XP are shown
 * until a real challenge type credits the wallet server-side.
 */
export interface GuessCardDailyRecord {
  /** Georgia-time day (YYYY-MM-DD) the round was played. */
  day: string;
  score: number;
  solved: number;
  total: number;
}

export const DAILY_TOTAL_CARDS = ROUND_SIZE;

/**
 * Day key in the product's timezone (Asia/Tbilisi) — dailies roll over at
 * 00:00 Georgia time, not UTC.
 */
export function tbilisiDayKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function readGuessCardDailyRecord(): GuessCardDailyRecord | null {
  const rec = storage.get<GuessCardDailyRecord | null>(STORAGE_KEYS.GUESS_CARD_DAILY, null);
  if (!rec || rec.day !== tbilisiDayKey()) return null;
  return rec;
}

export function saveGuessCardDailyRecord(result: Omit<GuessCardDailyRecord, "day">): GuessCardDailyRecord {
  const full: GuessCardDailyRecord = { day: tbilisiDayKey(), ...result };
  storage.set(STORAGE_KEYS.GUESS_CARD_DAILY, full);
  return full;
}

/**
 * Reads today's completion state on the client only (empty on the server / first
 * paint) so it never triggers a hydration mismatch. `refresh` re-reads after a
 * round finishes without a full navigation.
 */
export function useGuessCardDailyStatus() {
  const [record, setRecord] = useState<GuessCardDailyRecord | null>(null);
  const [ready, setReady] = useState(false);
  // Read after mount (client-only, so no SSR/hydration mismatch); deferred a
  // tick so it isn't a synchronous setState in the effect body.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setRecord(readGuessCardDailyRecord());
      setReady(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  return { ready, completedToday: record !== null, record };
}

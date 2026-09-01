"use client";

import { useEffect, useState } from "react";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { MAX_SCORE, ROUND_SIZE } from "@/features/mini-games/lib/guessCard";

/**
 * Frontend-only daily lock + coin logic for the "Guess the Card" daily.
 *
 * The backend has no challenge type for this yet, so coins are computed and
 * displayed client-side (not credited to the real wallet) and the once-a-day
 * gate lives in localStorage — keyed by the UTC day so it resets at 00:00 UTC,
 * the same rollover as the server-driven daily challenges.
 */
export interface GuessCardDailyRecord {
  /** UTC day (YYYY-MM-DD) the round was played. */
  day: string;
  score: number;
  coins: number;
  solved: number;
  total: number;
}

/** Reward curve: a base for finishing + 1 coin per point earned. */
export const DAILY_BASE_COINS = 20;
export function coinsForScore(score: number): number {
  return DAILY_BASE_COINS + Math.max(0, score);
}
/** Best-case payout, shown as the reward on the hub card. */
export const DAILY_MAX_COINS = coinsForScore(MAX_SCORE); // 170
/** Nominal XP shown alongside coins (display only — not credited). */
export const DAILY_XP_REWARD = 40;
export const DAILY_TOTAL_CARDS = ROUND_SIZE;

function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function readGuessCardDailyRecord(): GuessCardDailyRecord | null {
  const rec = storage.get<GuessCardDailyRecord | null>(STORAGE_KEYS.GUESS_CARD_DAILY, null);
  if (!rec || rec.day !== utcDayKey()) return null;
  return rec;
}

export function saveGuessCardDailyRecord(result: Omit<GuessCardDailyRecord, "day">): GuessCardDailyRecord {
  const full: GuessCardDailyRecord = { day: utcDayKey(), ...result };
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

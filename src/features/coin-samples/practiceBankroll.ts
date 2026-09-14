"use client";

import { useCallback, useMemo, useRef, useState } from "react";

/**
 * Practice coins for the coin-game sneak peeks: 1,000 per visit, in memory
 * only. Debited when a round starts, credited once when it settles. Nothing
 * is stored, posted or shared — a reload starts over, by design.
 */
export const PRACTICE_BANKROLL = 1_000;

export interface PracticeWallet {
  /** Balance for rendering (React state). */
  coins: number;
  /** Balance right now, before React re-renders — what the engines validate against. */
  peek: () => number;
  debit: (amount: number) => boolean;
  credit: (amount: number) => void;
  reset: () => void;
}

// Integer hundredths: Road to Goal settles in hundredths and nothing may be lost to rounding.
const toHundredths = (coins: number) => Math.round(coins * 100);

export function usePracticeBankroll(initial = PRACTICE_BANKROLL): PracticeWallet {
  // The ref is authoritative: a debit must be validated and applied synchronously, and
  // React state updaters may run later than the call (a second start would double-spend).
  const hundredths = useRef(toHundredths(initial));
  const [coins, setCoins] = useState(initial);
  const publish = useCallback(() => setCoins(hundredths.current / 100), []);
  const peek = useCallback(() => hundredths.current / 100, []);
  const debit = useCallback((amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const cost = toHundredths(amount);
    if (hundredths.current < cost) return false;
    hundredths.current -= cost;
    publish();
    return true;
  }, [publish]);
  const credit = useCallback((amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    hundredths.current += toHundredths(amount);
    publish();
  }, [publish]);
  const reset = useCallback(() => { hundredths.current = toHundredths(initial); publish(); }, [initial, publish]);
  return useMemo(() => ({ coins, peek, debit, credit, reset }), [coins, peek, debit, credit, reset]);
}

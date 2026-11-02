"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { PRACTICE_BANKROLL, usePracticeBankroll } from "@/features/coin-samples/practiceBankroll";
import { sampleTriviaQuestions } from "@/features/coin-samples/questionBank";
import { randomSeed, seededRandom } from "@/features/coin-samples/rng";
import { useMiniLocale } from "../lib/i18n";
import { FinalThird, type CoinSampleMode } from "./FinalThird";

const MIN_STAKE = 5;

/**
 * Untimed introductory run for Free Kicks: the real screen and rules, driven
 * client-side with practice coins and no answer clock. Nothing reaches the
 * backend, so the store wallet, payouts and run boards can never be touched.
 */
export function FreeKicksPractice({ onExit }: { onExit: () => void }) {
  const miniLocale = useMiniLocale();
  const wallet = usePracticeBankroll(PRACTICE_BANKROLL);
  const walletRef = useRef(wallet);
  walletRef.current = wallet;
  const [random] = useState(() => seededRandom(randomSeed()));
  const questions = useMemo(() => sampleTriviaQuestions(miniLocale), [miniLocale]);
  // Practice never dead-ends: below the smallest stake the bankroll refills.
  const onSettled = useCallback(() => {
    if (walletRef.current.peek() < MIN_STAKE) walletRef.current.reset();
  }, []);
  // The engine reads the wallet through a stable port so its state survives re-renders.
  const port = useMemo<CoinSampleMode["wallet"]>(() => ({
    get coins() { return walletRef.current.peek(); },
    debit: (amount: number) => walletRef.current.debit(amount),
    credit: (amount: number) => walletRef.current.credit(amount),
    reset: () => walletRef.current.reset(),
  }), []);
  // Stable across balance changes (the screen re-renders with this component and reads the getter).
  const sample = useMemo<CoinSampleMode>(
    () => ({ questions, wallet: port, random, onSettled, onExit, untimed: true }),
    [questions, port, random, onSettled, onExit],
  );
  return <FinalThird sample={sample} />;
}

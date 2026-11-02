"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { SAMPLE_SQUAD_SPIN_COMBOS } from "@/features/coin-samples/data/sampleSquadSpin";
import { MIN_STAKE, createSquadSpinSample } from "@/features/coin-samples/engines/squadSpin";
import { PRACTICE_BANKROLL, usePracticeBankroll, type PracticeWallet } from "@/features/coin-samples/practiceBankroll";
import { randomSeed } from "@/features/coin-samples/rng";
import { SquadSpinLive } from "./SquadSpinLive";

/**
 * Relaxed practice for signed-in players: the live Squad Spin screen driven by
 * the client-side sample engine with the answer clock switched off. Practice
 * coins live in memory only — no request reaches the backend, so the store
 * wallet, leaderboards and calibration can never be touched.
 */
export function SquadSpinPractice({ onExit }: { onExit: () => void }) {
  const wallet = usePracticeBankroll(PRACTICE_BANKROLL);
  const walletRef = useRef(wallet);
  walletRef.current = wallet;
  // The engine reads the wallet through a stable port so the client survives re-renders.
  const port = useMemo<PracticeWallet>(() => ({
    get coins() { return walletRef.current.peek(); },
    peek: () => walletRef.current.peek(),
    debit: (amount: number) => walletRef.current.debit(amount),
    credit: (amount: number) => walletRef.current.credit(amount),
    reset: () => walletRef.current.reset(),
  }), []);
  // Practice never dead-ends: below the smallest stake the bankroll refills.
  const onSettled = useCallback(() => { if (walletRef.current.peek() < MIN_STAKE) walletRef.current.reset(); }, []);
  const [client] = useState(() => createSquadSpinSample({ combos: SAMPLE_SQUAD_SPIN_COMBOS, wallet: port, seed: randomSeed(), onSettled, untimed: true }));
  const sample = useMemo(() => ({ coins: wallet.coins, onExit, relaxed: true }), [wallet.coins, onExit]);
  return <SquadSpinLive client={client} sample={sample} />;
}

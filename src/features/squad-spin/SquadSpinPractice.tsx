"use client";

import { useCallback, useMemo, useState } from "react";
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
  // peek/debit/credit/reset are stable callbacks over the bankroll's ref; only `coins` changes per render.
  const { coins, peek, debit, credit, reset } = usePracticeBankroll(PRACTICE_BANKROLL);
  // The engine reads the wallet through a stable port so the client survives re-renders.
  const port = useMemo<PracticeWallet>(() => ({
    get coins() { return peek(); },
    peek, debit, credit, reset,
  }), [peek, debit, credit, reset]);
  // Practice never dead-ends: below the smallest stake the bankroll refills.
  const onSettled = useCallback(() => { if (peek() < MIN_STAKE) reset(); }, [peek, reset]);
  const [client] = useState(() => createSquadSpinSample({ combos: SAMPLE_SQUAD_SPIN_COMBOS, wallet: port, seed: randomSeed(), onSettled, untimed: true }));
  const sample = useMemo(() => ({ coins, onExit, relaxed: true }), [coins, onExit]);
  return <SquadSpinLive client={client} sample={sample} />;
}

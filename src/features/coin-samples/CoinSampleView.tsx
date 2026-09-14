"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import type { EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { DemoResultScreen } from "@/features/demos/DemoResultScreen";
import { FinalThird } from "@/features/mini-games/components/FinalThird";
import { RoadToGoal } from "@/features/mini-games/components/RoadToGoal";
import { TriviaMinesLive } from "@/features/trivia-mines/TriviaMinesLive";
import { SquadSpinLive } from "@/features/squad-spin/SquadSpinLive";
import { useMiniLocale } from "@/features/mini-games/lib/i18n";
import { SAMPLE_QUESTIONS } from "./data/sampleQuestions";
import { SAMPLE_SQUAD_SPIN_COMBOS } from "./data/sampleSquadSpin";
import { createTriviaMinesSample } from "./engines/triviaMines";
import { createSquadSpinSample } from "./engines/squadSpin";
import { sampleTriviaQuestions } from "./questionBank";
import { PRACTICE_BANKROLL, usePracticeBankroll, type PracticeWallet } from "./practiceBankroll";
import { randomSeed, seededRandom } from "./rng";

export type CoinSampleGame = "trivia_mines" | "free_kicks" | "road_to_goal" | "squad_spin";
const MIN_STAKE: Record<CoinSampleGame, number> = { trivia_mines: 5, free_kicks: 5, road_to_goal: 10, squad_spin: 5 };
const TITLE: Record<CoinSampleGame, string> = { trivia_mines: "Trivia Mines", free_kicks: "Free Kicks", road_to_goal: "Road to Goal", squad_spin: "Squad Spin" };

interface Settled { stake: number; payout: number; status: "cashed" | "lost" }

/**
 * Public-page sneak peek of a coin game: the real screen, a client-side engine
 * with the live rules (frozen snapshot), 1,000 practice coins per visit in
 * memory, and the brand result card after every settlement. No requests.
 */
export function CoinSampleView({ game, modeId, backHref, playPath, onExit, onEvent, onLeaveToRealGame }: {
  game: CoinSampleGame;
  modeId: string;
  backHref: string;
  playPath: string;
  onExit: () => void;
  onEvent: (event: "start" | "complete" | "replay", detail?: EngineEventDetail) => void;
  onLeaveToRealGame: () => void;
}) {
  const { t } = useLocale();
  const miniLocale = useMiniLocale();
  const wallet = usePracticeBankroll(PRACTICE_BANKROLL);
  const [settled, setSettled] = useState<Settled | null>(null);
  const [attempt, setAttempt] = useState(0);
  const startedRef = useRef(false);
  const walletRef = useRef(wallet);
  walletRef.current = wallet;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  // The engines read the wallet through a stable port so the client objects survive re-renders.
  const port = useMemo<PracticeWallet>(() => ({
    get coins() { return walletRef.current.peek(); },
    peek: () => walletRef.current.peek(),
    debit: (amount: number) => {
      const ok = walletRef.current.debit(amount);
      if (ok && !startedRef.current) { startedRef.current = true; onEventRef.current("start"); }
      return ok;
    },
    credit: (amount: number) => walletRef.current.credit(amount),
    reset: () => walletRef.current.reset(),
  }), []);
  const onSettled = useCallback((r: Settled) => {
    startedRef.current = false;
    onEventRef.current("complete", { score: r.payout, outcome: r.status, stake: r.stake, payout: r.payout, balance: walletRef.current.peek() });
    setSettled(r);
  }, []);
  // One engine set per attempt: replay must deal a clean round from a fresh seed.
  const makeEngines = useCallback(() => {
    const seed = randomSeed();
    return {
      mines: createTriviaMinesSample({ questions: SAMPLE_QUESTIONS, wallet: port, seed, onSettled }),
      spin: createSquadSpinSample({ combos: SAMPLE_SQUAD_SPIN_COMBOS, wallet: port, seed, onSettled }),
      random: seededRandom(seed),
    };
  }, [port, onSettled]);
  const [engines, setEngines] = useState(makeEngines);
  const questions = useMemo(() => sampleTriviaQuestions(miniLocale), [miniLocale]);
  const sampleMode = useMemo(() => ({ questions, wallet: port, random: engines.random, onSettled }), [questions, port, engines.random, onSettled]);

  // Stable per balance so the live screens' effects do not re-run on unrelated renders.
  const sampleChip = useMemo(() => ({ coins: wallet.coins }), [wallet.coins]);

  const playAgain = () => { setSettled(null); onEventRef.current("replay"); setEngines(makeEngines()); setAttempt((a) => a + 1); };
  const resetAndPlay = () => { wallet.reset(); playAgain(); };
  const outOfCoins = wallet.coins < MIN_STAKE[game];
  const cta = { modeId, returnTo: playPath, onBeforeLeave: onLeaveToRealGame, label: t("coinSample.playReal") };

  if (settled) {
    return (
      <DemoResultScreen
        title={TITLE[game]}
        score={settled.payout}
        subtitle={settled.status === "cashed" ? t("coinSample.won", { amount: settled.payout.toLocaleString() }) : t("coinSample.lost")}
        onReplay={outOfCoins ? resetAndPlay : playAgain}
        onExit={onExit}
        embedded
        cta={cta}
        secondary={outOfCoins ? { label: t("coinSample.reset"), onClick: resetAndPlay } : undefined}
      />
    );
  }

  // Below the smallest stake with no round open (also reachable via the games' own "new round"): offer a reset, not a dead start screen.
  if (outOfCoins) {
    return (
      <DemoResultScreen
        title={TITLE[game]}
        score={wallet.coins}
        subtitle={t("coinSample.outOfCoins")}
        onReplay={resetAndPlay}
        onExit={onExit}
        embedded
        cta={cta}
        secondary={{ label: t("coinSample.reset"), onClick: resetAndPlay }}
      />
    );
  }

  switch (game) {
    case "trivia_mines":
      return <TriviaMinesLive key={attempt} backHref={backHref} client={engines.mines} sample={sampleChip} />;
    case "squad_spin":
      return <SquadSpinLive key={attempt} backHref={backHref} client={engines.spin} sample={sampleChip} />;
    case "free_kicks":
      return <FinalThird key={attempt} backHref={backHref} sample={sampleMode} />;
    case "road_to_goal":
      return <RoadToGoal key={attempt} backHref={backHref} sample={sampleMode} />;
  }
}

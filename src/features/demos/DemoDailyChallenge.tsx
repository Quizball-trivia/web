"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoneyDropGame } from "@/features/daily/MoneyDropGame";
import { ClueGame } from "@/features/daily/ClueGame";
import { CountdownGame } from "@/features/daily/CountdownGame";
import { PutInOrderGame } from "@/features/daily/PutInOrderGame";
import { TrueFalseGame } from "@/features/daily/TrueFalseGame";
import { ImposterGame } from "@/features/daily/ImposterGame";
import { CareerPathGame } from "@/features/daily/CareerPathGame";
import { HighLowGame } from "@/features/daily/HighLowGame";
import { FootballLogicGame } from "@/features/daily/FootballLogicGame";
import { CardDetectiveDailyGame } from "@/features/daily/CardDetectiveDailyGame";
import { MissingXiSoloGame } from "@/features/missing-xi/MissingXiSoloGame";
import { PassChainGame } from "@/features/daily/PassChainGame";
import { StatSniperGame } from "@/features/daily/StatSniperGame";
import { resolveDemoPassChainLink } from "@/features/demos/data/demoDailySessions";
import { DailyChallengeIntro } from "@/features/daily/components/DailyChallengeIntro";
import { useLocale } from "@/contexts/LocaleContext";
import type { DailyChallengeSession, DailyChallengeType, StatSniperLeaderboard } from "@/lib/domain/dailyChallenge";
import { buildDemoDailySession } from "./data/demoDailySessions";
import { DemoResultScreen } from "./DemoResultScreen";
import { DemoBackButton } from "./DemoBackButton";

interface DemoDailyChallengeProps {
  type: DailyChallengeType;
  backHref?: string;
  /** Embedded (public game page) use: leave without navigating. */
  onExit?: () => void;
  onEvent?: (event: "start" | "complete" | "replay", detail?: { score?: number }) => void;
  /** A real session (guest play) instead of the built-in sample. */
  session?: DailyChallengeSession;
  /** Guest play: record the result server-side (no rewards) before the results screen. */
  onRemoteComplete?: (score: number) => Promise<unknown>;
  /** Guest play: Pass Chain links resolved by the guest endpoint. */
  resolveLink?: ResolveLink;
  /** Guest play: Stat Sniper board from the public endpoint. */
  leaderboardFetcher?: () => Promise<StatSniperLeaderboard>;
}
type ResolveLink = NonNullable<Parameters<typeof PassChainGame>[0]["resolveLink"]>;

export function DemoDailyChallenge({ type, backHref = "/demos", onExit, onEvent, session: sessionOverride, onRemoteComplete, resolveLink, leaderboardFetcher }: DemoDailyChallengeProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const [attempt, setAttempt] = useState(0);
  const [introDone, setIntroDone] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const session = useMemo(
    () => sessionOverride ?? buildDemoDailySession(type, locale),
    [sessionOverride, type, locale],
  );

  const handleBack = useCallback(() => {
    if (onExit) onExit();
    else router.push(backHref);
  }, [backHref, onExit, router]);

  // A finished round is submitted once per attempt, at the terminal state when the engine offers one
  // (Stat Sniper's save hook) and otherwise when the results modal is dismissed.
  const submittedRef = useRef(false);
  const submitOnce = useCallback(async (score: number) => {
    if (submittedRef.current || !onRemoteComplete) return;
    submittedRef.current = true;
    await onRemoteComplete(score).catch(() => undefined);
  }, [onRemoteComplete]);
  const handleComplete = useCallback((score: number) => {
    onEvent?.("complete", { score });
    void submitOnce(score);
    setFinalScore(score);
  }, [onEvent, submitOnce]);

  const handleReplay = useCallback(() => {
    onEvent?.("replay");
    submittedRef.current = false;
    setFinalScore(null);
    setIntroDone(false);
    setAttempt((current) => current + 1);
  }, [onEvent]);

  if (finalScore !== null) {
    return (
      <DemoResultScreen
        title={session.title}
        score={finalScore}
        isMoney={type === "moneyDrop"}
        onReplay={handleReplay}
        onExit={handleBack}
        embedded={Boolean(onExit)}
      />
    );
  }

  if (!introDone) {
    return (
      <>
        <DemoBackButton onClick={handleBack} />
        <DailyChallengeIntro title={session.title} onDone={() => { onEvent?.("start"); setIntroDone(true); }} />
      </>
    );
  }

  const gameProps = { onBack: handleBack, onComplete: handleComplete };

  switch (session.challengeType) {
    case "moneyDrop":
      return <MoneyDropGame key={attempt} session={session} {...gameProps} />;
    case "trueFalse":
      return <TrueFalseGame key={attempt} session={session} {...gameProps} />;
    case "clues":
      return <ClueGame key={attempt} session={session} {...gameProps} />;
    case "countdown":
      return <CountdownGame key={attempt} session={session} {...gameProps} />;
    case "putInOrder":
      return <PutInOrderGame key={attempt} session={session} {...gameProps} />;
    case "imposter":
      return <ImposterGame key={attempt} session={session} {...gameProps} />;
    case "careerPath":
      return <CareerPathGame key={attempt} session={session} {...gameProps} />;
    case "highLow":
      return <HighLowGame key={attempt} session={session} {...gameProps} />;
    case "footballLogic":
      return <FootballLogicGame key={attempt} session={session} {...gameProps} />;
    case "cardDetective":
      return <CardDetectiveDailyGame key={attempt} session={session} {...gameProps} />;
    case "missingXi":
      return <MissingXiSoloGame key={attempt} session={session} {...gameProps} />;
    case "passChain":
      return <PassChainGame key={attempt} session={session} resolveLink={resolveLink ?? resolveDemoPassChainLink} {...gameProps} />;
    case "statSniper":
      return <StatSniperGame key={attempt} session={session} demo={!leaderboardFetcher} leaderboardFetcher={leaderboardFetcher} onSaveResult={onRemoteComplete ? submitOnce : undefined} {...gameProps} />;
  }
}

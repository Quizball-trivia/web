"use client";

import { useCallback, useMemo, useState } from "react";
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
import { FifaCardsDailyGame } from "@/features/daily/FifaCardsDailyGame";
import { DailyChallengeIntro } from "@/features/daily/components/DailyChallengeIntro";
import { useLocale } from "@/contexts/LocaleContext";
import type { DailyChallengeType } from "@/lib/domain/dailyChallenge";
import { buildDemoDailySession } from "./data/demoDailySessions";
import { DemoResultScreen } from "./DemoResultScreen";
import { DemoBackButton } from "./DemoBackButton";

interface DemoDailyChallengeProps {
  type: DailyChallengeType;
}

export function DemoDailyChallenge({ type }: DemoDailyChallengeProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const [attempt, setAttempt] = useState(0);
  const [introDone, setIntroDone] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const session = useMemo(
    () => buildDemoDailySession(type, locale),
    [type, locale],
  );

  const handleBack = useCallback(() => {
    router.push("/demos");
  }, [router]);

  const handleComplete = useCallback((score: number) => {
    setFinalScore(score);
  }, []);

  const handleReplay = useCallback(() => {
    setFinalScore(null);
    setIntroDone(false);
    setAttempt((current) => current + 1);
  }, []);

  if (finalScore !== null) {
    return (
      <DemoResultScreen
        title={session.title}
        score={finalScore}
        isMoney={type === "moneyDrop"}
        onReplay={handleReplay}
        onExit={handleBack}
      />
    );
  }

  if (!introDone) {
    return (
      <>
        <DemoBackButton onClick={handleBack} />
        <DailyChallengeIntro title={session.title} onDone={() => setIntroDone(true)} />
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
    case "fifaCards":
      return <FifaCardsDailyGame key={attempt} session={session} {...gameProps} />;
  }
}

"use client";

import { notFound, useParams } from "next/navigation";
import { DemoAuction } from "@/features/demos/DemoAuction";
import { DemoBackButton } from "@/features/demos/DemoBackButton";
import { DemoDailyChallenge } from "@/features/demos/DemoDailyChallenge";
import { DemoTraining } from "@/features/demos/DemoTraining";
import { DemoWeekendLeague } from "@/features/demos/DemoWeekendLeague";
import { findDemoMode } from "@/features/demos/demoModes";
import { Accumulator } from "@/features/mini-games/components/Accumulator";
import { BetSlipBooster } from "@/features/mini-games/components/BetSlipBooster";
import { CashOutLadder } from "@/features/mini-games/components/CashOutLadder";
import { DailyJackpot } from "@/features/mini-games/components/DailyJackpot";
import { FinalThird } from "@/features/mini-games/components/FinalThird";
import { HalfTimeTrivia } from "@/features/mini-games/components/HalfTimeTrivia";
import { OddsBoard } from "@/features/mini-games/components/OddsBoard";
import { PassChain } from "@/features/mini-games/components/PassChain";
import { PenaltyShootout } from "@/features/mini-games/components/PenaltyShootout";
import { SquadCollection } from "@/features/mini-games/components/SquadCollection";
import { SquadSpin } from "@/features/mini-games/components/SquadSpin";
import { TriviaSpin } from "@/features/mini-games/components/TriviaSpin";

const DEMO_BACK = "/demos";

export default function DemoModePage() {
  const params = useParams();
  const slug = String(params.mode ?? "");
  const mode = findDemoMode(slug);

  if (!mode) {
    notFound();
  }

  if (mode.dailyType) {
    return <DemoDailyChallenge type={mode.dailyType} />;
  }

  switch (mode.slug) {
    case "match":
      return (
        <>
          <DemoBackButton />
          <DemoTraining />
        </>
      );
    case "auction":
      return (
        <>
          <DemoBackButton />
          <DemoAuction />
        </>
      );
    case "weekend-league":
      return (
        <>
          <DemoBackButton />
          <DemoWeekendLeague />
        </>
      );
    case "mini-final-third":
      return <FinalThird backHref={DEMO_BACK} />;
    case "mini-squad-spin":
      return <SquadSpin backHref={DEMO_BACK} />;
    case "mini-trivia-spin":
      return <TriviaSpin backHref={DEMO_BACK} />;
    case "mini-penalty-shootout":
      return <PenaltyShootout backHref={DEMO_BACK} />;
    case "mini-daily-jackpot":
      return <DailyJackpot backHref={DEMO_BACK} />;
    case "mini-pass-chain":
      return <PassChain backHref={DEMO_BACK} />;
    case "mini-accumulator":
      return <Accumulator backHref={DEMO_BACK} />;
    case "mini-squad-collection":
      return <SquadCollection backHref={DEMO_BACK} />;
    case "mini-cash-out-ladder":
      return <CashOutLadder backHref={DEMO_BACK} />;
    case "mini-bet-slip-booster":
      return <BetSlipBooster backHref={DEMO_BACK} />;
    case "mini-half-time-trivia":
      return <HalfTimeTrivia backHref={DEMO_BACK} />;
    case "mini-odds-board":
      return <OddsBoard backHref={DEMO_BACK} />;
    default:
      notFound();
  }
}

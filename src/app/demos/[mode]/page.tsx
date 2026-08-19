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
import { CareerRace } from "@/features/mini-games/components/CareerRace";
import { CashOutLadder } from "@/features/mini-games/components/CashOutLadder";
import { DailyJackpot } from "@/features/mini-games/components/DailyJackpot";
import { FinalThird } from "@/features/mini-games/components/FinalThird";
import { FootballGrid } from "@/features/mini-games/components/FootballGrid";
import { GoldenGoal } from "@/features/mini-games/components/GoldenGoal";
import { GuessTheGoal } from "@/features/mini-games/components/GuessTheGoal";
import { HalfTimeTrivia } from "@/features/mini-games/components/HalfTimeTrivia";
import { HiLoRide } from "@/features/mini-games/components/HiLoRide";
import { LastOneStanding } from "@/features/mini-games/components/LastOneStanding";
import { OddsBoard } from "@/features/mini-games/components/OddsBoard";
import { PassChain } from "@/features/mini-games/components/PassChain";
import { PenaltyShootout } from "@/features/mini-games/components/PenaltyShootout";
import { QuizBoard } from "@/features/mini-games/components/QuizBoard";
import { RoadToGoal } from "@/features/mini-games/components/RoadToGoal";
import { SquadCollection } from "@/features/mini-games/components/SquadCollection";
import { SquadSpin } from "@/features/mini-games/components/SquadSpin";
import { StatSniper } from "@/features/mini-games/components/StatSniper";
import { Survivor } from "@/features/mini-games/components/Survivor";
import { TriviaMines } from "@/features/mini-games/components/TriviaMines";
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
    case "mini-road-to-goal":
      return <RoadToGoal backHref={DEMO_BACK} />;
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
    case "mini-football-grid":
      return <FootballGrid backHref={DEMO_BACK} />;
    case "mini-survivor":
      return <Survivor backHref={DEMO_BACK} />;
    case "mini-hi-lo-ride":
      return <HiLoRide backHref={DEMO_BACK} />;
    case "mini-trivia-mines":
      return <TriviaMines backHref={DEMO_BACK} />;
    case "mini-quiz-board":
      return <QuizBoard backHref={DEMO_BACK} />;
    case "mini-last-one-standing":
      return <LastOneStanding backHref={DEMO_BACK} />;
    case "mini-golden-goal":
      return <GoldenGoal backHref={DEMO_BACK} />;
    case "mini-career-race":
      return <CareerRace backHref={DEMO_BACK} />;
    case "mini-guess-the-goal":
      return <GuessTheGoal backHref={DEMO_BACK} />;
    case "mini-stat-sniper":
      return <StatSniper backHref={DEMO_BACK} />;
    default:
      notFound();
  }
}

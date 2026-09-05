"use client";

import { Suspense } from "react";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { DemoAuction } from "@/features/demos/DemoAuction";
import { DemoBackButton } from "@/features/demos/DemoBackButton";
import { DemoDailyChallenge } from "@/features/demos/DemoDailyChallenge";
import { DemoTraining } from "@/features/demos/DemoTraining";
import { DemoWeekendLeague } from "@/features/demos/DemoWeekendLeague";
import { findDemoMode } from "@/features/demos/demoModes";
import { FifaUniverseMode } from "@/features/fifa-universe/FifaUniverseMode";
import { isFifaSlug } from "@/features/fifa-universe/registry";
import { BallKnowledgeGame } from "@/features/game-mode-lab/modes/BallKnowledgeGame";
import { BingoBattleGame } from "@/features/game-mode-lab/modes/BingoBattleGame";
import { ConnectionsRaceGame } from "@/features/game-mode-lab/modes/ConnectionsRaceGame";
import { DraftBattleGame } from "@/features/game-mode-lab/modes/DraftBattleGame";
import { MissingXIGame } from "@/features/game-mode-lab/modes/MissingXIGame";
import { OwnGoalGame } from "@/features/game-mode-lab/modes/OwnGoalGame";
import { SayItWithMemesGame } from "@/features/game-mode-lab/modes/SayItWithMemesGame";
import { Stat501Game } from "@/features/game-mode-lab/modes/Stat501Game";
import { Top10KnockoutGame } from "@/features/game-mode-lab/modes/Top10KnockoutGame";
import { Accumulator } from "@/features/mini-games/components/Accumulator";
import { BetSlipBooster } from "@/features/mini-games/components/BetSlipBooster";
import { CareerRace } from "@/features/mini-games/components/CareerRace";
import { CashOutLadder } from "@/features/mini-games/components/CashOutLadder";
import { DailyJackpot } from "@/features/mini-games/components/DailyJackpot";
import { FinalThird } from "@/features/mini-games/components/FinalThird";
import { FootballGrid } from "@/features/mini-games/components/FootballGrid";
import { GoldenGoal } from "@/features/mini-games/components/GoldenGoal";
import { GuessFifaCard } from "@/features/mini-games/components/GuessFifaCard";
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
/** Entry points outside the demos catalogue (e.g. /play, /mini-games) pass
 *  ?from= so the in-game back button returns where the player came from.
 *  Allowlisted to internal paths only. */
const ALLOWED_BACK = new Set(["/demos", "/play", "/mini-games"]);

export default function DemoModePage() {
  return (
    <Suspense fallback={null}>
      <DemoModePageInner />
    </Suspense>
  );
}

function DemoModePageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const backHref = fromParam && ALLOWED_BACK.has(fromParam) ? fromParam : DEMO_BACK;
  const slug = String(params.mode ?? "");
  const mode = findDemoMode(slug);

  if (!mode) {
    notFound();
  }

  if (mode.dailyType) {
    return <DemoDailyChallenge type={mode.dailyType} />;
  }

  if (isFifaSlug(mode.slug)) {
    return <FifaUniverseMode slug={mode.slug} backHref={backHref} />;
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
      return <FinalThird backHref={backHref} />;
    case "mini-road-to-goal":
      return <RoadToGoal backHref={backHref} />;
    case "mini-squad-spin":
      return <SquadSpin backHref={backHref} />;
    case "mini-trivia-spin":
      return <TriviaSpin backHref={backHref} />;
    case "mini-penalty-shootout":
      return <PenaltyShootout backHref={backHref} />;
    case "mini-daily-jackpot":
      return <DailyJackpot backHref={backHref} />;
    case "mini-pass-chain":
      return <PassChain backHref={backHref} />;
    case "mini-accumulator":
      return <Accumulator backHref={backHref} />;
    case "mini-squad-collection":
      return <SquadCollection backHref={backHref} />;
    case "mini-cash-out-ladder":
      return <CashOutLadder backHref={backHref} />;
    case "mini-bet-slip-booster":
      return <BetSlipBooster backHref={backHref} />;
    case "mini-half-time-trivia":
      return <HalfTimeTrivia backHref={backHref} />;
    case "mini-odds-board":
      return <OddsBoard backHref={backHref} />;
    case "mini-football-grid":
      return <FootballGrid backHref={backHref} />;
    case "mini-survivor":
      return <Survivor backHref={backHref} />;
    case "mini-hi-lo-ride":
      return <HiLoRide backHref={backHref} />;
    case "mini-trivia-mines":
      return <TriviaMines backHref={backHref} />;
    case "mini-quiz-board":
      return <QuizBoard backHref={backHref} />;
    case "mini-last-one-standing":
      return <LastOneStanding backHref={backHref} />;
    case "mini-golden-goal":
      return <GoldenGoal backHref={backHref} />;
    case "mini-career-race":
      return <CareerRace backHref={backHref} />;
    case "mini-guess-the-goal":
      return <GuessTheGoal backHref={backHref} />;
    case "mini-guess-fifa-card":
      return <GuessFifaCard backHref={backHref} />;
    case "mini-stat-sniper":
      return <StatSniper backHref={backHref} />;
    // Concept prototypes (game-mode-lab).
    case "lab-own-goal":
      return <OwnGoalGame backHref={backHref} />;
    case "lab-say-it-with-memes":
      return <SayItWithMemesGame backHref={backHref} />;
    case "lab-draft-battle":
      return <DraftBattleGame backHref={backHref} />;
    case "lab-top-10-knockout":
      return <Top10KnockoutGame backHref={backHref} />;
    case "lab-missing-xi":
      return <MissingXIGame backHref={backHref} />;
    case "lab-ball-knowledge":
      return <BallKnowledgeGame backHref={backHref} />;
    case "lab-bingo-battle":
      return <BingoBattleGame backHref={backHref} />;
    case "lab-connections-race":
      return <ConnectionsRaceGame backHref={backHref} />;
    case "lab-stat-501":
      return <Stat501Game backHref={backHref} />;
    default:
      notFound();
  }
}

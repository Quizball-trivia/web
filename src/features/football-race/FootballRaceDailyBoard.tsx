"use client";
import { WordDailyLeaderboard } from "@/features/wordgames/daily/WordDailyLeaderboard";
import { raceCopy } from "./race.copy";
import { footballRaceDailyGame, loadRaceBoard } from "./race.daily";

// Ranking module: like WordDailyPageBoards it must not import the playable engine or animation UI.
export function FootballRaceDailyBoard({ locale, className }: { locale: string; className?: string }) {
  return <WordDailyLeaderboard game={footballRaceDailyGame(locale)} locale={locale} load={loadRaceBoard} pointsLabel={raceCopy(locale).picksLabel} className={className} />;
}

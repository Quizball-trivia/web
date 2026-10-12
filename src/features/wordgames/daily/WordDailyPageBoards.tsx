"use client";
import { createWordDailyApi, type WordRunStateBase } from "./wordDaily.api";
import { nameChainDailyGame, sharedPlayerDailyGame } from "./wordDaily.games";
import { WordDailyLeaderboard } from "./WordDailyLeaderboard";

// Ranking modules must not import playable engines or animation UI.
const sharedApi = createWordDailyApi<WordRunStateBase, string, unknown>("/api/v1/shared-player");
const chainApi = createWordDailyApi<WordRunStateBase, string, unknown>("/api/v1/name-chain");
const loadShared = (day: string, locale: string) => sharedApi.leaderboard(day, locale);
const loadChain = (day: string, locale: string) => chainApi.leaderboard(day, locale);

export function SharedPlayerDailyBoard({ locale, className }: { locale: string; className?: string }) {
  return <WordDailyLeaderboard game={sharedPlayerDailyGame(locale)} locale={locale} load={loadShared} className={className} />;
}
export function NameChainDailyBoard({ locale, className }: { locale: string; className?: string }) {
  return <WordDailyLeaderboard game={nameChainDailyGame(locale)} locale={locale} load={loadChain} className={className} />;
}

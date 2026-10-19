"use client";
import { createWordDailyApi, type WordRunStateBase } from "./wordDaily.api";
import { nameChainDailyGame, sharedPlayerDailyGame } from "./wordDaily.games";
import { WordDailyLeaderboard } from "./WordDailyLeaderboard";
import { tenableDailyGame } from "@/features/tenable/tenable.game";
import { codenamesCopy } from "@/features/codenames/codenames.copy";
import { codenamesDailyGame, loadCodenamesBoard } from "@/features/codenames/codenames.daily";
import { datoFalsoDailyApi } from "@/features/dato-falso/datoFalso.daily";
import { datoFalsoDailyGame } from "@/features/dato-falso/datoFalso.game";

// Ranking modules must not import playable engines or animation UI.
const sharedApi = createWordDailyApi<WordRunStateBase, string, unknown>("/api/v1/shared-player");
const chainApi = createWordDailyApi<WordRunStateBase, string, unknown>("/api/v1/name-chain");
const loadShared = (day: string, locale: string) => sharedApi.leaderboard(day, locale);
const loadChain = (day: string, locale: string) => chainApi.leaderboard(day, locale);
const tenableApi = createWordDailyApi<WordRunStateBase, string, unknown>("/api/v1/tenable");
const loadTenable = (day: string, locale: string) => tenableApi.leaderboard(day, locale);
const loadDatoFalso = (day: string, locale: string) => datoFalsoDailyApi.leaderboard(day, locale);

export function SharedPlayerDailyBoard({ locale, className }: { locale: string; className?: string }) {
  return <WordDailyLeaderboard game={sharedPlayerDailyGame(locale)} locale={locale} load={loadShared} className={className} />;
}
export function NameChainDailyBoard({ locale, className }: { locale: string; className?: string }) {
  return <WordDailyLeaderboard game={nameChainDailyGame(locale)} locale={locale} load={loadChain} className={className} />;
}
export function TenableDailyBoard({ locale, className }: { locale: string; className?: string }) {
  return <WordDailyLeaderboard game={tenableDailyGame(locale)} locale={locale} load={loadTenable} className={className} />;
}
export function CodenamesDailyBoard({ locale, className }: { locale: string; className?: string }) {
  return <WordDailyLeaderboard game={codenamesDailyGame(locale)} locale={locale} load={loadCodenamesBoard} pointsLabel={codenamesCopy(locale).foundLabel} className={className} />;
}
export function DatoFalsoDailyBoard({ locale, className }: { locale: string; className?: string }) {
  return <WordDailyLeaderboard game={datoFalsoDailyGame(locale)} locale={locale} load={loadDatoFalso} className={className} />;
}

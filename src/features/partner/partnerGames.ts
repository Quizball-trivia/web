import { demoText, findDemoMode } from "@/features/demos/demoModes";
import type { PartnerGameId } from "./api/partnerApi.types";
import { partnerCopy, type PartnerLocale } from "./partnerCopy";
import { partnerBasePath } from "./partnerHosts";

/** Artwork + title source for each partner game (the /demos hub cards). Ranked uses the 1v1 match art. */
export const PARTNER_GAME_DEMO_SLUG: Record<PartnerGameId, string> = {
  ranked: "match",
  countdown: "daily-countdown",
  "true-false": "daily-trueFalse",
  "pick-em": "daily-imposter",
  "career-path": "daily-careerPath",
  "higher-lower": "daily-highLow",
  "card-detective": "daily-cardDetective",
  "guess-the-goal": "mini-guess-the-goal",
  "road-to-goal": "mini-road-to-goal",
  "trivia-mines": "mini-trivia-mines",
  "quiz-board": "mini-quiz-board",
};

export function partnerGameTitle(gameId: PartnerGameId, locale: PartnerLocale): string {
  const override = partnerCopy(locale).gameTitles[gameId];
  if (override) return override;
  const mode = findDemoMode(PARTNER_GAME_DEMO_SLUG[gameId]);
  return mode ? demoText(mode.title, locale) : gameId;
}

export function partnerGameDescription(gameId: PartnerGameId, locale: PartnerLocale): string {
  const mode = findDemoMode(PARTNER_GAME_DEMO_SLUG[gameId]);
  return mode ? demoText(mode.description, locale) : "";
}

export const FREECROCO_HOME_PATH = partnerBasePath("freecroco");

export function partnerGamePath(gameId: PartnerGameId): string {
  return `${FREECROCO_HOME_PATH}/play/${gameId}`;
}

"use client";

import { storage, STORAGE_KEYS } from "@/utils/storage";
import { normalizeLocale, translate } from "./messages";

export function getDailyChallengeLocale() {
  return normalizeLocale(storage.get(STORAGE_KEYS.LOCALE, "en"));
}

export function getDailyChallengeCopy() {
  const locale = getDailyChallengeLocale();

  return {
    answerPrefix: translate(locale, "dailyChallenge.answerPrefix"),
    chainComplete: translate(locale, "dailyChallenge.chainComplete"),
    correct: translate(locale, "dailyChallenge.correct"),
    correctAnswers: translate(locale, "dailyChallenge.correctAnswers"),
    higherValueInstruction: translate(locale, "dailyChallenge.higherValueInstruction"),
    imposterInstruction: translate(locale, "dailyChallenge.imposterInstruction"),
    matchup: translate(locale, "dailyChallenge.matchup"),
    pick: translate(locale, "dailyChallenge.pick"),
    round: translate(locale, "dailyChallenge.round"),
    roundFailed: translate(locale, "dailyChallenge.roundFailed"),
    score: translate(locale, "dailyChallenge.score"),
    submit: translate(locale, "common.submit"),
    submitSelection: translate(locale, "dailyChallenge.submitSelection"),
    typePlayerName: translate(locale, "dailyChallenge.typePlayerName"),
    typeYourAnswer: translate(locale, "dailyChallenge.typeYourAnswer"),
  };
}

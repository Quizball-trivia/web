import type { PromoRound } from './promoQuiz.data';

// A promo quiz edition: content + shell strings + locale pin. The engine
// (usePromoQuiz / PromoQuizScreen) is edition-agnostic; /promo mounts the
// Georgian pack, /promo/tr the Turkish one.

export interface PromoStrings {
  nextQuestion: string;
  finish: string;
  finalScore: string;
  playAgain: string;
  correctLabel: string;
  accuracyLabel: string;
}

export interface PromoChainLabels {
  placeholderPrefix: string;
  add: string;
  reset: string;
  linked: string;
  perfect: string;
  linksWord: string;
  start: string;
  target: string;
  unknown: string;
  already: string;
  neverPlayed: (a: string, b: string) => string;
}

export interface PromoContentPack {
  id: string;
  /** App-chrome locale to pin (the app only ships ka/en UI strings). */
  localePin: 'ka' | 'en';
  playerName: string;
  avatarMonogram: string;
  strings: PromoStrings;
  chainLabels: PromoChainLabels;
  rounds: PromoRound[];
  pioCorrectIds: string[];
  cluesAnswer: string;
  cluesAccepted: string[];
}

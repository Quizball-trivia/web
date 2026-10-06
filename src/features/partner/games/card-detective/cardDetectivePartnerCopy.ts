import { useLocale } from "@/contexts/LocaleContext";
import { toPartnerLocale, type PartnerLocale } from "../../partnerCopy";

interface CardDetectiveCopy {
  title: string;
  rules: string[];
  start: string;
  back: string;
  quit: string;
  quitBody: string;
  send: string;
  tryAgain: string;
  somethingWrong: string;
  noPlaysLeft: string;
  pointsTotal: (n: number) => string;
  cardPoints: (n: number) => string;
  correctNow: (n: number) => string;
  solvedFor: (n: number) => string;
  wrongGuess: (name: string, cost: number) => string;
}

// Rules text mirrors contract v1.2 §7.3.
const COPY: Record<PartnerLocale, CardDetectiveCopy> = {
  en: {
    title: "FIFA Card Detective",
    rules: [
      "10 cards. Each card starts with 100 points.",
      "The position and two stats are free. Buy more clues with the card's points: rating 25, club 20, league 15, nation 10, each stat 5.",
      "A wrong name costs 15. Name the player to keep the points left on the card.",
      "A skipped card scores 0. Up to 1,000 points.",
    ],
    start: "Start",
    back: "Back to games",
    quit: "Leave the game",
    quitBody: "The game ends now with the points you have earned so far.",
    send: "Send",
    tryAgain: "Try again",
    somethingWrong: "Something went wrong — try again",
    noPlaysLeft: "No plays left today",
    pointsTotal: (n) => `${n} pts`,
    cardPoints: (n) => `Card: ${n} pts`,
    correctNow: (n) => `Correct now = ${n} pts`,
    solvedFor: (n) => `Solved · +${n}`,
    wrongGuess: (name, cost) => `Not ${name} · −${cost} pts`,
  },
  ka: {
    title: "FIFA ბარათის დეტექტივი",
    rules: [
      "10 ბარათი. თითოეული ბარათი იწყება 100 ქულით.",
      "პოზიცია და ორი მაჩვენებელი უფასოა. სხვა მინიშნებები ბარათის ქულებით იყიდება: რეიტინგი 25, კლუბი 20, ლიგა 15, ქვეყანა 10, თითო მაჩვენებელი 5.",
      "არასწორი სახელი 15 ქულა ჯდება. გამოიცანი მოთამაშე და ბარათზე დარჩენილი ქულები შენია.",
      "გამოტოვებული ბარათი 0 ქულაა. მაქსიმუმ 1,000 ქულა.",
    ],
    start: "დაწყება",
    back: "თამაშებზე დაბრუნება",
    quit: "თამაშის დატოვება",
    quitBody: "თამაში ახლა დასრულდება იმ ქულებით, რაც უკვე დააგროვე.",
    send: "გაგზავნა",
    tryAgain: "თავიდან ცდა",
    somethingWrong: "რაღაც შეცდომა მოხდა — სცადე თავიდან",
    noPlaysLeft: "დღეს თამაშები აღარ დაგრჩა",
    pointsTotal: (n) => `${n} ქულა`,
    cardPoints: (n) => `ბარათი: ${n} ქულა`,
    correctNow: (n) => `ახლა სწორი = ${n} ქულა`,
    solvedFor: (n) => `გამოცნობილია · +${n}`,
    wrongGuess: (name, cost) => `არა ${name} · −${cost} ქულა`,
  },
};

export function useCardDetectiveCopy(): CardDetectiveCopy {
  const { locale } = useLocale();
  return COPY[toPartnerLocale(locale)];
}

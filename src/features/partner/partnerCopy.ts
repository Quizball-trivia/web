import type { Locale } from "@/lib/i18n/messages";
import type { PartnerGameId } from "./api/partnerApi.types";

/**
 * Languages the partner view offers. Adding Russian = add "ru" here (once the app Locale has it) and a `ru`
 * block to PARTNER_COPY below; the switcher, the redeem language mapping and the copy lookup all follow.
 */
export const PARTNER_LOCALES = ["ka", "en"] as const satisfies readonly Locale[];
export type PartnerLocale = (typeof PARTNER_LOCALES)[number];

export const PARTNER_LOCALE_LABELS: Record<PartnerLocale, string> = { ka: "ქარ", en: "ENG" };

export function toPartnerLocale(value: string | null | undefined): PartnerLocale {
  return (PARTNER_LOCALES as readonly string[]).includes(value ?? "") ? (value as PartnerLocale) : "en";
}

interface PartnerCopy {
  backToFreecroco: string;
  language: string;
  rankedTitle: string;
  rankedSubtitle: string;
  playsLeftToday: string;
  resetsIn: (time: string) => string;
  play: string;
  playsLeft: (count: number) => string;
  upToPoints: (points: string) => string;
  doneForToday: string;
  continuePlay: string;
  comeBackTomorrow: string;
  comingSoon: string;
  moreGames: string;
  signingIn: string;
  relaunchTitle: string;
  relaunchBody: string;
  replacedBody: string;
  linkUsedBody: string;
  launchErrorBody: string;
  blockedTitle: string;
  blockedBody: string;
  errorTitle: string;
  errorBody: string;
  tryAgain: string;
  backToGames: string;
  gameSoonBody: string;
  pointsLabel: string;
  gameTitles: Partial<Record<PartnerGameId, string>>;
}

export const PARTNER_COPY: Record<PartnerLocale, PartnerCopy> = {
  en: {
    backToFreecroco: "Back to Freecroco",
    pointsLabel: "points earned",
    language: "Language",
    rankedTitle: "Ranked match",
    rankedSubtitle: "1v1 live football quiz",
    playsLeftToday: "Plays left today",
    resetsIn: (time) => `Resets in ${time}`,
    play: "Play",
    playsLeft: (count) => (count === 1 ? "1 play left" : `${count} plays left`),
    upToPoints: (points) => `Up to ${points} pts`,
    doneForToday: "Done for today",
    continuePlay: "Continue",
    comeBackTomorrow: "Come back tomorrow",
    comingSoon: "Coming soon",
    moreGames: "More games",
    signingIn: "Signing you in…",
    relaunchTitle: "Open again from Freecroco",
    relaunchBody: "Your session has ended. Go back to Freecroco and open Quizball again.",
    replacedBody: "Quizball was opened in another tab or on another device. To play here, open it again from Freecroco.",
    linkUsedBody: "Go back to Freecroco and open Quizball again to get a fresh link.",
    launchErrorBody: "We couldn't sign you in. Go back to Freecroco and open Quizball again.",
    blockedTitle: "Account unavailable",
    blockedBody: "This account can't play right now. Contact Freecroco support.",
    errorTitle: "Something went wrong",
    errorBody: "We couldn't load your games. Check your connection and try again.",
    tryAgain: "Try again",
    backToGames: "Back to games",
    gameSoonBody: "This game opens here soon.",
    // Freecroco's own names for the games (their brief), not Quizball's internal ones.
    gameTitles: {
      ranked: "Ranked match",
      countdown: "Countdown",
      "true-false": "True or False",
      "pick-em": "Pick Em",
      "career-path": "Career Path",
      "higher-lower": "Higher or Lower",
      "card-detective": "FIFA Card Detective",
      "guess-the-goal": "Guess the Goal",
      "road-to-goal": "Road to Goal",
      "trivia-mines": "Trivia Mines",
      "quiz-board": "Quiz Board",
    },
  },
  ka: {
    backToFreecroco: "Freecroco-ზე დაბრუნება",
    pointsLabel: "მოპოვებული ქულა",
    language: "ენა",
    rankedTitle: "რეიტინგული მატჩი",
    rankedSubtitle: "1v1 ონლაინ საფეხბურთო ქვიზი",
    playsLeftToday: "დღეს დარჩენილი თამაშები",
    resetsIn: (time) => `განახლდება ${time}-ში`,
    play: "თამაში",
    playsLeft: (count) => `დარჩა ${count} თამაში`,
    upToPoints: (points) => `მაქს. ${points} ქულა`,
    doneForToday: "დღეისთვის დასრულდა",
    continuePlay: "გაგრძელება",
    comeBackTomorrow: "დაბრუნდი ხვალ",
    comingSoon: "მალე",
    moreGames: "სხვა თამაშები",
    signingIn: "შესვლა…",
    relaunchTitle: "გახსენი თავიდან Freecroco-დან",
    relaunchBody: "სესია დასრულდა. დაბრუნდი Freecroco-ზე და გახსენი Quizball ხელახლა.",
    replacedBody: "Quizball სხვა ჩანართში ან მოწყობილობაზე გაიხსნა. აქ სათამაშოდ ხელახლა გახსენი Freecroco-დან.",
    linkUsedBody: "დაბრუნდი Freecroco-ზე და გახსენი Quizball ხელახლა ახალი ბმულისთვის.",
    launchErrorBody: "შესვლა ვერ მოხერხდა. დაბრუნდი Freecroco-ზე და გახსენი Quizball ხელახლა.",
    blockedTitle: "ანგარიში მიუწვდომელია",
    blockedBody: "ამ ანგარიშით ახლა თამაში შეუძლებელია. დაუკავშირდი Freecroco-ს მხარდაჭერას.",
    errorTitle: "რაღაც შეცდომა მოხდა",
    errorBody: "თამაშები ვერ ჩაიტვირთა. შეამოწმე კავშირი და სცადე ხელახლა.",
    tryAgain: "ხელახლა ცდა",
    backToGames: "თამაშებზე დაბრუნება",
    gameSoonBody: "ეს თამაში აქ მალე გაიხსნება.",
    gameTitles: {
      ranked: "რეიტინგული მატჩი",
      countdown: "უკუთვლა",
      "true-false": "მართალია თუ მცდარი",
      "pick-em": "Pick Em",
      "career-path": "კარიერის გზა",
      "higher-lower": "მეტი თუ ნაკლები",
      "card-detective": "FIFA ბარათის დეტექტივი",
      "guess-the-goal": "გამოიცანი გოლი",
      "road-to-goal": "გზა გოლისკენ",
      "trivia-mines": "Trivia Mines",
      "quiz-board": "ქვიზის დაფა",
    },
  },
};

export function partnerCopy(locale: string | null | undefined): PartnerCopy {
  return PARTNER_COPY[toPartnerLocale(locale)];
}

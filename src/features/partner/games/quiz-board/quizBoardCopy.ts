import type { PartnerLocale } from "../../partnerCopy";

interface QuizBoardCopy {
  subtitle: string;
  rules: string;
  start: string;
  starting: string;
  pointsLabel: string;
  pickTile: string;
  timeLeft: (seconds: number) => string;
  timesUp: string;
  completedTitle: string;
  endedTitle: string;
  finalScore: (points: string) => string;
  seePoints: string;
  cancelledTitle: string;
  cancelledBody: string;
  noPlaysTitle: string;
  noPlaysBody: string;
  error: string;
  retry: string;
  back: string;
}

const COPY: Record<PartnerLocale, QuizBoardCopy> = {
  en: {
    subtitle: "Pick tiles and answer — a right answer earns the tile's points",
    rules: "9 tiles · 20 seconds per question · 100, 200 or 300 points per right answer",
    start: "Start",
    starting: "Setting up your board…",
    pointsLabel: "Points",
    pickTile: "Pick a tile",
    timeLeft: (s) => `${s}s`,
    timesUp: "Time's up",
    completedTitle: "Board complete",
    endedTitle: "Game over",
    finalScore: (p) => `You earned ${p} of 1,800 points.`,
    seePoints: "See my points",
    cancelledTitle: "This game was cancelled",
    cancelledBody: "No points were sent for it.",
    noPlaysTitle: "No plays left today",
    noPlaysBody: "Come back tomorrow for a new board.",
    error: "Something went wrong — try again",
    retry: "Try again",
    back: "Back",
  },
  ka: {
    subtitle: "აირჩიე უჯრები და უპასუხე — სწორი პასუხი უჯრის ქულას მოგიტანს",
    rules: "9 უჯრა · თითო კითხვაზე 20 წამი · სწორ პასუხზე 100, 200 ან 300 ქულა",
    start: "დაწყება",
    starting: "დაფას ვამზადებთ…",
    pointsLabel: "ქულა",
    pickTile: "აირჩიე უჯრა",
    timeLeft: (s) => `${s}წმ`,
    timesUp: "დრო ამოიწურა",
    completedTitle: "დაფა დასრულდა",
    endedTitle: "თამაში დასრულდა",
    finalScore: (p) => `შენ მოიგე ${p} ქულა 1 800-დან.`,
    seePoints: "ჩემი ქულები",
    cancelledTitle: "ეს თამაში გაუქმდა",
    cancelledBody: "ამ თამაშისთვის ქულები არ გაიგზავნა.",
    noPlaysTitle: "დღეს თამაშები აღარ დაგრჩა",
    noPlaysBody: "ახალი დაფისთვის ხვალ დაბრუნდი.",
    error: "რაღაც შეცდომაა — სცადე თავიდან",
    retry: "თავიდან ცდა",
    back: "უკან",
  },
};

export function quizBoardCopy(locale: PartnerLocale): QuizBoardCopy {
  return COPY[locale];
}

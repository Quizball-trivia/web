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
  finalScore: (points: string, max: string) => string;
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
    rules: "9 tiles · 20 seconds per question · 50, 100 or 150 points per right answer",
    start: "Start",
    starting: "Setting up your board…",
    pointsLabel: "Points",
    pickTile: "Pick a tile",
    timeLeft: (s) => `${s}s`,
    timesUp: "Time's up",
    completedTitle: "Board complete",
    endedTitle: "Game over",
    finalScore: (p, max) => `You earned ${p} of ${max} points.`,
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
    rules: "9 უჯრა · თითო კითხვაზე 20 წამი · სწორ პასუხზე 50, 100 ან 150 ქულა",
    start: "დაწყება",
    starting: "დაფას ვამზადებთ…",
    pointsLabel: "ქულა",
    pickTile: "აირჩიე უჯრა",
    timeLeft: (s) => `${s}წმ`,
    timesUp: "დრო ამოიწურა",
    completedTitle: "დაფა დასრულდა",
    endedTitle: "თამაში დასრულდა",
    finalScore: (p, max) => `შენ მოიგე ${p} ქულა ${max}-დან.`,
    seePoints: "ჩემი ქულები",
    cancelledTitle: "ეს თამაში გაუქმდა",
    cancelledBody: "ამ თამაშისთვის ქულები არ გაიგზავნა.",
    noPlaysTitle: "დღეს თამაშები აღარ დაგრჩა",
    noPlaysBody: "ახალი დაფისთვის ხვალ დაბრუნდი.",
    error: "რაღაც შეცდომაა — სცადე თავიდან",
    retry: "თავიდან ცდა",
    back: "უკან",
  },
  ru: {
    subtitle: "Выбирай клетки и отвечай — за правильный ответ получишь очки клетки",
    rules: "9 клеток · 20 секунд на вопрос · 50, 100 или 150 очков за правильный ответ",
    start: "Начать",
    starting: "Готовим доску…",
    pointsLabel: "Очки",
    pickTile: "Выбери клетку",
    timeLeft: (s) => `${s} с`,
    timesUp: "Время вышло",
    completedTitle: "Доска пройдена",
    endedTitle: "Игра окончена",
    finalScore: (p, max) => `Ты набрал ${p} из ${max} очков.`,
    seePoints: "Мои очки",
    cancelledTitle: "Эта игра отменена",
    cancelledBody: "Очки за неё не начислены.",
    noPlaysTitle: "На сегодня игры закончились",
    noPlaysBody: "Возвращайся завтра за новой доской.",
    error: "Что-то пошло не так — попробуй ещё раз",
    retry: "Попробовать ещё раз",
    back: "Назад",
  },
};

export function quizBoardCopy(locale: PartnerLocale): QuizBoardCopy {
  return COPY[locale];
}

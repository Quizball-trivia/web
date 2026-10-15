import type { PartnerGameId } from "../../api/partnerApi.types";
import type { PartnerLocale } from "../../partnerCopy";

export type PartnerDailyGameId = Extract<PartnerGameId, "countdown" | "true-false" | "pick-em" | "career-path" | "higher-lower">;

interface DailyCopy {
  start: string;
  starting: string;
  back: string;
  usesPlay: string;
  rules: Record<PartnerDailyGameId, string>;
  loadError: string;
  tryAgain: string;
  noPlaysLeft: string;
  notAvailable: string;
  quitTitle: string;
  quitBody: string;
}

const COPY: Record<PartnerLocale, DailyCopy> = {
  en: {
    start: "Start",
    starting: "Starting…",
    back: "Back",
    usesPlay: "Starting uses one of today's plays.",
    rules: {
      "true-false": "4 questions · 15 seconds each · 50 points per correct answer",
      "pick-em": "2 questions · 30 seconds each · 250 points when you pick exactly the right ones",
      "career-path": "3 players · 30 seconds each · 100 points per player guessed",
      "higher-lower": "2 rounds · 30 seconds each · 200 points per round cleared without a mistake",
      countdown: "2 rounds · 30 seconds each · 50 points per answer found (up to 50 answers)",
    },
    loadError: "We couldn't reach the game. Check your connection and try again.",
    tryAgain: "Try again",
    noPlaysLeft: "No plays left today. Come back tomorrow.",
    notAvailable: "This game isn't available right now.",
    quitTitle: "Leave this game?",
    quitBody: "You keep the points earned so far, and today's play counts as used.",
  },
  ka: {
    start: "დაწყება",
    starting: "იწყება…",
    back: "უკან",
    usesPlay: "დაწყებისას დღევანდელი ერთი თამაში გამოიყენება.",
    rules: {
      "true-false": "4 კითხვა · თითო 15 წამი · 50 ქულა ყოველ სწორ პასუხზე",
      "pick-em": "2 კითხვა · თითო 30 წამი · 250 ქულა, თუ ზუსტად სწორ პასუხებს აირჩევ",
      "career-path": "3 მოთამაშე · თითო 30 წამი · 100 ქულა ყოველ გამოცნობილ მოთამაშეზე",
      "higher-lower": "2 რაუნდი · თითო 30 წამი · 200 ქულა უშეცდომოდ გავლილ რაუნდზე",
      countdown: "2 რაუნდი · თითო 30 წამი · 50 ქულა ყოველ ნაპოვნ პასუხზე (მაქს. 50 პასუხი)",
    },
    loadError: "თამაშთან კავშირი ვერ დამყარდა. შეამოწმე კავშირი და სცადე ხელახლა.",
    tryAgain: "ხელახლა ცდა",
    noPlaysLeft: "დღეს თამაშები აღარ დაგრჩა. დაბრუნდი ხვალ.",
    notAvailable: "ეს თამაში ახლა მიუწვდომელია.",
    quitTitle: "დატოვებ თამაშს?",
    quitBody: "აქამდე მოპოვებული ქულები შენ რჩება, დღევანდელი თამაში კი გამოყენებულად ჩაითვლება.",
  },
  ru: {
    start: "Начать",
    starting: "Запускаем…",
    back: "Назад",
    usesPlay: "Старт тратит одну из сегодняшних игр.",
    rules: {
      "true-false": "4 вопроса · по 15 секунд · 50 очков за правильный ответ",
      "pick-em": "2 вопроса · по 30 секунд · 250 очков, если выберешь ровно все правильные ответы",
      "career-path": "3 игрока · по 30 секунд · 100 очков за каждого угаданного",
      "higher-lower": "2 раунда · по 30 секунд · 200 очков за раунд без ошибок",
      countdown: "2 раунда · по 30 секунд · 50 очков за каждый найденный ответ (до 50 ответов)",
    },
    loadError: "Не удалось подключиться к игре. Проверь подключение и попробуй ещё раз.",
    tryAgain: "Попробовать ещё раз",
    noPlaysLeft: "На сегодня игры закончились. Возвращайся завтра.",
    notAvailable: "Эта игра сейчас недоступна.",
    quitTitle: "Выйти из игры?",
    quitBody: "Набранные очки сохранятся, а сегодняшняя игра будет засчитана.",
  },
};

export function dailyCopy(locale: PartnerLocale): DailyCopy {
  return COPY[locale];
}

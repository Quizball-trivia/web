import { useLocale } from "@/contexts/LocaleContext";
import { toPartnerLocale, type PartnerLocale } from "../../partnerCopy";

interface FakeFactCopy {
  title: string;
  rules: string[];
  start: string;
  back: string;
  tryAgain: string;
  somethingWrong: string;
  noPlaysLeft: string;
  mainCard: string;
  bonusCard: string;
  openBonus: string;
  bonusWaits: (seconds: number) => string;
  seeResult: string;
  right: (points: number) => string;
  pointsTotal: (n: number) => string;
}

// Rules text mirrors the Freecroco game rules (Fake Fact, max 140).
const COPY: Record<PartnerLocale, FakeFactCopy> = {
  en: {
    title: "Football Odd One Out",
    rules: [
      "A footballer and five facts: four are true, one is fake.",
      "Find the fake within 30 seconds: 100 points. A wrong answer or no answer ends the game with 0.",
      "Right? A bonus card follows: find its fake within 30 seconds for +40. Up to 140 points.",
    ],
    start: "Start",
    back: "Back to games",
    tryAgain: "Try again",
    somethingWrong: "Something went wrong. Try again.",
    noPlaysLeft: "No plays left today.",
    mainCard: "Card 1 · 100 pts",
    bonusCard: "Bonus card · +40",
    openBonus: "Bonus card",
    bonusWaits: (s) => `The bonus card waits ${s} s`,
    seeResult: "See result",
    right: (points) => `Right! +${points}`,
    pointsTotal: (n) => `${n} pts`,
  },
  ka: {
    title: "ყალბი ფაქტი",
    rules: [
      "ფეხბურთელი და ხუთი ფაქტი: ოთხი მართალია, ერთი ყალბი.",
      "იპოვე ყალბი 30 წამში: 100 ქულა. არასწორი პასუხი ან უპასუხობა თამაშს 0 ქულით ასრულებს.",
      "სწორია? მოდის ბონუს ბარათი: იპოვე მისი ყალბი ფაქტი 30 წამში და მიიღე +40. მაქს. 140 ქულა.",
    ],
    start: "დაწყება",
    back: "თამაშებზე დაბრუნება",
    tryAgain: "თავიდან ცდა",
    somethingWrong: "რაღაც შეცდომა მოხდა. სცადე თავიდან.",
    noPlaysLeft: "დღეს თამაშები აღარ დაგრჩა.",
    mainCard: "ბარათი 1 · 100 ქულა",
    bonusCard: "ბონუს ბარათი · +40",
    openBonus: "ბონუს ბარათი",
    bonusWaits: (s) => `ბონუს ბარათი გელოდება ${s} წამი`,
    seeResult: "შედეგის ნახვა",
    right: (points) => `სწორია! +${points}`,
    pointsTotal: (n) => `${n} ქულა`,
  },
  ru: {
    title: "Ложный факт",
    rules: [
      "Футболист и пять фактов: четыре правдивы, один ложный.",
      "Найди ложный за 30 секунд: 100 очков. Неверный ответ или нет ответа — игра заканчивается с 0.",
      "Верно? Дальше бонусная карточка: найди её ложный факт за 30 секунд и получи +40. До 140 очков.",
    ],
    start: "Начать",
    back: "К играм",
    tryAgain: "Попробовать снова",
    somethingWrong: "Что-то пошло не так. Попробуй снова.",
    noPlaysLeft: "На сегодня игр больше нет.",
    mainCard: "Карточка 1 · 100 очков",
    bonusCard: "Бонусная карточка · +40",
    openBonus: "Бонусная карточка",
    bonusWaits: (s) => `Бонусная карточка ждёт ${s} с`,
    seeResult: "Смотреть результат",
    right: (points) => `Верно! +${points}`,
    pointsTotal: (n) => `${n} очк.`,
  },
};

export function useFakeFactCopy(): FakeFactCopy {
  const { locale } = useLocale();
  return COPY[toPartnerLocale(locale)];
}

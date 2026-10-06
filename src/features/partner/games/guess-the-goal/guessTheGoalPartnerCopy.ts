import type { PartnerLocale } from "../../partnerCopy";
import type { GgtPartnerMode } from "@/features/mini-games/components/GuessTheGoalLive";

// Rules text mirrors contract v1.2 §7.4.
export const GUESS_THE_GOAL_PARTNER_COPY: Record<PartnerLocale, GgtPartnerMode["copy"]> = {
  en: {
    subtitle: "One goal · up to 140 points",
    intro:
      "A legendary goal replays on the coaching board. Name it: 100 points, or 40 if you have seen this goal before. A wrong answer ends the play. Then a bonus question: +40 if you answer right within 30 seconds.",
    seeResult: "See my points",
    timeLeft: (seconds) => `${seconds}s left`,
    timeUp: "Time's up",
    noPlaysLeft: "No plays left today",
  },
  ka: {
    subtitle: "ერთი გოლი · მაქსიმუმ 140 ქულა",
    intro:
      "ლეგენდარული გოლი ტაქტიკურ დაფაზე თამაშდება. გამოიცანი: 100 ქულა, ან 40, თუ ეს გოლი უკვე გინახავს. არასწორი პასუხი თამაშს ასრულებს. შემდეგ ბონუს კითხვა: +40, თუ 30 წამში სწორად უპასუხებ.",
    seeResult: "ჩემი ქულები",
    timeLeft: (seconds) => `დარჩა ${seconds} წმ`,
    timeUp: "დრო ამოიწურა",
    noPlaysLeft: "დღეს თამაშები აღარ დაგრჩა",
  },
};

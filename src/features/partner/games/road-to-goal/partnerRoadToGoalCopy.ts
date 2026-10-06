import type { RoadToGoalPartnerMode } from "@/features/mini-games/components/RoadToGoal";
import type { PartnerLocale } from "../../partnerCopy";

type Copy = Pick<RoadToGoalPartnerMode, "copy" | "startLabel" | "finishLabel">;

/** Freecroco wording: points, no stake, no luck roll (contract §7.5). */
export const PARTNER_ROAD_TO_GOAL_COPY: Record<PartnerLocale, Copy> = {
  en: {
    startLabel: "Start: 100 points",
    finishLabel: "See my points",
    copy: {
      subtitle: "Beat 10 defenders and the keeper. One football question per zone.",
      introBody: "A right answer clears the zone. After each zone, bank your points or attack the next defender. A wrong answer or running out of time ends the run with 0.",
      kickOff: "Kick off",
      nextReturn: "Next value",
      currentReturn: "Current value",
      cashOut: "Bank {amount} points",
      savedBody: "The keeper saved your final shot. This run scores 0.",
      tackledBody: "The defender stopped you in zone {zone}. This run scores 0.",
      won: "You banked {amount} points",
    },
  },
  ka: {
    startLabel: "საწყისი: 100 ქულა",
    finishLabel: "ჩემი ქულები",
    copy: {
      subtitle: "აჯობე 10 მცველს და მეკარეს — თითო ზონაში ერთი საფეხბურთო კითხვა.",
      introBody: "სწორი პასუხი ზონას გაგატარებს. ყოველი ზონის შემდეგ აიღე ქულები ან შეუტიე შემდეგ მცველს. არასწორი პასუხი ან ამოწურული დრო გარბენს 0 ქულით ასრულებს.",
      kickOff: "დაწყება",
      nextReturn: "შემდეგი ღირებულება",
      currentReturn: "მიმდინარე ღირებულება",
      cashOut: "აიღე {amount} ქულა",
      savedBody: "მეკარემ ბოლო დარტყმა მოიგერია. ამ გარბენის შედეგია 0.",
      tackledBody: "მცველმა გაგაჩერა ზონაში {zone}. ამ გარბენის შედეგია 0.",
      won: "აიღე {amount} ქულა",
    },
  },
};

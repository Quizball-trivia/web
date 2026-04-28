import type {
  DailyChallengeIconToken,
  DailyChallengeSummary,
  DailyChallengeType,
} from "@/lib/domain/dailyChallenge";

export type DailyChallengeId = DailyChallengeType;
export type IconToken = DailyChallengeIconToken;

export interface ChallengeVisualConfig {
  icon: string;
  iconToken: IconToken;
  iconColorClass: string;
  iconBgColor: string;
}

export type ChallengeCard = DailyChallengeSummary &
  ChallengeVisualConfig & {
    id: DailyChallengeId;
  };

export const DAILY_CHALLENGE_VISUALS: Record<DailyChallengeType, ChallengeVisualConfig> = {
  moneyDrop: {
    icon: "\u{1F4B0}",
    iconToken: "dollarSign",
    iconColorClass: "text-yellow-400",
    iconBgColor: "bg-yellow-500/20",
  },
  trueFalse: {
    icon: "\u{2705}",
    iconToken: "checkCircle",
    iconColorClass: "text-emerald-400",
    iconBgColor: "bg-emerald-500/20",
  },
  clues: {
    icon: "\u{1F4A1}",
    iconToken: "lightbulb",
    iconColorClass: "text-emerald-400",
    iconBgColor: "bg-emerald-500/20",
  },
  countdown: {
    icon: "\u{23F1}\u{FE0F}",
    iconToken: "timer",
    iconColorClass: "text-orange-400",
    iconBgColor: "bg-orange-500/20",
  },
  putInOrder: {
    icon: "\u{1F4CB}",
    iconToken: "list",
    iconColorClass: "text-indigo-400",
    iconBgColor: "bg-indigo-500/20",
  },
  imposter: {
    icon: "\u{1F465}",
    iconToken: "users",
    iconColorClass: "text-cyan-400",
    iconBgColor: "bg-cyan-500/20",
  },
  careerPath: {
    icon: "\u{1F6E3}\u{FE0F}",
    iconToken: "route",
    iconColorClass: "text-sky-400",
    iconBgColor: "bg-sky-500/20",
  },
  highLow: {
    icon: "\u{1F4C8}",
    iconToken: "trendingUp",
    iconColorClass: "text-amber-400",
    iconBgColor: "bg-amber-500/20",
  },
  footballLogic: {
    icon: "\u{1F5BC}\u{FE0F}",
    iconToken: "image",
    iconColorClass: "text-pink-400",
    iconBgColor: "bg-pink-500/20",
  },
};

export function toChallengeCard(challenge: DailyChallengeSummary): ChallengeCard {
  return {
    ...challenge,
    id: challenge.challengeType,
    ...DAILY_CHALLENGE_VISUALS[challenge.challengeType],
  };
}

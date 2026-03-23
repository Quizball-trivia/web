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
  footballJeopardy: {
    icon: "\u{1F9E0}",
    iconToken: "brain",
    iconColorClass: "text-blue-400",
    iconBgColor: "bg-blue-500/20",
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
};

export function toChallengeCard(challenge: DailyChallengeSummary): ChallengeCard {
  return {
    ...challenge,
    id: challenge.challengeType,
    ...DAILY_CHALLENGE_VISUALS[challenge.challengeType],
  };
}

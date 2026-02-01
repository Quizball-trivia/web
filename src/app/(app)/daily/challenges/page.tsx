"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle2,
  Trophy,
  Coins,
  Timer,
  Clock,
  Zap,
  Sparkles,
  DollarSign,
  Brain,
  Lightbulb,
  Target,
  ListOrdered,
  type LucideIcon,
} from "lucide-react";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import {
  ALL_CHALLENGES,
  type ChallengeConfig,
  type IconToken,
  type DailyChallengeId,
} from "@/features/home/challenges";
import { formatTimeRemaining } from "@/utils/gameHelpers";

// Map icon tokens to Lucide components
const ICON_MAP: Record<IconToken, LucideIcon> = {
  dollarSign: DollarSign,
  brain: Brain,
  sparkles: Sparkles,
  lightbulb: Lightbulb,
  target: Target,
  timer: Timer,
  list: ListOrdered,
};

interface DailyChallengeState {
  completedChallenges: Record<string, number>;
}

function getTimeUntilReset(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const msUntilReset = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(msUntilReset / (1000 * 60 * 60));
  const minutes = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
}

function ChallengeCard({
  challenge,
  isCompleted,
  completedTimestamp,
  onClick,
}: {
  challenge: ChallengeConfig;
  isCompleted: boolean;
  completedTimestamp?: number;
  onClick: () => void;
}) {
  const IconComponent = ICON_MAP[challenge.iconToken];

  return (
    <button
      onClick={() => !isCompleted && onClick()}
      disabled={isCompleted}
      className={`w-full text-left rounded-2xl border-2 transition-all relative overflow-hidden ${
        isCompleted
          ? "border-green-500/40 bg-green-500/5 cursor-not-allowed"
          : `border-border ${challenge.iconBgColor} hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg hover:shadow-xl hover:border-primary/50`
      }`}
    >
      <div className="p-5">
        {/* Top Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            {/* Icon */}
            <div
              className={`size-14 rounded-xl flex items-center justify-center text-3xl shrink-0 ${
                isCompleted
                  ? "bg-green-500/20 border-2 border-green-500/40"
                  : `${challenge.iconBgColor} border-2 border-white/20`
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="size-7 text-green-500" />
              ) : (
                <IconComponent className={`size-7 ${challenge.iconColorClass}`} />
              )}
            </div>

            {/* Title and Description */}
            <div className="flex-1 min-w-0">
              <h3
                className={`font-semibold text-base mb-1 ${
                  isCompleted ? "text-muted-foreground" : ""
                }`}
              >
                {challenge.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isCompleted
                  ? "Challenge completed! Come back tomorrow."
                  : challenge.description}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex items-center justify-between">
          {/* Reward or Status */}
          {!isCompleted ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Coins className="size-4 text-yellow-500" />
                <span className="font-bold">{challenge.coinReward}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-4 text-purple-500" />
                <span className="font-bold">{challenge.xpReward} XP</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-green-600">
              <CheckCircle2 className="size-5" />
              <span className="font-semibold text-sm">Completed</span>
            </div>
          )}

          {/* Timer or Action Button */}
          {isCompleted && completedTimestamp ? (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 text-green-600">
                <Timer className="size-4" />
                <span className="font-semibold text-sm">
                  {formatTimeRemaining(completedTimestamp)}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                until reset
              </span>
            </div>
          ) : !isCompleted ? (
            <div className="px-4 py-2 rounded-xl font-semibold text-sm bg-primary text-primary-foreground shadow-lg">
              Play Now
            </div>
          ) : null}
        </div>
      </div>

      {/* Completion Checkmark Badge */}
      {isCompleted && (
        <div className="absolute top-4 right-4">
          <div className="size-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
            <CheckCircle2 className="size-5 text-white" />
          </div>
        </div>
      )}
    </button>
  );
}

export default function DailyChallengesPage() {
  const router = useRouter();
  const [completedChallenges, setCompletedChallenges] = useState<
    Map<string, number>
  >(new Map());
  const [, setTick] = useState(0);

  // Force re-render every minute to update timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Load completed challenges from storage
    const state = storage.get<DailyChallengeState | null>(
      STORAGE_KEYS.DAILY_CHALLENGE_STATE,
      null
    );

    if (state?.completedChallenges) {
      // Check if challenges need to be reset (past midnight)
      const now = new Date();
      const todayMidnight = new Date(now);
      todayMidnight.setHours(0, 0, 0, 0);

      const validChallenges = new Map<string, number>();

      Object.entries(state.completedChallenges).forEach(([id, timestamp]) => {
        // Only keep challenges completed after today's midnight
        if (timestamp >= todayMidnight.getTime()) {
          validChallenges.set(id, timestamp);
        }
      });

      setCompletedChallenges(validChallenges);

      // Update storage if some challenges were reset
      if (
        validChallenges.size !== Object.keys(state.completedChallenges).length
      ) {
        storage.set(STORAGE_KEYS.DAILY_CHALLENGE_STATE, {
          completedChallenges: Object.fromEntries(validChallenges),
        });
      }
    }
  }, []);

  const handleSelectChallenge = (challengeId: DailyChallengeId) => {
    // TODO: Navigate to actual challenge game screen
    // For now, mark as completed immediately
    const newCompleted = new Map(completedChallenges);
    newCompleted.set(challengeId, Date.now());
    setCompletedChallenges(newCompleted);

    // Persist to storage
    storage.set(STORAGE_KEYS.DAILY_CHALLENGE_STATE, {
      completedChallenges: Object.fromEntries(newCompleted),
    });
  };

  const completedCount = ALL_CHALLENGES.filter((c) =>
    completedChallenges.has(c.id)
  ).length;
  const totalCoins = ALL_CHALLENGES.reduce((sum, c) => sum + c.coinReward, 0);
  const earnedCoins = ALL_CHALLENGES.filter((c) =>
    completedChallenges.has(c.id)
  ).reduce((sum, c) => sum + c.coinReward, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/")}
                className="flex items-center justify-center size-9 rounded-xl hover:bg-secondary active:scale-95 transition-all"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="text-2xl">⚡</div>
                <h1 className="text-xl font-bold">Daily Challenges</h1>
              </div>
            </div>

            {/* Reset Timer */}
            <Badge
              variant="outline"
              className="gap-1.5 bg-primary/10 border-primary/30 text-primary"
            >
              <Clock className="size-3.5" />
              {getTimeUntilReset()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Progress Overview */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Today&apos;s Progress
                </div>
                <div className="text-3xl font-bold">
                  {completedCount}
                  <span className="text-muted-foreground text-xl">
                    /{ALL_CHALLENGES.length}
                  </span>
                </div>
              </div>
              <div className="size-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
                <Trophy className="size-7 text-primary" />
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="h-3 bg-secondary/80 rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-gradient-to-r from-primary via-green-500 to-primary transition-all duration-700 ease-out relative"
                  style={{
                    width: `${(completedCount / ALL_CHALLENGES.length) * 100}%`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Coins className="size-4 text-yellow-500" />
                <span className="text-sm font-medium">
                  {earnedCoins} / {totalCoins} coins
                </span>
              </div>
              {completedCount === ALL_CHALLENGES.length && (
                <Badge className="bg-primary/20 text-primary border-primary/40 gap-1">
                  <Sparkles className="size-3" />
                  All Complete!
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Challenges Grid */}
        <div className="space-y-3">
          {ALL_CHALLENGES.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              isCompleted={completedChallenges.has(challenge.id)}
              completedTimestamp={completedChallenges.get(challenge.id)}
              onClick={() => handleSelectChallenge(challenge.id)}
            />
          ))}
        </div>

        {/* Info Banner */}
        <Card className="rounded-xl bg-primary/5 border border-primary/20 p-4">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Zap className="size-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">Daily Reset System</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All challenges reset every 24 hours at midnight. Complete
                challenges to earn coins and boost your progress!
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

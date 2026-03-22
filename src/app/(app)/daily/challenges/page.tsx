"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, ListOrdered, Brain, Lightbulb, DollarSign, Timer, Trophy, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useDailyChallenges, useResetDailyChallengeDev } from "@/lib/queries/dailyChallenges.queries";
import { queryKeys } from "@/lib/queries/queryKeys";
import { toChallengeCard, type IconToken } from "@/features/home/challenges";
import type { DailyChallengeSummary } from "@/lib/domain/dailyChallenge";
import { useAuthStore } from "@/stores/auth.store";
import { useQueryClient } from "@tanstack/react-query";

const ICON_MAP = {
  dollarSign: DollarSign,
  brain: Brain,
  lightbulb: Lightbulb,
  timer: Timer,
  list: ListOrdered,
} satisfies Record<IconToken, React.ComponentType<{ className?: string }>>;

const CHALLENGE_ACCENT = {
  moneyDrop: { border: "border-b-[#FFD700]", btnBg: "bg-[#D4A800]", btnBorder: "border-[#A68500]", iconBorder: "border-[#FFD700]/40" },
  footballJeopardy: { border: "border-b-[#1CB0F6]", btnBg: "bg-[#1A7FA8]", btnBorder: "border-[#14627F]", iconBorder: "border-[#1CB0F6]/40" },
  clues: { border: "border-b-[#58CC02]", btnBg: "bg-[#46A302]", btnBorder: "border-[#378200]", iconBorder: "border-[#58CC02]/40" },
  countdown: { border: "border-b-[#FF9600]", btnBg: "bg-[#C47400]", btnBorder: "border-[#9A5B00]", iconBorder: "border-[#FF9600]/40" },
  putInOrder: { border: "border-b-[#1CB0F6]", btnBg: "bg-[#1A7FA8]", btnBorder: "border-[#14627F]", iconBorder: "border-[#1CB0F6]/40" },
} as const;

function getTimeUntilUtcReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const remainingMs = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function ChallengeCard({
  challenge,
  index,
  onClick,
  showDevReset,
}: {
  challenge: DailyChallengeSummary;
  index: number;
  onClick: () => void;
  showDevReset: boolean;
}) {
  const card = toChallengeCard(challenge);
  const accent = CHALLENGE_ACCENT[card.id];
  const Icon = ICON_MAP[card.iconToken];
  const queryClient = useQueryClient();
  const resetMutation = useResetDailyChallengeDev(challenge.challengeType);

  const handleReset = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await resetMutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: queryKeys.dailyChallenges.all });
      toast.success(`${challenge.title} reset for today`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reset daily challenge";
      toast.error(message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 + index * 0.05, ease: "easeOut" }}
      className="h-full"
    >
      <div
        role="button"
        aria-disabled={!challenge.availableToday}
        tabIndex={challenge.availableToday ? 0 : -1}
        onClick={() => {
          if (!challenge.availableToday) return;
          onClick();
        }}
        onKeyDown={(event) => {
          if (!challenge.availableToday) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        }}
        className={`w-full h-full text-left rounded-2xl border-b-4 transition-all overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58CC02] ${
          challenge.availableToday
            ? `bg-[#1B2F36] ${accent.border} hover:bg-[#243B44] active:border-b-2 active:translate-y-[2px]`
            : "bg-[#1B2F36]/80 border-b-[#58CC02]/40 opacity-80 cursor-default"
        }`}
      >
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-4">
            <div
              className={`size-14 rounded-2xl flex items-center justify-center shrink-0 border-2 ${
                challenge.availableToday
                  ? `${card.iconBgColor} ${accent.iconBorder}`
                  : "bg-[#58CC02]/20 border-[#58CC02]/40"
              }`}
            >
              {challenge.availableToday ? (
                <Icon className={`size-8 ${card.iconColorClass}`} />
              ) : (
                <CheckCircle2 className="size-8 text-[#58CC02]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className={`text-base md:text-lg font-black uppercase ${challenge.availableToday ? "text-white" : "text-[#58CC02]"}`}>
                {challenge.title}
              </h3>
              <p className="text-xs md:text-sm text-[#56707A] font-semibold mt-1">
                {challenge.availableToday ? challenge.description : "Completed today. Come back after the UTC reset."}
              </p>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] md:text-xs font-black px-2.5 py-0.5 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/30 text-[#FFD700]">
                  {challenge.coinReward} coins
                </span>
                <span className="text-[11px] md:text-xs font-black px-2.5 py-0.5 rounded-full bg-[#CE82FF]/15 border border-[#CE82FF]/30 text-[#CE82FF]">
                  {challenge.xpReward} XP
                </span>
              </div>
            </div>

            <div
              className={`px-5 py-2.5 rounded-xl border-b-[3px] shrink-0 ${
                challenge.availableToday
                  ? `${accent.btnBg} ${accent.btnBorder}`
                  : "bg-[#58CC02]/20 border-[#58CC02]/30"
              }`}
            >
              <span className={`text-sm font-black uppercase tracking-wide ${challenge.availableToday ? "text-white" : "text-[#58CC02]"}`}>
                {challenge.availableToday ? "Play" : "Done"}
              </span>
            </div>
          </div>

          {showDevReset ? (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                disabled={resetMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-[#1CB0F6]/25 bg-[#1CB0F6]/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#7FD8FF] transition-colors hover:bg-[#1CB0F6]/15 disabled:opacity-50"
              >
                <RotateCcw className="size-3.5" />
                {resetMutation.isPending ? "Resetting" : "Dev Reset"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export default function DailyChallengesPage() {
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const { data: challenges = [], isLoading } = useDailyChallenges();
  const [timeUntilReset, setTimeUntilReset] = useState(() => getTimeUntilUtcReset());
  const canUseDevReset = authUser?.role === "admin";

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimeUntilReset(getTimeUntilUtcReset());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const completedCount = useMemo(
    () => challenges.filter((challenge) => challenge.completedToday).length,
    [challenges]
  );
  const totalCoins = useMemo(
    () => challenges.reduce((sum, challenge) => sum + challenge.coinReward, 0),
    [challenges]
  );
  const earnedCoins = useMemo(
    () => challenges.filter((challenge) => challenge.completedToday).reduce((sum, challenge) => sum + challenge.coinReward, 0),
    [challenges]
  );
  const progressPct = challenges.length > 0 ? (completedCount / challenges.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#131F24] font-fun">
      <div className="sticky top-0 z-20 bg-[#131F24]/95 backdrop-blur-sm border-b-2 border-[#1B2F36]">
        <div className="max-w-2xl lg:max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                aria-label="Back to home"
                onClick={() => router.push("/")}
                className="flex items-center justify-center size-9 md:size-10 rounded-xl bg-[#1B2F36] border-b-[3px] border-[#0D1B21] hover:bg-[#243B44] active:border-b-[1px] active:translate-y-[2px] transition-all"
              >
                <ArrowLeft className="size-4 md:size-5 text-white" />
              </button>
              <div className="flex items-center gap-2">
                <Trophy className="size-5 md:size-6 text-[#FFD700]" />
                <h1 className="text-base md:text-xl font-black text-white uppercase tracking-wide">
                  Daily Challenges
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-[#56707A]">
              <Clock className="size-4 text-[#1CB0F6]" />
              <span>UTC reset in {timeUntilReset}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl lg:max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-6 space-y-4 md:space-y-6">
        <div className="bg-[#1B2F36] rounded-2xl border-b-4 border-[#0D1B21] p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#56707A]">Today&apos;s Progress</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-black text-white">{completedCount}</span>
                <span className="text-base md:text-xl font-black text-[#56707A]">/{challenges.length}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#56707A] font-bold uppercase">Coins earned</p>
              <p className="text-2xl font-black text-[#FFD700]">{earnedCoins}</p>
              <p className="text-xs text-[#56707A] font-bold">of {totalCoins}</p>
            </div>
          </div>
          <div className="h-3 bg-[#131F24] rounded-full overflow-hidden">
            <div className="h-full bg-[#58CC02] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {isLoading ? (
          <div className="bg-[#1B2F36] rounded-2xl border-b-4 border-[#0D1B21] p-6 text-center text-[#56707A] font-bold">
            Loading today&apos;s challenge lineup...
          </div>
        ) : (
          <div className="space-y-3">
            {challenges.map((challenge, index) => (
              <ChallengeCard
                key={challenge.challengeType}
                challenge={challenge}
                index={index}
                onClick={() => router.push(`/daily/challenges/${challenge.challengeType}`)}
                showDevReset={canUseDevReset}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

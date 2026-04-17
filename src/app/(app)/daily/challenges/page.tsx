"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useDailyChallenges, useResetDailyChallengeDev } from "@/lib/queries/dailyChallenges.queries";
import { queryKeys } from "@/lib/queries/queryKeys";
import type { DailyChallengeSummary } from "@/lib/domain/dailyChallenge";
import { useAuthStore } from "@/stores/auth.store";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const resetMutation = useResetDailyChallengeDev(challenge.challengeType);
  const disabled = !challenge.availableToday;

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
      transition={{ duration: 0.35, delay: 0.05 + index * 0.04, ease: "easeOut" }}
      className="relative"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="w-full rounded-[20px] bg-[#FFE500] p-5 md:p-6 text-center transition-all hover:brightness-105 active:translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE500] disabled:cursor-default disabled:brightness-95"
      >
        <h3 className="font-poppins text-xl md:text-2xl uppercase leading-none text-black text-center">
          {challenge.title}
        </h3>
        <p className="mt-3 text-sm md:text-base font-bold text-black/70 leading-snug text-center">
          {challenge.availableToday
            ? challenge.description
            : "Completed today. Come back after the UTC reset."}
        </p>
        <div className="mt-5 flex justify-center">
          <span className="font-poppins inline-flex h-11 min-w-[140px] items-center justify-center rounded-xl bg-black px-8 text-lg uppercase tracking-wide text-white">
            {disabled ? "Done" : "Play"}
          </span>
        </div>
      </button>

      {showDevReset && (
        <button
          type="button"
          onClick={handleReset}
          disabled={resetMutation.isPending}
          className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white hover:bg-black/80 disabled:opacity-50"
        >
          <RotateCcw className="size-3" />
          {resetMutation.isPending ? "…" : "Reset"}
        </button>
      )}
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
    () => challenges.filter((c) => c.completedToday).length,
    [challenges],
  );
  const totalCoins = useMemo(
    () => challenges.reduce((sum, c) => sum + c.coinReward, 0),
    [challenges],
  );
  const earnedCoins = useMemo(
    () => challenges.filter((c) => c.completedToday).reduce((sum, c) => sum + c.coinReward, 0),
    [challenges],
  );
  const totalXp = useMemo(
    () => challenges.reduce((sum, c) => sum + c.xpReward, 0),
    [challenges],
  );
  const totalPlayCost = useMemo(
    () => challenges.reduce((sum, c) => sum + (c.coinReward ?? 0), 0),
    [challenges],
  );
  const progressPct = challenges.length > 0 ? (completedCount / challenges.length) * 100 : 0;

  return (
    <div className="min-h-screen font-fun">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8 md:mb-10">
          <div>
            <h1 className="font-poppins text-4xl md:text-6xl uppercase leading-none text-white">
              Daily Challenges
            </h1>
            <p className="mt-2 text-xs md:text-sm font-black uppercase tracking-[0.2em] text-white/40">
              UTC Reset in {timeUntilReset}
            </p>
          </div>

          <div className="flex items-start gap-10 md:gap-14">
            <div className="min-w-[140px]">
              <p className="font-poppins text-[10px] md:text-xs uppercase tracking-wider text-white/60">
                Today&apos;s Progress
              </p>
              <div className="mt-2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FFE500] rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs font-black text-white/60 text-center">
                {completedCount}/{challenges.length}
              </p>
            </div>

            <div className="text-right">
              <p className="font-poppins text-[10px] md:text-xs uppercase tracking-wider text-white/60">
                Coins Earned
              </p>
              <p className="font-poppins mt-1 text-3xl md:text-4xl uppercase leading-none text-[#FFE500]">
                {earnedCoins}
              </p>
              <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-white/40">
                of {totalCoins}
              </p>
            </div>
          </div>
        </div>

        {/* Grid of challenge cards */}
        {isLoading ? (
          <div className="rounded-2xl bg-[#1B2F36] p-6 text-center text-[#56707A] font-bold">
            Loading today&apos;s challenge lineup...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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

        {/* Bottom stats */}
        {!isLoading && challenges.length > 0 && (
          <div className="mt-8 md:mt-10 flex flex-wrap items-end gap-8">
            <div className="flex flex-col items-center">
              <p className="font-poppins text-xs uppercase tracking-wider text-white mb-2">
                Play For
              </p>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#FFE500]/15 px-4 py-1.5 text-sm font-black text-[#FFE500]">
                {totalPlayCost}
                <Image src="/assets/coin-1.png" alt="" width={20} height={20} className="size-5 object-contain" />
              </span>
            </div>
            <div className="flex flex-col items-center">
              <p className="font-poppins text-xs uppercase tracking-wider text-white mb-2">
                Earn
              </p>
              <span className="inline-flex items-center rounded-full bg-[#58CC02] px-4 py-1.5 text-sm font-black text-white">
                {totalXp} XP
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

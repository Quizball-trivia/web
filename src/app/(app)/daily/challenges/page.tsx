"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";
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
  const isCompleted = challenge.completedToday;

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
        className={`relative flex h-[184px] w-full flex-col overflow-hidden rounded-[8px] p-3.5 pb-10 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow md:flex md:h-[252px] md:flex-col md:rounded-[20px] md:p-6 ${
          isCompleted
            ? "bg-brand-yellow text-black disabled:cursor-default md:border-2 md:border-brand-green-light md:bg-[#164314] md:text-white md:shadow-[0_0_0_4px_rgba(88,204,2,0.16)]"
            : "bg-brand-yellow text-black hover:brightness-105 active:translate-y-[2px]"
        }`}
      >
        {isCompleted ? (
          <div className="absolute left-3 top-3 hidden items-center gap-1.5 rounded-full bg-brand-green-light px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white md:inline-flex">
            <CheckCircle2 className="size-3.5" />
            Completed
          </div>
        ) : null}

        <h3 className={`font-poppins min-h-[31px] pr-7 text-center text-[16px] uppercase leading-[0.95] md:min-h-0 md:pr-0 md:text-[28px] md:mt-2 ${isCompleted ? "text-black md:mt-8 md:text-white" : "text-black"}`}>
          {challenge.title}
        </h3>
        <p className={`mt-3 line-clamp-3 text-center text-[10px] font-bold leading-tight md:mt-5 md:line-clamp-3 md:flex-1 md:text-[18px] md:font-semibold md:leading-snug md:px-4 ${isCompleted ? "text-black/65 md:text-white/75" : "text-black/55"}`}>
          {challenge.availableToday
            ? challenge.description
            : "Completed today. Come back after the UTC reset."}
        </p>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 lg:hidden">
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-white/70 px-2.5 text-[10px] font-black text-[#9A7900]">
            {challenge.coinReward}
            <Image src="/assets/coin-1.png" alt="" width={16} height={16} className="size-4 object-contain" />
          </span>
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-brand-green-light px-2.5 text-[10px] font-black text-white">
            {challenge.xpReward} XP
          </span>
        </div>
        <div className="hidden justify-center md:flex md:mt-auto">
          <span className={`font-poppins inline-flex h-[50px] min-w-[200px] items-center justify-center rounded-[20px] px-8 text-[24px] uppercase tracking-wide ${
            isCompleted ? "bg-white text-[#164314]" : "bg-black text-white"
          }`}>
            {isCompleted ? "Done" : "Play"}
          </span>
        </div>
      </button>

      {showDevReset && (
        <button
          type="button"
          onClick={handleReset}
          disabled={resetMutation.isPending}
          className="absolute right-1.5 top-1.5 inline-flex h-4 items-center gap-0.5 rounded-md bg-black/60 px-1.5 text-[7px] font-black uppercase tracking-wide text-white hover:bg-black/80 disabled:opacity-50 md:right-2 md:top-2 md:h-auto md:gap-1 md:rounded-lg md:px-2 md:py-1 md:text-[10px]"
        >
          <RotateCcw className="size-2.5 md:size-3" />
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
      <div className="mx-auto max-w-[430px] px-4 py-6 md:max-w-6xl md:px-8 md:py-10">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4 md:mb-10">
          <div>
            <h1 className="font-poppins text-[20px] uppercase leading-none text-white md:text-6xl">
              Daily Challenges
            </h1>
            <p className="mt-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/45 md:mt-2 md:text-sm md:tracking-[0.2em]">
              UTC Reset in {timeUntilReset}
            </p>
          </div>

          <div className="flex items-start gap-3 md:gap-4">
            <div className="hidden w-[250px] md:block">
              <p className="inline-block whitespace-nowrap font-poppins text-sm md:text-[0.95rem] font-semibold uppercase leading-none tracking-[-0.02em] text-white">
                Today&apos;s Progress
              </p>
              <div className="mt-3 h-[18px] w-[15ch] max-w-full overflow-hidden rounded-[5px] bg-[#A18F00]">
                <div
                  className="h-full rounded-[5px] bg-brand-yellow transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-3 text-center font-poppins text-[18px] font-semibold leading-none text-white/55">
                {completedCount}/{challenges.length}
              </p>
            </div>

            <div className="w-[96px] text-right md:w-[165px]">
              <p className="font-poppins text-[8px] font-semibold uppercase leading-none tracking-[-0.02em] text-white md:text-[0.95rem]">
                Coins Earned
              </p>
              <p className="font-poppins mt-1 text-[30px] font-semibold uppercase leading-none text-brand-yellow md:mt-2 md:text-[44px]">
                {earnedCoins}
              </p>
              <p className="mt-0.5 font-poppins text-[10px] font-semibold uppercase leading-none text-white/45 md:mt-1 md:text-[16px]">
                of {totalCoins}
              </p>
            </div>
          </div>
        </div>

        {/* Grid of challenge cards */}
        {isLoading ? (
          <div className="rounded-[10px] bg-surface-card p-6 text-center text-brand-slate font-bold">
            Loading today&apos;s challenge lineup...
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
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

        {!isLoading && challenges.length > 0 && (
          <div className="mt-4 flex flex-col items-center lg:hidden">
            <p className="font-poppins text-[8px] font-black uppercase tracking-[0.12em] text-white">
              Today&apos;s Progress
            </p>
            <div className="mt-2 h-[7px] w-[74px] overflow-hidden rounded-full bg-[#A18F00]">
              <div
                className="h-full rounded-full bg-brand-yellow transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-2 font-poppins text-[9px] font-semibold leading-none text-white/55">
              {completedCount}/{challenges.length}
            </p>
          </div>
        )}

        {/* Bottom stats */}
        {!isLoading && challenges.length > 0 && (
          <div className="mt-8 hidden flex-wrap items-end gap-8 md:mt-10 md:flex">
            <div className="flex flex-col items-center">
              <p className="font-poppins text-xs uppercase tracking-wider text-white mb-2">
                Play For
              </p>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-yellow/15 px-4 py-1.5 text-sm font-black text-brand-yellow">
                {totalPlayCost}
                <Image src="/assets/coin-1.png" alt="" width={20} height={20} className="size-5 object-contain" />
              </span>
            </div>
            <div className="flex flex-col items-center">
              <p className="font-poppins text-xs uppercase tracking-wider text-white mb-2">
                Earn
              </p>
              <span className="inline-flex items-center rounded-full bg-brand-green-light px-4 py-1.5 text-sm font-black text-white">
                {totalXp} XP
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

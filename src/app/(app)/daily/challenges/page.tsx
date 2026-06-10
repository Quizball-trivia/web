"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useDailyChallenges, useResetDailyChallengeDev } from "@/lib/queries/dailyChallenges.queries";
import { queryKeys } from "@/lib/queries/queryKeys";
import type { DailyChallengeSummary, DailyChallengeType } from "@/lib/domain/dailyChallenge";
import { useAuthStore } from "@/stores/auth.store";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "@/contexts/LocaleContext";
import { prefetchDailyChallengeSession } from "@/features/daily/dailyChallengeSessionPrefetch";

// Challenges reset at 00:00 UTC. Show that moment as a wall-clock time in the
// viewer's own timezone (auto-detected by Intl) so a Georgia user sees 04:00
// and an EST user sees 7:00 PM — no confusing "UTC" label. Georgian uses 24h
// (EU/Georgia convention, e.g. 04:00 / 20:00); English keeps 12h AM/PM.
function getLocalResetTime(locale: string) {
  const reset = new Date();
  reset.setUTCHours(24, 0, 0, 0); // next 00:00 UTC
  return new Intl.DateTimeFormat(locale === "ka" ? "ka-GE" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: locale === "ka" ? "h23" : "h12",
  }).format(reset);
}

function ChallengeCard({
  challenge,
  index,
  onClick,
  onPrefetch,
  showDevReset,
}: {
  challenge: DailyChallengeSummary;
  index: number;
  onClick: () => void;
  onPrefetch: () => void;
  showDevReset: boolean;
}) {
  const { t } = useLocale();
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
      toast.success(t('dailyGames.hubResetSuccess', { title: challenge.title }));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('dailyGames.hubResetError');
      toast.error(message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 + index * 0.04, ease: "easeOut" }}
      className="relative flex h-full"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        onPointerDown={disabled ? undefined : onPrefetch}
        className={`relative flex min-h-[184px] w-full flex-col overflow-hidden rounded-[8px] p-3.5 pb-3.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow md:flex md:min-h-[268px] md:flex-col md:rounded-[20px] md:p-6 ${
          isCompleted
            ? "border-2 border-brand-green-light bg-brand-green-darkest text-white shadow-[0_0_0_3px_hsl(var(--brand-green-light)/0.16)] disabled:cursor-default md:border-2 md:shadow-[0_0_0_4px_hsl(var(--brand-green-light)/0.16)]"
            : "bg-brand-yellow text-black pb-10 hover:brightness-105 active:translate-y-[2px] md:pb-6"
        }`}
      >
        {isCompleted ? (
          <div className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-brand-green-light p-1 text-[11px] font-black uppercase tracking-wide text-white md:left-3 md:top-3 md:px-3 md:py-1">
            {/* Mobile: just the check icon so it can't overlap the centered
                title. md+: full "COMPLETED" label (room to spare). */}
            <CheckCircle2 className="size-3 md:size-3.5" />
            <span className="hidden md:inline">{t('dailyGames.hubCompleted')}</span>
          </div>
        ) : null}

        {/* Reserve 2 title lines (min-h) and TOP-align so a 1-line and a 2-line
            title share the same top baseline across cards in a row, and the
            description below them also starts at the same height. */}
        <h3 className={`font-poppins flex min-h-[2.1rem] items-start justify-center px-7 text-center text-[16px] uppercase leading-[0.95] md:min-h-[3.5rem] md:px-0 md:text-[28px] md:mt-2 ${isCompleted ? "text-white md:mt-8" : "text-black"}`}>
          {challenge.title}
        </h3>
        {/* No line-clamp: the full description always shows and the card (min-h,
            not fixed h) grows to fit it. mb keeps a gap above PLAY. */}
        <p className={`mt-3 mb-4 text-center text-[10px] font-bold leading-tight md:mt-5 md:mb-6 md:text-[18px] md:font-semibold md:leading-snug md:px-4 ${isCompleted ? "text-white/75 md:text-white/80" : "text-black/80"}`}>
          {challenge.availableToday
            ? challenge.description
            : t('dailyGames.hubUnavailable')}
        </p>
        {/* Mobile reward pills — only for an OPEN challenge. A completed card
            drops these and shows the DONE button instead, matching the web. */}
        {!isCompleted ? (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 lg:hidden">
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-white/70 px-2.5 text-[10px] font-black text-brand-gold-ink">
              {challenge.coinReward}
              <Image src="/assets/coin-1.png" alt="" width={16} height={16} className="size-4 object-contain" />
            </span>
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-brand-green-light px-2.5 text-[10px] font-black text-white">
              {challenge.xpReward} XP
            </span>
          </div>
        ) : null}
        {/* Desktop reward pills — coin left, XP right (mirrors the mobile
            layout) so players see exactly what each challenge pays. */}
        {!isCompleted ? (
          <div className="mt-auto mb-3 hidden w-full items-center justify-between gap-2 md:flex">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/70 px-3.5 text-[16px] font-black tabular-nums text-brand-gold-ink">
              {challenge.coinReward}
              <Image src="/assets/coin-1.png" alt="" width={20} height={20} className="size-5 object-contain" />
            </span>
            <span className="inline-flex h-8 items-center gap-1 rounded-full bg-brand-green-light px-3.5 text-[16px] font-black text-white">
              {challenge.xpReward} XP
            </span>
          </div>
        ) : null}
        {/* PLAY / DONE pill. On mobile it's hidden for OPEN cards (those use the
            reward pills above) but shown for COMPLETED cards so they get the same
            DONE treatment as the web. On md+ it always shows. */}
        <div className={`justify-center ${isCompleted ? "mt-auto flex" : "hidden md:flex"}`}>
          <span className={`font-poppins inline-flex h-[34px] min-w-[120px] items-center justify-center rounded-[14px] px-5 text-[15px] uppercase tracking-wide md:h-[50px] md:min-w-[200px] md:rounded-[20px] md:px-8 md:text-[24px] ${
            isCompleted ? "bg-white text-brand-green-darkest" : "bg-black text-white"
          }`}>
            {isCompleted ? t('dailyGames.hubDone') : t('dailyGames.hubPlay')}
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
          {resetMutation.isPending ? "…" : t('dailyGames.hubResetButton')}
        </button>
      )}
    </motion.div>
  );
}

export default function DailyChallengesPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const { data: challenges = [], isLoading } = useDailyChallenges();
  // Computed client-side only (depends on the browser's timezone), so it stays
  // empty on the server and first paint to avoid a hydration mismatch.
  const [localResetTime, setLocalResetTime] = useState("");
  const canUseDevReset = authUser?.role === "admin";

  useEffect(() => {
    setLocalResetTime(getLocalResetTime(locale));
  }, [locale]);

  // Prefetch the page bundle for AVAILABLE challenges only (completed/locked
  // ones can't be opened, so prefetching them is wasted). The session POST is
  // what we overlap on tap-down.
  useEffect(() => {
    for (const challenge of challenges) {
      if (!challenge.availableToday) continue;
      router.prefetch(`/daily/challenges/${challenge.challengeType}`);
    }
  }, [challenges, router]);

  // Start (or reuse) the session the moment the user presses a card — the POST
  // round-trip then overlaps the navigation + intro, so the game's ready by the
  // time the intro finishes. Available cards only; completed ones aren't tapped.
  const handlePrefetchSession = useCallback(
    (challengeType: DailyChallengeType) => {
      void prefetchDailyChallengeSession(challengeType, locale, Date.now()).catch(() => {
        // Swallow — the challenge page will surface and retry any real failure.
      });
    },
    [locale],
  );

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
  const progressPct = challenges.length > 0 ? (completedCount / challenges.length) * 100 : 0;

  return (
    <div className="min-h-screen font-fun">
      <div className="mx-auto max-w-[430px] px-4 py-6 md:max-w-6xl md:px-8 md:py-10">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4 md:mb-10">
          <div>
            <h1 className="font-poppins text-[20px] uppercase leading-[1.1] text-white md:text-[40px] md:leading-[1.1]">
              {t('dailyGames.hubTitle')}
            </h1>
            {localResetTime ? (
              <p className="mt-1.5 text-[11px] font-black uppercase tracking-[0.04em] text-white/55 md:mt-2 md:text-sm md:tracking-[0.08em]">
                {t('dailyGames.hubResetAt', { time: localResetTime })}
              </p>
            ) : null}
          </div>

          <div className="flex items-start gap-3 md:gap-8">
            {/* Label, bar, and count are one left-aligned column whose width is
                set by the (widest) label — so the bar and the count line up to
                the label's edges in any locale (EN or the wider Georgian). */}
            <div className="hidden md:flex md:flex-col md:items-start">
              <p className="whitespace-nowrap font-poppins text-sm md:text-[0.95rem] font-semibold uppercase leading-none tracking-[-0.02em] text-white">
                {t('dailyGames.hubTodaysProgress')}
              </p>
              <div className="mt-3 h-[18px] w-full overflow-hidden rounded-[5px] bg-brand-gold-fill-deep">
                <div
                  className="h-full rounded-[5px] bg-brand-yellow transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-3 self-end font-poppins text-[18px] font-semibold leading-none text-white/55">
                {completedCount}/{challenges.length}
              </p>
            </div>

            <div className="w-[120px] text-right md:w-[200px]">
              <p className="font-poppins text-[13px] font-semibold uppercase leading-tight tracking-[-0.02em] text-white md:whitespace-nowrap md:text-[0.95rem] md:leading-none">
                {t('dailyGames.hubCoinsEarned')}
              </p>
              <p className="font-poppins mt-1 text-[22px] font-semibold uppercase leading-none text-brand-yellow md:mt-2 md:text-[32px]">
                {earnedCoins}/{totalCoins}
              </p>
            </div>
          </div>
        </div>

        {/* Grid of challenge cards */}
        {isLoading ? (
          <div className="rounded-[10px] bg-surface-card p-6 text-center text-brand-slate font-bold">
            {t('dailyGames.hubLoading')}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {challenges.map((challenge, index) => (
              <ChallengeCard
                key={challenge.challengeType}
                challenge={challenge}
                index={index}
                onClick={() => router.push(`/daily/challenges/${challenge.challengeType}`)}
                onPrefetch={() => handlePrefetchSession(challenge.challengeType)}
                showDevReset={canUseDevReset}
              />
            ))}
          </div>
        )}

        {!isLoading && challenges.length > 0 && (
          <div className="mt-4 flex flex-col items-center lg:hidden">
            <p className="font-poppins text-[10px] font-black uppercase tracking-[0.04em] text-white">
              {t('dailyGames.hubTodaysProgress')}
            </p>
            <div className="mt-2 h-[7px] w-[74px] overflow-hidden rounded-full bg-brand-gold-fill-deep">
              <div
                className="h-full rounded-full bg-brand-yellow transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-2 font-poppins text-[12px] font-semibold leading-none text-white/55">
              {completedCount}/{challenges.length}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

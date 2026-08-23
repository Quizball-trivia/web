"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ChevronRight, Target, Ticket, Trophy } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { getWeekendLeagueCurrent } from "@/lib/api/endpoints";
import {
  trackDailyWeekendLeagueCtaClicked,
  trackDailyWeekendLeagueCtaShown,
} from "@/lib/analytics/game-events";
import {
  loadDailyWeekendLeagueExperimentVariant,
  type DailyWeekendLeagueExperimentVariant,
} from "@/lib/experiments/dailyWeekendLeagueExperiment";
import {
  resolveDailyWeekendLeagueCta,
  type DailyWeekendLeagueCtaAction,
  type DailyWeekendLeagueCtaState,
} from "@/lib/experiments/dailyWeekendLeagueCta";
import { queryKeys } from "@/lib/queries/queryKeys";
import { useAuthStore } from "@/stores/auth.store";

export interface DailyChallengeWeekendLeagueCta {
  state: DailyWeekendLeagueCtaState;
  action: DailyWeekendLeagueCtaAction;
  currentQp: number;
  targetQp: number;
  onClick: () => void;
}

interface DailyChallengeCompleteModalProps {
  open: boolean;
  title: string;
  correct: number;
  total: number;
  onDone: (nextPath?: string) => void;
}

export function DailyChallengeCompleteModal({
  open,
  title,
  correct,
  total,
  onDone,
}: DailyChallengeCompleteModalProps) {
  if (!open) return null;

  const contentProps = { title, correct, total, onDone };
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <DailyChallengeCompleteModalContent {...contentProps} />;
  }

  return <DailyChallengeCompleteModalExperiment {...contentProps} />;
}

type OpenModalProps = Omit<DailyChallengeCompleteModalProps, "open">;

function DailyChallengeCompleteModalExperiment(props: OpenModalProps) {
  const createdAt = useAuthStore((state) => state.user?.created_at);
  const country = useAuthStore((state) => state.user?.country);
  const assignmentKey = country?.trim().toUpperCase() ?? "unknown";

  return (
    <DailyChallengeCompleteModalExperimentAssignment
      key={assignmentKey}
      {...props}
      country={country}
      createdAt={createdAt}
    />
  );
}

function DailyChallengeCompleteModalExperimentAssignment({
  country,
  createdAt,
  ...props
}: OpenModalProps & {
  country?: string | null;
  createdAt?: string | null;
}) {
  const isEligibleCountry = country?.trim().toUpperCase() === "GE";
  const weekendLeagueQuery = useQuery({
    queryKey: queryKeys.weekendLeague.current(),
    queryFn: getWeekendLeagueCurrent,
    staleTime: 30_000,
  });
  const tournament = weekendLeagueQuery.data?.tournament ?? null;
  const you = weekendLeagueQuery.data?.you ?? null;
  const [experimentVariant, setExperimentVariant] =
    useState<DailyWeekendLeagueExperimentVariant>("not_enrolled");
  const assignmentRef = useRef<Promise<DailyWeekendLeagueExperimentVariant> | null>(null);
  const trackedPromptRef = useRef(false);

  useEffect(() => {
    if (!isEligibleCountry) return;

    if (
      !weekendLeagueQuery.isSuccess
      || weekendLeagueQuery.isFetching
      || !tournament
    ) {
      return;
    }

    if (!assignmentRef.current) {
      assignmentRef.current = loadDailyWeekendLeagueExperimentVariant({
        createdAt,
        country,
      });
    }

    let active = true;
    void assignmentRef.current.then((variant) => {
      if (active) setExperimentVariant(variant);
    });
    return () => {
      active = false;
    };
  }, [
    country,
    createdAt,
    isEligibleCountry,
    tournament,
    weekendLeagueQuery.isFetching,
    weekendLeagueQuery.isSuccess,
  ]);
  const ctaDecision = resolveDailyWeekendLeagueCta({
    points: you?.qp.points,
    target: tournament?.qp_target ?? you?.qp.target,
    qualified: you?.qp.qualified,
    entered: you?.entered,
    tournamentStatus: tournament?.status,
  });
  const { action: ctaAction, currentQp, state: ctaState, targetQp } = ctaDecision;
  const weekendLeagueCta: DailyChallengeWeekendLeagueCta | undefined =
    isEligibleCountry && experimentVariant === "test" && tournament
      ? {
          state: ctaState,
          action: ctaAction,
          currentQp,
          targetQp,
          onClick: () => {
            trackDailyWeekendLeagueCtaClicked({
              state: ctaState,
              action: ctaAction,
              currentQp,
              targetQp,
              tournamentStatus: tournament?.status ?? null,
            });
            props.onDone(ctaDecision.nextPath);
          },
        }
      : undefined;

  useEffect(() => {
    if (
      !isEligibleCountry
      || !tournament
      || experimentVariant !== "test"
      || trackedPromptRef.current
    ) return;
    trackedPromptRef.current = true;
    trackDailyWeekendLeagueCtaShown({
      state: ctaState,
      action: ctaAction,
      currentQp,
      targetQp,
      tournamentStatus: tournament?.status ?? null,
    });
  }, [
    ctaAction,
    ctaState,
    currentQp,
    experimentVariant,
    isEligibleCountry,
    targetQp,
    tournament,
  ]);

  return (
    <DailyChallengeCompleteModalContent
      {...props}
      weekendLeagueCta={weekendLeagueCta}
    />
  );
}

export function DailyChallengeCompleteModalContent({
  title,
  correct,
  total,
  onDone,
  weekendLeagueCta,
}: OpenModalProps & { weekendLeagueCta?: DailyChallengeWeekendLeagueCta }) {
  const { t } = useLocale();

  const isWeekendLeagueEntered = weekendLeagueCta?.state === "entered";
  const isWeekendLeagueQualified = weekendLeagueCta?.state === "qualified";
  const displayedQp = weekendLeagueCta
    ? Math.max(0, Math.min(weekendLeagueCta.currentQp, weekendLeagueCta.targetQp))
    : 0;
  const remainingQp = weekendLeagueCta
    ? Math.max(0, weekendLeagueCta.targetQp - displayedQp)
    : 0;
  const qpProgress = weekendLeagueCta?.targetQp
    ? Math.round((displayedQp / weekendLeagueCta.targetQp) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-challenge-complete-title"
        initial={{ opacity: 0, scale: 0.9, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-[24px] bg-brand-blue p-7 text-center sm:p-8"
      >
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-white/12">
          <Trophy className="size-8 text-brand-yellow" />
        </div>

        <h2 id="daily-challenge-complete-title" className="font-poppins text-[22px] font-semibold uppercase text-white sm:text-[26px]">
          {t("dailyGames.challengeComplete")}
        </h2>
        <p className="mt-1 font-poppins text-sm font-medium text-white/80">{title}</p>

        <div className="mt-5 rounded-[18px] bg-black/18 px-5 py-4">
          <p className="font-poppins text-xs font-semibold uppercase tracking-wide text-white/60">
            {t("dailyGames.correctAnswers")}
          </p>
          <p className="mt-1 font-poppins text-4xl font-black leading-none text-brand-yellow">
            {correct}
            <span className="text-white/55"> / {total}</span>
          </p>
        </div>

        <p className="mt-4 font-poppins text-sm font-semibold text-white">
          {t("dailyGames.completionGreat")}
        </p>

        {weekendLeagueCta && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.28 }}
            className="mt-5 border-y border-white/15 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center text-brand-yellow">
                {isWeekendLeagueQualified || isWeekendLeagueEntered ? (
                  <Ticket className="size-6" aria-hidden />
                ) : (
                  <Target className="size-6" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-poppins text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">
                    {t("weekendLeague.title")}
                  </p>
                  <span className="shrink-0 font-poppins text-[10px] font-semibold uppercase tracking-wide text-brand-green-light">
                    {isWeekendLeagueEntered
                      ? t("weekendLeague.joinedCta")
                      : isWeekendLeagueQualified
                        ? t("weekendLeague.qualified")
                        : t("weekendLeague.stageQualifying")}
                  </span>
                </div>
                <p className="mt-1 font-poppins text-sm font-semibold text-white">
                  {t("weekendLeague.qpProgress", {
                    current: displayedQp,
                    target: weekendLeagueCta.targetQp,
                  })}
                </p>
              </div>
            </div>

            <div
              role="progressbar"
              aria-label={t("weekendLeague.qpProgress", {
                current: displayedQp,
                target: weekendLeagueCta.targetQp,
              })}
              aria-valuemin={0}
              aria-valuemax={weekendLeagueCta.targetQp}
              aria-valuenow={displayedQp}
              className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/18"
            >
              <div
                className="h-full rounded-full bg-brand-green-light transition-[width] duration-500"
                style={{ width: `${qpProgress}%` }}
              />
            </div>

            <p className="mt-2 font-poppins text-[11px] font-semibold text-white/65">
              {remainingQp > 0
                ? t("weekendLeague.qpNeeded", { count: remainingQp })
                : isWeekendLeagueEntered
                  ? t("weekendLeague.enteredTitle")
                  : t("weekendLeague.qualified")}
            </p>

            <button
              type="button"
              onClick={weekendLeagueCta.onClick}
              className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-[22px] bg-brand-yellow font-poppins text-xs font-semibold uppercase tracking-wide text-black transition-colors hover:bg-brand-yellow-deep"
            >
              {weekendLeagueCta.action === "play_ranked"
                ? t("weekendLeague.playRanked")
                : weekendLeagueCta.action === "join_league"
                  ? t("weekendLeague.joinCta")
                  : t("weekendLeague.viewLeague")}
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </motion.div>
        )}

        <button
          type="button"
          onClick={() => onDone()}
          className={`h-12 w-full rounded-[28px] font-poppins text-sm font-semibold uppercase tracking-wide transition-colors ${
            weekendLeagueCta
              ? "mt-2 text-white/70 hover:text-white"
              : "mt-6 bg-brand-yellow text-black hover:bg-brand-yellow-deep"
          }`}
        >
          {t("dailyGames.backToChallenges")}
        </button>
      </motion.div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from '@/contexts/LocaleContext';
import { getWeekendLeagueCurrent } from '@/lib/api/endpoints';
import { trackWeekendLeagueProgressRail } from '@/lib/analytics/game-events';
import {
  loadWeekendLeagueProgressExperimentVariant,
  type WeekendLeagueProgressExperimentVariant,
} from '@/lib/experiments/weekendLeagueProgressExperiment';
import { queryKeys } from '@/lib/queries/queryKeys';
import { useAuthStore } from '@/stores/auth.store';
import {
  RailNavyGradient,
  RailNavyGradientProgress,
  type WeekendLeagueProgressRailState,
} from './RailColorVariants';

function formatCountdown(remainingMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(remainingMs / 60_000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function WeekendLeagueProgressExperimentRail() {
  const { t } = useLocale();
  const country = useAuthStore((state) => state.user?.country);
  const createdAt = useAuthStore((state) => state.user?.created_at);
  const isGeorgia = country?.trim().toUpperCase() === 'GE';
  const currentQuery = useQuery({
    queryKey: queryKeys.weekendLeague.current(),
    queryFn: getWeekendLeagueCurrent,
    staleTime: 30_000,
    enabled: isGeorgia,
  });
  const [variant, setVariant] =
    useState<WeekendLeagueProgressExperimentVariant>('not_enrolled');
  const [clientNowAtMount] = useState(() => Date.now());
  const assignmentRef =
    useRef<Promise<WeekendLeagueProgressExperimentVariant> | null>(null);
  const trackedShownRef = useRef(false);
  const tournament = currentQuery.data?.tournament ?? null;
  const you = currentQuery.data?.you ?? null;

  useEffect(() => {
    if (
      !isGeorgia
      || !currentQuery.isSuccess
      || currentQuery.isFetching
      || !tournament
    ) return;
    if (!assignmentRef.current) {
      assignmentRef.current = loadWeekendLeagueProgressExperimentVariant({
        country,
        createdAt,
      });
    }
    let active = true;
    void assignmentRef.current.then((nextVariant) => {
      if (active) setVariant(nextVariant);
    });
    return () => {
      active = false;
    };
  }, [
    country,
    createdAt,
    currentQuery.isFetching,
    currentQuery.isSuccess,
    isGeorgia,
    tournament,
  ]);

  const state: WeekendLeagueProgressRailState = you?.entered
    ? 'entered'
    : you?.qp.qualified
      ? 'qualified'
      : 'qualifying';
  const targetAt = useMemo(() => {
    if (!tournament) return null;
    const status = tournament.status;
    if (['qualifier_done', 'final_checkin', 'final_live'].includes(status)) {
      return tournament.final_starts_at;
    }
    if (['entry_closed', 'checkin', 'game_live', 'break'].includes(status)) {
      return tournament.qualifier_starts_at;
    }
    return tournament.entry_closes_at ?? tournament.qualifier_starts_at;
  }, [tournament]);
  const targetMs = targetAt ? Date.parse(targetAt) : Number.NaN;
  const initialServerNow = tournament?.server_now_ms ?? clientNowAtMount;
  const [remainingMs, setRemainingMs] = useState(
    Number.isFinite(targetMs) ? Math.max(0, targetMs - initialServerNow) : 0,
  );

  useEffect(() => {
    if (!Number.isFinite(targetMs) || !tournament) return;
    const loadedAt = Date.now();
    const update = () => {
      const estimatedServerNow = tournament.server_now_ms + (Date.now() - loadedAt);
      setRemainingMs(Math.max(0, targetMs - estimatedServerNow));
    };
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [targetMs, tournament]);

  const analyticsProps = useMemo(() => tournament ? {
    state,
    currentQp: you?.qp.points ?? 0,
    targetQp: tournament.qp_target ?? you?.qp.target ?? 200,
    tournamentStatus: tournament.status,
  } : null, [state, tournament, you?.qp]);

  useEffect(() => {
    if (variant !== 'test' || !analyticsProps || trackedShownRef.current) return;
    trackedShownRef.current = true;
    trackWeekendLeagueProgressRail('shown', analyticsProps);
  }, [analyticsProps, variant]);

  if (variant !== 'test' || !tournament || !analyticsProps) {
    return <RailNavyGradient />;
  }

  return (
    <div onClickCapture={() => trackWeekendLeagueProgressRail('clicked', analyticsProps)}>
      <RailNavyGradientProgress
        state={state}
        currentQp={analyticsProps.currentQp}
        targetQp={analyticsProps.targetQp}
        countdownLabel={targetAt ? formatCountdown(remainingMs) : t('weekendLeague.qualifierShort')}
      />
    </div>
  );
}

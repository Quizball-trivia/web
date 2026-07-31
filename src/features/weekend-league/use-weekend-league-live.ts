'use client';

// LIVE Weekend League controller — the production replacement for the mock
// hook on the events tab. Maps the backend tournament (GET /current) onto the
// prototype's phase/controller contract so the presentational components work
// unchanged; entry goes through the real endpoint. The mock hook stays behind
// /dev/wl for design iteration.
//
// Not yet live-driven (lands with the wl:* socket client): gameplay, check-in,
// standings and your rank. Until then `playable` is false — the screen renders
// live phases informationally and never routes users into the mock game — and
// the qualifier board stays empty rather than showing invented players.

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { enterWeekendLeague, getWeekendLeagueCurrent } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/queries/queryKeys';
import { useAuthStore } from '@/stores/auth.store';
import type { components } from '@/types/api.generated';
import { QP_TARGET } from './constants';
import { getMilestones } from './mock-data';
import type { LeaguePhase, Milestone } from './types';
import type { WeekendLeagueController } from './use-weekend-league';

type WlCurrent = components['schemas']['WlCurrentResponse'];
type WlStatus = NonNullable<WlCurrent['tournament']>['status'];

// Statuses where the tournament is actually running and the screen should
// refresh fast; everything else can poll lazily.
const HOT_STATUSES: ReadonlySet<string> = new Set([
  'checkin', 'game_live', 'break', 'final_checkin', 'final_live', 'paused',
]);

function phaseFromStatus(status: WlStatus | undefined): LeaguePhase {
  switch (status) {
    case 'entry_open':
    case 'entry_closed': // same countdown card; the claim CTA locks via canEnter
      return 'entry_open';
    case 'checkin':
    case 'game_live':
    case 'break':
    case 'paused':
      return 'qualifier_live';
    case 'qualifier_done':
    case 'final_checkin':
      return 'qualifier_done';
    case 'final_live':
      return 'playoffs_live';
    case 'completed':
      return 'completed';
    default:
      // scheduled / content_pending / ready — the week hasn't opened yet.
      // cancelled / voided / no tournament fall back to the next event's
      // calendar (handled by the milestone fallback below).
      return 'upcoming';
  }
}

const GE_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Tbilisi',
  hour: '2-digit',
  minute: '2-digit',
});
const GE_DAY = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tbilisi',
  weekday: 'long',
});

function toMilestone(
  key: Milestone['key'],
  label: string,
  iso: string | null | undefined,
  fallback: Milestone,
): Milestone {
  if (!iso) return fallback;
  const targetMs = Date.parse(iso);
  if (Number.isNaN(targetMs)) return fallback;
  return {
    key,
    label,
    dayLabel: GE_DAY.format(targetMs),
    timeLabel: GE_TIME.format(targetMs),
    targetMs,
  };
}

/** Live-only signals layered on top of the prototype controller contract. */
export interface WeekendLeagueLiveExtras {
  /** Marks a backend-driven controller (the screen uses it to trust server fields). */
  live: true;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  /** Running QP balance (server truth, resets when a ticket is claimed). */
  qp: number;
  qpTarget: number;
  /** Server's word on entry eligibility (`you.qp.qualified`). */
  qpQualified: boolean;
  /** The entry window is open right now and the caller hasn't claimed yet. */
  canEnter: boolean;
  /** Actually won the event (distinct from `qualified` = reached the final). */
  champion: boolean;
  /** Gameplay is wired — false until the wl:* socket client lands, so live
      phases render informationally instead of launching the mock game. */
  playable: boolean;
}

export type WeekendLeagueLiveController = WeekendLeagueController & WeekendLeagueLiveExtras;

const noop = () => {};

export function useWeekendLeagueLive(): WeekendLeagueLiveController {
  const authStatus = useAuthStore((state) => state.status);
  const queryClient = useQueryClient();
  const [nowMs] = useState(() => Date.now());

  const query = useQuery({
    queryKey: queryKeys.weekendLeague.current(),
    queryFn: getWeekendLeagueCurrent,
    enabled: authStatus === 'authenticated',
    staleTime: 0,
    refetchInterval: (q) => {
      const status = q.state.data?.tournament?.status;
      return status && HOT_STATUSES.has(status) ? 5_000 : 60_000;
    },
  });

  const tournament = query.data?.tournament ?? null;
  const you = query.data?.you ?? null;
  const status = tournament?.status;
  const phase = phaseFromStatus(status);
  const hasEntered = you?.entered ?? false;
  const canEnter = status === 'entry_open' && !hasEntered;

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.weekendLeague.all }),
    [queryClient],
  );

  const enterMutation = useMutation({
    mutationFn: enterWeekendLeague,
    onSuccess: (res) => {
      if (!res.entered && !res.already_entered) {
        toast.error('Entry is closed for this event.');
      }
      invalidate();
    },
    onError: () => toast.error('Could not claim your entry — try again.'),
  });
  const { mutate: enterMutate } = enterMutation;
  const enterLeague = useCallback(() => {
    if (status !== 'entry_open') {
      toast.error('Entry is closed for this event.');
      return;
    }
    enterMutate();
  }, [status, enterMutate]);

  const milestones = useMemo(() => {
    // The fallback is NOT invented: the league runs on a fixed weekly calendar
    // (Fri close / Sat qualifier / Sun final, Georgia time) shared with the
    // backend scheduler. With no tournament row — or a cancelled/voided one —
    // the next occurrence of that calendar IS the next event; the reconciler
    // creates its row ahead of time and the poll swaps in real timestamps.
    const fallback = getMilestones(nowMs);
    if (!tournament || tournament.status === 'cancelled' || tournament.status === 'voided') {
      return fallback;
    }
    return {
      entry: toMilestone('entry', 'Entry closes', tournament.entry_closes_at, fallback.entry),
      qualifier: toMilestone('qualifier', 'Qualifier', tournament.qualifier_starts_at, fallback.qualifier),
      playoffs: toMilestone('playoffs', 'Playoffs', tournament.final_starts_at, fallback.playoffs),
    };
  }, [tournament, nowMs]);

  const activeMilestone: Milestone | null = useMemo(() => {
    switch (phase) {
      case 'upcoming':
        return milestones.entry;
      case 'entry_open':
        return milestones.qualifier;
      case 'qualifier_done':
        return milestones.playoffs;
      default:
        return null;
    }
  }, [milestones, phase]);

  // Server truth only — no locally simulated results in live mode.
  const champion = you?.state === 'champion';
  const qualified = champion || you?.state === 'finalist';

  return {
    phase,
    hasEntered,
    qualified,
    milestones,
    activeMilestone,
    leaderboard: [],
    yourRank: 0,
    bracket: null,
    registered: tournament?.registered_count ?? 0,
    session: null,
    playedOutcome: null,
    playoffOutcome: null,
    setPhase: noop,
    setEntered: noop,
    setQualified: noop,
    enterLeague,
    startQualifierGame: noop,
    startPlayoffGame: noop,
    cancelGame: noop,
    finishQualifier: noop,
    finishPlayoff: noop,
    live: true,
    isLoading: query.isLoading,
    // Fatal only when there's nothing to show — a failed background poll on
    // top of usable data must not blank the screen into an error card.
    isError: query.isError && query.data === undefined,
    refetch: () => void query.refetch(),
    qp: you?.qp.points ?? 0,
    qpTarget: tournament?.qp_target ?? QP_TARGET,
    qpQualified: you?.qp.qualified ?? false,
    canEnter,
    champion,
    playable: false,
  };
}

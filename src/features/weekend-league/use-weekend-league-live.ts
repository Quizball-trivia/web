'use client';

// LIVE Weekend League controller — the production replacement for the mock
// hook on the events tab. Maps the backend tournament (GET /current) onto the
// prototype's phase/controller contract so the presentational components work
// unchanged; entry goes through the real endpoint. The mock hook stays behind
// /dev/wl for design iteration.
//
// Not yet live-driven (lands with the socket client): qualifier standings and
// your rank — the REST surface has no standings, so the board is empty until
// the wl:* feed is wired in.

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { enterWeekendLeague, getWeekendLeagueCurrent } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/queries/queryKeys';
import { useAuthStore } from '@/stores/auth.store';
import type { components } from '@/types/api.generated';
import { PLAYOFF_CUTOFF, QP_TARGET } from './constants';
import { getMilestones } from './mock-data';
import type {
  GameSession,
  LeaguePhase,
  Milestone,
  PlayoffOutcome,
  QuizOutcome,
} from './types';
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
    case 'entry_closed': // still the countdown card, claiming is just over
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
      // scheduled / content_pending / ready / cancelled / voided / no tournament
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

export type WeekendLeagueLiveController = WeekendLeagueController & {
  isLoading: boolean;
  /** Running QP balance (full bar on the launch edition). */
  qp: number;
  qpTarget: number;
};

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

  // ── Play session (mock gameplay until the wl:* socket client lands) ──
  const [session, setSession] = useState<GameSession | null>(null);
  const [playedRank, setPlayedRank] = useState<number | null>(null);
  const [playedOutcome, setPlayedOutcome] = useState<QuizOutcome | null>(null);
  const [playoffOutcome, setPlayoffOutcome] = useState<PlayoffOutcome | null>(null);

  const startQualifierGame = useCallback(() => {
    setPlayedRank(null);
    setPlayedOutcome(null);
    setSession({ kind: 'qualifier' });
  }, []);
  const startPlayoffGame = useCallback(() => {
    setPlayoffOutcome(null);
    setSession({ kind: 'playoff' });
  }, []);
  const cancelGame = useCallback(() => setSession(null), []);
  const finishQualifier = useCallback((rank: number, outcome: QuizOutcome) => {
    setPlayedRank(rank);
    setPlayedOutcome(outcome);
    setSession(null);
  }, []);
  const finishPlayoff = useCallback((result: PlayoffOutcome) => {
    setSession(null);
    setPlayoffOutcome(result);
  }, []);

  const milestones = useMemo(() => {
    const fallback = getMilestones(nowMs);
    if (!tournament) return fallback;
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

  // "Made the cut": the server's word once it has one, a played mock result as
  // an interim stand-in while gameplay is still prototype-driven.
  const serverQualified = you?.state === 'finalist' || you?.state === 'champion';
  const qualified = playedRank != null ? playedRank <= PLAYOFF_CUTOFF : serverQualified;

  return {
    phase,
    hasEntered: you?.entered ?? false,
    qualified,
    milestones,
    activeMilestone,
    leaderboard: [],
    yourRank: 0,
    bracket: null,
    registered: tournament?.registered_count ?? 0,
    session,
    playedOutcome,
    playoffOutcome,
    setPhase: () => {},
    setEntered: () => {},
    setQualified: () => {},
    enterLeague,
    startQualifierGame,
    startPlayoffGame,
    cancelGame,
    finishQualifier,
    finishPlayoff,
    isLoading: query.isLoading,
    qp: tournament?.launch_edition ? (tournament.qp_target ?? QP_TARGET) : (you?.qp.points ?? 0),
    qpTarget: tournament?.qp_target ?? QP_TARGET,
  };
}

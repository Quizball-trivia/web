'use client';

import { useMemo, useState } from 'react';
import {
  buildBracket,
  buildLeaderboard,
  buildLeaderboardAtRank,
  getMilestones,
  REGISTERED_COUNT,
} from './mock-data';
import type {
  GameSession,
  LeaguePhase,
  Milestone,
  PlayoffOutcome,
  QuizOutcome,
  WeekendLeagueState,
} from './types';
import { PLAYOFF_CUTOFF } from './constants';

const DEFAULT_STATE: WeekendLeagueState = {
  phase: 'entry_open',
  hasEntered: false,
  qualified: true,
};

/**
 * Prototype state for the Weekend League. Owns the demo scenario (phase + two
 * toggles) plus the live play session, and derives the schedule, standings and
 * bracket from mock data.
 *
 * Milestones use Date.now(), anchored once; nothing renders the raw value before
 * the countdown's own mount tick, so there's no SSR/client hydration mismatch.
 */
export function useWeekendLeague(initial?: Partial<WeekendLeagueState>) {
  const [state, setState] = useState<WeekendLeagueState>({ ...DEFAULT_STATE, ...initial });
  const [nowMs] = useState(() => Date.now());

  // Live play. When `session` is set, the screen hands over to the full-screen
  // game flow. `playedRank` overrides the demo leaderboard with a rank the player
  // actually earned; `playoffOutcome` records how their Sunday run ended.
  const [session, setSession] = useState<GameSession | null>(null);
  const [playedRank, setPlayedRank] = useState<number | null>(null);
  const [playedOutcome, setPlayedOutcome] = useState<QuizOutcome | null>(null);
  const [playoffOutcome, setPlayoffOutcome] = useState<PlayoffOutcome | null>(null);

  const milestones = useMemo(() => getMilestones(nowMs), [nowMs]);

  // Effective qualification: real result if the player played, else the toggle.
  const qualified = playedRank != null ? playedRank <= PLAYOFF_CUTOFF : state.qualified;

  // ── Scenario controls (demo switcher) ──
  const setPhase = (phase: LeaguePhase) =>
    setState((s) => {
      const needsEntry: LeaguePhase[] = ['qualifier_done', 'playoffs_live', 'completed'];
      return { ...s, phase, hasEntered: needsEntry.includes(phase) ? true : s.hasEntered };
    });
  const setEntered = (hasEntered: boolean) => setState((s) => ({ ...s, hasEntered }));
  const setQualified = (q: boolean) => {
    // A manual toggle takes back control from any played result.
    setPlayedRank(null);
    setPlayedOutcome(null);
    setPlayoffOutcome(null);
    setState((s) => ({ ...s, qualified: q }));
  };
  const enterLeague = () => setState((s) => ({ ...s, hasEntered: true }));

  // ── Play session ──
  const startQualifierGame = () => {
    setPlayedRank(null);
    setPlayedOutcome(null);
    setSession({ kind: 'qualifier' });
  };
  const startPlayoffGame = () => {
    setPlayoffOutcome(null);
    setSession({ kind: 'playoff' });
  };
  const cancelGame = () => setSession(null);

  const finishQualifier = (rank: number, outcome: QuizOutcome) => {
    setPlayedRank(rank);
    setPlayedOutcome(outcome);
    setSession(null);
    setState((s) => ({ ...s, phase: 'qualifier_done', qualified: rank <= PLAYOFF_CUTOFF }));
  };
  const finishPlayoff = (result: PlayoffOutcome) => {
    setSession(null);
    setPlayoffOutcome(result);
    if (result.status === 'champion') setState((s) => ({ ...s, phase: 'completed' }));
  };

  const activeMilestone: Milestone | null = useMemo(() => {
    switch (state.phase) {
      case 'upcoming':
        return milestones.entry;
      case 'entry_open':
        return milestones.qualifier;
      case 'qualifier_done':
        return milestones.playoffs;
      default:
        return null;
    }
  }, [milestones, state.phase]);

  const leaderboard = useMemo(
    () => (playedRank != null ? buildLeaderboardAtRank(playedRank) : buildLeaderboard(qualified)),
    [playedRank, qualified],
  );
  const yourRank = useMemo(() => leaderboard.findIndex((p) => p.isYou) + 1, [leaderboard]);

  const bracket = useMemo(() => {
    if (state.phase === 'completed') return buildBracket(qualified, 'completed');
    if (state.phase === 'playoffs_live') return buildBracket(qualified, 'live');
    return null;
  }, [state.phase, qualified]);

  const registered = REGISTERED_COUNT + (state.hasEntered ? 1 : 0);

  return {
    ...state,
    qualified, // effective
    milestones,
    activeMilestone,
    leaderboard,
    yourRank,
    bracket,
    registered,
    session,
    playedOutcome,
    playoffOutcome,
    setPhase,
    setEntered,
    setQualified,
    enterLeague,
    startQualifierGame,
    startPlayoffGame,
    cancelGame,
    finishQualifier,
    finishPlayoff,
  };
}

export type WeekendLeagueController = ReturnType<typeof useWeekendLeague>;

'use client';

import { useEffect, useRef } from 'react';
import {
  trackMatchCompleted,
  trackMatchmakingAiFallback,
  trackMatchmakingCancelled,
  trackMatchmakingHumanFound,
  trackMatchmakingStarted,
  trackMatchStarted,
} from '@/lib/analytics/game-events';
import { trackEvent } from '@/lib/posthog';
import type {
  FootballGridCommandResultPayload,
  FootballGridCompletedPayload,
  FootballGridSearchStatePayload,
  FootballGridSeriesInfo,
  FootballGridState,
  OpponentInfo,
} from '@/lib/realtime/socket.types';

const MODE = 'football_grid';

interface FootballGridAnalyticsInput {
  selfUserId: string | null;
  theme: string;
  search: FootballGridSearchStatePayload;
  state: FootballGridState | null;
  opponent: OpponentInfo | null;
  series: FootballGridSeriesInfo | null;
  completed: FootballGridCompletedPayload | null;
  commandResult: FootballGridCommandResultPayload | null;
}

/**
 * PostHog conductor for Tic Tac Toe. Emits the SAME funnel events as ranked
 * and auction (matchmaking_* / match_started / match_completed with
 * mode=football_grid) so the shared dashboards pick the mode up unchanged, plus
 * grid-only events for turns, draws and series. Every event fires once per
 * key; redelivered payloads never double-count.
 */
export function useFootballGridAnalytics(input: FootballGridAnalyticsInput): void {
  const { selfUserId, theme, search, state, opponent, series, completed, commandResult } = input;
  const searchRef = useRef<{ searchId: string; startedAt: number } | null>(null);
  const startedMatchesRef = useRef<Set<string>>(new Set());
  const completedMatchesRef = useRef<Set<string>>(new Set());
  const completedSeriesRef = useRef<Set<string>>(new Set());
  const matchStartedAtRef = useRef<Map<string, number>>(new Map());
  const answersRef = useRef<Map<string, { answered: number; correct: number }>>(new Map());
  const lastCommandRef = useRef<string | null>(null);

  // Matchmaking: started → human found / bot fallback / cancelled.
  useEffect(() => {
    const searching = search.state === 'searching' || search.state === 'pairing';
    if (searching && search.searchId && searchRef.current?.searchId !== search.searchId) {
      searchRef.current = { searchId: search.searchId, startedAt: search.queuedAt ? Date.parse(search.queuedAt) : Date.now() };
      trackMatchmakingStarted(MODE, theme);
      return;
    }
    if (!searching && search.state === 'idle' && searchRef.current && !state) {
      trackMatchmakingCancelled(MODE, Date.now() - searchRef.current.startedAt);
      searchRef.current = null;
    }
  }, [search.queuedAt, search.searchId, search.state, state, theme]);

  // Match found → started (once per match id).
  useEffect(() => {
    if (!state || !selfUserId || startedMatchesRef.current.has(state.matchId)) return;
    startedMatchesRef.current.add(state.matchId);
    matchStartedAtRef.current.set(state.matchId, Date.now());
    const opponentPlayer = state.players.find((player) => player.userId !== selfUserId);
    const opponentIsAi = Boolean(opponentPlayer?.isBot);
    if (searchRef.current) {
      const waitMs = Date.now() - searchRef.current.startedAt;
      if (opponentIsAi) trackMatchmakingAiFallback(MODE, waitMs);
      else trackMatchmakingHumanFound(MODE, waitMs);
      searchRef.current = null;
    }
    trackMatchStarted({
      matchId: state.matchId,
      mode: MODE,
      variant: `${theme}:${series?.format ?? 'single'}:g${series?.gameIndex ?? 1}`,
      opponentIsAi,
      opponentRp: opponent?.rp,
    });
  }, [opponent?.rp, selfUserId, series?.format, series?.gameIndex, state, theme]);

  // Turns and draw offers, once per command result.
  useEffect(() => {
    if (!commandResult || lastCommandRef.current === commandResult.commandId) return;
    lastCommandRef.current = commandResult.commandId;
    const tally = answersRef.current.get(commandResult.matchId) ?? { answered: 0, correct: 0 };
    if (commandResult.outcome === 'draw_offered') {
      trackEvent('grid_draw_offered', { match_id: commandResult.matchId, mode: MODE });
    } else if (commandResult.outcome === 'draw_accepted' || commandResult.outcome === 'draw_declined') {
      trackEvent('grid_draw_responded', { match_id: commandResult.matchId, mode: MODE, accepted: commandResult.outcome === 'draw_accepted' });
    } else {
      if (commandResult.outcome !== 'pass') tally.answered += 1;
      if (commandResult.outcome === 'correct') tally.correct += 1;
      answersRef.current.set(commandResult.matchId, tally);
      trackEvent('grid_turn_submitted', { match_id: commandResult.matchId, mode: MODE, outcome: commandResult.outcome });
    }
  }, [commandResult]);

  // Game completed (once per match) + series completed (once per series).
  useEffect(() => {
    if (!completed || !selfUserId || completedMatchesRef.current.has(completed.matchId)) return;
    completedMatchesRef.current.add(completed.matchId);
    const finalState = completed.state;
    const opponentPlayer = finalState.players.find((player) => player.userId !== selfUserId);
    const tally = answersRef.current.get(completed.matchId) ?? { answered: 0, correct: 0 };
    const startedAt = matchStartedAtRef.current.get(completed.matchId);
    const gameSeries = completed.series ?? series;
    const myWins = gameSeries?.wins[selfUserId] ?? 0;
    const theirWins = opponentPlayer ? gameSeries?.wins[opponentPlayer.userId] ?? 0 : 0;
    trackMatchCompleted({
      matchId: completed.matchId,
      mode: MODE,
      variant: `${theme}:${gameSeries?.format ?? 'single'}:g${gameSeries?.gameIndex ?? 1}`,
      won: finalState.winnerUserId === selfUserId,
      score: myWins,
      opponentScore: theirWins,
      durationSec: startedAt ? Math.round((Date.now() - startedAt) / 1000) : undefined,
      questionsAnswered: tally.answered,
      correctAnswers: tally.correct,
      opponentIsAi: Boolean(opponentPlayer?.isBot),
      winnerDecisionMethod: finalState.completionReason ?? null,
    });
    trackEvent('grid_game_completed', {
      match_id: completed.matchId,
      mode: MODE,
      completion_reason: finalState.completionReason ?? null,
      draw: !finalState.winnerUserId,
      claims: finalState.claims.length,
      turns: finalState.turnNumber,
    });
    if (gameSeries?.finished && !completedSeriesRef.current.has(gameSeries.seriesId)) {
      completedSeriesRef.current.add(gameSeries.seriesId);
      trackEvent('grid_series_completed', {
        series_id: gameSeries.seriesId,
        mode: MODE,
        format: gameSeries.format,
        games: gameSeries.gameIndex,
        won: gameSeries.winnerUserId === selfUserId,
        draw: !gameSeries.winnerUserId,
        score: `${myWins}-${theirWins}`,
        opponent_is_ai: Boolean(opponentPlayer?.isBot),
      });
    }
  }, [completed, selfUserId, series, theme]);
}

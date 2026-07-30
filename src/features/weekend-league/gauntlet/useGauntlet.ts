'use client';

import { useCallback, useMemo, useState } from 'react';
import { buildGames, ROUNDS, rankForScore } from './gauntlet.data';
import type { GauntletExit, GauntletScreenKind, RoundResult } from './gauntlet.types';

export interface DevSettings {
  /** Divide all timers by 4 for quick walkthroughs. */
  fastTimers: boolean;
  /** Override the end-of-game outcome regardless of the simulated rank. */
  forceOutcome: 'auto' | 'survive' | 'eliminate';
}

/**
 * The Saturday gauntlet state machine. Owns which game/round/screen we're on
 * and the player's per-game score; ranks come from the deterministic field sim.
 * The field only shrinks between games — during rounds only ranks move.
 */
export function useGauntlet(
  onExit: (exit: GauntletExit) => void,
  initialScreen: GauntletScreenKind = 'lobby',
  fieldSize = 600,
  singleGame = false,
) {
  // The ladder is derived from the field that actually showed up, so a 200-player
  // Saturday still runs three games and ends on 25 finalists. The Sunday final
  // is a single game instead.
  const games = useMemo(() => buildGames(fieldSize, singleGame), [fieldSize, singleGame]);
  const [gameIndex, setGameIndex] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [screen, setScreen] = useState<GauntletScreenKind>(initialScreen);
  const [score, setScore] = useState(0);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [prevRank, setPrevRank] = useState<number | null>(null);
  const [bestRound, setBestRound] = useState<{ round: number; points: number }>({ round: 0, points: 0 });
  const [dev, setDev] = useState<DevSettings>({ fastTimers: false, forceOutcome: 'auto' });

  const game = games[gameIndex];
  const round = ROUNDS[roundIndex];

  // Rank after the rounds resolved so far (score already includes them).
  const rank = useMemo(
    () =>
      rankForScore(
        gameIndex,
        roundIndex + (screen === 'question' || screen === 'intro' || screen === 'roundIntro' ? 0 : 1),
        score,
        games,
      ),
    [gameIndex, roundIndex, screen, score, games],
  );

  /** Final-rank override for dev-forced outcomes at the end of a game. */
  const finalRank = useMemo(() => {
    if (dev.forceOutcome === 'survive') return Math.min(rank, Math.max(1, game.advance - 6));
    if (dev.forceOutcome === 'eliminate') return Math.max(rank, game.advance + 40);
    return rank;
  }, [dev.forceOutcome, rank, game.advance]);

  const survived = finalRank <= game.advance;
  const isLastGame = gameIndex === games.length - 1;

  // Entering goes through the ready check-in first; kickoff starts the rounds.
  const start = useCallback(() => setScreen('checkin'), []);
  const beginGames = useCallback(() => setScreen('intro'), []);
  const introDone = useCallback(() => setScreen('roundIntro'), []);
  const roundIntroDone = useCallback(() => setScreen('question'), []);

  const answer = useCallback(
    (result: RoundResult) => {
      setPrevRank(rankForScore(gameIndex, roundIndex, score, games));
      setScore((s) => s + result.points);
      setLastResult(result);
      if (result.points > bestRound.points) setBestRound({ round: roundIndex, points: result.points });
      setScreen('reveal');
    },
    [gameIndex, roundIndex, score, bestRound.points, games],
  );

  // Standings only show once a game ends — between rounds we go straight to
  // the next round's intro overlay.
  const revealDone = useCallback(() => {
    if (roundIndex < ROUNDS.length - 1) {
      setRoundIndex((r) => r + 1);
      setScreen('roundIntro');
    } else {
      setScreen('elimination');
    }
  }, [roundIndex]);

  const eliminationDone = useCallback(() => setScreen('result'), []);

  const resultContinue = useCallback(() => {
    if (!survived) {
      onExit({ status: 'eliminated', gameIndex, rank: finalRank, score });
      return;
    }
    if (isLastGame) {
      onExit({ status: 'finalist', rank: finalRank, score });
      return;
    }
    setScreen('break');
  }, [survived, isLastGame, onExit, gameIndex, finalRank, score]);

  const breakDone = useCallback(() => {
    setGameIndex((g) => g + 1);
    setRoundIndex(0);
    setScore(0);
    setPrevRank(null);
    setBestRound({ round: 0, points: 0 });
    setScreen('intro');
  }, []);

  const leave = useCallback(() => onExit({ status: 'left' }), [onExit]);

  // ── Dev panel ──
  const jumpTo = useCallback((g: number, r: number) => {
    setGameIndex(g);
    setRoundIndex(r);
    setScore(0);
    setPrevRank(null);
    setBestRound({ round: 0, points: 0 });
    setScreen('question');
  }, []);
  const reset = useCallback(() => {
    setGameIndex(0);
    setRoundIndex(0);
    setScore(0);
    setPrevRank(null);
    setBestRound({ round: 0, points: 0 });
    setScreen('lobby');
  }, []);

  return {
    games,
    gameIndex,
    roundIndex,
    game,
    round,
    screen,
    score,
    rank,
    finalRank,
    prevRank,
    survived,
    isLastGame,
    lastResult,
    bestRound,
    dev,
    setDev,
    start,
    beginGames,
    introDone,
    roundIntroDone,
    answer,
    revealDone,
    eliminationDone,
    resultContinue,
    breakDone,
    leave,
    jumpTo,
    reset,
  };
}

export type GauntletController = ReturnType<typeof useGauntlet>;

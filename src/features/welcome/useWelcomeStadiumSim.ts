'use client';

/**
 * Controller for the WelcomeScreen hero stadium simulation.
 *
 * Owns all of the landing animation state: stadium cycle/phase,
 * player position, ball ownership, goal visibility, target goal,
 * shot mode, in-flight score animations, score counter, and the
 * randomized demo-player loadout used by the hero avatars.
 *
 * Drives three effects:
 *  - shuffle demo players post-mount (SSR-safe initialiser starts
 *    with the deterministic loadout; client re-shuffles after paint).
 *  - subheading phrase rotation (`currentPhraseIndex`).
 *  - per-cycle stadium animation timeline that fires score flights,
 *    morphs into bars, runs charge/battle/result, and either fires
 *    a goal celebration (resetting the field) or pauses for the
 *    next cycle.
 *  - score reset when either side reaches 3.
 *
 * The shell passes the resulting state into PitchVisualization and
 * BarBattleFlightOverlay. The DOM-anchored flight targets need the
 * pitch + score-anchor refs, so those are returned for the JSX to
 * attach.
 */

import { useEffect, useRef, useState } from 'react';
import { GOAL_CELEBRATION_MS, GOAL_SHOT_TO_CELEBRATION_MS } from '@/features/possession/realtimePossession.helpers';
import type { BarBattleState } from '@/features/possession/components/BarBattleOverlay';
import { FLIGHT_TOTAL_MS, type FlightSpec } from '@/features/possession/components/BarBattleFlightOverlay';
import type { PitchVisualization } from '@/features/possession/components/PitchVisualization';
import {
  DEMO_AVATAR_LOADOUTS,
  DEMO_PLAYER_NAMES,
  LANDING_BARS_PER_STAGGER_MS,
  LANDING_BARS_SPAWN_BASE_MS,
  LANDING_BATTLE_BASE_MS,
  LANDING_BATTLE_PER_BAR_MS,
  LANDING_CHARGE_BASE_MS,
  LANDING_CHARGE_PER_BAR_MS,
  LANDING_CHARGE_SHOT_OVERLAP_MS,
  LANDING_CONVERT_MS,
  LANDING_DONE_LINGER_MS,
  LANDING_LOOP_REST_MS,
  LANDING_RESULT_HOLD_MS,
  LANDING_SCORE_FLIGHT_START_MS,
  SUBHEADING_PHRASE_KEYS,
} from './welcome.content';
import {
  getElementCenter,
  getLandingAvatarX,
  getLandingScenario,
  getLandingTargetPosition,
  landingPointsToBars,
} from './welcome.helpers';
import type { DemoPlayer, LandingGoalSide } from './welcome.types';

const LANDING_SCORE_HANDOFF_MS = FLIGHT_TOTAL_MS + 420;

export function useWelcomeStadiumSim() {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [stadiumPhase, setStadiumPhase] = useState(0);
  const [stadiumCycle, setStadiumCycle] = useState(0);
  const [landingScore, setLandingScore] = useState({ left: 0, right: 0 });
  const [landingBattle, setLandingBattle] = useState<BarBattleState | null>(null);
  const [landingPlayerPosition, setLandingPlayerPosition] = useState(50);
  const [landingBallOnPlayer, setLandingBallOnPlayer] = useState(true);
  const [landingGoalVisible, setLandingGoalVisible] = useState(false);
  const [landingTargetGoal, setLandingTargetGoal] = useState<LandingGoalSide>('right');
  const [landingShotMode, setLandingShotMode] = useState<
    React.ComponentProps<typeof PitchVisualization>['shotMode']
  >(undefined);
  const [landingFlights, setLandingFlights] = useState<FlightSpec[]>([]);

  const leftScoreAnchorRef = useRef<HTMLDivElement | null>(null);
  const rightScoreAnchorRef = useRef<HTMLDivElement | null>(null);
  const landingPitchRef = useRef<HTMLDivElement | null>(null);
  const landingFlightSeqRef = useRef(0);
  const landingPositionRef = useRef(50);
  const landingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Start with a deterministic loadout so SSR and client first paint match
  // (Math.random in useState breaks hydration). Re-shuffle after mount so
  // returning visitors see variety without affecting the SEO-critical HTML.
  const [demoPlayers, setDemoPlayers] = useState<{
    left: DemoPlayer;
    right: DemoPlayer;
    crowd: DemoPlayer[];
  }>(() => {
    const make = (index: number, fallbackName: string): DemoPlayer => ({
      name: DEMO_PLAYER_NAMES[index] ?? fallbackName,
      avatarCustomization: DEMO_AVATAR_LOADOUTS[index % DEMO_AVATAR_LOADOUTS.length],
    });
    return {
      left: make(0, 'Mason'),
      right: make(1, 'Thiago'),
      crowd: [make(2, 'Santi'), make(3, 'Jamal'), make(4, 'Enzo')],
    };
  });

  useEffect(() => {
    const shuffledNames = [...DEMO_PLAYER_NAMES].sort(() => Math.random() - 0.5);
    const shuffledLoadouts = [...DEMO_AVATAR_LOADOUTS].sort(() => Math.random() - 0.5);
    const make = (index: number, fallbackName: string): DemoPlayer => ({
      name: shuffledNames[index] ?? fallbackName,
      avatarCustomization: shuffledLoadouts[index] ?? DEMO_AVATAR_LOADOUTS[index % DEMO_AVATAR_LOADOUTS.length],
    });
    queueMicrotask(() => {
      setDemoPlayers({
        left: make(0, 'Mason'),
        right: make(1, 'Thiago'),
        crowd: [make(2, 'Santi'), make(3, 'Jamal'), make(4, 'Enzo')],
      });
    });
  }, []);

  // Subheading rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPhraseIndex((prev) => (prev + 1) % SUBHEADING_PHRASE_KEYS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    landingTimersRef.current.forEach((timer) => clearTimeout(timer));
    landingTimersRef.current = [];

    const scenario = getLandingScenario(stadiumCycle);
    const playerBars = landingPointsToBars(scenario.playerPoints);
    const opponentBars = landingPointsToBars(scenario.opponentPoints);
    const maxBars = Math.max(playerBars, opponentBars);
    const cancelledCount = Math.min(playerBars, opponentBars);
    const survivorCount = maxBars - cancelledCount;
    const remainingDelta = playerBars - opponentBars;
    const isGoalScenario = scenario.kind === 'left-goal' || scenario.kind === 'right-goal';
    const playerIsAttacker = scenario.kind === 'left-goal';
    const targetGoal: LandingGoalSide = playerIsAttacker ? 'right' : 'left';
    const startPosition = landingPositionRef.current;
    const targetPosition = getLandingTargetPosition(startPosition, scenario);
    const battleKey = stadiumCycle;
    const baseBattle: BarBattleState = {
      key: battleKey,
      phase: 'both-score',
      playerBars,
      opponentBars,
      playerPoints: scenario.playerPoints,
      opponentPoints: scenario.opponentPoints,
      remainingDelta,
      dividerX: 242.5,
      chargeMode: isGoalScenario ? 'lunge' : 'pulse',
    };
    const schedule = (delayMs: number, callback: () => void) => {
      const timer = setTimeout(callback, delayMs);
      landingTimersRef.current.push(timer);
    };
    const setBattlePhase = (delayMs: number, phase: BarBattleState['phase']) => {
      schedule(delayMs, () => {
        setLandingBattle((prev) => prev?.key === battleKey ? { ...prev, phase } : prev);
      });
    };

    schedule(0, () => {
      setStadiumPhase(0);
      setLandingPlayerPosition(startPosition);
      setLandingBallOnPlayer(remainingDelta >= 0);
      setLandingGoalVisible(false);
      setLandingFlights([]);
      setLandingShotMode(undefined);
      setLandingTargetGoal(targetGoal);
      setLandingBattle(baseBattle);
    });

    schedule(LANDING_SCORE_FLIGHT_START_MS, () => {
      const pitch = landingPitchRef.current;
      const playerTarget = getElementCenter(
        pitch?.querySelector('[data-pitch-bar-target="player"]')
          ?? pitch?.querySelector('[data-pitch-avatar="player"]')
          ?? null,
      );
      const opponentTarget = getElementCenter(
        pitch?.querySelector('[data-pitch-bar-target="opponent"]')
          ?? pitch?.querySelector('[data-pitch-avatar="opponent"]')
          ?? null,
      );
      const playerSource = getElementCenter(leftScoreAnchorRef.current);
      const opponentSource = getElementCenter(rightScoreAnchorRef.current);
      const nextFlights: FlightSpec[] = [];

      if (scenario.playerPoints > 0 && playerSource && playerTarget) {
        nextFlights.push({
          id: ++landingFlightSeqRef.current,
          side: 'player',
          source: playerSource,
          target: playerTarget,
          points: scenario.playerPoints,
        });
      }

      if (scenario.opponentPoints > 0 && opponentSource && opponentTarget) {
        nextFlights.push({
          id: ++landingFlightSeqRef.current,
          side: 'opponent',
          source: opponentSource,
          target: opponentTarget,
          points: scenario.opponentPoints,
        });
      }

      if (nextFlights.length > 0) {
        setLandingFlights((flights) => [...flights, ...nextFlights]);
      }
    });

    let t = LANDING_SCORE_HANDOFF_MS;
    setBattlePhase(t, 'convert');

    t += LANDING_CONVERT_MS;
    setBattlePhase(t, 'bars');

    t += LANDING_BARS_SPAWN_BASE_MS + maxBars * LANDING_BARS_PER_STAGGER_MS;
    if (cancelledCount > 0) {
      setBattlePhase(t, 'battle');
      t += LANDING_BATTLE_BASE_MS + cancelledCount * LANDING_BATTLE_PER_BAR_MS;
    }

    if (isGoalScenario && survivorCount > 0) {
      const chargeMs = LANDING_CHARGE_BASE_MS + survivorCount * LANDING_CHARGE_PER_BAR_MS;
      setBattlePhase(t, 'charge');
      schedule(t + Math.max(0, chargeMs - LANDING_CHARGE_SHOT_OVERLAP_MS), () => {
        setLandingBattle(null);
        landingPositionRef.current = targetPosition;
        setLandingPlayerPosition(targetPosition);
        setLandingTargetGoal(targetGoal);
        setLandingBallOnPlayer(playerIsAttacker);
        setLandingShotMode({
          result: 'goal',
          ballOriginX: getLandingAvatarX(targetPosition, playerIsAttacker ? 'player' : 'opponent'),
          isPlayerAttacker: playerIsAttacker,
          variant: stadiumCycle % 5,
          shotId: `landing-${stadiumCycle}`,
        });
      });
      t += chargeMs;
    } else {
      setBattlePhase(t, 'result');
      schedule(t + 80, () => {
        landingPositionRef.current = targetPosition;
        setLandingPlayerPosition(targetPosition);
        setLandingBallOnPlayer(remainingDelta >= 0);
      });
    }

    if (isGoalScenario) {
      schedule(t + GOAL_SHOT_TO_CELEBRATION_MS, () => {
        setLandingGoalVisible(true);
        setLandingScore((score) => ({
          left: score.left + (playerIsAttacker ? 1 : 0),
          right: score.right + (playerIsAttacker ? 0 : 1),
        }));
        // Snap avatars back to center as the celebration starts (matches the
        // ranked match), instead of leaving them pushed out until it ends.
        setLandingShotMode(undefined);
        setLandingBattle(null);
        landingPositionRef.current = 50;
        setLandingPlayerPosition(50);
        setStadiumPhase(2);
      });
      schedule(t + GOAL_SHOT_TO_CELEBRATION_MS + GOAL_CELEBRATION_MS, () => {
        setLandingGoalVisible(false);
        setLandingBallOnPlayer(true);
        setStadiumPhase(3);
        setStadiumCycle((cycle) => cycle + 1);
      });
    } else {
      t += LANDING_RESULT_HOLD_MS;
      setBattlePhase(t, 'done');
      schedule(t + LANDING_DONE_LINGER_MS, () => {
        setLandingBattle(null);
      });
      schedule(t + LANDING_DONE_LINGER_MS + LANDING_LOOP_REST_MS, () => {
        setLandingShotMode(undefined);
        setStadiumPhase(3);
        setStadiumCycle((cycle) => cycle + 1);
      });
    }

    return () => {
      landingTimersRef.current.forEach((timer) => clearTimeout(timer));
      landingTimersRef.current = [];
    };
  }, [stadiumCycle]);

  useEffect(() => {
    if (landingScore.left < 3 && landingScore.right < 3) return;
    const timer = setTimeout(() => setLandingScore({ left: 0, right: 0 }), 1200);
    return () => clearTimeout(timer);
  }, [landingScore.left, landingScore.right]);

  return {
    currentPhraseIndex,
    stadiumPhase,
    landingScore,
    landingBattle,
    landingPlayerPosition,
    landingBallOnPlayer,
    landingGoalVisible,
    landingTargetGoal,
    landingShotMode,
    landingFlights,
    setLandingFlights,
    leftScoreAnchorRef,
    rightScoreAnchorRef,
    landingPitchRef,
    demoPlayers,
  };
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PossessionMatchViewport,
  type PossessionViewportModel,
} from "@/features/possession/components/PossessionMatchViewport";
import { PossessionQuestionPanel } from "@/components/game/PossessionQuestionPanel";
import { BarBattleFlightOverlay } from "@/features/possession/components/BarBattleFlightOverlay";
import { useBarBattle, getBarBattleTotalMs, getBarBattleGoalAttackDelayMs } from "@/features/possession/hooks/useBarBattle";
import { usePossessionBarBattleFlights } from "@/features/possession/hooks/usePossessionBarBattleFlights";
import {
  GOAL_ATTACK_START_DELAY_MS,
  GOAL_CELEBRATION_MS,
  GOAL_SHOT_TO_CELEBRATION_MS,
} from "@/features/possession/realtimePossession.helpers";
import type {
  MatchAnswerAckPayload,
  MatchRoundResultPayload,
  MatchRoundResultPlayer,
} from "@/lib/realtime/socket.types";
import { usePlayerAvatar } from "@/hooks/usePlayerAvatar";
import { usePlayer } from "@/contexts/PlayerContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useTraining } from "../TrainingMatchProvider";
import {
  TRAINING_DEMO_GOAL_INDEX,
  TRAINING_SCRIPT,
  getTrainingRequiredAnswerIndex,
  getTrainingShotPlan,
} from "../data/trainingScript";
import { localizeTrainingQuestion } from "../data/trainingQuestions";
import { BOT_AVATAR, BOT_AVATAR_CUSTOMIZATION, BOT_NAME, BOT_RANK_POINTS } from "../constants";
import {
  TRAINING_MATCH_ID,
  TRAINING_OPPONENT_ID,
  patchTrainingMatch,
  startTrainingRound,
  trainingSelfId,
} from "../lib/trainingRealtimeSim";

const TOTAL_QUESTIONS = 12;
const SIMPLE_SHOT_OTHER_FLIGHT_MS = 900;
const RESULT_TOOLTIP_HANDOFF_MS = 600;

export function TrainingPlayingStage() {
  const { match, tooltips, onSkip } = useTraining();
  const { player } = usePlayer();
  const { locale, t } = useLocale();
  const { avatarUrl: playerAvatar, avatarCustomization, username: playerName } = usePlayerAvatar();

  const { state } = match;
  const {
    dismissPlayerSplash,
    dismissOpponentSplash,
    advanceAfterReveal,
    showGoalCelebration,
    finishGoalCelebration,
    finishShotFlight,
    continueAfterPhase,
    handleTimeout,
  } = match;
  const prevQuestionIndex = useRef(state.questionIndex);
  const prevZoneKey = useRef(state.zoneKey);
  const prevPhase = useRef(state.phase);

  // ── Synthesize the socket payloads the ranked bar battle is driven by ──
  // Both players "resolve" at the same moment in training, so ack and round
  // result appear together at reveal and clear when the next question starts.
  const isRevealish =
    state.phase === "reveal" ||
    state.phase === "shot" ||
    state.phase === "goal" ||
    state.phase === "saved";

  // The demo-goal round holds its (forced 100 vs 0) animation behind an
  // explainer modal — the full flight → bars → charge → shot → goal chain only
  // starts after GOT IT, so nothing plays half-hidden under the backdrop.
  const isDemoGoalRound = state.questionIndex === TRAINING_DEMO_GOAL_INDEX;
  const [demoIntroDone, setDemoIntroDone] = useState(false);
  const demoTooltipFiredRef = useRef(false);

  useEffect(() => {
    if (isDemoGoalRound && state.phase === "reveal" && !demoTooltipFiredRef.current) {
      demoTooltipFiredRef.current = true;
      tooltips.tryShowEventTooltip("goal-demo");
    }
  }, [isDemoGoalRound, state.phase, tooltips]);

  useEffect(() => {
    if (isDemoGoalRound && isRevealish && !tooltips.isPaused && demoTooltipFiredRef.current) {
      setDemoIntroDone(true);
    }
  }, [isDemoGoalRound, isRevealish, tooltips.isPaused]);

  const payloadsHeld = isDemoGoalRound && isRevealish && !demoIntroDone;
  const hasResolvedAnswer =
    isRevealish && state.selectedAnswer !== null && state.question !== null && !payloadsHeld;

  // Season 3: ranked is MCQ-only, so every training round is an MCQ.
  const questionKind = "multipleChoice" as const;
  const playerAnsweredCorrectly = state.playerQuestionResults[state.questionIndex] === "correct";
  const activeScript = TRAINING_SCRIPT[state.questionIndex];
  const localizedQuestion = useMemo(
    () => state.question ? localizeTrainingQuestion(state.question, locale) : null,
    [locale, state.question],
  );
  const requiredAnswerIndex = state.question
    ? getTrainingRequiredAnswerIndex(activeScript, state.question)
    : null;
  const projectedDiff = state.possessionDiff + (state.pendingPointDiff ?? 0);
  const projectedPosition = Math.max(0, Math.min(100, 50 + projectedDiff / 2));
  const shotPlan = useMemo(() => getTrainingShotPlan({
    script: activeScript,
    playerCorrect: playerAnsweredCorrectly,
    opponentCorrect: state.opponentAnsweredCorrectly === true,
    projectedPosition,
  }), [activeScript, playerAnsweredCorrectly, projectedPosition, state.opponentAnsweredCorrectly]);

  const answerAck = useMemo<MatchAnswerAckPayload | null>(() => {
    if (!hasResolvedAnswer || !state.question) return null;
    const selected = state.selectedAnswer !== null && state.selectedAnswer >= 0 ? state.selectedAnswer : null;
    return {
      matchId: TRAINING_MATCH_ID,
      qIndex: state.questionIndex,
      questionKind,
      selectedIndex: selected,
      isCorrect: playerAnsweredCorrectly,
      correctIndex: state.question.correctIndex,
      myTotalPoints: 0,
      oppAnswered: true,
      pointsEarned: state.playerSplashPoints,
      phaseKind: "normal",
    };
  }, [hasResolvedAnswer, state.question, state.selectedAnswer, state.questionIndex, state.playerSplashPoints, questionKind, playerAnsweredCorrectly]);

  const myRound = useMemo<MatchRoundResultPlayer | null>(() => {
    if (!hasResolvedAnswer || !state.question) return null;
    const selected = state.selectedAnswer !== null && state.selectedAnswer >= 0 ? state.selectedAnswer : null;
    return {
      selectedIndex: selected,
      isCorrect: playerAnsweredCorrectly,
      timeMs: 0,
      pointsEarned: state.playerSplashPoints,
      totalPoints: 0,
      submittedOrderIds: [],
    };
  }, [hasResolvedAnswer, state.question, state.selectedAnswer, state.playerSplashPoints, playerAnsweredCorrectly]);

  const opponentRound = useMemo<MatchRoundResultPlayer | null>(() => {
    if (!hasResolvedAnswer || !state.question) return null;
    return {
      selectedIndex: state.opponentAnswer,
      isCorrect: state.opponentAnsweredCorrectly === true,
      timeMs: 0,
      pointsEarned: state.opponentSplashPoints,
      totalPoints: 0,
      submittedOrderIds: [],
    };
  }, [hasResolvedAnswer, state.question, state.opponentAnswer, state.opponentAnsweredCorrectly, state.opponentSplashPoints]);

  const roundResult = useMemo<MatchRoundResultPayload | null>(() => {
    if (!hasResolvedAnswer || !state.question || !myRound || !opponentRound) return null;
    return {
      matchId: TRAINING_MATCH_ID,
      qIndex: state.questionIndex,
      questionKind,
      reveal: { kind: "multipleChoice", correctIndex: state.question.correctIndex },
      players: { [trainingSelfId()]: myRound, [TRAINING_OPPONENT_ID]: opponentRound },
      phaseKind: "normal",
      deltas: {
        possessionDelta: state.playerSplashPoints - state.opponentSplashPoints,
        penaltyOutcome: null,
        // This flag is what makes the shared bar-battle enter its real
        // bars → battle → charge → kick lifecycle for an open-play goal.
        goalScoredBySeat: shotPlan?.result === "goal"
          ? (shotPlan.isPlayerAttacker ? 1 : 2)
          : null,
      },
    };
  }, [hasResolvedAnswer, state.question, state.questionIndex, myRound, opponentRound, state.playerSplashPoints, state.opponentSplashPoints, questionKind, shotPlan]);

  // ── Hydrate the realtime store so the ranked flight pipeline runs ──
  useEffect(() => {
    if (state.stage !== "playing" || !state.question) return;
    startTrainingRound(state.question, state.questionIndex, TOTAL_QUESTIONS);
  }, [state.stage, state.question, state.questionIndex]);

  // Clear the round payloads when this stage unmounts (halftime/penalties) —
  // a remounted flight hook has fresh dedupe refs and would otherwise replay
  // the last round's flights against the new stage's anchors.
  useEffect(() => () => {
    patchTrainingMatch({
      currentQuestion: null,
      answerAck: null,
      lastRoundResult: null,
      opponentAnswered: false,
      opponentAnsweredCorrectly: null,
      opponentRecentPoints: 0,
    });
  }, []);

  useEffect(() => {
    if (!hasResolvedAnswer) return;
    patchTrainingMatch({
      answerAck,
      lastRoundResult: roundResult,
      opponentAnswered: true,
      opponentAnsweredCorrectly: state.opponentAnsweredCorrectly,
      opponentRecentPoints: state.opponentSplashPoints,
    });
  }, [hasResolvedAnswer, answerAck, roundResult, state.opponentAnsweredCorrectly, state.opponentSplashPoints]);

  const barBattleFlights = usePossessionBarBattleFlights();

  // Divider X in pitch SVG coords — same mapping the ranked controller uses
  // (centerPossessionTrack ⇒ track spans 15..485).
  const mirrored = state.half === 2;
  const possessionTrackLeft = 15;
  const possessionTrackRight = 485;
  const possessionTrackWidth = possessionTrackRight - possessionTrackLeft;
  const dividerX = mirrored
    ? possessionTrackRight - (state.playerPosition / 100) * possessionTrackWidth
    : possessionTrackLeft + (state.playerPosition / 100) * possessionTrackWidth;

  const barBattle = useBarBattle({
    answerAck,
    opponentAnswered: state.opponentAnswered,
    opponentRecentPoints: isRevealish ? state.opponentSplashPoints : null,
    opponentAnsweredCorrectly: state.opponentAnsweredCorrectly,
    roundResult,
    myRound,
    opponentRound,
    phaseKind: "normal",
    dividerX,
    unopposedBarPulse: true,
    forceShotResolution: shotPlan !== null,
    mySeat: 1,
  });

  // Trigger tooltips on question index change. Every trigger below waits for
  // the "playing" phase — firing during reveal/shot/goal cuts the animation.
  useEffect(() => {
    if (state.phase !== "playing") return;
    if (prevQuestionIndex.current !== state.questionIndex) {
      prevQuestionIndex.current = state.questionIndex;
      tooltips.tryShowQuestionTooltip(state.questionIndex);
    }
  }, [state.questionIndex, state.phase, tooltips]);

  // Fire once on mount for the initial question
  useEffect(() => {
    tooltips.tryShowQuestionTooltip(state.questionIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger zone tooltip
  useEffect(() => {
    if (prevZoneKey.current === state.zoneKey) return;
    prevZoneKey.current = state.zoneKey;
    if (state.phase !== "playing") return;
    tooltips.tryShowZoneTooltip(state.zoneKey);
  }, [state.zoneKey, state.phase, tooltips]);

  // Goal/saved are entered only AFTER their animation has landed, so their
  // coach card can open immediately without cutting the sequence in half.
  useEffect(() => {
    if (prevPhase.current === state.phase) return;
    prevPhase.current = state.phase;
    tooltips.tryShowPhaseTooltip(state.phase);
  }, [state.phase, tooltips]);

  // Auto-dismiss splashes after a fixed delay (safety net if animation callbacks don't fire)
  useEffect(() => {
    if (payloadsHeld) return;
    if (state.phase === "reveal" && (state.showPlayerSplash || state.showOpponentSplash)) {
      const timer = setTimeout(() => {
        dismissPlayerSplash();
        dismissOpponentSplash();
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [payloadsHeld, state.phase, state.showPlayerSplash, state.showOpponentSplash, dismissPlayerSplash, dismissOpponentSplash]);

  const willShoot = shotPlan !== null;

  // Auto-advance after reveal, timed like ranked: when a shot follows, hand
  // off DURING the bar charge (getBarBattleGoalAttackDelayMs) so the charge
  // flows straight into the kick; otherwise wait for the battle to finish.
  useEffect(() => {
    if (state.phase !== "reveal" || payloadsHeld || tooltips.isPaused) return;
    // Shot rounds hand off during the charge (bars power the kick); other
    // rounds wait for the full pulse timeline so surviving bars finish pushing.
    const delay = willShoot
      ? getBarBattleGoalAttackDelayMs(state.playerSplashPoints, state.opponentSplashPoints, GOAL_ATTACK_START_DELAY_MS, {
          includeScoreFlightHandoff: true,
        })
      : getBarBattleTotalMs(state.playerSplashPoints, state.opponentSplashPoints, {
          includeScoreFlightHandoff: true,
          includeUnopposedPulse: true,
        }) + 200;
    const timer = setTimeout(advanceAfterReveal, delay);
    return () => clearTimeout(timer);
  }, [state.phase, payloadsHeld, tooltips.isPaused, willShoot, state.playerSplashPoints, state.opponentSplashPoints, advanceAfterReveal]);

  // Ranked normal-play attacks expose the resolved result at the exact charge
  // handoff. Training does the same in advanceAfterReveal; there is no blank
  // pending-shot interval to insert between charge and kick.
  useEffect(() => {
    if (
      state.phase !== "shot"
      || state.shotMode?.result !== "goal"
      || state.showGoalCelebration
    ) return;
    const timer = setTimeout(showGoalCelebration, GOAL_SHOT_TO_CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, [state.phase, state.shotMode?.result, state.showGoalCelebration, showGoalCelebration]);

  // The celebration owns/hides the pitch ball. Only finish the goal phase once
  // its full overlay has played; the goal tooltip is triggered by that phase.
  useEffect(() => {
    if (state.phase !== "shot" || !state.showGoalCelebration) return;
    const timer = setTimeout(finishGoalCelebration, GOAL_CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, [state.phase, state.showGoalCelebration, finishGoalCelebration]);

  // Saves/misses keep shotMode alive for the complete ball flight, then reset
  // the field and enter the result phase where its tooltip is safe to display.
  useEffect(() => {
    if (
      state.phase !== "shot"
      || (state.shotMode?.result !== "saved" && state.shotMode?.result !== "miss")
    ) return;
    const timer = setTimeout(finishShotFlight, SIMPLE_SHOT_OTHER_FLIGHT_MS);
    return () => clearTimeout(timer);
  }, [state.phase, state.shotMode?.result, finishShotFlight]);

  // Once the result coach card has been dismissed, move to the next question.
  useEffect(() => {
    if ((state.phase !== "goal" && state.phase !== "saved") || tooltips.isPaused) return;
    const timer = setTimeout(continueAfterPhase, RESULT_TOOLTIP_HANDOFF_MS);
    return () => clearTimeout(timer);
  }, [state.phase, tooltips.isPaused, continueAfterPhase]);

  // Handle timeout — treat as wrong answer, show reveal
  useEffect(() => {
    if (state.timeRemaining === 0 && state.phase === "playing" && state.selectedAnswer === null) {
      const timer = setTimeout(handleTimeout, 800);
      return () => clearTimeout(timer);
    }
  }, [state.timeRemaining, state.phase, state.selectedAnswer, handleTimeout]);

  const isShotVisualPhase = state.phase === "shot" && state.shotMode !== null;
  const attackerIsMe = state.shotMode?.isPlayerAttacker ?? true;
  const visualPlayerPosition = isShotVisualPhase
    ? (state.shotMode?.originPosition ?? state.playerPosition)
    : state.playerPosition;
  const suppressSplash = barBattleFlights.suppressScoreSplash;

  const viewportModel: PossessionViewportModel = useMemo(() => ({
    showMainUI: true,
    hud: {
      kind: "possession",
      props: {
        playerGoals: state.playerGoals,
        opponentGoals: state.opponentGoals,
        playerName,
        opponentName: BOT_NAME,
        playerAvatarUrl: playerAvatar,
        opponentAvatarUrl: BOT_AVATAR,
      opponentAvatarCustomization: BOT_AVATAR_CUSTOMIZATION,
        playerAvatarCustomization: avatarCustomization,
        playerRankPoints: player.rankPoints ?? 0,
        opponentRankPoints: BOT_RANK_POINTS,
        timeRemaining: state.phase === "playing" && state.selectedAnswer === null ? state.timeRemaining : null,
        half: state.half,
        questionInHalf: state.questionInHalf,
        zone: state.zone,
        zoneColor: state.zoneColor,
        onQuit: onSkip,
        opponentAnswered: state.opponentAnswered,
        opponentAnsweredCorrectly: state.opponentAnsweredCorrectly,
      },
    },
    // Exact ranked pitchProps shape: simpleShotAnimation cancels the zoom for
    // open-play shots (ranked never zooms outside penalties).
    pitchProps: {
      playerPosition: visualPlayerPosition,
      playerAvatarUrl: playerAvatar,
      playerAvatarCustomization: avatarCustomization,
      opponentAvatarUrl: BOT_AVATAR,
      opponentAvatarCustomization: BOT_AVATAR_CUSTOMIZATION,
      playerName,
      opponentName: BOT_NAME,
      shotMode: state.shotMode ?? undefined,
      zoomToGoal: isShotVisualPhase,
      targetGoal: isShotVisualPhase ? (attackerIsMe !== mirrored ? "right" : "left") : undefined,
      ballOnPlayer: visualPlayerPosition >= 50,
      mirrored,
      barBattle,
      barBattleVariant: "ranked_sim",
      centerPossessionTrack: true,
      simpleShotAnimation: true,
    },
    goalProgressPosition: state.playerPosition,
    goalCelebration: state.showGoalCelebration
      ? {
          scorerName: state.goalScorerIsPlayer ? playerName : BOT_NAME,
          isMeScorer: state.goalScorerIsPlayer,
        }
      : null,
    penaltySplash: null,
    muted: false,
  }), [
    state.playerGoals, state.opponentGoals, state.phase, state.selectedAnswer, state.timeRemaining,
    state.half, state.questionInHalf, state.zone, state.zoneColor, state.opponentAnswered,
    state.opponentAnsweredCorrectly, state.playerPosition, state.shotMode, state.showGoalCelebration,
    state.goalScorerIsPlayer, playerName, playerAvatar, avatarCustomization, player.rankPoints,
    onSkip, isShotVisualPhase, attackerIsMe, mirrored, barBattle, visualPlayerPosition,
  ]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat">
      <div className="w-full max-w-lg flex flex-col lg:max-w-7xl lg:flex-row lg:h-[calc(100dvh-2rem)] lg:items-stretch lg:gap-4 lg:px-4">
        <PossessionMatchViewport model={viewportModel}>
          <div className="relative">
            <>
                {requiredAnswerIndex !== null
                  && localizedQuestion
                  && state.phase === "playing"
                  && !tooltips.isPaused && (
                    <div className="mx-3 mb-1.5 rounded-xl border border-brand-yellow/50 bg-brand-blue/90 px-3 py-2 text-center font-poppins text-xs font-bold text-white shadow-lg sm:mx-4 sm:text-sm">
                      {t(
                        activeScript.requiredAnswer === "wrong"
                          ? "training.tapGuidedWrongAnswer"
                          : "training.tapGuidedAnswer",
                        { answer: localizedQuestion.options[requiredAnswerIndex] },
                      )}
                    </div>
                  )}
                <PossessionQuestionPanel
                  phase={state.phase}
                  isPenaltyPhase={false}
                  isShotPhase={state.phase === "shot"}
                  isLastAttackPhase={false}
                  question={localizedQuestion}
                  qIndex={state.questionIndex}
                  totalQuestions={TOTAL_QUESTIONS}
                  timeRemaining={null}
                  showOptions={state.showOptions}
                  selectedAnswer={state.selectedAnswer}
                  answerStates={state.answerStates}
                  opponentAnswer={state.opponentAnswer}
                  guidedAnswerIndex={requiredAnswerIndex}
                  onAnswer={match.handleAnswer}
                  showPlayerSplash={suppressSplash || payloadsHeld ? false : state.showPlayerSplash}
                  showOpponentSplash={suppressSplash || payloadsHeld ? false : state.showOpponentSplash}
                  playerSplashPoints={suppressSplash || payloadsHeld ? null : state.playerSplashPoints}
                  opponentSplashPoints={suppressSplash || payloadsHeld ? null : state.opponentSplashPoints}
                  onPlayerSplashComplete={match.dismissPlayerSplash}
                  onOpponentSplashComplete={match.dismissOpponentSplash}
                />
            </>
          </div>
        </PossessionMatchViewport>
      </div>

      {/* Bar-battle +N flight overlay — same fixed-position pipeline as ranked. */}
      <BarBattleFlightOverlay
        flights={barBattleFlights.flights}
        onArrive={barBattleFlights.handleFlightArrive}
      />
    </div>
  );
}

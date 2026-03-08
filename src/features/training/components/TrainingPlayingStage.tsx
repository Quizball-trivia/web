"use client";

import { useEffect, useRef, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import { PitchVisualization } from "@/features/possession/components/PitchVisualization";
import { PossessionHUD } from "@/features/possession/components/PossessionHUD";
import { PossessionQuestionPanel } from "@/features/possession/components/PossessionQuestionPanel";
import { PossessionFeed } from "@/features/possession/components/PossessionFeed";
import { GoalCelebrationOverlay } from "@/features/possession/components/GoalCelebrationOverlay";
import { usePlayerAvatar } from "@/hooks/usePlayerAvatar";
import { useTraining } from "../TrainingMatchProvider";
import { TRAINING_SCRIPT } from "../data/trainingScript";
import { BOT_AVATAR, BOT_NAME } from "../constants";

export function TrainingPlayingStage() {
  const { match, tooltips, onSkip } = useTraining();
  const { avatarUrl: playerAvatar, username: playerName } = usePlayerAvatar();

  const { state } = match;
  const prevQuestionIndex = useRef(state.questionIndex);
  const prevZoneKey = useRef(state.zoneKey);
  const prevPhase = useRef(state.phase);

  // Trigger tooltips on question index change
  useEffect(() => {
    if (prevQuestionIndex.current !== state.questionIndex) {
      prevQuestionIndex.current = state.questionIndex;
      tooltips.tryShowQuestionTooltip(state.questionIndex);
    }
  }, [state.questionIndex, tooltips]);

  // Fire once on mount for the initial question
  useEffect(() => {
    tooltips.tryShowQuestionTooltip(state.questionIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger zone tooltip
  useEffect(() => {
    if (prevZoneKey.current !== state.zoneKey) {
      prevZoneKey.current = state.zoneKey;
      tooltips.tryShowZoneTooltip(state.zoneKey);
    }
  }, [state.zoneKey, tooltips]);

  // Trigger phase tooltip
  useEffect(() => {
    if (prevPhase.current !== state.phase) {
      prevPhase.current = state.phase;
      tooltips.tryShowPhaseTooltip(state.phase);
    }
  }, [state.phase, tooltips]);

  // Auto-dismiss splashes after a fixed delay (safety net if animation callbacks don't fire)
  useEffect(() => {
    if (state.phase === "reveal" && (state.showPlayerSplash || state.showOpponentSplash)) {
      const timer = setTimeout(() => {
        match.dismissPlayerSplash();
        match.dismissOpponentSplash();
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.showPlayerSplash, state.showOpponentSplash, match]);

  // Auto-advance after reveal phase — splashes dismissed
  useEffect(() => {
    if (state.phase === "reveal" && !state.showPlayerSplash && !state.showOpponentSplash && !tooltips.isPaused) {
      const timer = setTimeout(() => {
        match.advanceAfterReveal();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.showPlayerSplash, state.showOpponentSplash, tooltips.isPaused, match]);

  // Auto-resolve shot after tooltip is dismissed — use scripted outcome
  useEffect(() => {
    if (state.phase === "shot" && !tooltips.isPaused) {
      const timer = setTimeout(() => {
        const script = TRAINING_SCRIPT[state.questionIndex];
        const isPlayerAttacker = state.shotMode?.isPlayerAttacker ?? true;

        if (isPlayerAttacker) {
          // Player is shooting — attacker correct (player answered correctly to trigger shot)
          // Defender (bot) uses script to decide if they save
          const defenderCorrect = script.botCorrectIfPlayerCorrect;
          match.resolveShot(true, defenderCorrect);
        } else {
          // Bot is shooting — bot is attacker
          // Player is defender — in training, let player "save" most shots
          match.resolveShot(true, true); // defender saves
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.questionIndex, state.shotMode?.isPlayerAttacker, tooltips.isPaused, match]);

  // Auto-advance after goal celebration
  useEffect(() => {
    if (state.showGoalCelebration && !tooltips.isPaused) {
      const timer = setTimeout(() => {
        match.continueAfterPhase();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.showGoalCelebration, tooltips.isPaused, match]);

  // Auto-advance after saved/miss
  useEffect(() => {
    if (state.phase === "saved" && !tooltips.isPaused) {
      const timer = setTimeout(() => {
        match.continueAfterPhase();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.phase, tooltips.isPaused, match]);

  // Handle timeout — treat as wrong answer, show reveal
  useEffect(() => {
    if (state.timeRemaining === 0 && state.phase === "playing" && state.selectedAnswer === null) {
      const timer = setTimeout(() => {
        match.handleTimeout();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [state.timeRemaining, state.phase, state.selectedAnswer, match]);

  const handlePlayerSplashComplete = useCallback(() => {
    match.dismissPlayerSplash();
  }, [match]);

  const handleOpponentSplashComplete = useCallback(() => {
    match.dismissOpponentSplash();
  }, [match]);

  // Use feed message from state (calculated by real possession formula)
  const feedMessage = state.phase === "shot"
    ? "SHOT!"
    : state.phase === "reveal" && state.selectedAnswer === -1
      ? "Time's up!"
      : state.feedMessage;

  const feedDirection = state.phase === "shot"
    ? "neutral" as const
    : state.feedDirection;

  const isShotVisualPhase = state.phase === "shot" || state.phase === "goal" || state.phase === "saved";

  return (
    <div className="min-h-dvh bg-[#0f1420] flex flex-col items-center justify-center relative">
      <div className="w-full max-w-lg flex flex-col lg:max-w-7xl lg:flex-row lg:h-[calc(100dvh-2rem)] lg:items-stretch lg:gap-4 lg:px-4">

        {/* LEFT: Portrait pitch — desktop only */}
        <div className="hidden lg:flex lg:w-[42%] lg:items-center lg:py-4 relative">
          <div className="h-full w-full max-h-[calc(100dvh-2rem)]">
            <PitchVisualization
              playerPosition={state.playerPosition}
              playerAvatarUrl={playerAvatar}
              opponentAvatarUrl={BOT_AVATAR}
              playerName={playerName}
              opponentName={BOT_NAME}
              shotMode={state.shotMode ?? undefined}
              zoomToGoal={isShotVisualPhase}
              ballOnPlayer={state.playerPosition >= 50}
              mirrored={state.half === 2}
              orientation="portrait"
            />
          </div>
        </div>

        {/* RIGHT: HUD + Pitch (mobile) + Feed + Question */}
        <div className="w-full flex flex-col lg:flex-1 lg:max-w-2xl lg:mx-auto lg:justify-start lg:py-4">
          {/* HUD */}
          <PossessionHUD
            playerGoals={state.playerGoals}
            opponentGoals={state.opponentGoals}
            playerName={playerName}
            opponentName={BOT_NAME}
            playerAvatarUrl={playerAvatar}
            opponentAvatarUrl={BOT_AVATAR}
            timeRemaining={state.phase === "playing" && state.selectedAnswer === null ? state.timeRemaining : null}
            half={state.half}
            questionInHalf={state.questionInHalf}
            zone={state.zone}
            zoneColor={state.zoneColor}
            onQuit={onSkip}
            opponentAnswered={state.opponentAnswered}
            opponentAnsweredCorrectly={state.opponentAnsweredCorrectly}
          />

          {/* Mobile landscape pitch — hidden on desktop */}
          <div className="lg:hidden">
            <PitchVisualization
              playerPosition={state.playerPosition}
              playerAvatarUrl={playerAvatar}
              opponentAvatarUrl={BOT_AVATAR}
              playerName={playerName}
              opponentName={BOT_NAME}
              shotMode={state.shotMode ?? undefined}
              zoomToGoal={isShotVisualPhase}
              ballOnPlayer={state.playerPosition >= 50}
              mirrored={state.half === 2}
              orientation="landscape"
            />
          </div>

          <PossessionFeed
            message={feedMessage}
            direction={feedDirection}
            side="left"
            penaltyResult={null}
          />

          <div className="relative">
            <PossessionQuestionPanel
              phase={state.phase}
              isPenaltyPhase={false}
              isShotPhase={state.phase === "shot"}
              isLastAttackPhase={false}
              question={state.question}
              showOptions={state.showOptions}
              selectedAnswer={state.selectedAnswer}
              answerStates={state.answerStates}
              opponentAnswer={state.opponentAnswer}
              showPlayerSplash={state.showPlayerSplash}
              showOpponentSplash={state.showOpponentSplash}
              playerSplashPoints={state.playerSplashPoints}
              opponentSplashPoints={state.opponentSplashPoints}
              onPlayerSplashComplete={handlePlayerSplashComplete}
              onOpponentSplashComplete={handleOpponentSplashComplete}
              onAnswer={match.handleAnswer}
            />
          </div>
        </div>
      </div>

      {/* Goal celebration overlay */}
      <AnimatePresence>
        {state.showGoalCelebration && (
          <GoalCelebrationOverlay
            scorerName={state.goalScorerIsPlayer ? playerName : BOT_NAME}
            isMeScorer={state.goalScorerIsPlayer}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

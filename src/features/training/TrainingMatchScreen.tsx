"use client";

import type { ComponentProps } from "react";
import { TrainingMatchProvider, useTraining } from "./TrainingMatchProvider";
import { TrainingMatchmakingStage } from "./components/TrainingMatchmakingStage";
import { TrainingShowdownStage } from "./components/TrainingShowdownStage";
import { TrainingBanningStage } from "./components/TrainingBanningStage";
import { TrainingPlayingStage } from "./components/TrainingPlayingStage";
import { TrainingHalftimeStage } from "./components/TrainingHalftimeStage";
import { TrainingResultsStage } from "./components/TrainingResultsStage";
import { TrainingTooltip } from "./components/TrainingTooltip";

function TrainingMatchContent() {
  const { match, tooltips, onSkip } = useTraining();
  const { state } = match;

  return (
    <>
      {state.stage === "matchmaking" && <TrainingMatchmakingStage />}
      {state.stage === "showdown" && <TrainingShowdownStage />}
      {state.stage === "banning" && <TrainingBanningStage />}
      {state.stage === "playing" && <TrainingPlayingStage />}
      {state.stage === "halftime" && <TrainingHalftimeStage />}
      {state.stage === "results" && <TrainingResultsStage />}

      {tooltips.activeTooltip && (
        <TrainingTooltip
          title={tooltips.activeTooltip.title}
          message={tooltips.activeTooltip.message}
          position={tooltips.activeTooltip.position}
          onDismiss={tooltips.dismissTooltip}
          onSkip={onSkip}
        />
      )}
    </>
  );
}

type TrainingMatchScreenProps = Pick<
  ComponentProps<typeof TrainingMatchProvider>,
  "onComplete" | "banCategoriesOverride" | "questionsOverride" | "resultsCopy"
>;

export function TrainingMatchScreen({
  onComplete,
  banCategoriesOverride,
  questionsOverride,
  resultsCopy,
}: TrainingMatchScreenProps) {
  return (
    <TrainingMatchProvider
      onComplete={onComplete}
      banCategoriesOverride={banCategoriesOverride}
      questionsOverride={questionsOverride}
      resultsCopy={resultsCopy}
    >
      <TrainingMatchContent />
    </TrainingMatchProvider>
  );
}

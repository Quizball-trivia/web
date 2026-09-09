"use client";

import { useEffect, type ComponentProps } from "react";
import { TrainingMatchProvider, useTraining } from "./TrainingMatchProvider";
import { resetTrainingMatch } from "./lib/trainingRealtimeSim";
import { TrainingMatchmakingStage } from "./components/TrainingMatchmakingStage";
import { TrainingShowdownStage } from "./components/TrainingShowdownStage";
import { TrainingBanningStage } from "./components/TrainingBanningStage";
import { TrainingPlayingStage } from "./components/TrainingPlayingStage";
import { TrainingHalftimeStage } from "./components/TrainingHalftimeStage";
import { TrainingPenaltiesStage } from "./components/TrainingPenaltiesStage";
import { TrainingResultsStage } from "./components/TrainingResultsStage";
import { TrainingTooltip } from "./components/TrainingTooltip";

function TrainingMatchContent() {
  const { match, tooltips, onSkip } = useTraining();
  const { state } = match;

  // The playing/penalty stages hydrate a synthetic match into the realtime
  // store to drive the ranked flight pipeline — never let it leak into /play.
  useEffect(() => resetTrainingMatch, []);

  return (
    <>
      {state.stage === "matchmaking" && <TrainingMatchmakingStage />}
      {state.stage === "showdown" && <TrainingShowdownStage />}
      {state.stage === "banning" && <TrainingBanningStage />}
      {state.stage === "playing" && <TrainingPlayingStage />}
      {state.stage === "halftime" && <TrainingHalftimeStage />}
      {state.stage === "penalties" && <TrainingPenaltiesStage />}
      {state.stage === "results" && <TrainingResultsStage />}

      {tooltips.activeTooltip && (
        <TrainingTooltip
          titleKey={tooltips.activeTooltip.titleKey}
          messageKey={tooltips.activeTooltip.messageKey}
          position={tooltips.activeTooltip.position}
          highlightSelector={tooltips.activeTooltip.highlight}
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

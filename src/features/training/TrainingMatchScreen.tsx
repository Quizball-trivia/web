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
import { useLocale } from "@/contexts/LocaleContext";
import { TrainingTooltip } from "./components/TrainingTooltip";

function TrainingMatchContent() {
  const { match, tooltips, onSkip, loadingFailed, retryLoading, onExit } = useTraining();
  const { t } = useLocale();
  const leaveTraining = loadingFailed ? onExit : onSkip;
  const { state } = match;

  // The playing/penalty stages hydrate a synthetic match into the realtime
  // store to drive the ranked flight pipeline — never let it leak into /play.
  useEffect(() => resetTrainingMatch, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") leaveTraining(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [leaveTraining]);

  if (loadingFailed) {
    return (
      <section className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
        <p role="alert" className="text-lg font-semibold">{t("training.loadError")}</p>
        <button type="button" className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground" onClick={retryLoading}>
          {t("training.retryLoading")}
        </button>
        <button type="button" className="px-6 py-3 underline" onClick={onExit}>
          {t("training.exitLoading")}
        </button>
      </section>
    );
  }

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
  "onComplete" | "banCategoriesOverride" | "banCategoriesFallback" | "questionsOverride" | "resultsCopy"
>;

export function TrainingMatchScreen({
  onComplete,
  banCategoriesOverride,
  banCategoriesFallback,
  questionsOverride,
  resultsCopy,
}: TrainingMatchScreenProps) {
  return (
    <TrainingMatchProvider
      onComplete={onComplete}
      banCategoriesOverride={banCategoriesOverride}
      banCategoriesFallback={banCategoriesFallback}
      questionsOverride={questionsOverride}
      resultsCopy={resultsCopy}
    >
      <TrainingMatchContent />
    </TrainingMatchProvider>
  );
}

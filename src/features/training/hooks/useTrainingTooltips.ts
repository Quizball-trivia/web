import { useState, useCallback, useRef } from "react";
import { TOOLTIP_DEFINITIONS, type TooltipDefinition } from "../data/trainingTooltipConfig";

export function useTrainingTooltips() {
  const [activeTooltip, setActiveTooltip] = useState<TooltipDefinition | null>(null);
  const shownIds = useRef(new Set<string>());

  const isPaused = activeTooltip !== null;

  const tryShowStageTooltip = useCallback((stage: string) => {
    const def = TOOLTIP_DEFINITIONS.find(
      (d) => d.trigger.type === "stage" && d.trigger.stage === stage && !shownIds.current.has(d.id)
    );
    if (def) {
      shownIds.current.add(def.id);
      setActiveTooltip(def);
    }
  }, []);

  const tryShowQuestionTooltip = useCallback((index: number) => {
    const def = TOOLTIP_DEFINITIONS.find(
      (d) => d.trigger.type === "questionIndex" && d.trigger.index === index && !shownIds.current.has(d.id)
    );
    if (def) {
      shownIds.current.add(def.id);
      setActiveTooltip(def);
    }
  }, []);

  const tryShowZoneTooltip = useCallback((zone: string) => {
    const def = TOOLTIP_DEFINITIONS.find(
      (d) => d.trigger.type === "zone" && d.trigger.zone === zone && !shownIds.current.has(d.id)
    );
    if (def) {
      shownIds.current.add(def.id);
      setActiveTooltip(def);
    }
  }, []);

  const tryShowPhaseTooltip = useCallback((phase: string) => {
    const def = TOOLTIP_DEFINITIONS.find(
      (d) => d.trigger.type === "phase" && d.trigger.phase === phase && !shownIds.current.has(d.id)
    );
    if (def) {
      shownIds.current.add(def.id);
      setActiveTooltip(def);
    }
  }, []);

  const tryShowEventTooltip = useCallback((event: string) => {
    const def = TOOLTIP_DEFINITIONS.find(
      (d) => d.trigger.type === "event" && d.trigger.event === event && !shownIds.current.has(d.id)
    );
    if (def) {
      shownIds.current.add(def.id);
      setActiveTooltip(def);
    }
  }, []);

  const dismissTooltip = useCallback(() => {
    setActiveTooltip(null);
  }, []);

  return {
    activeTooltip,
    isPaused,
    dismissTooltip,
    tryShowStageTooltip,
    tryShowQuestionTooltip,
    tryShowZoneTooltip,
    tryShowPhaseTooltip,
    tryShowEventTooltip,
  };
}

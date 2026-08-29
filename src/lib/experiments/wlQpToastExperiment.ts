import { loadExperimentVariant, type ExperimentVariant } from './loadExperimentVariant';

export const WL_QP_TOAST_EXPERIMENT_KEY = 'ranked-results-wl-qp-toast';
export type WlQpToastExperimentVariant = ExperimentVariant;

export interface WlQpToastCue {
  gainedQp: number;
  previousQp: number;
}

/** The toast only makes sense when this ranked match actually banked QP. */
export function getWlQpToastCue(input: {
  matchType: 'ranked' | 'friendly';
  isCancelledNoContest: boolean;
  qpAwarded: number | null;
  qpWeekTotal: number | null;
}): WlQpToastCue | null {
  if (
    input.matchType !== 'ranked'
    || input.isCancelledNoContest
    || input.qpAwarded == null
    || input.qpAwarded <= 0
    || input.qpWeekTotal == null
  ) return null;

  return {
    gainedQp: input.qpAwarded,
    previousQp: Math.max(0, input.qpWeekTotal - input.qpAwarded),
  };
}

export function loadWlQpToastExperimentVariant(input: {
  country?: string | null;
  createdAt?: string | null;
}) {
  return loadExperimentVariant(WL_QP_TOAST_EXPERIMENT_KEY, {
    country: input.country ?? undefined,
    created_at: input.createdAt ?? undefined,
  });
}

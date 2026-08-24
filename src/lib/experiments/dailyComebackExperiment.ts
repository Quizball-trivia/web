import { loadExperimentVariant, type ExperimentVariant } from './loadExperimentVariant';

export const DAILY_COMEBACK_EXPERIMENT_KEY = 'daily-completion-comeback';
export type DailyComebackExperimentVariant = ExperimentVariant;

export function loadDailyComebackExperimentVariant(createdAt?: string | null) {
  return loadExperimentVariant(DAILY_COMEBACK_EXPERIMENT_KEY, {
    created_at: createdAt ?? undefined,
  });
}

import { loadExperimentVariant, type ExperimentVariant } from './loadExperimentVariant';

export const WEEKEND_LEAGUE_PROGRESS_EXPERIMENT_KEY = 'home-weekend-league-progress';
export type WeekendLeagueProgressExperimentVariant = ExperimentVariant;

export function loadWeekendLeagueProgressExperimentVariant(input: {
  createdAt?: string | null;
  country?: string | null;
}) {
  const country = input.country?.trim().toUpperCase();
  if (country !== 'GE') return Promise.resolve('not_enrolled' as const);
  return loadExperimentVariant(WEEKEND_LEAGUE_PROGRESS_EXPERIMENT_KEY, {
    created_at: input.createdAt ?? undefined,
    country,
  });
}

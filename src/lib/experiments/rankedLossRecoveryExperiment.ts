import { loadExperimentVariant, type ExperimentVariant } from './loadExperimentVariant';

export const RANKED_LOSS_RECOVERY_EXPERIMENT_KEY = 'ranked-results-loss-recovery';
export type RankedLossRecoveryExperimentVariant = ExperimentVariant;

export interface RankedLossRecoveryCue {
  previousRp: number;
  currentRp: number;
  rpToRecover: number;
}

export function getRankedLossRecoveryCue(input: {
  matchType: 'ranked' | 'friendly';
  playerWon: boolean;
  isDraw: boolean;
  isCancelledNoContest: boolean;
  isPlacementMatch: boolean;
  oldRp: number;
  newRp: number;
}): RankedLossRecoveryCue | null {
  if (
    input.matchType !== 'ranked'
    || input.playerWon
    || input.isDraw
    || input.isCancelledNoContest
    || input.isPlacementMatch
    || input.newRp >= input.oldRp
  ) return null;

  return {
    previousRp: input.oldRp,
    currentRp: input.newRp,
    rpToRecover: input.oldRp - input.newRp,
  };
}

export function loadRankedLossRecoveryExperimentVariant(createdAt?: string | null) {
  return loadExperimentVariant(RANKED_LOSS_RECOVERY_EXPERIMENT_KEY, {
    created_at: createdAt ?? undefined,
  });
}

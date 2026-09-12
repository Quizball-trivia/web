import { trackEvent } from '@/lib/posthog';

export type TrainingGameId = 'ranked' | 'auction';

/** Guided tutorials: one funnel per game so the auction tutorial never pollutes the ranked one. */
export const trackTrainingStarted = (p: { game: TrainingGameId; access: 'member' | 'guest' }) =>
  trackEvent('training_started', p);
export const trackTrainingSkipped = (p: { game: TrainingGameId; stage: string }) =>
  trackEvent('training_skipped', p);
export const trackTrainingCompleted = (p: { game: TrainingGameId }) =>
  trackEvent('training_completed', p);

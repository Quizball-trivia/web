import { cache } from 'react';
import { listCampaignQuizPages } from './campaignQuiz.api';

/**
 * The Portuguese hub (and the other hubs' pt-BR alternates) exists once at least one quiz has a pt edition. The pt
 * catalog lists only those quizzes; a catalog that cannot be read (or a backend without pt) means no hub.
 */
export const hasPortugueseCampaignHub = cache(async (): Promise<boolean> => {
  try {
    return (await listCampaignQuizPages('pt')).length > 0;
  } catch {
    return false;
  }
});

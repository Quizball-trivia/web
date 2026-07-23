import { trackEvent } from '@/lib/posthog';

export function trackCampaignQuizStart(slug: string, totalQuestions: number): void {
  trackEvent('quiz_start', {
    quiz_slug: slug,
    quiz_type: 'campaign',
    total_questions: totalQuestions,
  });
}

export function trackCampaignQuizComplete(
  slug: string,
  score: number,
  totalQuestions: number,
): void {
  trackEvent('quiz_complete', {
    quiz_slug: slug,
    quiz_type: 'campaign',
    score,
    total_questions: totalQuestions,
  });
}

export function trackCampaignSignupClick(
  slug: string,
  placement: 'header' | 'score' | 'footer' | 'rating',
): void {
  trackEvent('signup_click', {
    quiz_slug: slug,
    source: 'campaign_quiz',
    placement,
  });
}

export function trackCampaignQuizRating(slug: string, rating: number): void {
  trackEvent('quiz_rating_submitted', {
    quiz_slug: slug,
    rating,
  });
}

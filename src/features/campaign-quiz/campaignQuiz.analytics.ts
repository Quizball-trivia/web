import { trackEvent } from '@/lib/posthog';
import {
  rememberCampaignAttribution,
  type CampaignCtaPlacement,
} from './campaignAttribution';

/**
 * Funnel for the public SEO quiz pages:
 *   page view -> quiz start -> per-question answers -> completion -> signup
 * Every event carries `quiz_slug` so one funnel can be split by campaign, and
 * `quiz_type: 'campaign'` so this traffic stays separable from in-app play.
 */

const CAMPAIGN_PROPS = { quiz_type: 'campaign' as const };

export function trackCampaignQuizPageView(
  slug: string,
  totalQuestions: number,
): void {
  trackEvent('campaign_quiz_page_view', {
    ...CAMPAIGN_PROPS,
    quiz_slug: slug,
    total_questions: totalQuestions,
  });
}

export function trackCampaignQuizStart(slug: string, totalQuestions: number): void {
  trackEvent('quiz_start', {
    ...CAMPAIGN_PROPS,
    quiz_slug: slug,
    total_questions: totalQuestions,
  });
}

export function trackCampaignQuizAnswer(input: {
  slug: string;
  questionId: string;
  questionType: string;
  position: number;
  difficulty: string;
  correct: boolean;
}): void {
  trackEvent('quiz_question_answered', {
    ...CAMPAIGN_PROPS,
    quiz_slug: input.slug,
    question_id: input.questionId,
    question_type: input.questionType,
    question_position: input.position,
    difficulty: input.difficulty,
    correct: input.correct,
  });
}

export function trackCampaignQuizComplete(
  slug: string,
  score: number,
  totalQuestions: number,
): void {
  trackEvent('quiz_complete', {
    ...CAMPAIGN_PROPS,
    quiz_slug: slug,
    score,
    total_questions: totalQuestions,
    // Pre-computed so score-band funnels do not need a HogQL expression.
    score_percent:
      totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0,
  });
}

export function trackCampaignQuizRestart(slug: string, previousScore: number): void {
  trackEvent('quiz_restart', {
    ...CAMPAIGN_PROPS,
    quiz_slug: slug,
    previous_score: previousScore,
  });
}

export function trackCampaignSignupClick(
  slug: string,
  placement: CampaignCtaPlacement,
  quizResult?: { score: number; totalQuestions: number },
): void {
  const attribution = rememberCampaignAttribution({
    quizSlug: slug,
    placement,
    ...(quizResult
      ? { score: quizResult.score, totalQuestions: quizResult.totalQuestions }
      : {}),
  });
  trackEvent('signup_click', {
    ...CAMPAIGN_PROPS,
    quiz_slug: slug,
    source: 'campaign_quiz',
    placement,
    ...(attribution
      ? { campaign_conversion_id: attribution.campaign_conversion_id }
      : {}),
    ...(quizResult
      ? {
          score: quizResult.score,
          total_questions: quizResult.totalQuestions,
        }
      : {}),
  });
}

export function trackCampaignQuizRating(
  slug: string,
  rating: number,
  authenticated: boolean,
): void {
  trackEvent('quiz_rating_submitted', {
    ...CAMPAIGN_PROPS,
    quiz_slug: slug,
    rating,
    // Guests can rate these pages, so keep guest and account feedback split.
    rater: authenticated ? 'account' : 'guest',
  });
}

export function trackCampaignRelatedQuizClick(
  fromSlug: string,
  toSlug: string,
): void {
  trackEvent('campaign_quiz_related_click', {
    ...CAMPAIGN_PROPS,
    quiz_slug: fromSlug,
    target_quiz_slug: toSlug,
  });
}

export function trackCampaignHubQuizClick(slug: string): void {
  trackEvent('campaign_quiz_hub_click', {
    ...CAMPAIGN_PROPS,
    quiz_slug: slug,
  });
}

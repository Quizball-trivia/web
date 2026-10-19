import { trackEvent } from "@/lib/posthog";

/**
 * Campaign quiz funnel on the Play screen: card seen → started → completed
 * (or abandoned) → shared / CTA. `campaign_id` keeps one-off campaigns apart
 * in the same events; `trigger` says why the visitor was shown the card.
 */
type Base = { campaignId: string; trigger: string; lang: string; attemptId?: string };

const base = (p: Base) => ({ campaign_id: p.campaignId, trigger: p.trigger, quiz_lang: p.lang, attempt_id: p.attemptId ?? null });

export const trackCampaignQuizView = (p: Base & { previousBest: number | null }) =>
  trackEvent("campaign_quiz_view", { ...base(p), previous_best: p.previousBest });
export const trackCampaignQuizStart = (p: Base & { attempt: number }) =>
  trackEvent("campaign_quiz_start", { ...base(p), attempt: p.attempt });
export const trackCampaignQuizComplete = (p: Base & { attempt: number; score: number; total: number; correctMask: string; durationMs: number }) =>
  trackEvent("campaign_quiz_complete", { ...base(p), attempt: p.attempt, score: p.score, total_questions: p.total, correct_mask: p.correctMask, active_duration_ms: p.durationMs });
export const trackCampaignQuizAbandon = (p: Base & { attempt: number; answered: number; correctMask: string; durationMs: number }) =>
  trackEvent("campaign_quiz_abandon", { ...base(p), attempt: p.attempt, questions_answered: p.answered, correct_mask: p.correctMask, active_duration_ms: p.durationMs }, { departing: true });
export const trackCampaignQuizShare = (p: Base & { score: number; method: "native" | "clipboard" }) =>
  trackEvent("campaign_quiz_share", { ...base(p), score: p.score, share_method: p.method });
export const trackCampaignQuizCta = (p: Base & { score: number; target: "signup" | "more_games" }) =>
  trackEvent("campaign_quiz_cta_click", { ...base(p), score: p.score, cta_target: p.target });

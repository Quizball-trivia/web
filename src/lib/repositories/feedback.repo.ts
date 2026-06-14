import { apiFetch } from '@/lib/api/client';
import type { HttpMethod } from '@/lib/api/api';

// Hand-typed like notifications.repo: the feedback route isn't in the generated
// `paths` (regenerated on a separate cadence), so we bridge it through a single
// loose-typed boundary here. The endpoint is public — `auth: false` skips the
// token + refresh dance so logged-out visitors can submit.

export type FeedbackCategory = 'bug' | 'feedback' | 'other';

export interface SubmitFeedbackInput {
  category: FeedbackCategory;
  message: string;
  email?: string;
  nickname?: string;
  context?: string;
  /** Attachments as base64 data URLs (the backend uploads them to storage). */
  attachments?: string[];
}

export interface SubmitFeedbackResponse {
  ok: boolean;
}

export function submitFeedback(input: SubmitFeedbackInput): Promise<SubmitFeedbackResponse> {
  const looseFetch = apiFetch as unknown as (
    method: HttpMethod,
    path: string,
    options: { body: unknown; auth: boolean },
  ) => Promise<SubmitFeedbackResponse>;
  return looseFetch('post', '/api/v1/feedback', { body: input, auth: false });
}

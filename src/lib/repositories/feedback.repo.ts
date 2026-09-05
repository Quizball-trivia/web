import { apiFetch } from '@/lib/api/client';
import type { components, paths } from '@/types/api.generated';

export type SubmitFeedbackInput = paths['/api/v1/feedback']['post']['requestBody']['content']['application/json'];
export type FeedbackCategory = SubmitFeedbackInput['category'];
export type SubmitFeedbackResponse = components['schemas']['SubmitFeedbackResponse'];

export function submitFeedback(input: SubmitFeedbackInput): Promise<SubmitFeedbackResponse> {
  return apiFetch('post', '/api/v1/feedback', { body: input, auth: false });
}

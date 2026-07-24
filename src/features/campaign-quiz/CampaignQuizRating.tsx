'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { rateCampaignQuiz } from './campaignQuiz.api';
import {
  trackCampaignQuizRating,
  trackCampaignSignupClick,
} from './campaignQuiz.analytics';
import type { CampaignQuizRating as Rating } from './campaignQuiz.types';

interface CampaignQuizRatingProps {
  slug: string;
  initialRating: Rating;
}

export function CampaignQuizRating({ slug, initialRating }: CampaignQuizRatingProps) {
  const authStatus = useAuthStore((state) => state.status);
  const [aggregate, setAggregate] = useState(initialRating);
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (rating: number) => {
    setSelected(rating);
    setMessage(null);

    if (authStatus !== 'authenticated') {
      trackCampaignSignupClick(slug, 'rating');
      setMessage('Sign up free to leave a rating.');
      return;
    }

    setSubmitting(true);
    try {
      const nextAggregate = await rateCampaignQuiz(slug, rating);
      setAggregate(nextAggregate);
      setMessage('Thanks — your rating has been saved.');
      trackCampaignQuizRating(slug, rating);
    } catch {
      setMessage('We could not save your rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="quiz-rating"
      aria-labelledby="quiz-rating-heading"
      className="scroll-mt-24 rounded-[24px] border-0 bg-brand-blue px-5 py-7 text-center sm:px-8"
    >
      <h2 id="quiz-rating-heading" className="text-xl font-black text-white">
        How would you rate this quiz?
      </h2>
      <p className="mt-1 text-sm font-semibold text-white/75">
        {aggregate.count > 0 && aggregate.average !== null
          ? `${aggregate.average.toFixed(1)} out of 5 from ${aggregate.count.toLocaleString('en-GB')} rating${aggregate.count === 1 ? '' : 's'}`
          : 'Be the first player to rate it.'}
      </p>

      <div className="mt-4 flex justify-center gap-1" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((rating) => {
          const filled = rating <= (hovered || selected || Math.round(aggregate.average ?? 0));
          return (
            <button
              key={rating}
              type="button"
              disabled={submitting || authStatus === 'loading'}
              onMouseEnter={() => setHovered(rating)}
              onFocus={() => setHovered(rating)}
              onBlur={() => setHovered(0)}
              onClick={() => void submit(rating)}
              aria-label={`Rate ${rating} out of 5`}
              className="rounded-xl p-1.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow disabled:opacity-60"
            >
              <Star
                className={`size-8 ${
                  filled
                    ? 'fill-brand-yellow text-brand-yellow'
                    : 'fill-transparent text-white/55'
                }`}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      {message ? (
        <p role="status" className="mt-3 text-sm font-semibold text-white/65">
          {message}{' '}
          {authStatus !== 'authenticated' ? (
            <Link
              href={`/en?signup=1&source=${slug}-quiz-rating`}
              className="text-brand-yellow underline underline-offset-4"
            >
              Sign up
            </Link>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}

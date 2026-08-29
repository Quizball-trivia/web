'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { rateCampaignQuiz } from './campaignQuiz.api';
import { trackCampaignQuizRating } from './campaignQuiz.analytics';
import type { CampaignQuizRating as Rating } from './campaignQuiz.types';
import type { Locale } from '@/lib/i18n/messages';

interface CampaignQuizRatingProps {
  slug: string;
  initialRating: Rating;
  locale?: Locale;
}

export function CampaignQuizRating({ slug, initialRating, locale = 'en' }: CampaignQuizRatingProps) {
  const copy = locale === 'es'
    ? {
        saved: 'Gracias, hemos guardado tu valoración.',
        failed: 'No pudimos guardar tu valoración. Inténtalo de nuevo.',
        heading: '¿Cómo valorarías este quiz?',
        first: 'Sé la primera persona en valorarlo.',
        rate: 'Valorar',
        outOf: 'de 5',
        rating: 'valoración',
        ratings: 'valoraciones',
      }
    : {
        saved: 'Thanks — your rating has been saved.',
        failed: 'We could not save your rating. Please try again.',
        heading: 'How would you rate this quiz?',
        first: 'Be the first player to rate it.',
        rate: 'Rate',
        outOf: 'out of 5',
        rating: 'rating',
        ratings: 'ratings',
      };
  const [aggregate, setAggregate] = useState(initialRating);
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (rating: number) => {
    setSelected(rating);
    setMessage(null);
    setSubmitting(true);

    try {
      const result = await rateCampaignQuiz(slug, rating);
      setAggregate(result.rating);
      setMessage(copy.saved);
      trackCampaignQuizRating(slug, rating, result.authenticated);
    } catch {
      setSelected(0);
      setMessage(copy.failed);
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
        {copy.heading}
      </h2>
      <p className="mt-1 text-sm font-semibold text-white/75">
        {aggregate.count > 0 && aggregate.average !== null
          ? `${aggregate.average.toFixed(1)} ${copy.outOf} · ${aggregate.count.toLocaleString(locale === 'es' ? 'es-ES' : 'en-GB')} ${aggregate.count === 1 ? copy.rating : copy.ratings}`
          : copy.first}
      </p>

      <div className="mt-4 flex justify-center gap-1" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((rating) => {
          const filled = rating <= (hovered || selected || Math.round(aggregate.average ?? 0));
          return (
            <button
              key={rating}
              type="button"
              disabled={submitting}
              onMouseEnter={() => setHovered(rating)}
              onFocus={() => setHovered(rating)}
              onBlur={() => setHovered(0)}
              onClick={() => void submit(rating)}
              aria-label={`${copy.rate} ${rating} ${copy.outOf}`}
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
          {message}
        </p>
      ) : null}
    </section>
  );
}

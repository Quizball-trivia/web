import { describe, expect, it } from 'vitest';
import { buildLocalizedMetadata } from '../metadata';

describe('buildLocalizedMetadata', () => {
  it('keeps a branded large preview when localized pages override root metadata', () => {
    const metadata = buildLocalizedMetadata({
      locale: 'en',
      path: '',
      title: 'QuizBall',
      description: 'Football trivia',
    });

    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: '/assets/brand/quizball-og-1200x630.png',
        width: 1200,
        height: 630,
      }),
    ]);
    expect(metadata.twitter).toEqual(expect.objectContaining({
      card: 'summary_large_image',
      images: ['/assets/brand/quizball-og-1200x630.png'],
    }));
  });
});

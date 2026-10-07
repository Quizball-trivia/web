import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LOCALES } from '@/lib/i18n/locale';
import { DOWNLOAD_COPY, GOOGLE_PLAY_URL, buildDownloadStructuredData } from '@/lib/seo/app-download';
import { isLightweightSeoRoute } from '@/lib/seo/lightweight-routes';

vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-nonce': 'test-download-nonce' }) }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));

import DownloadPage, { generateMetadata, generateStaticParams } from '../page';

describe('official Android download page', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('only generates the four supported locales', () => {
    expect(generateStaticParams()).toEqual(LOCALES.map((locale) => ({ locale })));
  });

  it.each(LOCALES)('renders crawlable, localized content without auth for %s', async (locale) => {
    const html = renderToStaticMarkup(await DownloadPage({ params: Promise.resolve({ locale }) }));
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('h1')?.textContent).toContain(DOWNLOAD_COPY[locale].title);
    expect(doc.querySelector(`a[href="${GOOGLE_PLAY_URL}"]`)?.textContent).toContain(DOWNLOAD_COPY[locale].storeCta);
    expect(doc.querySelector(`a[href="/${locale}"]`)).not.toBeNull();
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    for (const alternate of LOCALES) {
      expect(doc.querySelector(`a[href="/${alternate}/download"][hreflang="${alternate}"]`)).not.toBeNull();
    }
    const script = doc.querySelector('script[type="application/ld+json"]');
    expect(script?.getAttribute('nonce')).toBe('test-download-nonce');
    expect(JSON.parse(script?.textContent ?? '{}')).toMatchObject({
      '@type': 'WebPage', inLanguage: locale, significantLink: GOOGLE_PLAY_URL,
    });
  });

  it.each(LOCALES)('sets canonical and reciprocal alternates for %s without overriding indexability', async (locale) => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
    expect(metadata.alternates?.canonical).toBe(`https://quizball.io/${locale}/download`);
    expect(metadata.alternates?.languages).toEqual({
      en: 'https://quizball.io/en/download', ka: 'https://quizball.io/ka/download',
      es: 'https://quizball.io/es/download', tr: 'https://quizball.io/tr/download',
      'x-default': 'https://quizball.io/en/download',
    });
    // Inherit production/preview robots from the root; do not accidentally index previews.
    expect(metadata.robots).toBeUndefined();
    expect(metadata.description).toBe(DOWNLOAD_COPY[locale].description);
  });

  it('does not fabricate ratings, downloads, reviews, or a cash prize', () => {
    for (const locale of LOCALES) {
      const data = buildDownloadStructuredData(locale);
      expect(data).not.toHaveProperty('aggregateRating');
      expect(data).not.toHaveProperty('review');
      expect(data).not.toHaveProperty('interactionStatistic');
    }
  });

  it('rejects unsupported locales in both the document and metadata', async () => {
    const params = Promise.resolve({ locale: 'xx' });
    await expect(DownloadPage({ params })).rejects.toThrow('NOT_FOUND');
    await expect(generateMetadata({ params })).rejects.toThrow('NOT_FOUND');
  });

  it('uses lightweight providers only for exact download and existing public quiz paths', () => {
    for (const locale of LOCALES) {
      expect(isLightweightSeoRoute(`/${locale}/download`)).toBe(true);
      expect(isLightweightSeoRoute(`/${locale}/download/`)).toBe(true);
    }
    expect(isLightweightSeoRoute('/en/football-quiz/career-path')).toBe(true);
    expect(isLightweightSeoRoute('/es/quiz-de-futbol')).toBe(true);
    for (const path of ['/en', '/play', '/auth/welcome', '/xx/download', '/en/download/other', '/download']) {
      expect(isLightweightSeoRoute(path)).toBe(false);
    }
  });
});

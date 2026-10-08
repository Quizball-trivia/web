import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LOCALES } from '@/lib/i18n/locale';
import { DOWNLOAD_COPY, DOWNLOAD_UPDATED_AT, GOOGLE_PLAY_URL, buildDownloadStructuredData } from '@/lib/seo/app-download';
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
    expect(doc.querySelector('h1')?.textContent).toContain('Quizball');
    expect(doc.querySelector('h1')?.textContent).toContain('Android');
    expect(doc.querySelector(`a[href="${GOOGLE_PLAY_URL}"]`)?.textContent).toContain(DOWNLOAD_COPY[locale].storeCta);
    expect(doc.querySelectorAll(`a[href="${GOOGLE_PLAY_URL}"]`)).toHaveLength(1);
    expect(doc.body.textContent).toContain(DOWNLOAD_COPY[locale].officialNote);
    expect(DOWNLOAD_COPY[locale].officialNote).toContain('Quizball LLC');
    expect(DOWNLOAD_COPY[locale].officialNote).toContain('quizball.io');
    const screenshot = doc.querySelector(`img[alt="${DOWNLOAD_COPY[locale].rankedAlt}"]`);
    expect(screenshot).not.toBeNull();
    expect(screenshot?.getAttribute('width')).toBe('1080');
    expect(screenshot?.getAttribute('height')).toBe('2424');
    expect(doc.querySelector('figcaption')?.textContent).toBe(DOWNLOAD_COPY[locale].rankedCaption);
    expect(doc.querySelector(`a[href="/${locale}"]`)).not.toBeNull();
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    for (const alternate of LOCALES) {
      expect(doc.querySelector(`a[href="/${alternate}/download"][hreflang="${alternate}"]`)).not.toBeNull();
    }
    const script = doc.querySelector('script[type="application/ld+json"]');
    expect(script?.getAttribute('nonce')).toBe('test-download-nonce');
    expect(JSON.parse(script?.textContent ?? '{}')).toMatchObject({
      '@type': 'WebPage', inLanguage: locale, significantLink: GOOGLE_PLAY_URL, dateModified: DOWNLOAD_UPDATED_AT,
    });
    const data = JSON.parse(script?.textContent ?? '{}');
    expect(data.breadcrumb.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: DOWNLOAD_COPY[locale].homeLabel, item: `https://quizball.io/${locale}` },
      { '@type': 'ListItem', position: 2, name: DOWNLOAD_COPY[locale].homeCta, item: `https://quizball.io/${locale}/download` },
    ]);
    expect(doc.querySelector(`main nav[aria-label="${DOWNLOAD_COPY[locale].homeCta}"] [aria-current="page"]`)?.textContent).toBe(DOWNLOAD_COPY[locale].homeCta);
    expect(doc.querySelectorAll('ol li')).toHaveLength(3);
    expect(doc.querySelectorAll('details')).toHaveLength(3);
    for (const item of DOWNLOAD_COPY[locale].questions) {
      // Useful installation answers must remain readable without JavaScript.
      expect(doc.body.textContent).toContain(item.question);
      expect(doc.body.textContent).toContain(item.answer);
    }
    expect(doc.querySelector('dl')?.textContent).toContain('io.quizball.mobile');
    expect(doc.querySelector('dl')?.textContent).toContain('Quizball LLC');
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
      expect(data['@type']).toBe('WebPage');
      // No invented app reviews or FAQ rich-result eligibility for a games page.
      expect(data).not.toHaveProperty('mainEntity');
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

/**
 * Regression: a Georgian quiz page with ratings must hydrate without a text mismatch. Node formats `ka-GE` numbers as
 * "1,0" while browsers without Georgian number data render "1.0"; that React 418 mismatch made the root re-render on the
 * client, which duplicated the page and site JSON-LD (Search Console: "multiple aggregate ratings").
 *
 * The page is the real `/ka/football-quiz/[slug]` route with an invented quiz (no real content) inside a document like
 * the root layout's, rendered to HTML under Node's Intl and hydrated as a document (as Next does) under a simulated
 * browser Intl that has no Georgian number data.
 */
import { act, createElement, type ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CampaignQuiz } from '../campaignQuiz.types';

const api = vi.hoisted(() => {
  class CampaignQuizApiError extends Error {
    constructor(public status: number) { super(`status ${status}`); }
  }
  return {
    CampaignQuizApiError,
    getCampaignQuiz: vi.fn(),
    listCampaignQuizPages: vi.fn(),
    loadCampaignSlugRegistry: vi.fn(async () => undefined),
    resolveCampaignQuizRoute: vi.fn(),
    rateCampaignQuiz: vi.fn(),
    answerCampaignQuizQuestion: vi.fn(),
  };
});
vi.mock('../campaignQuiz.api', () => api);

/** Off: the fixed formatter. On: the formatting this page shipped with (`toLocaleString('ka-GE')`), as the control. */
const legacy = vi.hoisted(() => ({ georgianFromRuntime: false }));
vi.mock('../campaignQuiz.number', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../campaignQuiz.number')>();
  return {
    formatCampaignNumber: (...args: Parameters<typeof actual.formatCampaignNumber>) => {
      const [value, locale, options] = args;
      return legacy.georgianFromRuntime && locale === 'ka' ? value.toLocaleString('ka-GE', options) : actual.formatCampaignNumber(...args);
    },
  };
});

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_NOT_FOUND'); },
  redirect: (path: string) => { throw new Error(`NEXT_REDIRECT ${path}`); },
  permanentRedirect: (path: string) => { throw new Error(`NEXT_PERMANENT_REDIRECT ${path}`); },
  usePathname: () => '/ka/football-quiz/harbor-lions',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/lib/posthog', () => ({ trackEvent: vi.fn() }));

import CampaignQuizPage from '@/app/[locale]/football-quiz/[slug]/page';
import { buildSiteStructuredData, serializeJsonLd } from '@/lib/seo/structured-data';

const SLUG = 'harbor-lions';

/** An invented club from an invented league: nothing here is real quiz content. */
function inventedQuiz(rating: CampaignQuiz['rating']): CampaignQuiz {
  return {
    slug: SLUG,
    title: 'Harbor Lions Quiz',
    total_questions: 1,
    difficulty_counts: { easy: 1, medium: 0, hard: 0 },
    questions: [{
      id: 'q-invented-1', position: 1, difficulty: 'easy', type: 'mcq_single',
      prompt: 'Which colour is the invented Harbor Lions mascot?', details: [], image_url: null,
      options: [{ id: 'o1', text: 'Teal' }, { id: 'o2', text: 'Amber' }],
    }],
    rating,
    page: {
      category: 'team', h1: 'Harbor Lions Quiz — Test Yourself', lede: 'An invented club for tests.', about_heading: 'About',
      about_blocks: [{ id: 'b1', type: 'paragraph', text: 'Harbor Lions play in an invented league.' }],
      score_cta: '{score}/{total}', footer_banner_text: 'Play.', footer_button_label: 'Play Ranked',
      hero_image_url: '/playground/no-portrait.webp', hero_image_alt: 'Harbor Lions', seo_title: 'Harbor Lions Quiz | QuizBall',
      meta_description: 'Invented quiz.', og_image_url: null, og_image_alt: null, breadcrumb_label: 'Harbor Lions Quiz',
      locale_mode: 'en_ka', ka_seo_title: 'ჰარბორ ლაიონსის ქვიზი | QuizBall', ka_meta_description: 'გამოგონილი ქვიზი.',
      ka_h1: 'ჰარბორ ლაიონსის ქვიზი', ka_lede: 'გამოგონილი კლუბი ტესტებისთვის.', related_pages: [],
      updated_at: '2026-11-01T00:00:00.000Z',
    },
    editions: { ka: true, es: true, ru: false, pt: false, de: false, tr: false, fr: false },
  };
}

/**
 * A browser whose Intl has no Georgian number data: `ka` falls back to the default (English) formatting, which is what
 * the 418 reports showed ("1.0" in the browser against the server's "1,0").
 */
function simulateBrowserWithoutGeorgianNumbers(): () => void {
  const NativeNumberFormat = Intl.NumberFormat;
  const nativeToLocaleString = Number.prototype.toLocaleString;
  const withoutGeorgian = (locales?: string | readonly string[]) => {
    const list = locales === undefined ? [] : Array.isArray(locales) ? locales : [locales as string];
    const kept = list.filter((tag) => !/^ka(?:-|$)/i.test(tag));
    return kept.length ? kept : 'en-US';
  };
  const BrowserNumberFormat = function (locales?: string | string[], options?: Intl.NumberFormatOptions) {
    return new NativeNumberFormat(withoutGeorgian(locales), options);
  } as unknown as typeof Intl.NumberFormat;
  BrowserNumberFormat.supportedLocalesOf = (locales, options) =>
    NativeNumberFormat.supportedLocalesOf(locales, options).filter((tag) => !/^ka(?:-|$)/i.test(tag));
  Object.defineProperty(Intl, 'NumberFormat', { value: BrowserNumberFormat, configurable: true, writable: true });
  Object.defineProperty(Number.prototype, 'toLocaleString', {
    value: function (this: number, locales?: string | string[], options?: Intl.NumberFormatOptions) {
      return nativeToLocaleString.call(this, withoutGeorgian(locales), options);
    },
    configurable: true, writable: true,
  });
  return () => {
    Object.defineProperty(Intl, 'NumberFormat', { value: NativeNumberFormat, configurable: true, writable: true });
    Object.defineProperty(Number.prototype, 'toLocaleString', { value: nativeToLocaleString, configurable: true, writable: true });
  };
}

async function georgianPage(rating: CampaignQuiz['rating']): Promise<ReactElement> {
  api.getCampaignQuiz.mockResolvedValue(inventedQuiz(rating));
  const page = await CampaignQuizPage({
    params: Promise.resolve({ locale: 'ka', slug: SLUG }),
    searchParams: Promise.resolve({}),
  });
  // Next hydrates the whole document; the root layout puts the site JSON-LD in <body> beside the page.
  return createElement('html', { lang: 'ka', suppressHydrationWarning: true },
    createElement('head', null),
    createElement('body', { suppressHydrationWarning: true },
      createElement('script', {
        type: 'application/ld+json', suppressHydrationWarning: true,
        dangerouslySetInnerHTML: { __html: serializeJsonLd(buildSiteStructuredData()) },
      }),
      page,
    ),
  );
}

function structuredData(root: ParentNode) {
  const scripts = [...root.querySelectorAll('script[type="application/ld+json"]')];
  const nodes = scripts.flatMap((script) => {
    const data = JSON.parse(script.textContent ?? '{}') as { '@graph'?: Array<Record<string, unknown>> } & Record<string, unknown>;
    return data['@graph'] ?? [data];
  });
  return {
    scripts: scripts.length,
    quizRatings: nodes.filter((node) => String(node['@id'] ?? '').endsWith(`/${SLUG}#quiz`) && node.aggregateRating),
    allRatings: nodes.filter((node) => node.aggregateRating),
  };
}

const ratingSummary = (root: ParentNode) => root.querySelector('#quiz-rating > p');
const jsonLdScripts = (root: ParentNode) => [...root.querySelectorAll('script[type="application/ld+json"]')];

/** Restores the native Intl; set while the simulated browser is active (also called by afterEach on a failure). */
let restoreNativeIntl: (() => void) | null = null;

/**
 * Server-renders the page, parses it into the document, records the server's nodes, then hydrates under the simulated
 * browser Intl. The browser stays simulated until cleanup, so later client renders (a rating update) run there too.
 */
async function serverRenderThenHydrate(rating: CampaignQuiz['rating']) {
  const element = await georgianPage(rating);
  const html = renderToString(element);
  // The server's document, as the browser parsed it.
  document.documentElement.innerHTML = html.replace(/^<html[^>]*>/, '').replace(/<\/html>$/, '');
  const server = {
    section: document.querySelector('#quiz-rating'),
    summary: ratingSummary(document),
    summaryText: ratingSummary(document)?.textContent ?? null,
    scripts: jsonLdScripts(document),
  };

  restoreNativeIntl = simulateBrowserWithoutGeorgianNumbers();
  const recoverable = vi.fn();
  let root: ReturnType<typeof hydrateRoot> | undefined;
  await act(async () => {
    root = hydrateRoot(document, element, { onRecoverableError: recoverable });
  });
  return {
    html,
    server,
    container: document,
    recoverable,
    cleanup: async () => {
      try {
        await act(async () => root?.unmount());
      } finally {
        restoreNativeIntl?.();
        restoreNativeIntl = null;
      }
    },
  };
}

/** Hydration kept the server's DOM: the rating section, its summary and both JSON-LD scripts are the same nodes. */
function expectServerNodesKept(page: Awaited<ReturnType<typeof serverRenderThenHydrate>>) {
  expect(page.server.section).not.toBeNull();
  expect(page.server.summary).not.toBeNull();
  expect(page.server.scripts).toHaveLength(2);
  expect(document.querySelector('#quiz-rating')).toBe(page.server.section);
  expect(ratingSummary(document)).toBe(page.server.summary);
  const scripts = jsonLdScripts(document);
  expect(scripts).toHaveLength(2);
  scripts.forEach((script, index) => expect(script).toBe(page.server.scripts[index]));
}

describe('Georgian quiz page hydration with ratings', () => {
  const nativeKa = (1).toLocaleString('ka-GE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    legacy.georgianFromRuntime = false;
    api.listCampaignQuizPages.mockResolvedValue([{ slug: SLUG }]);
  });
  afterEach(() => {
    restoreNativeIntl?.();
    restoreNativeIntl = null;
    legacy.georgianFromRuntime = false;
    api.rateCampaignQuiz.mockReset();
    document.documentElement.innerHTML = '<head></head><body></body>';
  });

  it('the simulated runtimes really disagree on ka-GE (server "1,0", browser "1.0")', () => {
    expect(nativeKa).toBe('1,0');
    const restore = simulateBrowserWithoutGeorgianNumbers();
    try {
      expect((1).toLocaleString('ka-GE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })).toBe('1.0');
    } finally {
      restore();
    }
  });

  it.each([
    [{ average: 1, count: 1 }, '1,0 5-დან · 1 შეფასება'],
    [{ average: 2.55, count: 4 }, '2,6 5-დან · 4 შეფასება'],
    [{ average: 4.95, count: 12345 }, '5,0 5-დან · 12 345 შეფასება'],
  ])('hydrates %j without recoverable errors and keeps one page AggregateRating', async (rating, summary) => {
    const page = await serverRenderThenHydrate(rating);
    try {
      expect(page.server.summaryText).toBe(summary);
      expect(page.recoverable).not.toHaveBeenCalled();
      expectServerNodesKept(page);
      expect(ratingSummary(document)?.textContent).toBe(summary);

      const data = structuredData(page.container);
      expect(data.scripts).toBe(2);
      expect(data.quizRatings).toHaveLength(1);
      expect(data.allRatings).toHaveLength(1);
      expect(data.quizRatings[0].aggregateRating).toMatchObject({
        '@type': 'AggregateRating', ratingValue: rating.average, ratingCount: rating.count,
      });
    } finally {
      await page.cleanup();
    }
  });

  it.each([
    [{ average: null, count: 0 }],
    [{ average: 0, count: 0 }],
    [{ average: 3, count: 0 }],
  ])('an unrated quiz %j hydrates cleanly and has no AggregateRating', async (rating) => {
    const page = await serverRenderThenHydrate(rating);
    try {
      expect(page.server.summaryText).toBe('პირველი იყავი, ვინც შეაფასებს.');
      expect(page.recoverable).not.toHaveBeenCalled();
      expectServerNodesKept(page);
      const data = structuredData(page.container);
      expect(data.scripts).toBe(2);
      expect(data.allRatings).toHaveLength(0);
    } finally {
      await page.cleanup();
    }
  });

  it('a successful rating updates the summary in Georgian formatting in a browser without Georgian number data', async () => {
    // 2.65 is a value toFixed(1) would show as 2.6; Intl (and the page) show 2,7.
    api.rateCampaignQuiz.mockResolvedValue({ rating: { average: 2.65, count: 10000 }, authenticated: false });
    const page = await serverRenderThenHydrate({ average: 2.55, count: 9999 });
    try {
      expect(page.server.summaryText).toBe('2,6 5-დან · 9999 შეფასება');
      expect(page.recoverable).not.toHaveBeenCalled();
      expectServerNodesKept(page);

      const fiveStars = document.querySelector<HTMLButtonElement>('#quiz-rating button[aria-label="შეაფასე 5 5-დან"]');
      expect(fiveStars).not.toBeNull();
      await act(async () => fiveStars!.click());

      expect(api.rateCampaignQuiz).toHaveBeenCalledWith(SLUG, 5);
      expect(ratingSummary(document)?.textContent).toBe('2,7 5-დან · 10 000 შეფასება');
      expect(document.querySelector('#quiz-rating [role="status"]')?.textContent).toBe('მადლობა — შენი შეფასება შენახულია.');
      // The client update touches only the visible summary; the server JSON-LD stays the same two nodes.
      expectServerNodesKept(page);
      expect(page.recoverable).not.toHaveBeenCalled();
    } finally {
      await page.cleanup();
    }
  });

  it('control: the shipped ka-GE formatting fails this same hydration (418) and duplicates the JSON-LD', async () => {
    legacy.georgianFromRuntime = true;
    const page = await serverRenderThenHydrate({ average: 1, count: 1 });
    try {
      expect(page.html).toContain('1,0 5-დან');
      expect(page.recoverable).toHaveBeenCalled();
      const message = String((page.recoverable.mock.calls[0][0] as Error)?.message ?? '');
      expect(message).toMatch(/Hydration failed|didn't match|418/);
      // The client re-render of the root left the server's JSON-LD in <body> and added its own: Google's duplicate.
      const data = structuredData(page.container);
      expect(data.scripts).toBe(4);
      expect(data.quizRatings).toHaveLength(2);
    } finally {
      await page.cleanup();
    }
  });
});

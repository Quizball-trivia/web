import { act, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider, useLocale } from '../LocaleContext';
import { SeoProviders } from '@/app/seo-providers';
import { messages } from '@/lib/i18n/messages';
import { loadLocaleMessages } from '@/lib/i18n/client-messages';

const mocks = vi.hoisted(() => ({
  pathname: '/play',
  preferredLanguage: 'ka' as string | null | undefined,
  inferredLocale: 'en' as 'en' | 'ka',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector?: (state: { user: { preferred_language: string | null } | null }) => unknown) => {
    const state = {
      user: mocks.preferredLanguage === undefined
        ? null
        : { preferred_language: mocks.preferredLanguage },
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/components/PostHogProvider', () => ({ PostHogPageView: () => null }));

vi.mock('@/lib/i18n/infer-locale', () => ({
  inferLocaleFromBrowser: () => mocks.inferredLocale,
}));

function LocaleProbe() {
  const { locale, t } = useLocale();
  return <><div data-testid="locale">{locale}</div><div data-testid="translation">{t('welcome.signInTab')}</div></>;
}

describe('LocaleProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.pathname = '/play';
    mocks.preferredLanguage = 'ka';
    mocks.inferredLocale = 'en';
  });

  it.each(['es', 'ka', 'tr'] as const)('renders seeded %s copy on the server before any dictionary effect', locale => {
    mocks.pathname = `/${locale}/about`;
    const html = renderToString(<LocaleProvider initialLocale={locale} initialMessages={messages[locale]}><LocaleProbe /></LocaleProvider>);
    expect(html).toContain(messages[locale].welcome.signInTab);
  });

  it('updates translations when navigating away from the initially seeded language', async () => {
    mocks.pathname = '/tr/about';
    const view = render(<LocaleProvider initialLocale="tr" initialMessages={messages.tr}><LocaleProbe /></LocaleProvider>);
    expect(screen.getByTestId('translation')).toHaveTextContent(messages.tr.welcome.signInTab);
    mocks.pathname = '/es/about';
    view.rerender(<LocaleProvider initialLocale="tr" initialMessages={messages.tr}><LocaleProbe /></LocaleProvider>);
    await act(async () => { await loadLocaleMessages('es'); });
    await waitFor(() => expect(screen.getByTestId('translation')).toHaveTextContent(messages.es.welcome.signInTab));
    expect(screen.getByTestId('locale')).toHaveTextContent('es');
  });

  it('declares the page language of an unprefixed address from the saved choice, and of a prefixed one from the address', async () => {
    localStorage.setItem('quizball_locale', JSON.stringify('ka'));
    mocks.preferredLanguage = undefined;
    document.documentElement.lang = 'en';
    const view = render(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await waitFor(() => expect(document.documentElement.lang).toBe('ka'));
    mocks.pathname = '/es/about';
    view.rerender(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await waitFor(() => expect(document.documentElement.lang).toBe('es'));
    mocks.pathname = '/play';
    view.rerender(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await waitFor(() => expect(document.documentElement.lang).toBe('ka'));
  });

  it('keeps the page language right when navigation swaps the app providers for the lightweight ones and back', async () => {
    localStorage.setItem('quizball_locale', JSON.stringify('ka'));
    mocks.preferredLanguage = undefined;
    const app = render(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await waitFor(() => expect(document.documentElement.lang).toBe('ka'));
    app.unmount();
    mocks.pathname = '/en/football-quiz';
    const seo = render(<SeoProviders><p>quiz</p></SeoProviders>);
    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
    seo.unmount();
    mocks.pathname = '/play';
    render(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await waitFor(() => expect(document.documentElement.lang).toBe('ka'));
  });

  it('restores the saved user locale after a transient localized public route', async () => {
    localStorage.setItem('quizball_locale', JSON.stringify('ka'));

    const { rerender } = render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('ka'));

    mocks.pathname = '/en';
    rerender(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('en'));
    expect(localStorage.getItem('quizball_locale')).toBe(JSON.stringify('ka'));

    mocks.pathname = '/play';
    rerender(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('ka'));
  });

  it('does not persist a URL locale over the stored app locale', async () => {
    mocks.preferredLanguage = undefined;
    localStorage.setItem('quizball_locale', JSON.stringify('ka'));

    const { rerender } = render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('ka'));

    mocks.pathname = '/en';
    rerender(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('en'));
    expect(localStorage.getItem('quizball_locale')).toBe(JSON.stringify('ka'));

    mocks.pathname = '/play';
    rerender(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('ka'));
    expect(localStorage.getItem('quizball_locale')).toBe(JSON.stringify('ka'));
  });

  it('shows and stores English on the public site when "ru" was saved, but keeps Russian in partner views', async () => {
    mocks.preferredLanguage = null;
    localStorage.setItem('quizball_locale', JSON.stringify('ru'));
    const site = render(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await waitFor(() => expect(localStorage.getItem('quizball_locale')).toBe(JSON.stringify('en')));
    expect(screen.getByTestId('locale')).toHaveTextContent('en');
    site.unmount();

    localStorage.setItem('quizball_locale', JSON.stringify('ru'));
    render(<LocaleProvider allowPartnerLocales><LocaleProbe /></LocaleProvider>);
    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('ru'));
    expect(localStorage.getItem('quizball_locale')).toBe(JSON.stringify('ru'));
  });

  it('clears a saved "ru" on the public site even when the page names its language in the address', async () => {
    mocks.pathname = '/en/about';
    localStorage.setItem('quizball_locale', JSON.stringify('ru'));
    render(<LocaleProvider initialLocale="en"><LocaleProbe /></LocaleProvider>);
    await waitFor(() => expect(localStorage.getItem('quizball_locale')).toBe(JSON.stringify('en')));
  });

  it('uses the inferred browser locale on a first visit with no saved locale or profile preference', async () => {
    mocks.preferredLanguage = undefined;
    mocks.inferredLocale = 'ka';

    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('ka'));
    await waitFor(() => expect(localStorage.getItem('quizball_locale')).toBe(JSON.stringify('ka')));
  });

  it('does not override an explicit saved locale with the inferred browser locale', async () => {
    mocks.preferredLanguage = undefined;
    mocks.inferredLocale = 'ka';
    localStorage.setItem('quizball_locale', JSON.stringify('en'));

    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('en'));
    expect(localStorage.getItem('quizball_locale')).toBe(JSON.stringify('en'));
  });
});

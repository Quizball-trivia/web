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
  inferredLocale: 'en' as 'en' | 'ka' | 'fr',
  onboardingComplete: true,
  favoriteClub: null as string | null,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector?: (state: { user: { preferred_language: string | null; onboarding_complete: boolean; favorite_club: string | null } | null }) => unknown) => {
    const state = {
      user: mocks.preferredLanguage === undefined
        ? null
        : { preferred_language: mocks.preferredLanguage, onboarding_complete: mocks.onboardingComplete, favorite_club: mocks.favoriteClub },
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
    mocks.onboardingComplete = true;
    mocks.favoriteClub = null;
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

  it.each(['fr', 'de'] as const)('keeps %s for a guest with no saved language who leaves a language page for the app', async (locale) => {
    mocks.preferredLanguage = undefined;
    mocks.pathname = `/${locale}/about`;
    const view = render(<LocaleProvider initialLocale={locale}><LocaleProbe /></LocaleProvider>);
    await act(async () => { await Promise.resolve(); });

    mocks.pathname = '/play';
    view.rerender(<LocaleProvider initialLocale={locale}><LocaleProbe /></LocaleProvider>);
    await act(async () => { await Promise.resolve(); });

    await waitFor(() => expect(screen.getByTestId('locale').textContent).toBe(locale));
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

  it('keeps the language a guest arrived in across a reload, whatever the browser says', async () => {
    mocks.preferredLanguage = undefined;
    mocks.inferredLocale = 'en';
    mocks.pathname = '/fr';
    const { rerender, unmount } = render(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('fr'));
    expect(localStorage.getItem('quizball_locale')).toBeNull();

    mocks.pathname = '/leaderboard';
    rerender(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await waitFor(() => expect(localStorage.getItem('quizball_locale')).toBe(JSON.stringify('fr')));
    expect(screen.getByTestId('locale')).toHaveTextContent('fr');

    unmount();
    render(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('fr'));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(screen.getByTestId('locale')).toHaveTextContent('fr');
    expect(localStorage.getItem('quizball_locale')).toBe(JSON.stringify('fr'));
  });

  const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  const pendingSignup = (locale: string) => localStorage.setItem('quizball_signup_locale', JSON.stringify({ locale, at: Date.now() }));
  const newAccount = () => { mocks.preferredLanguage = 'en'; mocks.onboardingComplete = false; mocks.favoriteClub = null; };

  it.each(['fr', 'de'] as const)('a new signup from /%s starts onboarding in that language, whatever the browser held', async (locale) => {
    newAccount();
    mocks.inferredLocale = 'en';
    pendingSignup(locale);
    localStorage.setItem('quizball_locale', JSON.stringify('en'));
    mocks.pathname = '/onboarding';
    render(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent(locale));
    await settle();
    expect(screen.getByTestId('locale')).toHaveTextContent(locale);
    expect(localStorage.getItem('quizball_locale')).toBe(JSON.stringify(locale));
    expect(localStorage.getItem('quizball_signup_locale')).toBeNull();
  });

  it('an email signup that stays on /fr keeps French on the way to onboarding', async () => {
    newAccount();
    pendingSignup('fr');
    localStorage.setItem('quizball_locale', JSON.stringify('en'));
    mocks.pathname = '/fr';
    const { rerender } = render(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await settle();
    expect(localStorage.getItem('quizball_signup_locale')).not.toBeNull();
    mocks.pathname = '/onboarding';
    rerender(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await settle();
    expect(screen.getByTestId('locale')).toHaveTextContent('fr');
    expect(localStorage.getItem('quizball_locale')).toBe(JSON.stringify('fr'));
  });

  it('resuming onboarding with a saved German profile keeps German on a French browser', async () => {
    mocks.preferredLanguage = 'de';
    mocks.onboardingComplete = false;
    mocks.inferredLocale = 'fr';
    mocks.pathname = '/onboarding';
    render(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('de'));
    await settle();
    expect(screen.getByTestId('locale')).toHaveTextContent('de');
    expect(localStorage.getItem('quizball_locale')).toBe(JSON.stringify('de'));
  });

  it('resuming onboarding with a saved German profile beats the Georgian another account left in this browser', async () => {
    mocks.preferredLanguage = 'de';
    mocks.onboardingComplete = false;
    localStorage.setItem('quizball_locale', JSON.stringify('ka'));
    mocks.pathname = '/onboarding';
    render(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('de'));
    await settle();
    expect(localStorage.getItem('quizball_locale')).toBe(JSON.stringify('de'));
  });

  it('a saved English profile with onboarding unfinished is a choice: it has the club the same request saved', async () => {
    mocks.preferredLanguage = 'en';
    mocks.onboardingComplete = false;
    mocks.favoriteClub = 'Northwick Rovers';
    mocks.inferredLocale = 'fr';
    localStorage.setItem('quizball_locale', JSON.stringify('fr'));
    pendingSignup('fr');
    mocks.pathname = '/onboarding';
    render(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('en'));
    expect(localStorage.getItem('quizball_signup_locale')).toBeNull();
  });

  it.each([
    ['saved German', 'de'],
    ['no saved language', null],
    ['another account\'s Georgian', 'ka'],
  ] as const)('a completed German account signing in on /fr with %s lands on /play in German', async (_label, stored) => {
    mocks.preferredLanguage = undefined;
    if (stored) localStorage.setItem('quizball_locale', JSON.stringify(stored));
    pendingSignup('fr');
    mocks.pathname = '/fr';
    const { rerender } = render(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await settle();
    expect(screen.getByTestId('locale')).toHaveTextContent('fr');
    mocks.preferredLanguage = 'de';
    rerender(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await settle();
    expect(localStorage.getItem('quizball_signup_locale')).toBeNull();
    mocks.pathname = '/play';
    rerender(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('de'));
    await settle();
    expect(screen.getByTestId('locale')).toHaveTextContent('de');
    expect(localStorage.getItem('quizball_locale')).toBe(JSON.stringify('de'));
  });

  it('a saved English profile beats the French this browser stored, once queued updates settle', async () => {
    mocks.preferredLanguage = 'en';
    mocks.onboardingComplete = false;
    mocks.favoriteClub = 'Northwick Rovers';
    localStorage.setItem('quizball_locale', JSON.stringify('fr'));
    mocks.pathname = '/onboarding';
    render(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await settle();
    await settle();
    expect(screen.getByTestId('locale')).toHaveTextContent('en');
    expect(localStorage.getItem('quizball_locale')).toBe(JSON.stringify('en'));
  });

  it('picking a language while a signup waits for its confirmation drops the signup language', async () => {
    mocks.preferredLanguage = undefined;
    pendingSignup('fr');
    localStorage.setItem('quizball_locale', JSON.stringify('en'));
    mocks.pathname = '/play';
    function Picker() {
      const { setLocale } = useLocale();
      return <button type="button" onClick={() => setLocale('ka')}>pick</button>;
    }
    const { rerender } = render(<LocaleProvider><Picker /><LocaleProbe /></LocaleProvider>);
    await settle();
    act(() => screen.getByRole('button', { name: 'pick' }).click());
    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('ka'));
    expect(localStorage.getItem('quizball_signup_locale')).toBeNull();

    newAccount();
    mocks.pathname = '/onboarding';
    rerender(<LocaleProvider><Picker /><LocaleProbe /></LocaleProvider>);
    await settle();
    expect(screen.getByTestId('locale')).toHaveTextContent('ka');
    expect(localStorage.getItem('quizball_locale')).toBe(JSON.stringify('ka'));
  });

  it('a signed-in account renders even when storage refuses every call', async () => {
    mocks.preferredLanguage = 'de';
    mocks.pathname = '/play';
    const denied = () => { throw new DOMException('denied', 'SecurityError'); };
    const spies = [vi.spyOn(Storage.prototype, 'getItem').mockImplementation(denied), vi.spyOn(Storage.prototype, 'setItem').mockImplementation(denied), vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(denied)];
    try {
      render(<LocaleProvider><LocaleProbe /></LocaleProvider>);
      await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('de'));
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });

  it('a pending signup language does nothing while signed out', async () => {
    mocks.preferredLanguage = undefined;
    localStorage.setItem('quizball_locale', JSON.stringify('de'));
    pendingSignup('fr');
    mocks.pathname = '/play';
    render(<LocaleProvider><LocaleProbe /></LocaleProvider>);
    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('de'));
    await settle();
    expect(localStorage.getItem('quizball_locale')).toBe(JSON.stringify('de'));
    expect(localStorage.getItem('quizball_signup_locale')).not.toBeNull();
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

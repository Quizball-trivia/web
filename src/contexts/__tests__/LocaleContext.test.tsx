import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider, useLocale } from '../LocaleContext';

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

vi.mock('@/lib/i18n/infer-locale', () => ({
  inferLocaleFromBrowser: () => mocks.inferredLocale,
}));

function LocaleProbe() {
  const { locale } = useLocale();
  return <div data-testid="locale">{locale}</div>;
}

describe('LocaleProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.pathname = '/play';
    mocks.preferredLanguage = 'ka';
    mocks.inferredLocale = 'en';
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

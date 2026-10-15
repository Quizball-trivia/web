import { act } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { ProvidersProps } from '../providers';
import { messages, translate as expectedTranslation } from '@/lib/i18n/messages';

const state = vi.hoisted(() => ({ pathname: '/es', captured: null as ProvidersProps | null }));
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));
vi.mock('@/stores/auth.store', () => ({ useAuthStore: (selector: (s: { user: null }) => unknown) => selector({ user: null }) }));
vi.mock('../providers', async () => {
  const { LocaleProvider } = await import('@/contexts/LocaleContext');
  return { Providers: (props: ProvidersProps) => {
    state.captured = props;
    return <LocaleProvider initialLocale={props.initialLocale} initialMessages={props.initialMessages} geoCountry={props.geoCountry}>{props.children}</LocaleProvider>;
  } };
});
import { useLocale } from '@/contexts/LocaleContext';
import { LocaleAssetProviders as Es } from '../locale-asset-providers.es';
import { LocaleAssetProviders as Tr } from '../locale-asset-providers.tr';
import { LocaleAssetProviders as Ka } from '../locale-asset-providers.ka';

function Copy() { const { t, locale } = useLocale(); return <p data-testid="copy" data-locale={locale}>{t('welcome.signInTab')}</p>; }
const cases = [['es', Es], ['tr', Tr], ['ka', Ka]] as const;
beforeEach(() => { state.captured = null; });
afterEach(cleanup);

describe('cacheable complete locale seed entries', () => {
  it.each(cases)('%s server-renders the canonical dictionary without serialized caller messages', (locale, Entry) => {
    state.pathname = `/${locale}`;
    const html = renderToString(<Entry initialLocale={locale} geoCountry="GE" cspNonce="test-nonce"><Copy /></Entry>);
    expect(html).toContain(expectedTranslation(locale, 'welcome.signInTab'));
    expect(state.captured?.initialMessages).toEqual(messages[locale]);
    expect(state.captured?.geoCountry).toBe('GE');
    expect(state.captured?.cspNonce).toBe('test-nonce');
    expect(state.captured?.initialLocale).toBe(locale);
  });

  it.each(cases)('%s caller messages keep precedence', (locale, Entry) => {
    state.pathname = `/${locale}`;
    const dictionary = { welcome: { signInTab: 'Caller copy' } };
    const html = renderToString(<Entry initialLocale={locale} initialMessages={dictionary}><Copy /></Entry>);
    expect(html).toContain('Caller copy');
    expect(state.captured?.initialMessages).toBe(dictionary);
  });

  it.each(cases)('%s never mislabels its dictionary after a root initialization-prop change', (_locale, Entry) => {
    state.pathname = '/en';
    renderToString(<Entry initialLocale="en"><Copy /></Entry>);
    expect(state.captured?.initialMessages).toBeUndefined();
  });

  it.each(cases)('%s hydrates the same localized first paint', async (locale, Entry) => {
    state.pathname = `/${locale}`;
    const element = <Entry initialLocale={locale}><Copy /></Entry>;
    const container = document.createElement('div');
    container.innerHTML = renderToString(element); document.body.append(container);
    const recoverable = vi.fn();
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => { root = hydrateRoot(container, element, { onRecoverableError: recoverable }); });
    expect(container.textContent).toBe(expectedTranslation(locale, 'welcome.signInTab'));
    expect(recoverable).not.toHaveBeenCalled();
    await act(async () => { root.unmount(); }); container.remove();
  });

  it('retains the caller-seeded navigation and login copy', () => {
    state.pathname = '/es';
    render(<Es initialLocale="es"><Copy /></Es>);
    expect(screen.getByTestId('copy')).toHaveTextContent(expectedTranslation('es', 'welcome.signInTab'));
  });
});

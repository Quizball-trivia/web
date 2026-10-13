import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigation = vi.hoisted(() => ({ pathname: '/en/football-quiz' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
}));

const dynamicImports = vi.hoisted(() => ({ mounts: {} as Record<string, number>, unmounts: {} as Record<string, number> }));

vi.mock('next/dynamic', () => ({
  default: (loader: () => unknown) => {
    const source = loader.toString();
    const name = source.includes('locale-asset-providers.es') ? 'locale-es'
      : source.includes('locale-asset-providers.tr') ? 'locale-tr'
        : source.includes('locale-asset-providers.ka') ? 'locale-ka'
          : source.includes('PartnerProviders') ? 'partner-providers' : 'full-providers';
    const queryClient = new QueryClient();
    return function MockDynamicProviders({ children }: { children: ReactNode }) {
      useEffect(() => {
        dynamicImports.mounts[name] = (dynamicImports.mounts[name] ?? 0) + 1;
        return () => { dynamicImports.unmounts[name] = (dynamicImports.unmounts[name] ?? 0) + 1; };
      }, []);
      return (
        <div data-testid={name}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </div>
      );
    };
  },
}));

vi.mock('../seo-providers', () => ({
  SeoProviders: ({ children }: { children: ReactNode }) => (
    <div data-testid="seo-providers">{children}</div>
  ),
}));

import { RouteProviders } from '../route-providers';

function QueryClientProbe() {
  useQueryClient();
  return <p>signup ready</p>;
}

describe('RouteProviders', () => {
  beforeEach(() => {
    navigation.pathname = '/en/football-quiz';
    dynamicImports.mounts = {};
    dynamicImports.unmounts = {};
  });

  it('keeps the lightweight provider tree on public football quiz routes', () => {
    render(
      <RouteProviders isSeoRoute initialLocale="en">
        <p>quiz hub</p>
      </RouteProviders>,
    );

    expect(screen.getByTestId('seo-providers')).toBeInTheDocument();
    expect(screen.getByText('quiz hub')).toBeInTheDocument();
  });

  it('gives partner hosts their own provider tree on every path', () => {
    for (const pathname of ['/partner/freecroco', '/en/football-quiz', '/dev/games']) {
      navigation.pathname = pathname;
      const view = render(
        <RouteProviders partner="freecroco" isSeoRoute={false}>
          <p>partner home</p>
        </RouteProviders>,
      );
      expect(screen.getByTestId('partner-providers')).toBeInTheDocument();
      expect(screen.queryByTestId('full-providers')).not.toBeInTheDocument();
      expect(screen.queryByTestId('seo-providers')).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it('switches to full providers when Play Ranked navigates to signup', () => {
    const view = render(
      <RouteProviders isSeoRoute initialLocale="en">
        <p>quiz hub</p>
      </RouteProviders>,
    );

    navigation.pathname = '/en';
    view.rerender(
      <RouteProviders isSeoRoute initialLocale="en">
        <QueryClientProbe />
      </RouteProviders>,
    );

    expect(screen.getByText('signup ready')).toBeInTheDocument();
    expect(screen.queryByTestId('seo-providers')).not.toBeInTheDocument();
  });

  it.each(['en', 'ka', 'es', 'tr'])('renders download without app/auth providers for %s', (locale) => {
    navigation.pathname = `/${locale}/download`;
    const view = render(<RouteProviders isSeoRoute={false}><p>download ready</p></RouteProviders>);
    expect(screen.getByTestId('seo-providers')).toBeInTheDocument();
    // The persistent root must switch back to full providers when browser play is opened.
    navigation.pathname = `/${locale}`;
    view.rerender(<RouteProviders isSeoRoute><QueryClientProbe /></RouteProviders>);
    expect(screen.getByText('signup ready')).toBeInTheDocument();
    expect(screen.queryByTestId('seo-providers')).not.toBeInTheDocument();
  });

  it.each(['en', 'es', 'ka', 'tr'] as const)('keeps the original tree unless explicitly opted in for %s', locale => {
    navigation.pathname = `/${locale}`;
    render(<RouteProviders isSeoRoute={false} initialLocale={locale}><QueryClientProbe /></RouteProviders>);
    expect(screen.getByTestId('full-providers')).toBeInTheDocument();
  });

  it.each(['es', 'tr', 'ka'] as const)('seeds %s without remounting full providers across locale, Settings and Back', locale => {
    navigation.pathname = `/${locale}`;
    const view = render(<RouteProviders isSeoRoute={false} initialLocale={locale} localeAssetSeed><QueryClientProbe /></RouteProviders>);
    for (const pathname of ['/en/football-games/football-name-chain', '/settings', `/${locale}`]) {
      navigation.pathname = pathname;
      view.rerender(<RouteProviders isSeoRoute={false} initialLocale={locale} localeAssetSeed><QueryClientProbe /></RouteProviders>);
      expect(screen.getByTestId(`locale-${locale}`)).toBeInTheDocument();
      expect(screen.getByText('signup ready')).toBeInTheDocument();
    }
    expect(dynamicImports.mounts[`locale-${locale}`]).toBe(1);
    expect(dynamicImports.unmounts[`locale-${locale}`] ?? 0).toBe(0);
  });

  it('uses the original English entry even with opt-in', () => {
    navigation.pathname = '/en';
    render(<RouteProviders isSeoRoute={false} initialLocale="en" localeAssetSeed><QueryClientProbe /></RouteProviders>);
    expect(screen.getByTestId('full-providers')).toBeInTheDocument();
  });

  it('does not render a seeded entry on lightweight/partner paths, then restores queries after SEO', () => {
    const view = render(<RouteProviders isSeoRoute initialLocale="es" localeAssetSeed><p>quiz</p></RouteProviders>);
    expect(screen.queryByTestId('locale-es')).not.toBeInTheDocument();
    navigation.pathname = '/es';
    view.rerender(<RouteProviders isSeoRoute initialLocale="es" localeAssetSeed><QueryClientProbe /></RouteProviders>);
    expect(screen.getByTestId('locale-es')).toBeInTheDocument();
    view.rerender(<RouteProviders partner="freecroco" isSeoRoute={false} initialLocale="es" localeAssetSeed><p>partner</p></RouteProviders>);
    expect(screen.getByTestId('partner-providers')).toBeInTheDocument();
    expect(screen.queryByTestId('locale-es')).not.toBeInTheDocument();
  });
});

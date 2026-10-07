import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigation = vi.hoisted(() => ({ pathname: '/en/football-quiz' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
}));

const dynamicImports = vi.hoisted(() => ({ count: 0 }));

vi.mock('next/dynamic', () => ({
  // route-providers declares FullProviders first, then PartnerProviders.
  default: () => {
    const name = ++dynamicImports.count === 1 ? 'full-providers' : 'partner-providers';
    const queryClient = new QueryClient();
    return function MockDynamicProviders({ children }: { children: ReactNode }) {
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
});

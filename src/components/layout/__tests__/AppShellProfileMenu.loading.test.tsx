import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentType, ReactElement } from 'react';
import type { PlayerStats } from '@/types/game';

const mocks = vi.hoisted(() => ({
  ready: false,
  loader: undefined as undefined | (() => Promise<ComponentType>),
  options: undefined as undefined | { ssr: boolean; loading: () => ReactElement },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/queries/ranked.queries', () => ({ useRankedProfile: () => ({ data: { tier: 'Academy' } }) }));
vi.mock('@/contexts/LocaleContext', () => ({ useLocale: () => ({ t: (key: string) => key }) }));
vi.mock('@/components/TierFrameAvatar', () => ({ TierFrameAvatar: () => <div data-testid="loaded-avatar" /> }));
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<ComponentType>, options: { ssr: boolean; loading: () => ReactElement }) => {
    mocks.loader = loader;
    mocks.options = options;
    return function DeferredAvatar() {
      return mocks.ready ? <div data-testid="loaded-avatar" /> : options.loading();
    };
  },
}));

import { AppShellProfileMenu } from '../app-shell/AppShellProfileMenu';
import { TierFrameAvatar } from '@/components/TierFrameAvatar';

const playerStats = { username: 'Tester', avatar: 'avatar-1', level: 5, rankPoints: 1234 } as PlayerStats;

describe('profile artwork loading', () => {
  beforeEach(() => { mocks.ready = false; });

  it.each(['desktop', 'mobile'] as const)('preserves the %s trigger and exact frame space before the avatar loads', (variant) => {
    const { container } = render(<AppShellProfileMenu variant={variant} playerStats={playerStats} onRequestLogout={vi.fn()} />);
    expect(screen.getAllByText('Tester').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1234/).length).toBeGreaterThan(0);
    const frame = container.querySelector('[aria-hidden="true"][style]');
    expect(frame).toHaveStyle({ width: '44px', height: '62px' });
    expect(screen.queryByTestId('loaded-avatar')).not.toBeInTheDocument();
    expect(mocks.options?.ssr).toBe(false);
  });

  it('loads the existing avatar implementation without replacing the member controls', async () => {
    const view = render(<AppShellProfileMenu variant="mobile" playerStats={playerStats} onRequestLogout={vi.fn()} />);
    const trigger = screen.getByRole('button');
    expect(await mocks.loader?.()).toBe(TierFrameAvatar);
    mocks.ready = true;
    view.rerender(<AppShellProfileMenu variant="mobile" playerStats={playerStats} onRequestLogout={vi.fn()} />);
    expect(screen.getByRole('button')).toBe(trigger);
    expect(screen.getByTestId('loaded-avatar')).toBeInTheDocument();
  });
});

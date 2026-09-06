import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { messages, translate, type Locale, type MessageKey } from '@/lib/i18n/messages';
import { getWeekendLeaguePrizes } from '../prizes';
import { PrizesPanel } from '../components/PrizesPanel';
import { WeekendLeaguePromoCard } from '../components/WeekendLeaguePromoCard';
import { LeagueHeader } from '../components/LeagueHeader';

const settings = vi.hoisted(() => ({ locale: 'en' as Locale }));
vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    locale: settings.locale,
    t: (key: MessageKey, params?: Record<string, string | number>) => translate(settings.locale, key, params),
  }),
}));
vi.mock('@/stores/auth.store', async () => {
  const { create } = await import('zustand');
  return { useAuthStore: create(() => ({ user: null as { country: string } | null })) };
});
import { useAuthStore } from '@/stores/auth.store';

function setCountry(country: string | null) {
  useAuthStore.setState({ user: country == null ? null : { country } as NonNullable<ReturnType<typeof useAuthStore.getState>['user']> });
}

afterEach(() => { cleanup(); settings.locale = 'en'; setCountry(null); });

describe('Weekend League country prizes', () => {
  it.each(['GE', 'ge', ' Georgia ', 'GEO', null, undefined, '', 'unknown'])('keeps GEL prizes for Georgia or an unknown country: %s', (country) => {
    expect(getWeekendLeaguePrizes(country).heroAmount).toBe('200₾');
  });

  it.each(['US', 'ES', 'GB', 'DE', 'Spain', 'United States'])('uses Amazon USD prizes for %s', (country) => {
    expect(getWeekendLeaguePrizes(country).tiers.map((tier) => translate('en', tier.prizeKey)))
      .toEqual(['$50 USD Amazon Gift Card', '$25 USD Amazon Gift Card', '$10 USD Amazon Gift Card']);
  });

  it.each(['en', 'ka', 'es'] as const)('renders both country offers and rules in %s without a language fallback', (locale) => {
    settings.locale = locale;
    setCountry('ES');
    render(<PrizesPanel />);
    for (const key of ['prize1AmazonReward', 'prize2AmazonReward', 'prize3AmazonReward', 'prizesInternationalRule', 'prizesPayoutNote'] as const) {
      expect(screen.getByText(messages[locale].weekendLeague[key])).toBeInTheDocument();
    }
    expect(screen.queryByText(/Wolt/)).not.toBeInTheDocument();
    act(() => setCountry('GE'));
    for (const key of ['prize1Reward', 'prize2Reward', 'prize3Reward', 'prizesGeorgiaRule'] as const) {
      expect(screen.getByText(messages[locale].weekendLeague[key])).toBeInTheDocument();
    }
    expect(screen.queryByText(/Amazon/)).not.toBeInTheDocument();
  });

  it.each(['en', 'ka', 'es'] as const)('updates both banners when the profile loads in %s', (locale) => {
    settings.locale = locale;
    setCountry(null);
    const { container } = render(<>
      <WeekendLeaguePromoCard registeredCount={10} kickoffMs={null} onStart={() => {}} />
      <LeagueHeader phase="upcoming" milestones={null} />
    </>);
    expect(screen.getAllByText('200₾')).toHaveLength(2);
    act(() => setCountry('US'));
    expect(screen.getAllByText('$50')).toHaveLength(2);
    expect(screen.queryByText('200₾')).not.toBeInTheDocument();
    expect(screen.getAllByText(messages[locale].weekendLeague.promoAmazonGiftCard)).toHaveLength(2);
    expect(screen.getAllByText(messages[locale].weekendLeague.promoAmazonStore)).toHaveLength(2);
    expect([...container.querySelectorAll('img')].filter((img) => img.getAttribute('src')?.includes('wl-promo-amazon-50'))).toHaveLength(2);
    act(() => setCountry('GE'));
    expect(screen.getAllByText('200₾')).toHaveLength(2);
    expect(screen.queryByText('$50')).not.toBeInTheDocument();
  });
});

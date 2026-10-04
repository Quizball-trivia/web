import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { messages, translate, type Locale, type MessageKey } from '@/lib/i18n/messages';
import { getWeekendLeaguePrizes, WEEKEND_COIN_REWARDS } from '../prizes';
import { PrizesPanel } from '../components/PrizesPanel';
import { WeekendLeaguePromoCard } from '../components/WeekendLeaguePromoCard';
import { LeagueHeader } from '../components/LeagueHeader';

const settings = vi.hoisted(() => ({ locale: 'en' as Locale }));
vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({ locale: settings.locale,
    t: (key: MessageKey, params?: Record<string, string | number>) => translate(settings.locale, key, params),
  }),
}));
afterEach(() => { cleanup(); settings.locale = 'en'; });

describe('Weekend League rare-item packs', () => {
  it.each(['GE','US','GB','ES','TR',null,undefined,'unknown'])('uses the same digital-only reward ladder for %s', country => {
    const rewards = getWeekendLeaguePrizes(country);
    expect(rewards).toBe(getWeekendLeaguePrizes('GE'));
    expect(rewards.tiers.map(t => [t.rankFrom,t.rankTo])).toEqual([[1,1],[2,2],[3,3]]);
    expect(rewards).not.toHaveProperty('heroAmount');
    expect(rewards).not.toHaveProperty('voucherKey');
  });

  it.each(['en','ka','es','tr'] as const)('renders packs and inline details in %s without English fallback', locale => {
    settings.locale = locale;
    const {container} = render(<PrizesPanel highlightRank={2} />);
    for(const key of ['prize1Reward','prize2Reward','prize3Reward','rewardDropTitle','rewardPreviewNote','rewardEntryRule',
      'rewardScoringRule','rewardNonCash','prizesPayoutNote'] as const) {
      expect(screen.getByText(messages[locale].weekendLeague[key])).toBeInTheDocument();
    }
    expect(screen.getAllByTestId('weekend-reward-current-place')).toHaveLength(1);
    expect(container.querySelectorAll('img[src*="wl-retro-playmaker"]')).toHaveLength(3);
    expect(container.textContent).not.toMatch(/Amazon|Wolt|Zoommer|Setanta|FotMob|₾200|\$50/);
    expect(container.querySelector('a[href*="contest"]')).toBeNull();
    // Packs hold a kit and coins only (frames are not ownable), and they are
    // granted automatically: nothing tells winners to claim through support.
    expect(container.textContent).not.toMatch(/frame|marco|ჩარჩო|çerçeve|Apple/i);
    expect(messages[locale].weekendLeague.prizesPayoutNote).not.toMatch(/Help|Ayuda|Yardım|დახმარება/);
  });

  it('advertises exactly the coin ladder the server pays (backend wl-reward-policy.ts, policy v1)', () => {
    expect(WEEKEND_COIN_REWARDS.map((tier) => [tier.id, tier.coins])).toEqual([
      ['winner', 40_000], ['second', 25_000], ['third', 15_000], ['top10', 8_000], ['finalist', 4_000], ['participant', 1_500],
    ]);
  });

  it.each(['en','ka','es','tr'] as const)('shows the packs in both pre-event banners in %s', locale => {
    settings.locale = locale;
    const {container} = render(<>
      <WeekendLeaguePromoCard registeredCount={10} kickoffMs={null} onStart={() => {}} />
      <LeagueHeader phase="upcoming" milestones={null} />
    </>);
    expect(screen.getAllByTestId('weekend-rare-drop')).toHaveLength(2);
    expect(screen.getAllByText(messages[locale].weekendLeague.rewardPreviewNote)).toHaveLength(2);
    expect(container.querySelectorAll('img[src*="wl-retro-playmaker"]')).toHaveLength(6);
    expect(container.textContent).not.toMatch(/Amazon|Wolt|Zoommer|₾200|\$50/);
  });

  it('does not highlight a top-three pack for fourth place', () => {
    render(<PrizesPanel highlightRank={4} />);
    expect(screen.queryByTestId('weekend-reward-current-place')).not.toBeInTheDocument();
  });
});

describe('Weekend League prize board assets', () => {
  it('points every image at a file that exists in public/', async () => {
    const { existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { container } = render(<PrizesPanel highlightRank={null} />);
    const sources = [...container.querySelectorAll('img')].map((img) => decodeURIComponent(img.getAttribute('src') ?? ''));
    expect(sources.length).toBeGreaterThan(0);
    for (const src of sources) {
      const path = (src.match(/url=([^&]+)/)?.[1] ?? src).split('?')[0];
      expect(existsSync(join(process.cwd(), 'public', path)), path).toBe(true);
    }
  });
});

describe('Weekend League prize board content', () => {
  it.each(['en', 'es'] as const)('each podium tile shows its own kit and coin amount, and the ladder its own amounts (%s)', (locale) => {
    settings.locale = locale;
    const { container } = render(<PrizesPanel highlightRank={null} />);
    const amount = (coins: number) => coins.toLocaleString(locale);
    const tiles = [...container.querySelectorAll('[data-place]')];
    expect(tiles.map((tile) => tile.getAttribute('data-place'))).toEqual(['1', '2', '3']);
    const kits = ['jerseyHome', 'jerseyAway', 'jerseyTraining'] as const;
    const podium = [40_000, 25_000, 15_000];
    tiles.forEach((tile, i) => {
      expect(tile.textContent).toContain(amount(podium[i]));
      expect(tile.querySelector('img[src*="wl-retro-playmaker"]')?.getAttribute('alt')).toBe(messages[locale].wlRewards[kits[i]]);
    });
    for (const coins of [8_000, 4_000, 1_500]) expect(container.textContent).toContain(amount(coins));
  });
});

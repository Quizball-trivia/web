import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { messages, translate, type Locale, type MessageKey } from '@/lib/i18n/messages';
import { getWeekendLeaguePrizes, WEEKEND_COIN_REWARDS, WL_PACK_HAS_FRAME } from '../prizes';
import { PrizesPanel } from '../components/PrizesPanel';
import { WeekendLeaguePromoCard } from '../components/WeekendLeaguePromoCard';
import { LeagueHeader } from '../components/LeagueHeader';
import { WlPrizeCard, coinFormatter, groupDigits } from '../components/WlPrizeCard';

const settings = vi.hoisted(() => ({ locale: 'en' as Locale }));
vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({ locale: settings.locale,
    t: (key: MessageKey, params?: Record<string, string | number>) => translate(settings.locale, key, params),
  }),
}));
afterEach(() => { cleanup(); settings.locale = 'en'; });

const LOCALES = ['en', 'ka', 'es', 'tr'] as const;
const grouped = (locale: Locale, coins: number) =>
  new Intl.NumberFormat(locale === 'ka' ? 'ka-GE' : locale, { useGrouping: 'always' } as Intl.NumberFormatOptions).format(coins);

describe('Weekend League prizes', () => {
  it.each(['GE', 'US', 'GB', 'ES', 'TR', null, undefined, 'unknown'])('uses the same digital-only reward ladder for %s', (country) => {
    const rewards = getWeekendLeaguePrizes(country);
    expect(rewards).toBe(getWeekendLeaguePrizes('GE'));
    expect(rewards.tiers.map((t) => [t.rankFrom, t.rankTo])).toEqual([[1, 1], [2, 2], [3, 3]]);
    expect(rewards).not.toHaveProperty('heroAmount');
    expect(rewards).not.toHaveProperty('voucherKey');
  });

  it('advertises exactly the coin ladder the server pays (backend wl-reward-policy.ts)', () => {
    expect(WEEKEND_COIN_REWARDS.map((tier) => [tier.id, tier.coins])).toEqual([
      ['winner', 40_000], ['second', 25_000], ['third', 15_000], ['top10', 8_000], ['finalist', 4_000], ['participant', 1_500],
    ]);
  });
});

describe('WlPrizeCard', () => {
  it.each(LOCALES)('shows every place with its own kit and amount, grouped the same way, in %s', (locale) => {
    settings.locale = locale;
    const { container } = render(<WlPrizeCard />);
    const wl = messages[locale].weekendLeague;
    expect(screen.getByText(wl.rewardDropTitle)).toBeInTheDocument();
    expect(screen.getByText(wl.prize1Label)).toBeInTheDocument();

    const kits = ['jerseyHome', 'jerseyAway', 'jerseyTraining'] as const;
    [40_000, 25_000, 15_000].forEach((coins, i) => {
      const tile = container.querySelector(`[data-place="${i + 1}"]`) as HTMLElement;
      expect(tile.textContent).toContain(grouped(locale, coins));
      expect(within(tile).getByAltText(messages[locale].wlRewards[kits[i]])).toBeInTheDocument();
    });
    for (const tier of WEEKEND_COIN_REWARDS.slice(3)) {
      const cell = container.querySelector(`[data-tier="${tier.id}"]`) as HTMLElement;
      expect(cell.textContent).toContain(grouped(locale, tier.coins));
      expect(cell.textContent).toContain(translate(locale, tier.labelKey));
    }
    expect(container.textContent).not.toMatch(/Amazon|Wolt|Zoommer|₾\s?\d|\$50/);
  });

  it('claims a frame only once packs carry one', () => {
    render(<WlPrizeCard />);
    const line = WL_PACK_HAS_FRAME ? messages.en.wlRewards.kitFrameCoins : messages.en.wlRewards.exclusiveJersey;
    expect(screen.getByText(line)).toBeInTheDocument();
  });

  it.each([[1, '1'], [2, '2'], [3, '3']] as const)('marks the viewer’s podium place %s, and nothing else', (rank, place) => {
    const { container } = render(<WlPrizeCard surface="dark" highlightRank={rank} />);
    const you = screen.getAllByText(messages.en.weekendLeague.you);
    expect(you).toHaveLength(1);
    expect(container.querySelector(`[data-place="${place}"]`)?.contains(you[0])).toBe(true);
  });

  it('marks Top 10 for ranks 4–10 and nothing outside it', () => {
    const { container, rerender } = render(<WlPrizeCard surface="dark" highlightRank={7} />);
    expect(container.querySelector('[data-tier="top10"]')?.textContent).toContain(messages.en.weekendLeague.you);
    rerender(<WlPrizeCard surface="dark" highlightRank={18} />);
    expect(screen.queryByText(messages.en.weekendLeague.you)).toBeNull();
  });

  it('points every image at a file that exists in public/', async () => {
    const { existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { container } = render(<WlPrizeCard />);
    const sources = [...container.querySelectorAll('img')].map((img) => decodeURIComponent(img.getAttribute('src') ?? ''));
    expect(sources.length).toBeGreaterThan(0);
    for (const src of sources) {
      const path = (src.match(/url=([^&]+)/)?.[1] ?? src).split('?')[0];
      expect(existsSync(join(process.cwd(), 'public', path)), path).toBe(true);
    }
  });
});

describe('Weekend League prize placements', () => {
  it.each(LOCALES)('the pre-event banners each show the card once, in %s', (locale) => {
    settings.locale = locale;
    render(<>
      <WeekendLeaguePromoCard registeredCount={10} kickoffMs={null} onStart={() => {}} />
      <LeagueHeader phase="upcoming" milestones={null} />
    </>);
    expect(screen.getAllByTestId('weekend-rare-drop')).toHaveLength(2);
  });

  it.each(LOCALES)('the rules section lists the rules in %s, with the card only when asked', (locale) => {
    settings.locale = locale;
    const wl = messages[locale].weekendLeague;
    const { rerender } = render(<PrizesPanel showBoard={false} />);
    for (const key of ['rewardEntryRule', 'rewardScoringRule', 'rewardParticipationRule', 'rewardNonCash', 'prizesPayoutNote'] as const) {
      expect(screen.getByText(wl[key])).toBeInTheDocument();
    }
    expect(screen.queryByTestId('weekend-rare-drop')).toBeNull();
    rerender(<PrizesPanel highlightRank={2} />);
    expect(screen.getByTestId('weekend-rare-drop')).toBeInTheDocument();
    // Packs are a kit and coins (frames come later) delivered automatically:
    // nothing tells winners to claim through support or mentions Apple.
    expect(wl.prizesPayoutNote).not.toMatch(/Help|Ayuda|Yardım|დახმარება/);
    expect(document.body.textContent).not.toMatch(/Apple/);
  });
});

describe('coin grouping', () => {
  it('groups four-digit amounts in every app language', () => {
    for (const locale of LOCALES) expect(coinFormatter(locale)(8000)).not.toBe('8000');
    expect(coinFormatter('es')(8000)).toBe('8.000');
  });

  it('the fallback for older engines inserts the separator by hand', () => {
    expect(groupDigits(8000, '.')).toBe('8.000');
    expect(groupDigits(40000, '\u00a0')).toBe('40\u00a0000');
    expect(groupDigits(1500, ',')).toBe('1,500');
    expect(groupDigits(999, '.')).toBe('999');
  });
});

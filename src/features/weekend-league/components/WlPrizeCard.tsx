'use client';

import Image from 'next/image';
import { useLocale } from '@/contexts/LocaleContext';
import { WEEKEND_COIN_REWARDS, WL_PACK_HAS_FRAME } from '../prizes';
import { WlFrameArt, type WlFramePlace } from '../rewards/WlFrame';

const PODIUM = [
  { place: 1, kit: 'home-v3', nameKey: 'wlRewards.jerseyHome', rankKey: 'weekendLeague.prize1Rank', packKey: 'weekendLeague.prize1Label', coins: WEEKEND_COIN_REWARDS[0].coins, accent: '#F1CB70' },
  { place: 2, kit: 'away-v2', nameKey: 'wlRewards.jerseyAway', rankKey: 'weekendLeague.prize2Rank', packKey: 'weekendLeague.prize2Label', coins: WEEKEND_COIN_REWARDS[1].coins, accent: '#D9DEE6' },
  { place: 3, kit: 'training-v4', nameKey: 'wlRewards.jerseyTraining', rankKey: 'weekendLeague.prize3Rank', packKey: 'weekendLeague.prize3Label', coins: WEEKEND_COIN_REWARDS[2].coins, accent: '#D99B64' },
] as const;

const LADDER = WEEKEND_COIN_REWARDS.slice(3);

export type PrizeCardSurface = 'blue' | 'gold' | 'dark';

/** The card has no panel of its own: text, hairlines and amounts follow the
 *  surface underneath — the blue promo card, the gold "entered" header, or
 *  the dark page after the qualifier (owner design, 2026-10-04). */
const SURFACE: Record<PrizeCardSurface, { kicker: string; title: string; text: string; muted: string; line: string; divide: string; coins: string; glow: string }> = {
  blue: { kicker: 'text-brand-gold', title: 'text-white', text: 'text-white', muted: 'text-white/70', line: 'bg-white/20', divide: 'divide-white/20', coins: 'text-brand-gold', glow: 'rgba(255,255,255,0.18)' },
  dark: { kicker: 'text-brand-gold', title: 'text-white', text: 'text-white', muted: 'text-white/60', line: 'bg-white/12', divide: 'divide-white/12', coins: 'text-brand-gold', glow: 'rgba(241,203,112,0.2)' },
  gold: { kicker: 'text-black/55', title: 'text-black/90', text: 'text-black/90', muted: 'text-black/60', line: 'bg-black/15', divide: 'divide-black/15', coins: 'text-black/85', glow: 'rgba(255,255,255,0.35)' },
};

const kitSrc = (kit: string) => `/assets/store/rewards/wl-retro-playmaker/${kit}.webp`;

/** Grouped in every locale: es/ka/tr skip grouping for four-digit numbers by
 *  default, which printed "8000" next to "40.000" on the same card. */
function useCoinFormat() {
  const { locale } = useLocale();
  const format = new Intl.NumberFormat(locale === 'ka' ? 'ka-GE' : locale, { useGrouping: 'always' } as Intl.NumberFormatOptions);
  return (coins: number) => format.format(coins);
}

function CoinAmount({ coins, color, className, size }: { coins: number; color: string; className: string; size: number }) {
  const format = useCoinFormat();
  return (
    <span className={`inline-flex items-center gap-1.5 font-poppins font-black tabular-nums ${color} ${className}`}>
      <Image src="/assets/coin-1.png?v=2" alt="" width={size} height={size} className="shrink-0" />
      {format(coins)}
    </span>
  );
}

/** The kit in front, its podium frame tucked behind to the right. */
function PackArt({ kit, alt, place, withFrame, big = false }: { kit: string; alt: string; place: WlFramePlace; withFrame: boolean; big?: boolean }) {
  return (
    <div className={`relative shrink-0 ${big ? (withFrame ? 'w-[132px] sm:w-[156px]' : 'w-[112px] sm:w-[136px]') : (withFrame ? 'w-[76px]' : 'w-[58px]')}`}>
      {withFrame && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 rotate-[8deg]">
          <WlFrameArt place={place} width={big ? 58 : 30} />
        </div>
      )}
      <Image
        src={kitSrc(kit)}
        alt={alt}
        width={700}
        height={580}
        className={`relative object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)] ${big ? 'h-[104px] w-[112px] sm:h-[128px] sm:w-[136px]' : 'h-[54px] w-[58px]'}`}
      />
    </div>
  );
}

/** What each Weekend League place wins: the champion's pack first, 2nd and
 *  3rd beside each other, then the coin ladder — hairlines, no boxes. */
export function WlPrizeCard({ surface = 'blue', highlightRank = null }: { surface?: PrizeCardSurface; highlightRank?: number | null }) {
  const { t } = useLocale();
  const c = SURFACE[surface];
  const [first, second, third] = PODIUM;
  const you = (
    <span className={`ml-1.5 whitespace-nowrap rounded-full px-2 py-0.5 font-poppins text-[9px] font-black uppercase ${surface === 'gold' ? 'bg-black/80 text-brand-gold' : 'bg-brand-gold text-black'}`}>
      {t('weekendLeague.you')}
    </span>
  );
  return (
    <section data-testid="weekend-rare-drop" className="w-full text-left">
      <div className="text-center">
        <p className={`font-poppins text-[10px] font-bold uppercase tracking-[0.18em] ${c.kicker}`}>{t('weekendLeague.rewardDropKicker')}</p>
        <h2 className={`mt-1.5 font-poppins text-[19px] font-black leading-tight sm:text-[22px] ${c.title}`}>{t('weekendLeague.rewardDropTitle')}</h2>
      </div>

      <div data-place={1} data-selected={highlightRank === 1} className="relative mt-4 flex items-center gap-4">
        <div className="pointer-events-none absolute -left-4 top-1/2 h-40 w-48 -translate-y-1/2 rounded-full blur-2xl" style={{ background: c.glow }} />
        <PackArt kit={first.kit} alt={t(first.nameKey)} place={1} withFrame={WL_PACK_HAS_FRAME} big />
        <div className="relative min-w-0">
          <span className="whitespace-nowrap rounded-full px-2.5 py-0.5 font-poppins text-[11px] font-black text-black" style={{ background: surface === 'gold' ? '#FFFFFF' : first.accent }}>
            {t(first.rankKey)}
          </span>
          {highlightRank === 1 && you}
          <div className={`mt-2 font-poppins text-[16px] font-black leading-tight sm:text-[18px] ${c.text}`}>{t(first.packKey)}</div>
          <div className={`mt-0.5 font-poppins text-[11px] ${c.muted}`}>{t(WL_PACK_HAS_FRAME ? 'wlRewards.kitFrameCoins' : 'wlRewards.exclusiveJersey')}</div>
          <CoinAmount coins={first.coins} color={c.coins} className="mt-2 text-[19px]" size={20} />
        </div>
      </div>

      <div className={`my-3.5 h-px ${c.line}`} />
      <div className={`grid grid-cols-2 divide-x ${c.divide}`}>
        {[second, third].map((p) => (
          <div key={p.place} data-place={p.place} data-selected={highlightRank === p.place} className="flex items-center gap-2.5 px-2 first:pl-0 last:pr-0">
            <PackArt kit={p.kit} alt={t(p.nameKey)} place={p.place} withFrame={WL_PACK_HAS_FRAME} />
            <div className="min-w-0">
              <div className={`whitespace-nowrap font-poppins text-[12px] font-black ${surface === 'gold' ? 'text-black/70' : ''}`} style={surface === 'gold' ? undefined : { color: p.accent }}>
                {t(p.rankKey)}
                {highlightRank === p.place && you}
              </div>
              <CoinAmount coins={p.coins} color={c.coins} className="text-[14px]" size={15} />
            </div>
          </div>
        ))}
      </div>

      <div className={`my-3.5 h-px ${c.line}`} />
      <div className={`grid grid-cols-3 divide-x ${c.divide}`}>
        {LADDER.map((tier) => (
          <div key={tier.id} data-tier={tier.id} className="flex flex-col items-center gap-1 px-1 text-center">
            <span className={`font-poppins text-[10px] font-semibold leading-tight ${c.muted}`}>
              {t(tier.labelKey)}
              {tier.id === 'top10' && highlightRank != null && highlightRank >= 4 && highlightRank <= 10 && you}
            </span>
            <CoinAmount coins={tier.coins} color={c.coins} className="text-[13px]" size={14} />
          </div>
        ))}
      </div>

      <p className={`mt-4 text-center font-poppins text-[11px] font-medium leading-relaxed ${c.muted}`}>
        {t('weekendLeague.rewardHighestOnly')} {t('weekendLeague.rewardPreviewNote')}
      </p>
    </section>
  );
}

/** The reward rules shown below the board. */
export function WeekendLeagueRewardDetails() {
  const { t } = useLocale();
  return (
    <div data-testid="weekend-inline-rules" className="mt-3.5 space-y-2 font-poppins text-[11px] font-medium leading-relaxed text-[#afc3dd]">
      <p>{t('weekendLeague.rewardEntryRule')}</p>
      <p>{t('weekendLeague.rewardScoringRule')}</p>
      <p>{t('weekendLeague.rewardNonCash')}</p>
      <p>{t('weekendLeague.prizesPayoutNote')}</p>
      <p>{t('weekendLeague.rewardContact')}</p>
    </div>
  );
}

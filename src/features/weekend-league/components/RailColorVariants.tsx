'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { LAUNCH_EDITION, poppins, QP_TARGET } from '../constants';
import { colors } from '@/lib/colors';
import { LEAGUE_TAB_HREF } from './StatusBandVariants';

const QP = LAUNCH_EDITION ? QP_TARGET : 120;
const PCT = Math.round((QP / QP_TARGET) * 100);

interface RailSkin {
  /** Outer surface: either a solid color or a CSS background image/gradient. */
  background: string;
  isGradient?: boolean;
  /** Progress trough behind the QP fill. */
  trough: string;
  /** QP fill + the QP number. */
  fill: string;
  qpText: string;
  /** Title, time and arrow colors. */
  title: string;
  meta: string;
  time: string;
  arrow: string;
  /** Optional left edge marker. */
  edge?: string;
  /** 0 hides the trophy watermark entirely. */
  trophyOpacity: number;
  /** Extra classes on the outer link (hover treatment). */
  hover: string;
}

function Rail({ skin }: { skin: RailSkin }) {
  const { t } = useLocale();
  return (
    <Link
      href={LEAGUE_TAB_HREF}
      className={`group relative block overflow-hidden rounded-[10px] ${skin.hover}`}
      style={skin.isGradient ? { backgroundImage: skin.background } : { backgroundColor: skin.background }}
    >
      {skin.edge && (
        <div className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: skin.edge }} />
      )}

      {skin.trophyOpacity > 0 && (
        <Image
          src="/assets/brand/world-cup-trophy.webp"
          alt=""
          width={420}
          height={420}
          className="pointer-events-none absolute right-6 top-1/2 hidden h-[240%] w-auto -translate-y-1/2 object-contain lg:block"
          style={{ opacity: skin.trophyOpacity }}
        />
      )}

      {/* Mobile stacks title/status over the bar; from `sm` it's a single row. */}
      <div className="relative z-10 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <h2 className={`min-w-0 flex-1 truncate text-[15px] uppercase italic leading-none sm:flex-none lg:text-lg ${skin.title}`} style={poppins}>
            {t('weekendLeague.title')}
          </h2>

          {/* Bar sits inline only once there's room for it. */}
          <div className={`hidden h-1.5 flex-1 overflow-hidden rounded-full sm:block ${skin.trough}`}>
            <div className={`h-full rounded-full ${skin.fill}`} style={{ width: `${PCT}%` }} />
          </div>

          <span className={`hidden whitespace-nowrap text-[13px] uppercase sm:inline ${skin.meta}`} style={poppins}>
            {LAUNCH_EDITION ? (
              <span className={skin.qpText}>{t('weekendLeague.freeEntryClaim')}</span>
            ) : (
              <>
                <span className={skin.qpText}>{QP}</span>/{QP_TARGET.toLocaleString()} QP
              </>
            )}
          </span>

          <span className={`shrink-0 whitespace-nowrap text-[13px] uppercase ${skin.time}`} style={poppins}>
            {t('weekendLeague.qualifierShort')}
          </span>
          <ArrowRight className={`size-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${skin.arrow}`} />
        </div>

        {/* Mobile row: bar + status under the title. */}
        <div className="mt-2 flex items-center gap-2.5 sm:hidden">
          <div className={`h-1.5 flex-1 overflow-hidden rounded-full ${skin.trough}`}>
            <div className={`h-full rounded-full ${skin.fill}`} style={{ width: `${PCT}%` }} />
          </div>
          <span className={`shrink-0 whitespace-nowrap text-[12px] uppercase ${skin.meta}`} style={poppins}>
            {LAUNCH_EDITION ? (
              <span className={skin.qpText}>{t('weekendLeague.freeEntryShort')}</span>
            ) : (
              <>
                <span className={skin.qpText}>{QP}</span>/{QP_TARGET.toLocaleString()} QP
              </>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}

const BASE = {
  trough: 'bg-black/25',
  fill: 'bg-brand-green-light',
  qpText: 'text-brand-green-light',
  title: 'text-white',
  meta: 'text-white/75',
  time: 'text-brand-yellow',
  arrow: 'text-white/70',
  trophyOpacity: 0.14,
  hover: 'transition-[filter] hover:brightness-110',
} satisfies Partial<RailSkin>;

/** 1 — Solid brand blue (current). */
export const RailBlue = () => <Rail skin={{ ...BASE, background: colors.blue.brand }} />;

/** 2 — Deep purple, matching the Auction card's premium feel. */
export const RailPurple = () => <Rail skin={{ ...BASE, background: '#6B2FB3' }} />;

/** 3 — Near-black with a lime edge: reads as a status rail, not a mode card. */
export const RailBlack = () => (
  <Rail
    skin={{
      ...BASE,
      background: '#0D1117',
      trough: 'bg-white/10',
      meta: 'text-white/60',
      arrow: 'text-white/45',
      edge: colors.green.light,
      trophyOpacity: 0.1,
      hover: 'transition-colors hover:bg-[#141B24]',
    }}
  />
);

/** 4 — Lime green: the qualification color as the surface. Dark text. */
export const RailLime = () => (
  <Rail
    skin={{
      ...BASE,
      background: colors.green.light,
      trough: 'bg-black/20',
      fill: 'bg-black',
      qpText: 'text-black',
      title: 'text-black',
      meta: 'text-black/70',
      time: 'text-black',
      arrow: 'text-black/70',
      trophyOpacity: 0.16,
    }}
  />
);

/** 5 — Navy → brand-blue gradient: deep navy on the left resolving into the
 *  brand blue on the right. */
export const RailNavyGradient = () => (
  <Rail
    skin={{
      ...BASE,
      background: `linear-gradient(90deg, #060C1A 0%, #0B1432 30%, #12296E 65%, ${colors.blue.brand} 100%)`,
      isGradient: true,
      trough: 'bg-black/25',
      meta: 'text-white/70',
      arrow: 'text-white/60',
      trophyOpacity: 0,
      hover: 'transition-[filter] hover:brightness-110',
    }}
  />
);

/** 6 — Gold: treats the league as the premium prize event. Dark text. */
export const RailGold = () => (
  <Rail
    skin={{
      ...BASE,
      background: colors.gold.base,
      trough: 'bg-black/20',
      fill: 'bg-black',
      qpText: 'text-black',
      title: 'text-black',
      meta: 'text-black/70',
      time: 'text-black',
      arrow: 'text-black/70',
      trophyOpacity: 0.18,
    }}
  />
);

/** 8 — Event orange (#FF6C0A), the token already used for event modes. Dark text. */
export const RailOrange = () => (
  <Rail
    skin={{
      ...BASE,
      background: '#FF6C0A',
      trough: 'bg-black/25',
      fill: 'bg-black',
      qpText: 'text-black',
      title: 'text-black',
      meta: 'text-black/70',
      time: 'text-black',
      arrow: 'text-black/70',
      trophyOpacity: 0,
    }}
  />
);

/** 9 — Deep burnt orange with white text: warmer than the flat event orange. */
export const RailOrangeDeep = () => (
  <Rail
    skin={{
      ...BASE,
      background: '#B8400A',
      trough: 'bg-black/30',
      fill: 'bg-brand-yellow',
      qpText: 'text-brand-yellow',
      meta: 'text-white/75',
      time: 'text-white',
      arrow: 'text-white/75',
      trophyOpacity: 0.16,
    }}
  />
);

/** 10 — Near-black with an orange edge and glow: status rail, event accent. */
export const RailBlackOrange = () => (
  <Rail
    skin={{
      ...BASE,
      background:
        'radial-gradient(80% 200% at 0% 50%, rgba(255,108,10,0.30) 0%, transparent 60%), linear-gradient(90deg, #0D1117 0%, #0D1117 100%)',
      isGradient: true,
      trough: 'bg-white/10',
      fill: 'bg-brand-orange-event',
      qpText: 'text-brand-orange-event',
      meta: 'text-white/60',
      arrow: 'text-white/45',
      edge: '#FF6C0A',
      trophyOpacity: 0.1,
      hover: 'transition-[filter] hover:brightness-125',
    }}
  />
);

/** 7 — Charcoal with a brand-blue glow: the most restrained option. */
export const RailCharcoal = () => (
  <Rail
    skin={{
      ...BASE,
      background:
        'radial-gradient(75% 180% at 100% 50%, rgba(22,69,255,0.45) 0%, rgba(22,69,255,0.12) 45%, transparent 70%), linear-gradient(90deg, #12181F 0%, #12181F 100%)',
      isGradient: true,
      trough: 'bg-white/10',
      meta: 'text-white/60',
      arrow: 'text-white/45',
      edge: colors.blue.brand,
      trophyOpacity: 0,
      hover: 'transition-[filter] hover:brightness-125',
    }}
  />
);

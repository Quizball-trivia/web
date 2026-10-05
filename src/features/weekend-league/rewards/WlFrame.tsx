'use client';

import { useId } from 'react';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { useLocale } from '@/contexts/LocaleContext';
import type { AvatarCustomization } from '@/types/game';

import type { WlFramePlace } from '@/lib/avatars/frames';

export type { WlFramePlace };

/** Metal and trim per podium place: gold, silver, bronze. */
const METAL: Record<WlFramePlace, { light: string; mid: string; dark: string; glow: string; ink: string }> = {
  1: { light: '#FFF4C2', mid: '#F1CB70', dark: '#A8740F', glow: '#F1CB70', ink: '#3A2A00' },
  2: { light: '#FFFFFF', mid: '#D9DEE6', dark: '#7C8697', glow: '#C9D3E3', ink: '#1F2733' },
  3: { light: '#F8D9B6', mid: '#D99B64', dark: '#7E4B22', glow: '#D99B64', ink: '#2E1806' },
};

export const WL_FRAME_INK: Record<WlFramePlace, string> = { 1: '#3A2A00', 2: '#1F2733', 3: '#2E1806' };

export const TITLE_KEY = {
  1: 'wlRewards.frameTitle1',
  2: 'wlRewards.frameTitle2',
  3: 'wlRewards.frameTitle3',
} as const;

// Same card silhouette family as the rank frames (≈ 1 : 1.58), so a Weekend
// League frame can stand in for the rank frame on profile and social screens.
const CARD = 'M22 20 Q64 20 84 7 Q100 20 116 7 Q136 20 178 20 L192 34 L192 262 Q192 280 174 289 L100 314 L26 289 Q8 280 8 262 L8 34 Z';
const INNER = 'M27 29 Q66 29 86 17 Q100 28 114 17 Q134 29 173 29 L183 39 L183 259 Q183 273 168 280 L100 303 L32 280 Q17 273 17 259 L17 39 Z';

function Laurel({ color }: { color: string }) {
  return (
    <>
      {[0, 1].map((side) => (
        <g key={side} transform={side ? 'translate(200 0) scale(-1 1)' : undefined}>
          <path d="M44 236 Q22 206 30 168" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
          {[0, 1, 2, 3].map((i) => (
            <ellipse key={i} cx={34 - i * 1.6} cy={226 - i * 16} rx={3.6} ry={8.5}
              transform={`rotate(${-38 + i * 8} ${34 - i * 1.6} ${226 - i * 16})`} fill={color} />
          ))}
        </g>
      ))}
    </>
  );
}

/** The frame artwork alone, `width` px wide — or filling its box when `fill`. */
export function WlFrameArt({ place, width = 100, fill = false }: { place: WlFramePlace; width?: number; fill?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const m = METAL[place];
  return (
    <svg width={fill ? '100%' : width} height={fill ? '100%' : Math.round(width * 1.6)} viewBox="0 0 200 320" preserveAspectRatio="xMidYMid meet" aria-hidden className="block">
      <defs>
        <linearGradient id={`metal${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={m.light} />
          <stop offset="0.45" stopColor={m.mid} />
          <stop offset="1" stopColor={m.dark} />
        </linearGradient>
        <radialGradient id={`glow${uid}`} cx="0.5" cy="0.32" r="0.75">
          <stop offset="0" stopColor={m.glow} stopOpacity="0.42" />
          <stop offset="0.55" stopColor="#14284A" stopOpacity="0.15" />
          <stop offset="1" stopColor="#0B1730" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`fill${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B3561" />
          <stop offset="1" stopColor="#0B1730" />
        </linearGradient>
        <clipPath id={`clip${uid}`}><path d={INNER} /></clipPath>
      </defs>
      <path d={CARD} fill={`url(#metal${uid})`} />
      <path d={INNER} fill={`url(#fill${uid})`} />
      <g clipPath={`url(#clip${uid})`}>
        <rect x="0" y="0" width="200" height="320" fill={`url(#glow${uid})`} />
        {/* Faint kit stripes: the frames belong to the Retro Playmaker set. */}
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={20 + i * 20} y="0" width="8" height="320" fill="#FFFFFF" opacity="0.035" />
        ))}
      </g>
      <path d={INNER} fill="none" stroke={m.light} strokeOpacity="0.55" strokeWidth="1.2" />
      {place === 1 && <Laurel color={m.mid} />}
      {place === 2 && (
        <path d="M30 238 L48 250 M30 228 L48 240 M170 238 L152 250 M170 228 L152 240" stroke={m.mid} strokeWidth={3} strokeLinecap="round" />
      )}
      {place === 3 && (
        <g fill={m.mid}>
          <circle cx="36" cy="232" r="3.2" /><circle cx="44" cy="244" r="2.4" />
          <circle cx="164" cy="232" r="3.2" /><circle cx="156" cy="244" r="2.4" />
        </g>
      )}
      {/* Ribbon for the title, then the place medallion at the tip. */}
      <path d="M14 248 L186 248 L180 262 L186 276 L14 276 L20 262 Z" fill={`url(#metal${uid})`} />
      <circle cx="100" cy="296" r="15" fill="#0B1730" stroke={`url(#metal${uid})`} strokeWidth="4" />
      <text x="100" y="302" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="900" fontSize="17" fill={m.mid}>{place}</text>
    </svg>
  );
}

const SIZES = {
  xs: { width: 44, avatar: 'xs' as const, title: false },
  sm: { width: 58, avatar: 'sm' as const, title: false },
  md: { width: 84, avatar: 'md' as const, title: false },
  lg: { width: 128, avatar: 'lg' as const, title: true },
  xl: { width: 176, avatar: 'xl' as const, title: true },
};

/** An avatar standing in its Weekend League frame, with the place title on the ribbon. */
export function WlFrameAvatar({ place, customization, size = 'lg' }: {
  place: WlFramePlace;
  customization: AvatarCustomization;
  size?: keyof typeof SIZES;
}) {
  const { t } = useLocale();
  const s = SIZES[size];
  const height = Math.round(s.width * 1.6);
  return (
    <div className="relative shrink-0" style={{ width: s.width, height }}>
      <WlFrameArt place={place} width={s.width} />
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: Math.round(height * 0.16) }}>
        <AvatarDisplay customization={customization} size={s.avatar} />
      </div>
      {s.title && (
        <span
          className="absolute inset-x-0 overflow-hidden whitespace-nowrap text-center font-poppins font-black uppercase"
          style={{ top: Math.round(height * 0.775), fontSize: Math.max(7, Math.round(s.width * 0.058)), letterSpacing: '0.04em', color: METAL[place].ink, lineHeight: `${Math.round(height * 0.087)}px` }}
        >
          {t(TITLE_KEY[place])}
        </span>
      )}
    </div>
  );
}

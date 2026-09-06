'use client';

/**
 * Table Derby brand primitives, recreated from the official studio deck
 * (`branding-refs/studio-setup.pdf`): sticker logo lockup, the four round
 * icons, accent glyphs, the wall-mural backdrop, betsson.sport wordmark.
 * The logo is a text substitution until Betsson hands over the real SVG.
 */

import type { CSSProperties } from 'react';

export const TD_DISPLAY: CSSProperties = {
  fontFamily: "'Noto Sans Georgian', 'Poppins', sans-serif",
  fontWeight: 900,
  textTransform: 'uppercase',
  lineHeight: 0.95,
};

export const TD_LATIN: CSSProperties = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 700,
};

/* ── betsson.sport wordmark ─────────────────────────────────────── */

export function BetssonWordmark({ tone = 'white', size = 18 }: { tone?: 'white' | 'orange'; size?: number }) {
  const color = tone === 'orange' ? 'var(--td-orange)' : 'var(--td-white)';
  return (
    <span aria-label="betsson.sport" className="inline-flex flex-col leading-none" style={{ color }}>
      <span style={{ ...TD_LATIN, fontWeight: 800, fontSize: size, letterSpacing: '-0.02em' }}>betsson</span>
      <span style={{ ...TD_LATIN, fontWeight: 500, fontSize: size * 0.62, letterSpacing: '0.06em', alignSelf: 'flex-end' }}>
        .sport
      </span>
    </span>
  );
}

/* ── Show logo sticker — official vector assets extracted from
      branding-refs/table-derby-logos.pdf ─────────────────────────── */

const LOGO_SRC = {
  blackOnWhite: '/assets/table-derby/logo-paper.svg',
  whiteOnOrange: '/assets/table-derby/logo-orange.svg',
  whiteOnBlack: '/assets/table-derby/logo-black.svg',
  orangeBare: '/assets/table-derby/logo-bare-orange.svg',
} as const;

export function TdLogoSticker({
  variant = 'whiteOnBlack',
  scale = 1,
  tilt = -4,
}: {
  variant?: keyof typeof LOGO_SRC;
  scale?: number;
  tilt?: number;
}) {
  return (
    <div style={{ transform: `rotate(${tilt}deg) scale(${scale})` }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local brand SVG, no optimization needed */}
      <img
        src={LOGO_SRC[variant]}
        alt="მაგიდის დერბი"
        style={{
          width: 230,
          height: 'auto',
          filter: variant === 'orangeBare' ? undefined : 'drop-shadow(5px 6px 0 rgba(0,0,0,0.55))',
        }}
      />
    </div>
  );
}

/* ── The four round icons — official assets (black set for orange
      surfaces, orange set for dark surfaces) ─────────────────────── */

const ICON_NAMES = ['beer', 'ball', 'cards', 'target'] as const;

export function RoundIconsRow({
  size = 26,
  tone = 'orange',
  gap = 10,
}: {
  size?: number;
  tone?: 'orange' | 'black';
  gap?: number;
}) {
  return (
    <div className="flex items-center" style={{ gap }} aria-hidden>
      {ICON_NAMES.map((name) => (
        // eslint-disable-next-line @next/next/no-img-element -- local brand SVG, no optimization needed
        <img
          key={name}
          src={`/assets/table-derby/icon-${name}-${tone}.svg`}
          alt=""
          style={{ height: size, width: 'auto' }}
        />
      ))}
    </div>
  );
}

/* ── Accent glyphs ──────────────────────────────────────────────── */

export function BoltGlyph({ size = 28, color = 'var(--td-orange)', rotate = 0 }: { size?: number; color?: string; rotate?: number }) {
  return (
    <svg viewBox="0 0 24 40" width={size * 0.6} height={size} fill={color} aria-hidden style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="M14 0 0 22h8L6 40 24 15h-9L21 0h-7Z" />
    </svg>
  );
}

export function StarburstGlyph({ size = 22, color = 'var(--td-orange)', rotate = 0 }: { size?: number; color?: string; rotate?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill={color} aria-hidden style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="M20 0l3.4 12.2L36 8l-8.6 9.4L40 20l-12.6 2.6L36 32l-12.6-4.2L20 40l-3.4-12.2L4 32l8.6-9.4L0 20l12.6-2.6L4 8l12.6 4.2L20 0Z" />
    </svg>
  );
}

export function XGlyph({ size = 20, color = 'var(--td-white)', rotate = 8 }: { size?: number; color?: string; rotate?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill={color} aria-hidden style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="M6 0h7l3 6 3-6h7l-6.5 16L26 32h-7l-3-6-3 6H6l6.5-16L6 0Z" transform="scale(0.9) translate(2 0)" />
      <path d="M4 10 10 4l22 22-6 6L4 10Z" opacity="0" />
    </svg>
  );
}

/* ── Wall mural backdrop (tone-on-tone typographic collage) ─────── */

interface MuralWord {
  text: string;
  x: number; // % of width
  y: number; // % of height
  rot: number;
  size: number;
  orange?: boolean;
}

// Deterministic layout (SSR-safe). Georgian-only per product rule.
const MURAL_WORDS: MuralWord[] = [
  { text: 'ფეხბურთი', x: 2, y: 4, rot: -90, size: 44 },
  { text: 'გოოოოლ!', x: 18, y: 8, rot: 0, size: 64 },
  { text: 'პენალტების სერია', x: 44, y: 3, rot: 0, size: 22 },
  { text: '26', x: 12, y: 30, rot: 0, size: 110 },
  { text: 'ჩამოთვალე', x: 40, y: 22, rot: -6, size: 34 },
  { text: 'მუნდიალი', x: 70, y: 10, rot: 90, size: 40 },
  { text: 'დერბი', x: 58, y: 16, rot: 0, size: 74 },
  { text: '?', x: 88, y: 8, rot: 12, size: 90 },
  { text: 'ვინ არის?', x: 78, y: 40, rot: 0, size: 30 },
  { text: 'თამაში', x: 4, y: 62, rot: 0, size: 56 },
  { text: 'მცველები', x: 30, y: 52, rot: 0, size: 26 },
  { text: 'ბუნდესლიგა', x: 48, y: 44, rot: -90, size: 30 },
  { text: 'ფინალი', x: 60, y: 58, rot: 0, size: 48 },
  { text: '10', x: 90, y: 56, rot: 0, size: 96 },
  { text: 'მაგიდის დერბი', x: 20, y: 78, rot: -4, size: 38 },
  { text: '!', x: 52, y: 74, rot: 0, size: 84 },
  { text: 'გოლი', x: 66, y: 82, rot: 6, size: 52 },
  { text: 'კაპიტანი', x: 2, y: 90, rot: 0, size: 28 },
  { text: 'დარტსი', x: 86, y: 88, rot: -8, size: 26 },
];

export function MuralBackdrop({ dim = 1 }: { dim?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden" style={{ opacity: dim }}>
      {MURAL_WORDS.map((w, i) => (
        <span
          key={i}
          className="absolute whitespace-nowrap"
          style={{
            ...TD_DISPLAY,
            left: `${w.x}%`,
            top: `${w.y}%`,
            fontSize: w.size,
            color: w.orange ? 'var(--td-orange)' : 'var(--td-charcoal-pattern)',
            transform: `rotate(${w.rot}deg)`,
            transformOrigin: 'left top',
          }}
        >
          {w.text}
        </span>
      ))}
      {/* sparse glyph accents, charcoal like the wall */}
      <div className="absolute" style={{ left: '34%', top: '36%' }}>
        <BoltGlyph size={64} color="var(--td-charcoal-pattern)" rotate={10} />
      </div>
      <div className="absolute" style={{ left: '82%', top: '26%' }}>
        <StarburstGlyph size={44} color="var(--td-charcoal-pattern)" />
      </div>
      <div className="absolute" style={{ left: '8%', top: '46%' }}>
        <XGlyph size={40} color="var(--td-charcoal-pattern)" />
      </div>
    </div>
  );
}

/* ── Ticket pill (daily entry tickets) ──────────────────────────── */

export function TicketGlyph({ size = 18, color = '#0d0d0d' }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 44 30" width={size * 1.45} height={size} fill={color} aria-hidden>
      <path d="M4 4h36a2 2 0 0 1 2 2v5.2a5 5 0 0 0 0 7.6V24a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5.2a5 5 0 0 0 0-7.6V6a2 2 0 0 1 2-2Z" />
      <path stroke="var(--td-orange)" strokeWidth="2" strokeDasharray="3 3" d="M28 5v20" fill="none" />
    </svg>
  );
}

export function TicketPill({ count, label }: { count: number | null; label: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-full py-1.5 pl-2.5 pr-3.5"
      style={{ background: 'var(--td-orange)', boxShadow: '3px 3px 0 rgba(0,0,0,0.5)' }}
      aria-label={label}
    >
      <TicketGlyph size={15} />
      <span className="text-sm leading-none" style={{ ...TD_DISPLAY, color: '#0d0d0d' }}>
        {count ?? '·'}
      </span>
    </div>
  );
}

/* ── Perforated-dot texture (the orange table skirt) ────────────── */

export const PERF_DOTS: CSSProperties = {
  backgroundImage: 'radial-gradient(rgba(0,0,0,0.28) 1.2px, transparent 1.3px)',
  backgroundSize: '7px 7px',
};

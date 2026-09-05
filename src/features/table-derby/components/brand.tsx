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

/* ── Show logo sticker (text substitution for the custom lettering) ── */

const STICKER_CLIP = 'polygon(0 3%, 88% 0, 100% 12%, 98% 100%, 2% 97%)';

export function TdLogoSticker({
  variant = 'whiteOnBlack',
  scale = 1,
  tilt = -4,
}: {
  variant?: 'blackOnWhite' | 'whiteOnOrange' | 'whiteOnBlack' | 'orangeBare';
  scale?: number;
  tilt?: number;
}) {
  const bg =
    variant === 'blackOnWhite' ? 'var(--td-paper)' : variant === 'whiteOnOrange' ? 'var(--td-orange)' : variant === 'whiteOnBlack' ? '#0d0d0d' : 'transparent';
  const fg = variant === 'blackOnWhite' ? '#0d0d0d' : variant === 'orangeBare' ? 'var(--td-orange)' : 'var(--td-white)';
  return (
    <div style={{ transform: `rotate(${tilt}deg) scale(${scale})` }}>
      <div
        className="px-5 py-3"
        style={{
          background: bg,
          clipPath: variant === 'orangeBare' ? undefined : STICKER_CLIP,
          filter: variant === 'orangeBare' ? undefined : 'drop-shadow(5px 6px 0 rgba(0,0,0,0.55))',
        }}
      >
        <div className="flex flex-col items-start" style={{ ...TD_DISPLAY, color: fg, fontSize: 34, letterSpacing: '-0.01em' }}>
          <span>მაგიდის</span>
          <span style={{ marginLeft: 10 }}>დერბი</span>
        </div>
      </div>
    </div>
  );
}

/* ── The four round icons (beer / football / cards+chip / target) ── */

function IconBase({ children, size, color }: { children: React.ReactNode; size: number; color: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" aria-hidden style={{ color }}>
      {children}
    </svg>
  );
}

export function BeerIcon({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <IconBase size={size} color={color}>
      <path
        fill="currentColor"
        d="M12 16c-1.8-2.6-.4-6.4 3-6.9.8-2.6 4-3.6 6.2-2 1.6-1.8 4.6-1.6 6 .4 3-.8 5.8 1.8 5 4.8 1.6 1.2 1.9 3.4.6 4.9V38a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V16Z"
      />
      <path fill="currentColor" d="M34 20h4a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-4v-4h3a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-3v-4Z" />
      <path stroke="var(--td-black)" strokeWidth="2.4" strokeLinecap="round" d="M18 15c3 2 8 2 12-.5" opacity="0.9" />
    </IconBase>
  );
}

export function BallIcon({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <IconBase size={size} color={color}>
      <circle cx="24" cy="24" r="18" fill="currentColor" />
      <path
        fill="var(--td-black)"
        d="m24 15 5.7 4.1-2.2 6.7h-7l-2.2-6.7L24 15Zm-12.6 4.7 4.6 1.2 1.5 6.9-3.7 3.4-4.2-3.6c.2-2.9 1-5.6 2.6-7.9h-.8Zm25.2 0c1.6 2.3 2.4 5 2.6 7.9l-4.2 3.6-3.7-3.4 1.5-6.9 4.6-1.2h-.8ZM19 34.6h10l1.7 4.3A15 15 0 0 1 24 40c-2.4 0-4.6-.4-6.7-1.1l1.7-4.3Z"
      />
    </IconBase>
  );
}

export function CardsIcon({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <IconBase size={size} color={color}>
      <rect x="18" y="7" width="17" height="24" rx="2.5" fill="currentColor" transform="rotate(8 26 19)" />
      <rect x="24" y="12" width="15" height="22" rx="2.5" fill="currentColor" transform="rotate(18 31 23)" opacity="0.85" />
      <circle cx="15" cy="26" r="8.5" fill="currentColor" />
      <circle cx="15" cy="26" r="4.5" fill="none" stroke="var(--td-black)" strokeWidth="2.4" />
      <path fill="var(--td-black)" d="M27 15.5c1.8-2.4 5.4-.9 5.2 1.9-.1 1.8-2.2 3.4-4.2 4.9-2-1.3-4.2-2.7-4.5-4.5-.4-2.8 3.1-4.6 3.5-2.3Z" opacity="0.9" />
    </IconBase>
  );
}

export function TargetIcon({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <IconBase size={size} color={color}>
      <circle cx="24" cy="24" r="18" fill="currentColor" />
      <circle cx="24" cy="24" r="12.5" fill="none" stroke="var(--td-white)" strokeWidth="2.2" />
      <circle cx="24" cy="24" r="6.5" fill="none" stroke="var(--td-white)" strokeWidth="2.2" />
      <circle cx="24" cy="24" r="2" fill="var(--td-white)" />
      <path stroke="var(--td-white)" strokeWidth="2.4" strokeLinecap="round" d="M24 24 38 10" />
      <path fill="var(--td-white)" d="M36 8h7l-3.2 3L43 14h-7V8Z" />
    </IconBase>
  );
}

export function RoundIconsRow({ size = 26, color = 'var(--td-orange)', gap = 10 }: { size?: number; color?: string; gap?: number }) {
  return (
    <div className="flex items-center" style={{ gap }} aria-hidden>
      <BeerIcon size={size} color={color} />
      <BallIcon size={size} color={color} />
      <CardsIcon size={size} color={color} />
      <TargetIcon size={size} color={color} />
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

/* ── Perforated-dot texture (the orange table skirt) ────────────── */

export const PERF_DOTS: CSSProperties = {
  backgroundImage: 'radial-gradient(rgba(0,0,0,0.28) 1.2px, transparent 1.3px)',
  backgroundSize: '7px 7px',
};

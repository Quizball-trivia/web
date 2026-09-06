'use client';

/** Show-style sticker avatars: a circular sticker with a bold Georgian
 *  initial, a small accent glyph, and a deterministic tilt — the print/
 *  sticker language of the brand, no image assets needed. Opponents get
 *  a variant hashed from their name; the player picks theirs. */

import { useSyncExternalStore } from 'react';
import { TD } from '../lib/copy';
import { getAvatarVariant, subscribeAvatar } from '../lib/state';
import { TD_DISPLAY, BoltGlyph, StarburstGlyph } from './brand';

type Glyph = 'bolt' | 'star' | 'ball' | 'x';

interface AvatarVariant {
  bg: string;
  fg: string;
  glyph: Glyph;
}

export const AVATAR_VARIANTS: AvatarVariant[] = [
  { bg: 'var(--td-paper)', fg: '#0d0d0d', glyph: 'bolt' },
  { bg: 'var(--td-orange)', fg: '#0d0d0d', glyph: 'star' },
  { bg: '#161616', fg: 'var(--td-white)', glyph: 'bolt' },
  { bg: 'var(--td-paper)', fg: '#0d0d0d', glyph: 'ball' },
  { bg: 'var(--td-orange)', fg: '#0d0d0d', glyph: 'x' },
  { bg: '#161616', fg: 'var(--td-orange)', glyph: 'star' },
  { bg: 'var(--td-paper)', fg: 'var(--td-orange)', glyph: 'x' },
  { bg: 'var(--td-orange)', fg: 'var(--td-white)', glyph: 'ball' },
];

function hashName(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return h;
}

function AccentGlyph({ glyph, size }: { glyph: Glyph; size: number }) {
  if (glyph === 'bolt') return <BoltGlyph size={size} color="var(--td-orange)" rotate={12} />;
  if (glyph === 'star') return <StarburstGlyph size={size} color="var(--td-orange)" />;
  if (glyph === 'ball')
    return (
      <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden>
        <circle cx="10" cy="10" r="9" fill="var(--td-orange)" />
        <path fill="#0d0d0d" d="m10 4.5 3 2.2-1.1 3.5H8.1L7 6.7l3-2.2ZM5.5 13.5h9l-1 2.6a7.6 7.6 0 0 1-7 0l-1-2.6Z" />
      </svg>
    );
  return (
    <span style={{ ...TD_DISPLAY, color: 'var(--td-orange)', fontSize: size }} aria-hidden>
      ✕
    </span>
  );
}

export function TdAvatar({
  name,
  size = 44,
  variant,
  active = false,
}: {
  name: string;
  size?: number;
  /** Explicit variant index; defaults to a hash of the name. */
  variant?: number;
  active?: boolean;
}) {
  const v = AVATAR_VARIANTS[(variant ?? hashName(name)) % AVATAR_VARIANTS.length];
  const tilt = ((hashName(name) % 9) - 4) * 1.2;
  const initial = [...name][0]?.toUpperCase() ?? '?';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size, transform: `rotate(${tilt}deg)` }} aria-hidden>
      <div
        className="flex h-full w-full items-center justify-center rounded-full"
        style={{
          background: v.bg,
          boxShadow: `${size * 0.06}px ${size * 0.08}px 0 rgba(0,0,0,0.55)`,
          outline: active ? '2.5px solid var(--td-orange)' : '2.5px solid transparent',
          outlineOffset: 2,
          transition: 'outline-color 0.25s',
        }}
      >
        <span style={{ ...TD_DISPLAY, color: v.fg, fontSize: size * 0.46, lineHeight: 1 }}>{initial}</span>
      </div>
      <div className="absolute" style={{ right: -size * 0.08, bottom: -size * 0.06 }}>
        <AccentGlyph glyph={v.glyph} size={Math.max(12, size * 0.3)} />
      </div>
    </div>
  );
}

/** The player's own avatar — variant from localStorage via the picker on
 *  the menu; updates live everywhere when a new one is chosen. */
export function MyAvatar({ size = 44, active = false }: { size?: number; active?: boolean }) {
  const variant = useSyncExternalStore(subscribeAvatar, getAvatarVariant, () => 0);
  return <TdAvatar name={TD.you} size={size} variant={variant} active={active} />;
}

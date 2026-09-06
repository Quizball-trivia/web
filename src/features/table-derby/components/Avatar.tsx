'use client';

/** Player avatars — Quizball's layered avatar characters (6 jersey
 *  colors), framed in TD-style circles. The player picks a color in
 *  onboarding; opponents get one hashed from their name. */

import { useSyncExternalStore } from 'react';
import { AvatarPreview } from '@/components/AvatarPreview';
import { AVATAR_COLORS, type AvatarColor } from '@/lib/avatars';
import { DEFAULT_HAIR_ID, DEFAULT_SKIN_ID } from '@/lib/avatars/parts';
import type { AvatarCustomization } from '@/types/game';
import { getAvatarColor, subscribeAvatar } from '../lib/state';

export const TD_AVATAR_COLORS = AVATAR_COLORS;

export function tdAvatarCustomization(color: AvatarColor): AvatarCustomization {
  return {
    skin: DEFAULT_SKIN_ID,
    hair: DEFAULT_HAIR_ID,
    jersey: `jersey_${color}` as AvatarCustomization['jersey'],
  };
}

function hashName(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return h;
}

export function TdAvatar({
  name,
  size = 44,
  color,
  active = false,
}: {
  name: string;
  size?: number;
  /** Explicit jersey color; defaults to a hash of the name. */
  color?: AvatarColor;
  active?: boolean;
}) {
  const c = color ?? AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];
  return (
    <div
      className="relative flex shrink-0 items-end justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        background: 'var(--td-charcoal)',
        boxShadow: `${size * 0.05}px ${size * 0.07}px 0 rgba(0,0,0,0.55)`,
        outline: active ? '2.5px solid var(--td-orange)' : '2.5px solid transparent',
        outlineOffset: 2,
        transition: 'outline-color 0.25s',
      }}
      aria-hidden
    >
      <AvatarPreview customization={tdAvatarCustomization(c)} width={size * 0.8} className="translate-y-[6%]" />
    </div>
  );
}

/** The player's own avatar — jersey color from onboarding/localStorage;
 *  updates live everywhere when a new one is chosen. */
export function MyAvatar({ size = 44, active = false }: { size?: number; active?: boolean }) {
  const color = useSyncExternalStore(subscribeAvatar, getAvatarColor, () => 'green' as AvatarColor);
  return <TdAvatar name="me" size={size} color={color} active={active} />;
}

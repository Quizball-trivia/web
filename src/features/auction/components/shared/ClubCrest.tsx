'use client';

import Image from 'next/image';
import { getClub } from '@/lib/clubs';

/**
 * A club crest resolved from a club name/id via getClub(). Renders nothing when
 * the club can't be resolved (so an unknown club simply shows no badge rather
 * than a broken image).
 */
export function ClubCrest({
  club,
  size = 20,
  className = '',
}: {
  club?: string | null;
  size?: number;
  className?: string;
}) {
  const resolved = getClub(club ?? null);
  if (!resolved) return null;
  return (
    <Image
      src={resolved.logo}
      alt={resolved.label}
      width={size * 2}
      height={size * 2}
      unoptimized
      className={`object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

'use client';

import Image from 'next/image';
import { findClubByName } from '@/lib/clubs';

/**
 * A club crest resolved from a club name via the career-path resolver
 * (findClubByName): alias-aware and suffix-tolerant, so Transfermarkt names
 * like "Feyenoord Rotterdam" or "RC Strasbourg Alsace" hit the same CDN
 * crests the career screens use. Renders nothing when the club can't be
 * resolved (an unknown club shows no badge rather than a broken image).
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
  const resolved = findClubByName(club ?? null);
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

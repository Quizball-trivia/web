'use client';

import { useState } from 'react';
import Image from 'next/image';
import { findClubByName } from '@/lib/clubs';
import { footballGridAssetUrl } from '@/lib/football-grid/assets';
import { normalizeCountryCode } from '@/lib/geo/countryCode';

/** Club crest resolved from a club name via getClub(). Renders nothing when the
 *  club can't be resolved. Self-contained so mini-games don't depend on other
 *  features' components. */
export function ClubCrest({ club, size = 24, className = '' }: { club?: string | null; size?: number; className?: string }) {
  const resolved = findClubByName(club ?? null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!resolved) return null;

  const fallbackSource = footballGridAssetUrl(`/assets/football-grid/clubs/${resolved.id}.svg`);
  const primarySource = footballGridAssetUrl(resolved.logo);
  if (!fallbackSource) return null;
  const useFallback = !primarySource || failedSource === primarySource;
  return (
    <Image
      src={useFallback ? fallbackSource : primarySource}
      alt={resolved.label}
      width={size * 2}
      height={size * 2}
      unoptimized
      onError={useFallback ? undefined : () => setFailedSource(primarySource)}
      className={`object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** Clipped, cover-filled country flag chip. Renders nothing for an unresolvable country. */
export function FlagChip({
  country,
  width = 24,
  height = 16,
  className = '',
}: {
  country: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const code = normalizeCountryCode(country);
  const source = code ? footballGridAssetUrl(`/assets/football-grid/flags/${code}.svg`) : null;
  if (!source) return null;
  return (
    <span className={`block overflow-hidden rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.4)] ${className}`} style={{ width, height }}>
      <Image src={source} alt="" width={width * 2} height={height * 2} unoptimized className="block h-full w-full object-cover" />
    </span>
  );
}

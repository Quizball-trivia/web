'use client';

import { useState } from 'react';
import Image from 'next/image';
import { findClubByName } from '@/lib/clubs';
import { CountryFlag } from '@/components/CountryFlag';
import { normalizeCountryCode } from '@/lib/geo/countryCode';

function localFootballGridCrest(clubId: string): string {
  return `/assets/football-grid/clubs/${clubId}.svg`;
}

function shouldUseLocalCrest(source: string): boolean {
  if (!/^https?:\/\//i.test(source)) return true;
  try {
    const hostname = new URL(source).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return true;
  }
}

/** Club crest resolved from a club name via getClub(). Renders nothing when the
 *  club can't be resolved. Self-contained so mini-games don't depend on other
 *  features' components. */
export function ClubCrest({ club, size = 24, className = '' }: { club?: string | null; size?: number; className?: string }) {
  const resolved = findClubByName(club ?? null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!resolved) return null;

  const fallbackSource = localFootballGridCrest(resolved.id);
  const useFallback = shouldUseLocalCrest(resolved.logo) || failedSource === resolved.logo;
  return (
    <Image
      src={useFallback ? fallbackSource : resolved.logo}
      alt={resolved.label}
      width={size * 2}
      height={size * 2}
      unoptimized
      onError={useFallback ? undefined : () => setFailedSource(resolved.logo)}
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
  if (!normalizeCountryCode(country)) return null;
  return (
    <span className={`block overflow-hidden rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.4)] ${className}`} style={{ width, height }}>
      <CountryFlag code={country} className="!block !h-full !w-full" style={{ backgroundSize: 'cover', backgroundPosition: 'center' }} />
    </span>
  );
}

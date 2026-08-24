'use client';

import { CountryFlag } from '@/components/CountryFlag';
import { normalizeCountryCode } from '@/lib/geo/countryCode';

/**
 * A clipped, cover-filled country flag chip. Renders nothing when the country
 * has no resolvable code. `width`/`height` set the chip size (3:2 by default).
 */
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
    <span
      className={`block overflow-hidden rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.4)] ${className}`}
      style={{ width, height }}
    >
      <CountryFlag
        code={country}
        className="!block !h-full !w-full"
        style={{ backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
    </span>
  );
}

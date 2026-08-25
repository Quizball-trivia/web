'use client';

import Image from 'next/image';
import { getLeague } from '../../data/leagues';
import { poppins } from '../../constants/auction.constants';

/**
 * A league crest. Every current league in leagues.ts sets a `logo` URL, which
 * renders the real crest; the styled colour badge with the league's 2-char tag
 * is the fallback for any future league added without an asset. Renders
 * nothing for an unknown league.
 */
export function LeagueLogo({
  league,
  size = 20,
  className = '',
}: {
  league?: string | null;
  size?: number;
  className?: string;
}) {
  const l = getLeague(league);
  if (!l) return null;

  if (l.logo) {
    // League marks are brand-coloured (PL purple, Ligue 1 black…) and drown on
    // dark chips — a white backing keeps every league legible on any surface.
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.4)] ${className}`}
        style={{ width: size, height: size, padding: Math.max(2, Math.round(size * 0.12)) }}
      >
        <Image
          src={l.logo}
          alt={l.name}
          width={size * 2}
          height={size * 2}
          unoptimized
          className="size-full object-contain"
        />
      </span>
    );
  }

  return (
    <span
      title={l.name}
      className={`inline-flex shrink-0 items-center justify-center rounded-[5px] font-black leading-none shadow-[0_1px_2px_rgba(0,0,0,0.4)] ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: l.color,
        color: l.textColor ?? '#ffffff',
        fontSize: size * 0.4,
        ...poppins,
      }}
    >
      {l.short}
    </span>
  );
}

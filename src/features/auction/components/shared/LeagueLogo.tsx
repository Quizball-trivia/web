'use client';

import Image from 'next/image';
import { getLeague } from '../../data/leagues';
import { poppins } from '../../constants/auction.constants';

/**
 * A league crest. There is no league logo asset set yet, so this falls back to
 * a styled colour badge with the league's 2-char tag. It is asset-ready: the
 * moment a league gains a `logo` URL in leagues.ts, the real crest renders
 * instead with no change here. Renders nothing for an unknown league.
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
    return (
      <Image
        src={l.logo}
        alt={l.name}
        width={size * 2}
        height={size * 2}
        unoptimized
        className={`object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${className}`}
        style={{ width: size, height: size }}
      />
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

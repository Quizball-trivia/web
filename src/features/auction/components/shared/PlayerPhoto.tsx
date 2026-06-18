'use client';

import { useState } from 'react';
import type { Footballer } from '../../types';
import { getFootballerPlaceholderImage } from '../../data';

/** Footballer avatar with placeholder fallback → initials on image error. */
export function PlayerPhoto({
  footballer,
  size = 32,
  className = '',
}: {
  footballer: Footballer;
  size?: number;
  className?: string;
}) {
  const [err, setErr] = useState(false);
  const src = footballer.imageUrl || getFootballerPlaceholderImage(footballer.id);

  if (err) {
    const initials = footballer.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2);
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-white/10 text-white/50 font-bold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {initials}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={footballer.name}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={() => setErr(true)}
    />
  );
}

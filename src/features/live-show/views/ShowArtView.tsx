'use client';

import Image from 'next/image';
import type { ShowArt } from '../show.types';

const PALETTE = ['#C8102E', '#1645FF', '#FFE500', '#0B8F3A', '#111827', '#FFFFFF', '#7A1E8C', '#F97316', '#0EA5E9', '#7C2D12'];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function colours(seed: string): [string, string, string] {
  const h = hash(seed);
  const a = PALETTE[h % PALETTE.length]!;
  let b = PALETTE[(h >>> 8) % PALETTE.length]!;
  if (b === a) b = PALETTE[(PALETTE.indexOf(a) + 3) % PALETTE.length]!;
  const accent = a === '#FFE500' || b === '#FFE500' ? '#111827' : '#FFE500';
  return [a, b, accent];
}

/** An invented crest. Era 0 is ornate and old-fashioned; each later era is simpler, the last one flat. */
function InventedCrest({ seed, era, initials }: { seed: string; era: number; initials: string }) {
  const [a, b, accent] = colours(seed);
  const pattern = hash(`${seed}:p`) % 3;
  const shield = 'M50 6 L90 18 L86 62 Q80 86 50 96 Q20 86 14 62 L10 18 Z';
  const clipId = `crest-${seed}-${era}`;
  if (era >= 3) {
    return (
      <svg viewBox="0 0 100 100" className="size-full">
        <circle cx="50" cy="50" r="44" fill={a} />
        <circle cx="50" cy="50" r="34" fill="none" stroke={b} strokeWidth="5" />
        <text x="50" y="58" textAnchor="middle" fontSize="24" fontWeight="900" fill={b} fontFamily="Poppins, sans-serif">
          {initials}
        </text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" className="size-full">
      <defs>
        <clipPath id={clipId}>
          <path d={shield} />
        </clipPath>
      </defs>
      <path d={shield} fill={a} />
      <g clipPath={`url(#${clipId})`}>
        {pattern === 0 && [0, 1, 2, 3].map((i) => <rect key={i} x={14 + i * 20} y="0" width="10" height="100" fill={b} />)}
        {pattern === 1 && <rect x="50" y="0" width="50" height="100" fill={b} />}
        {pattern === 2 && <path d="M0 20 L100 80 L100 100 L0 40 Z" fill={b} />}
        {era <= 1 && <rect x="0" y="0" width="100" height="26" fill={accent} opacity="0.9" />}
      </g>
      <path d={shield} fill="none" stroke={era === 0 ? accent : '#111827'} strokeWidth={era === 0 ? 5 : 3} />
      {era === 0 && <path d={shield} fill="none" stroke="#111827" strokeWidth="1.5" transform="translate(50 50) scale(0.86) translate(-50 -50)" />}
      {era === 0 && [18, 30, 42, 58, 70, 82].map((x) => <circle key={x} cx={x} cy="100" r="3" fill={accent} transform="translate(0 -4)" />)}
      <text
        x="50"
        y={era <= 1 ? 20 : 60}
        textAnchor="middle"
        fontSize={era <= 1 ? 13 : 22}
        fontWeight="900"
        fill={era <= 1 ? '#111827' : '#FFFFFF'}
        fontFamily={era === 0 ? 'Georgia, serif' : 'Poppins, sans-serif'}
        stroke={era <= 1 ? 'none' : '#111827'}
        strokeWidth="0.8"
      >
        {initials}
      </text>
    </svg>
  );
}

/** An invented kit. Older eras have laced collars and long sleeves; later ones are modern cuts. */
function InventedShirt({ seed, era }: { seed: string; era: number }) {
  const [a, b, accent] = colours(seed);
  const pattern = hash(`${seed}:k`) % 4;
  const longSleeves = era === 0;
  const body = longSleeves
    ? 'M30 10 L42 6 Q50 12 58 6 L70 10 L96 30 L90 52 L76 44 L76 94 L24 94 L24 44 L10 52 L4 30 Z'
    : 'M30 10 L42 6 Q50 12 58 6 L70 10 L90 26 L80 40 L74 36 L74 94 L26 94 L26 36 L20 40 L10 26 Z';
  const clipId = `shirt-${seed}-${era}`;
  return (
    <svg viewBox="0 0 100 100" className="size-full">
      <defs>
        <clipPath id={clipId}>
          <path d={body} />
        </clipPath>
      </defs>
      <path d={body} fill={a} />
      <g clipPath={`url(#${clipId})`}>
        {pattern === 0 && [0, 1, 2, 3, 4].map((i) => <rect key={i} x={6 + i * 20} y="0" width="9" height="100" fill={b} />)}
        {pattern === 1 && [0, 1, 2, 3].map((i) => <rect key={i} x="0" y={20 + i * 20} width="100" height="9" fill={b} />)}
        {pattern === 2 && <path d="M20 0 L40 0 L90 100 L70 100 Z" fill={b} />}
        {pattern === 3 && <rect x="50" y="0" width="50" height="100" fill={b} />}
        {era >= 2 && <rect x="0" y="86" width="100" height="8" fill={accent} opacity="0.85" />}
      </g>
      <path d={body} fill="none" stroke="#111827" strokeWidth="1.5" />
      {era === 0 ? (
        <path d="M42 6 Q50 22 58 6 M46 12 L54 12 M47 16 L53 16" fill="none" stroke="#FFFFFF" strokeWidth="2" />
      ) : era === 1 ? (
        <path d="M40 6 L50 20 L60 6" fill="#FFFFFF" stroke="#111827" strokeWidth="1" />
      ) : (
        <path d="M42 6 Q50 14 58 6" fill="none" stroke={accent} strokeWidth="3" />
      )}
    </svg>
  );
}

export function ShowArtView({ art, className }: { art: ShowArt; className?: string }) {
  return (
    <div className={`relative ${className ?? ''}`}>
      {art.kind === 'image' ? (
        <Image src={art.src} alt={art.alt ?? ''} fill sizes="(max-width: 768px) 100vw, 640px" className="object-cover" unoptimized />
      ) : art.kind === 'crest' ? (
        <InventedCrest seed={art.seed} era={art.era} initials={art.initials} />
      ) : (
        <InventedShirt seed={art.seed} era={art.era} />
      )}
    </div>
  );
}

import type { ReactElement, SVGProps } from 'react';

/**
 * PlayStyles shown on Icon cards. The glyphs are our own original designs that
 * evoke each PlayStyle's concept (EA's actual PlayStyle icons are their assets,
 * so we don't reproduce them) — same names, our art, matching the rest of the
 * recreated card.
 */
export type PlayStyle =
  | 'Tiki Taka'
  | 'Finesse Shot'
  | 'Trickster'
  | 'Power Shot'
  | 'Rapid'
  | 'Incisive Pass'
  | 'Whipped Pass'
  | 'Dead Ball'
  | 'Aerial'
  | 'Jockey'
  | 'Trivela'
  | 'First Touch';

export const PLAYSTYLES: PlayStyle[] = [
  'Tiki Taka', 'Finesse Shot', 'Trickster', 'Power Shot', 'Rapid', 'Incisive Pass',
  'Whipped Pass', 'Dead Ball', 'Aerial', 'Jockey', 'Trivela', 'First Touch',
];

const S = 2; // stroke width

const GLYPHS: Record<PlayStyle, ReactElement> = {
  // passing network — three linked nodes
  'Tiki Taka': (
    <>
      <path d="M6 7 L18 7 L12 18 Z" fill="none" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />
      <circle cx="6" cy="7" r="2.4" fill="currentColor" />
      <circle cx="18" cy="7" r="2.4" fill="currentColor" />
      <circle cx="12" cy="18" r="2.4" fill="currentColor" />
    </>
  ),
  // curving shot
  'Finesse Shot': (
    <>
      <path d="M4 18 C10 18 16 14 18 6" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" />
      <path d="M14 5 L19 5 L19 10" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // sparkle
  'Trickster': (
    <path d="M12 2 L14 9 L21 12 L14 15 L12 22 L10 15 L3 12 L10 9 Z" fill="currentColor" />
  ),
  // lightning bolt
  'Power Shot': (
    <path d="M13 2 L5 13 L11 13 L10 22 L19 10 L13 10 Z" fill="currentColor" />
  ),
  // speed chevrons
  Rapid: (
    <>
      <path d="M5 6 L11 12 L5 18" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 6 L18 12 L12 18" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // arrow threaded between two markers
  'Incisive Pass': (
    <>
      <circle cx="7" cy="5" r="1.8" fill="currentColor" />
      <circle cx="7" cy="19" r="1.8" fill="currentColor" />
      <path d="M4 12 L18 12 M13 8 L18 12 L13 16" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // whipped arc
  'Whipped Pass': (
    <>
      <path d="M4 20 A14 14 0 0 1 18 6" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" />
      <path d="M13 5 L19 5 L18 11" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // ball on a spot
  'Dead Ball': (
    <>
      <circle cx="12" cy="9" r="5" fill="none" stroke="currentColor" strokeWidth={S} />
      <path d="M12 9 L14.5 11.5 M12 9 L9.5 11.5 M12 9 L12 5.5" stroke="currentColor" strokeWidth={S * 0.7} strokeLinecap="round" />
      <path d="M5 19 L19 19" stroke="currentColor" strokeWidth={S} strokeLinecap="round" />
    </>
  ),
  // upward chevrons
  Aerial: (
    <>
      <path d="M6 13 L12 7 L18 13" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 19 L12 13 L18 19" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // shield
  Jockey: (
    <path d="M12 3 L20 6 V12 C20 17 16 20 12 21 C8 20 4 17 4 12 V6 Z" fill="none" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />
  ),
  // outside-of-boot S curve
  Trivela: (
    <path d="M6 5 C13 5 11 11 8 12 C5 13 3 19 10 19" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" />
  ),
  // concentric target
  'First Touch': (
    <>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth={S} />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
    </>
  ),
};

export function PlayStyleIcon({ name, size = 18, ...rest }: { name: PlayStyle; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden {...rest}>
      {GLYPHS[name]}
    </svg>
  );
}

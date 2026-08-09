import { useId } from "react";

import { cn } from "@/lib/utils";

export type WlMedalPlace = 1 | 2 | 3;

// Same coin language as the World Cup medals, re-tinted for the league:
// champion gold, runner-up silver, third bronze — with the WL green edge.
const PALETTES: Record<
  WlMedalPlace,
  { body: string; bodyDeep: string; ink: string; edge: string }
> = {
  1: { body: "#F0C63C", bodyDeep: "#DCAF1E", ink: "#8A6B0C", edge: "#B8912A" },
  2: { body: "#DCDCDC", bodyDeep: "#BFBFBF", ink: "#6C6C6C", edge: "#9A9A9A" },
  3: { body: "#E2953B", bodyDeep: "#C97B21", ink: "#74450D", edge: "#A96A1D" },
};

const PLACE_WORD: Record<WlMedalPlace, string> = {
  1: "CHAMPION",
  2: "2ND PLACE",
  3: "3RD PLACE",
};

interface WlChampionMedalProps {
  place: WlMedalPlace;
  className?: string;
}

/** Weekend League podium medal — pure SVG, sized via className width. */
export function WlChampionMedal({ place, className }: WlChampionMedalProps) {
  const uid = useId();
  const p = PALETTES[place];
  const topArcId = `${uid}-top`;
  const bottomArcId = `${uid}-bottom`;
  const coinId = `${uid}-coin`;

  return (
    <svg viewBox="0 0 100 100" className={cn("block", className)} role="img" aria-label={`Weekend League ${PLACE_WORD[place]}`}>
      <defs>
        <radialGradient id={coinId} cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor={p.body} />
          <stop offset="70%" stopColor={p.body} />
          <stop offset="100%" stopColor={p.bodyDeep} />
        </radialGradient>
        <path id={topArcId} d="M 16 50 A 34 34 0 0 1 84 50" fill="none" />
        <path id={bottomArcId} d="M 13 50 A 37 37 0 0 0 87 50" fill="none" />
      </defs>

      <circle cx="50" cy="50" r="48" fill={p.edge} />
      <circle cx="50" cy="50" r="44.5" fill={p.bodyDeep} />
      <circle cx="50" cy="50" r="42" fill={`url(#${coinId})`} />
      <circle cx="50" cy="50" r="29" fill="none" stroke={p.ink} strokeOpacity="0.5" strokeWidth="0.8" />

      <text fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="6.4" fill={p.ink} letterSpacing="1.3">
        <textPath href={`#${topArcId}`} startOffset="50%" textAnchor="middle">
          WEEKEND LEAGUE
        </textPath>
      </text>
      <text fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="5.4" fill={p.ink} letterSpacing="1.2">
        <textPath href={`#${bottomArcId}`} startOffset="50%" textAnchor="middle">
          {PLACE_WORD[place]}
        </textPath>
      </text>

      {/* Trophy: cup + handles + stem + base */}
      <g fill={p.ink}>
        <path d="M40 36 h20 v3.5 c0 6.5 -4 11 -10 11 s-10 -4.5 -10 -11 Z" />
        <path d="M37.5 38 h-4 a1.6 1.6 0 0 0 -1.6 1.8 c0.4 4.4 3.2 7.4 7.1 8.2 a13 13 0 0 1 -1.5 -4.6 c-1.8 -0.7 -3 -2 -3.4 -3.9 h3.4 Z" />
        <path d="M62.5 38 h4 a1.6 1.6 0 0 1 1.6 1.8 c-0.4 4.4 -3.2 7.4 -7.1 8.2 a13 13 0 0 0 1.5 -4.6 c1.8 -0.7 3 -2 3.4 -3.9 h-3.4 Z" />
        <rect x="47.5" y="50" width="5" height="5" rx="0.8" />
        <path d="M43 57 h14 l1.6 3.6 h-17.2 Z" />
      </g>
      <text x="50" y="70.5" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="900" fontSize="10" fill={p.ink}>
        {place}
      </text>
    </svg>
  );
}

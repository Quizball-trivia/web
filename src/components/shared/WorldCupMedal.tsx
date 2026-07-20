import { useId } from "react";

import { cn } from "@/lib/utils";

export type MedalPlace = 1 | 2 | 3;

const NUMERALS: Record<MedalPlace, string> = { 1: "I", 2: "II", 3: "III" };

// Coin palettes sampled from the Figma medals (node 1661-24533): body fill,
// engraved text/rim, and the darker outer edge ring.
const PALETTES: Record<
  MedalPlace,
  { body: string; bodyDeep: string; ink: string; edge: string }
> = {
  1: { body: "#F0C63C", bodyDeep: "#DCAF1E", ink: "#A78311", edge: "#B8912A" },
  2: { body: "#DCDCDC", bodyDeep: "#BFBFBF", ink: "#767676", edge: "#9A9A9A" },
  3: { body: "#E2953B", bodyDeep: "#C97B21", ink: "#7C4A0E", edge: "#A96A1D" },
};

interface WorldCupMedalProps {
  place: MedalPlace;
  className?: string;
}

/**
 * Circular "WORLD CUP TOURNAMENT" medal from the Figma winner cards. Pure SVG
 * (no assets): rim text follows two arcs instead of Figma's 40 hand-rotated
 * letters. Size it via className width — everything scales with the viewBox.
 */
export function WorldCupMedal({ place, className }: WorldCupMedalProps) {
  const uid = useId();
  const p = PALETTES[place];
  const topArcId = `${uid}-top`;
  const bottomArcId = `${uid}-bottom`;
  const coinId = `${uid}-coin`;

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("block", className)}
      role="img"
      aria-label={`${NUMERALS[place]} place — World Cup tournament`}
    >
      <defs>
        <radialGradient id={coinId} cx="50%" cy="38%" r="72%">
          <stop offset="0%" stopColor={p.body} />
          <stop offset="78%" stopColor={p.body} />
          <stop offset="100%" stopColor={p.bodyDeep} />
        </radialGradient>
        <path id={topArcId} d="M 14.5 50 A 35.5 35.5 0 0 1 85.5 50" fill="none" />
        <path id={bottomArcId} d="M 85.5 50 A 35.5 35.5 0 0 1 14.5 50" fill="none" />
      </defs>

      <circle cx="50" cy="50" r="49" fill={p.edge} />
      <circle cx="50" cy="50" r="46.5" fill={`url(#${coinId})`} />
      <circle
        cx="50"
        cy="50"
        r="43"
        fill="none"
        stroke={p.ink}
        strokeOpacity="0.55"
        strokeWidth="1"
        strokeDasharray="1.6 2.1"
      />
      <circle cx="50" cy="50" r="29" fill="none" stroke={p.ink} strokeOpacity="0.4" strokeWidth="0.8" />

      <text
        fill={p.ink}
        fontFamily="'Poppins', Helvetica, sans-serif"
        fontSize="5.4"
        fontWeight="700"
        letterSpacing="0.7"
      >
        <textPath href={`#${topArcId}`} startOffset="50%" textAnchor="middle">
          WORLD CUP TOURNAMENT
        </textPath>
      </text>
      <text
        fill={p.ink}
        fontFamily="'Poppins', Helvetica, sans-serif"
        fontSize="5.4"
        fontWeight="700"
        letterSpacing="0.7"
      >
        <textPath href={`#${bottomArcId}`} startOffset="50%" textAnchor="middle">
          WORLD CUP TOURNAMENT
        </textPath>
      </text>

      <text
        x="50"
        y="46"
        fill={p.ink}
        fontFamily="'Poppins', Helvetica, sans-serif"
        fontSize="19"
        fontWeight="800"
        textAnchor="middle"
      >
        {NUMERALS[place]}
      </text>
      <text
        x="50"
        y="63"
        fill={p.ink}
        fontFamily="'Poppins', Helvetica, sans-serif"
        fontSize="13.5"
        fontWeight="800"
        letterSpacing="0.5"
        textAnchor="middle"
      >
        PLACE
      </text>
    </svg>
  );
}

"use client";

import { motion } from "motion/react";

import { WL_PLACE_ACCENT, type WlPackPlace } from "./wlRewards";

export type WlPackState = "idle" | "opening";

interface WlVictoryPackProps {
  place: WlPackPlace;
  state?: WlPackState;
  /** Skip the float, shake and tear-off; the pack just fades when opened. */
  reducedMotion?: boolean;
  className?: string;
}

const ZIGZAG_TOP = "0,14 10,2 20,14 30,2 40,14 50,2 60,14 70,2 80,14 90,2 100,14 110,2 120,14 130,2 140,14 150,2 160,14 170,2 180,14";
const ZIGZAG_BOTTOM = "0,246 10,258 20,246 30,258 40,246 50,258 60,246 70,258 80,246 90,258 100,246 110,258 120,246 130,258 140,246 150,258 160,246 170,258 180,246";

/** The flat foil pack a podium finisher opens. Purely presentational: the
 *  reward inside is already owned before this is ever shown. */
export function WlVictoryPack({ place, state = "idle", reducedMotion = false, className = "" }: WlVictoryPackProps) {
  const accent = WL_PLACE_ACCENT[place];
  const opening = state === "opening";
  const clipId = `wl-pack-body-${place}`;

  return (
    <motion.div
      className={`relative ${className}`}
      style={{ aspectRatio: "180 / 260" }}
      animate={
        reducedMotion
          ? { opacity: opening ? 0 : 1 }
          : opening
            ? { rotate: [0, -5, 5, -4, 4, 0], y: [0, 0, 0, 0, 0, 60], opacity: [1, 1, 1, 1, 1, 0] }
            : { y: [0, -8, 0] }
      }
      transition={
        reducedMotion
          ? { duration: 0.3 }
          : opening
            ? { duration: 1.1, times: [0, 0.12, 0.24, 0.36, 0.48, 1], ease: "easeInOut" }
            : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <svg viewBox="0 0 180 260" className="size-full overflow-visible" aria-hidden>
        <defs>
          <clipPath id={clipId}>
            <polygon points={`${ZIGZAG_TOP} ${ZIGZAG_BOTTOM.split(" ").reverse().join(" ")}`} />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width="180" height="260" fill={accent.main} />
          <polygon points="0,260 0,150 180,40 180,150" fill={accent.deep} opacity="0.35" />
          <polygon points="0,120 0,96 180,-14 180,10" fill="#FFFFFF" opacity="0.28" />
          <rect x="0" y="232" width="180" height="28" fill={accent.deep} opacity="0.55" />
        </g>

        <circle cx="90" cy="128" r="46" fill={accent.ink} />
        <circle cx="90" cy="128" r="46" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="2" />
        <text
          x="90" y="146" textAnchor="middle" fill={accent.main}
          fontFamily="Poppins, sans-serif" fontWeight="900" fontSize="52"
        >
          {place}
        </text>
        <text
          x="90" y="206" textAnchor="middle" fill={accent.ink}
          fontFamily="Poppins, sans-serif" fontWeight="900" fontSize="11" letterSpacing="2.4"
        >
          WEEKEND LEAGUE
        </text>

        {/* Tear strip: the top crimp comes away when the pack is opened. */}
        <motion.g
          initial={false}
          animate={opening && !reducedMotion ? { x: 70, y: -90, rotate: 32, opacity: 0 } : { x: 0, y: 0, rotate: 0, opacity: 1 }}
          transition={{ delay: opening ? 0.52 : 0, duration: 0.45, ease: "easeOut" }}
          style={{ transformOrigin: "90px 20px" }}
        >
          <polygon points={`${ZIGZAG_TOP} 180,44 0,44`} fill={accent.deep} />
          <rect x="0" y="40" width="180" height="4" fill={accent.ink} opacity="0.35" />
        </motion.g>
      </svg>
    </motion.div>
  );
}

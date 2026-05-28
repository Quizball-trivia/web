"use client";

import { motion } from "motion/react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { MAP_W, MAP_H } from "@/lib/geo";
import type { AvatarCustomization } from "@/types/game";

/**
 * A single rendered pin on the matchmaking world map — used both for
 * the rotating "currently searching" pool and for the resolved
 * opponent once matchmaking finds one.
 *
 * The geometry constants exported alongside are tuned for the SVG
 * viewBox baked into the JSX; if you change the viewBox you'll want to
 * keep PIN_TIP_Y / PIN_AVATAR_CENTER_Y consistent with it so the
 * tip-anchor + avatar-center math (PIN_ORIGIN_Y_PCT,
 * PIN_AVATAR_Y_PCT) still lines up.
 */

export interface FakePlayer {
  id: number;
  lon: number;
  lat: number;
  x: number;
  y: number;
  color: string;
  avatarUrl: string;
  avatarCustomization?: AvatarCustomization | null;
  name: string;
  flag: string;
  city: string;
  country: string;
  delay: number;
  source?: string;
}

export const PIN_W = 24;
export const PIN_H = 34;
const PIN_VIEWBOX_MIN_Y = -22;
const PIN_TIP_Y = 8;
const PIN_AVATAR_CENTER_Y = -7.5;
export const PIN_ORIGIN_Y_PCT = ((PIN_TIP_Y - PIN_VIEWBOX_MIN_Y) / PIN_H) * 100;
export const PIN_AVATAR_Y_PCT = ((PIN_AVATAR_CENTER_Y - PIN_VIEWBOX_MIN_Y) / PIN_H) * 100;
export const PIN_SCREEN_WIDTH = "clamp(20px, min(2.4vw, 4.3vh), 30px)";

interface MapPlayerPinProps {
  player: FakePlayer;
  highlighted: boolean;
  isOpponent: boolean;
  showFoundState: boolean;
}

export function MapPlayerPin({
  player,
  highlighted,
  isOpponent,
  showFoundState,
}: MapPlayerPinProps) {
  return (
    <div
      className="absolute overflow-visible"
      style={{
        left: `${(player.x / MAP_W) * 100}%`,
        top: `${(player.y / MAP_H) * 100}%`,
        width: PIN_SCREEN_WIDTH,
        aspectRatio: `${PIN_W} / ${PIN_H}`,
        transform: `translate(-50%, -${PIN_ORIGIN_Y_PCT}%)`,
      }}
    >
      <motion.div
        className="relative size-full overflow-visible"
        animate={{ y: 0 }}
      >
        <svg
          className="absolute inset-0 overflow-visible"
          viewBox="-12 -22 24 34"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <ellipse cx="0" cy="1" rx="3.5" ry="1.2" fill="rgba(0,0,0,0.35)" />
          <path
            d="M0,-15 C-6.5,-15 -10,-11 -10,-6 C-10,1.5 0,8 0,8 C0,8 10,1.5 10,-6 C10,-11 6.5,-15 0,-15 Z"
            fill={player.color}
            stroke={isOpponent ? "#fff" : "rgba(0,0,0,0.4)"}
            strokeWidth={isOpponent ? "1.5" : "0.5"}
            opacity={isOpponent ? 1 : highlighted ? 0.95 : 0.8}
          />
          <circle
            cx="0"
            cy="-7.5"
            r="6.1"
            fill="#0D1117"
            stroke={player.color}
            strokeWidth="0.9"
          />
        </svg>

        <div
          className="absolute left-1/2 flex items-center justify-center overflow-hidden rounded-full bg-surface-darkest"
          style={{
            top: `${PIN_AVATAR_Y_PCT}%`,
            width: "52%",
            aspectRatio: "1 / 1",
            transform: "translate(-50%, -50%)",
            border: `1px solid ${player.color}`,
          }}
        >
          <AvatarDisplay
            customization={player.avatarCustomization ?? {}}
            size="xs"
            className="size-full"
          />
        </div>

        {(isOpponent || (highlighted && !showFoundState)) && (
          <div
            className="absolute left-1/2 whitespace-nowrap rounded-[3px] bg-black/70 px-1.5 py-0.5 text-center text-[5.5px] font-bold leading-none text-white"
            style={{
              bottom: "calc(100% + 2px)",
              transform: "translateX(-50%)",
            }}
          >
            {player.name}
          </div>
        )}

        {isOpponent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.35, duration: 0.3 }}
            className="absolute right-[-24%] top-[8%] flex items-center justify-center rounded-[3px] border border-white/35 bg-surface-darkest/90 px-1 py-0.5 text-[5.7px] leading-none"
          >
            {player.flag}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

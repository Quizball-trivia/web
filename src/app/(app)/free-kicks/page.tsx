"use client";

import { FinalThird } from "@/features/mini-games/components/FinalThird";

/**
 * Free Kicks game mode — LIVE: real coins from the store wallet, real
 * questions, server-authoritative outcomes via /api/v1/free-kicks.
 * The /demos copy of the game stays virtual.
 */
export default function FreeKicksPage() {
  return <FinalThird backHref="/play" live />;
}

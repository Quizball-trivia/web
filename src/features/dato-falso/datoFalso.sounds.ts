"use client";

import { useEffect, useRef } from "react";
import { playSfx, preloadSfx, type SoundName } from "@/lib/sounds/gameSounds";

/** The shared right / wrong sounds, one per revealed card. */
export const DATO_FALSO_SOUNDS = { right: "correctRanked", wrong: "wrongAnswer" } as const satisfies Record<string, SoundName>;

/**
 * Plays the verdict of each card once, when it is revealed on screen. `key` names the reveal (null while the card is
 * open); a reveal already on screen when the view mounts (a reload) stays silent.
 */
export function useRevealSound(key: string | null, right: boolean) {
  const seen = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    preloadSfx(DATO_FALSO_SOUNDS.right, DATO_FALSO_SOUNDS.wrong);
  }, []);
  useEffect(() => {
    if (seen.current === undefined) { seen.current = key; return; }
    if (key === null || key === seen.current) return;
    seen.current = key;
    playSfx(right ? DATO_FALSO_SOUNDS.right : DATO_FALSO_SOUNDS.wrong);
  }, [key, right]);
}

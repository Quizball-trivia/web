"use client";

import { useEffect, useRef } from "react";
import { playSfx, preloadSfx, type SoundName } from "@/lib/sounds/gameSounds";
import type { CardKind } from "./codenames.view";

/** Which sound each flip plays (null = silent on purpose). */
export const CODENAMES_SOUNDS = {
  /** Our team flips one of ours. */
  right: "correctRanked",
  /** Our team flips a rival or neutral card: the turn ends. */
  wrong: "wrongAnswer",
  /** Anyone flips the Own Goal: played by the blast animation itself, so sound and picture start together. */
  ownGoal: "codenamesOwnGoal",
  /** The rival flips any card other than the Own Goal. */
  rival: null,
} as const satisfies Record<string, SoundName | null>;

export interface FlipEvent { kind: CardKind; ours: boolean }

export function flipSound({ kind, ours }: FlipEvent): SoundName | null {
  if (kind === "owngoal") return null;
  if (!ours) return CODENAMES_SOUNDS.rival;
  return kind === "mine" ? CODENAMES_SOUNDS.right : CODENAMES_SOUNDS.wrong;
}

/** Loads every Codenames sound when the board opens, so none starts late. */
export function usePreloadCodenamesSounds() {
  useEffect(() => {
    const names: (SoundName | null)[] = Object.values(CODENAMES_SOUNDS);
    preloadSfx(...names.filter((n): n is SoundName => n !== null));
  }, []);
}

/** Plays the Own Goal sound once, from the blast's first frame. */
export function useOwnGoalSound() {
  const played = useRef(false);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    playSfx(CODENAMES_SOUNDS.ownGoal);
  }, []);
}

/** Plays the sound of each new flip; flips already made when the screen opened stay silent. */
export function useFlipSounds(count: number, kind: CardKind | null, ours: boolean) {
  const heard = useRef(count);
  useEffect(() => {
    const fresh = count > heard.current;
    heard.current = count;
    const name = fresh && kind ? flipSound({ kind, ours }) : null;
    if (name) playSfx(name);
  }, [count, kind, ours]);
}

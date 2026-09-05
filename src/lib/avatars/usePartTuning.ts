"use client";

import { useSyncExternalStore } from "react";
import type { AvatarPart, AvatarPartPosition } from "./parts";

export const TUNING_KEY = "dev-part-tuner-overrides";
export interface PartTransform { rotation: number; scaleY: number; }
export interface PartTuning {
  transform?: Record<string, PartTransform>;
  storeTransform?: Record<string, PartTransform>;
  hairFrontPercent?: Record<string, number>;
  hairBehindFace?: Record<string, boolean>;
  position: Record<string, AvatarPartPosition>;
  storePosition: Record<string, AvatarPartPosition>;
}
const empty: PartTuning = { position: {}, storePosition: {} };
function snapshot() {
  if (process.env.NODE_ENV !== "development") return "{}";
  try { return localStorage.getItem(TUNING_KEY) ?? "{}"; } catch { return "{}"; }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("avatar-tuning", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("avatar-tuning", callback);
  };
}
export function usePartTuning(): PartTuning {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "{}");
  try {
    const parsed = JSON.parse(raw);
    const result: PartTuning = { position: {}, storePosition: {} };
    for (const field of ["position", "storePosition"] as const) {
      for (const [id, value] of Object.entries(parsed?.[field] ?? {})) {
        const pos = value as AvatarPartPosition;
        if (pos && [pos.top, pos.left, pos.width].every(Number.isFinite) && pos.width > 0)
          result[field][id] = pos;
      }
    }
    if (parsed?.hairBehindFace && typeof parsed.hairBehindFace === "object") {
      result.hairBehindFace = Object.fromEntries(Object.entries(parsed.hairBehindFace).filter(([, value]) => typeof value === "boolean")) as Record<string, boolean>;
    }
    if (parsed?.hairFrontPercent && typeof parsed.hairFrontPercent === "object") {
      result.hairFrontPercent = Object.fromEntries(Object.entries(parsed.hairFrontPercent).filter(([, value]) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100)) as Record<string, number>;
    }
    for (const field of ["transform", "storeTransform"] as const) {
      if (parsed?.[field] && typeof parsed[field] === "object") {
        result[field] = Object.fromEntries(Object.entries(parsed[field]).filter(([, value]) => {
          const t = value as PartTransform;
          return t && Number.isFinite(t.rotation) && Math.abs(t.rotation) <= 180 && Number.isFinite(t.scaleY) && t.scaleY >= 0.25 && t.scaleY <= 3;
        })) as Record<string, PartTransform>;
      }
    }
    return result;
  } catch { return empty; }
}
export function savePartTuning(value: PartTuning) {
  localStorage.setItem(TUNING_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event("avatar-tuning"));
}
export function tunedPosition(part: AvatarPart, tuning: PartTuning, card = false): AvatarPartPosition {
  return card
    ? tuning.storePosition[part.id] ?? part.storePosition ?? tuning.position[part.id] ?? part.position
    : tuning.position[part.id] ?? part.position;
}

/** Keep the upper fringe in front while the full silhouette stays behind the head. */
export function frontHairMask(percent: number) {
  // A scalloped edge keeps the cut from looking like a straight fringe.
  if (percent === 0) return "linear-gradient(transparent, transparent)";
  if (percent === 100) return "linear-gradient(black, black)";
  const edge = Math.max(0, percent - 4);
  const curls = Array.from({ length: 9 }, (_, i) =>
    `radial-gradient(ellipse 7% 5% at ${i * 12.5}% ${edge}%, black 98%, transparent 100%)`);
  return [`linear-gradient(to bottom, black ${edge}%, transparent ${edge}%)`, ...curls].join(", ");
}

export function tunedTransform(part: AvatarPart, tuning: PartTuning, card = false): PartTransform {
  return (card ? tuning.storeTransform?.[part.id] : undefined) ?? tuning.transform?.[part.id] ?? { rotation: 0, scaleY: 1 };
}
export function partTransformStyle(part: AvatarPart, tuning: PartTuning, card = false) {
  const t = tunedTransform(part, tuning, card);
  return { transform: `rotate(${t.rotation}deg) scaleY(${t.scaleY})`, transformOrigin: "50% 50%" };
}

export function tunedFrontHairPercent(part: AvatarPart, tuning: PartTuning) {
  if (tuning.hairFrontPercent?.[part.id] !== undefined) return tuning.hairFrontPercent[part.id];
  if (tuning.hairBehindFace?.[part.id] !== undefined) return undefined;
  return part.hairFrontPercent;
}

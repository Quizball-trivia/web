/** Keyboard navigation over the Missing XI pitch. Slots carry pitch
 *  percentages: x left→right, y top (opposition goal) → bottom (own goal). */
export interface PitchPoint {
  id: string;
  x: number;
  y: number;
}

/**
 * Shirts closer than this (in pitch-height %) belong to one formation line. Lines are often drawn
 * curved (full-backs a few points ahead of the centre-backs, a midfield three with its middle man
 * deeper), while separate lines sit 10+ points apart.
 */
export const LINE_GAP = 8;

/** Formation lines from the goalkeeper forward, each left to right. Consecutive y values within
 *  LINE_GAP chain into the same line. */
export function pitchLines<T extends PitchPoint>(slots: readonly T[]): T[][] {
  const byDepth = [...slots].sort((a, b) => b.y - a.y);
  const lines: T[][] = [];
  let lastY = Number.NaN;
  for (const slot of byDepth) {
    const line = lines.at(-1);
    if (line && lastY - slot.y <= LINE_GAP) line.push(slot);
    else lines.push([slot]);
    lastY = slot.y;
  }
  return lines.map((line) => line.sort((a, b) => a.x - b.x));
}

/** Reading order on the pitch: goalkeeper first, then each formation line back to
 *  front, left to right within a line. */
export function pitchOrder<T extends PitchPoint>(slots: readonly T[]): T[] {
  return pitchLines(slots).flat();
}

/** The next (or previous) slot in pitch order that is still open; `fromId` null starts from the
 *  first open slot. `wrap` (the "next empty shirt" after an answer) goes round from the last shirt
 *  to the first; arrow keys don't, and get null at the end. */
export function nextOpenSlotId<T extends PitchPoint>(
  slots: readonly T[],
  isOpen: (slot: T) => boolean,
  fromId: string | null,
  step: 1 | -1 = 1,
  wrap = true,
): string | null {
  const ordered = pitchOrder(slots);
  const start = fromId === null ? -1 : ordered.findIndex((slot) => slot.id === fromId);
  if (start === -1) return (step === 1 ? ordered : [...ordered].reverse()).find(isOpen)?.id ?? null;
  for (let offset = 1; offset <= ordered.length; offset += 1) {
    const raw = start + step * offset;
    if (!wrap && (raw < 0 || raw >= ordered.length)) return null;
    const slot = ordered[((raw % ordered.length) + ordered.length) % ordered.length];
    if (slot && slot.id !== fromId && isOpen(slot)) return slot.id;
  }
  return null;
}

export type PitchDirection = "up" | "down" | "left" | "right";

/**
 * The open slot an arrow key moves to from `fromId`, never wrapping (null when nothing lies that way):
 * left/right walk the current formation line; up/down go to the nearest line that way with an open
 * shirt, landing on the one most in line with the current shirt.
 */
export function slotInDirection<T extends PitchPoint>(
  slots: readonly T[],
  isOpen: (slot: T) => boolean,
  fromId: string,
  direction: PitchDirection,
): string | null {
  const lines = pitchLines(slots);
  const lineIdx = lines.findIndex((line) => line.some((slot) => slot.id === fromId));
  if (lineIdx === -1) return null;
  const line = lines[lineIdx];
  const at = line.findIndex((slot) => slot.id === fromId);
  const from = line[at];

  if (direction === "left" || direction === "right") {
    const step = direction === "right" ? 1 : -1;
    for (let j = at + step; j >= 0 && j < line.length; j += step) if (isOpen(line[j])) return line[j].id;
    return null;
  }

  // Up is towards the opposition goal: later lines.
  const step = direction === "up" ? 1 : -1;
  for (let i = lineIdx + step; i >= 0 && i < lines.length; i += step) {
    const open = lines[i].filter(isOpen);
    if (open.length === 0) continue;
    return open.reduce((best, slot) => (Math.abs(slot.x - from.x) < Math.abs(best.x - from.x) ? slot : best)).id;
  }
  return null;
}

export const ARROW_DIRECTIONS: Record<string, PitchDirection> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

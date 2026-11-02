/** Keyboard navigation over the Missing XI pitch. Slots carry pitch
 *  percentages: x left→right, y top (opposition goal) → bottom (own goal). */
export interface PitchPoint {
  id: string;
  x: number;
  y: number;
}

/** Reading order on the pitch: goalkeeper first, then each line back to
 *  front, left to right within a line. */
export function pitchOrder<T extends PitchPoint>(slots: readonly T[]): T[] {
  return [...slots].sort((a, b) => b.y - a.y || a.x - b.x);
}

/** The next (or previous) slot in pitch order that is still open, wrapping
 *  around; `fromId` null starts from the first open slot. */
export function nextOpenSlotId<T extends PitchPoint>(
  slots: readonly T[],
  isOpen: (slot: T) => boolean,
  fromId: string | null,
  step: 1 | -1 = 1,
): string | null {
  const ordered = pitchOrder(slots);
  const start = fromId === null ? -1 : ordered.findIndex((slot) => slot.id === fromId);
  if (start === -1) return (step === 1 ? ordered : [...ordered].reverse()).find(isOpen)?.id ?? null;
  for (let offset = 1; offset <= ordered.length; offset += 1) {
    const index = (((start + step * offset) % ordered.length) + ordered.length) % ordered.length;
    const slot = ordered[index];
    if (slot && slot.id !== fromId && isOpen(slot)) return slot.id;
  }
  return null;
}

export type PitchDirection = "up" | "down" | "left" | "right";

/** The nearest open slot in an arrow-key direction from `fromId`, favouring
 *  slots in line with it; null when nothing lies that way. */
export function slotInDirection<T extends PitchPoint>(
  slots: readonly T[],
  isOpen: (slot: T) => boolean,
  fromId: string,
  direction: PitchDirection,
): string | null {
  const from = slots.find((slot) => slot.id === fromId);
  if (!from) return null;
  let best: { id: string; cost: number } | null = null;
  for (const slot of slots) {
    if (slot.id === fromId || !isOpen(slot)) continue;
    const dx = slot.x - from.x;
    const dy = slot.y - from.y;
    const along = direction === "left" ? -dx : direction === "right" ? dx : direction === "up" ? -dy : dy;
    const across = direction === "left" || direction === "right" ? Math.abs(dy) : Math.abs(dx);
    if (along <= 0) continue;
    // Up/down prefers the adjacent line over the nearest-in-column slot two lines away;
    // left/right stays within the line.
    const cost = direction === "left" || direction === "right" ? along + across * 3 : along * 2 + across;
    if (!best || cost < best.cost) best = { id: slot.id, cost };
  }
  return best?.id ?? null;
}

export const ARROW_DIRECTIONS: Record<string, PitchDirection> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

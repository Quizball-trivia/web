/**
 * Each player has one colour everywhere on the duel screen: you in brand green, your rival in brand blue.
 * Brand blue is too dark for small text on the dark screen, so small labels stay white on the seat's tint or ring.
 */
export const SEAT_TEXT = { me: "text-brand-green", rival: "text-brand-blue" } as const;
export const SEAT_LABEL = { me: "text-white", rival: "text-white" } as const;
export const SEAT_DOT = { me: "bg-brand-green", rival: "bg-brand-blue" } as const;
export const SEAT_AVATAR_RING = { me: "ring-brand-green", rival: "ring-brand-blue" } as const;
export const SEAT_RING = {
  me: "border-brand-green shadow-[0_0_12px_rgba(56,182,14,0.35)]",
  rival: "border-brand-blue shadow-[0_0_12px_rgba(22,69,255,0.45)]",
} as const;
export const SEAT_BG = { me: "bg-brand-green/20", rival: "bg-brand-blue/25" } as const;

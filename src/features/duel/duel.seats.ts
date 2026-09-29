/** Each player has one colour everywhere on the duel screen: you in green, your rival in sky blue. */
export const SEAT_TEXT = { me: "text-brand-green-light", rival: "text-sky-300" } as const;
export const SEAT_RING = {
  me: "border-brand-green-light shadow-[0_0_12px_rgba(88,204,2,0.3)]",
  rival: "border-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.3)]",
} as const;
export const SEAT_BG = { me: "bg-brand-green-light/15", rival: "bg-sky-300/15" } as const;

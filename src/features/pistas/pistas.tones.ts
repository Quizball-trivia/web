import type { ResultTone } from "./pistas.logic";

/** Tinted surfaces instead of flat traffic-light squares: the hue says how early, the tint keeps it quiet. */
export const TONE_CHIP: Record<ResultTone, string> = {
  early: "bg-brand-green-light/15 text-brand-green-light ring-1 ring-inset ring-brand-green-light/25",
  mid: "bg-brand-yellow/12 text-brand-yellow-soft ring-1 ring-inset ring-brand-yellow/20",
  late: "bg-brand-orange/12 text-brand-orange-light ring-1 ring-inset ring-brand-orange/20",
  missed: "bg-white/[0.05] text-white/35 ring-1 ring-inset ring-white/10",
};

export const TONE_BAR: Record<ResultTone, string> = {
  early: "bg-brand-green-light/80",
  mid: "bg-brand-yellow-soft/80",
  late: "bg-brand-orange-light/80",
  missed: "bg-white/25",
};

/** On the blue score card: dark tiles like the stats below, the hue only in the number. */
export const TONE_ON_CARD: Record<ResultTone, string> = {
  early: "bg-black/25 text-brand-green-bright",
  mid: "bg-black/25 text-brand-yellow",
  late: "bg-black/25 text-brand-orange-light",
  missed: "bg-black/15 text-white/40",
};

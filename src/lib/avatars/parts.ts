import type { AvatarCustomization } from "@/types/game";

/**
 * Avatar parts registry — items that can be equipped on top of the base avatar.
 *
 * Layout note: items are positioned as percentages of the canonical Figma slot
 * (495.25 × 543.03). The wrapper renders the bald base at this aspect ratio and
 * each item overlays at its declared `position` % values.
 *
 * Figma anchors used (from the file `bGN22zy2Ln6qjVg2MSBjWg`):
 *   • Hair group bounding rect:  279.19 × 213.10 at (86.24, 0)   in 495.25×543.03
 *     → top: 0%, left: 17.4%, width: 56.4%
 *   • Body wrapper:               full width × 390.44 at (0, 95.18) → top 17.5%
 *   • Jersey yellow group:        139.7 × 115.93 at (23.8, 116.07) inside 195.68×232 card
 *     → relative top: 50%, left: 12.2%, width: 71.4%
 *
 * Glasses / facial-hair anchors are eyeballed (the Figma data didn't have a clean
 * group bounding rect for these and the visual fit is good).
 */

export type AvatarSlot = "jersey" | "facialHair" | "glasses" | "hair";
type AvatarSkinId = NonNullable<AvatarCustomization["skin"]>;
type AvatarHairId = NonNullable<AvatarCustomization["hair"]>;
type AvatarGlassesId = NonNullable<AvatarCustomization["glasses"]>;
type AvatarFacialHairId = NonNullable<AvatarCustomization["facialHair"]>;
type AvatarJerseyId = NonNullable<AvatarCustomization["jersey"]>;

/**
 * Render order (bottom → top). All overlays render ON TOP of the skin body.
 * Each hair PNG should have a transparent gap where the face goes, so the body's face
 * shows through naturally. (If a hair lacks a face cutout, it'll cover the eyes — that's
 * an asset-level fix, not a code fix.)
 */
export const AVATAR_SLOTS: readonly AvatarSlot[] = ["jersey", "facialHair", "hair", "glasses"];

export interface AvatarPartPosition {
  /** % from top of the 495.25×543.03 canvas */
  top: number;
  /** % from left */
  left: number;
  /** % of canvas width */
  width: number;
}

export interface AvatarPart {
  id: string;
  slot: AvatarSlot;
  name: string;
  asset: string;
  free?: boolean;
  priceCoins?: number;
  productSlug?: string;
  /** Position on the live AvatarPreview (full body). */
  position: AvatarPartPosition;
  /** Optional override for store mannequin card. Falls back to `position` when omitted. */
  storePosition?: AvatarPartPosition;
}

// Canonical Figma canvas dimensions
export const AVATAR_CANVAS_WIDTH = 495.25;
export const AVATAR_CANVAS_HEIGHT = 543.03;

/* ─────────────── Skin tones (base bodies) ─────────────── */
export interface SkinPart {
  id: AvatarSkinId;
  name: string;
  asset: string;
  free?: boolean;
  priceCoins?: number;
  productSlug?: string;
}

export const SKIN_PARTS: SkinPart[] = [
  {
    id: "skin_male_white",
    name: "Light",
    asset: "/assets/store/avatars/avatar_male_white.webp",
    free: true,
  },
  {
    id: "skin_male_white_alt",
    name: "Tan",
    asset: "/assets/store/avatars/avatar_male_white_alt.webp",
    free: true,
  },
  {
    id: "skin_male_dark",
    name: "Brown",
    asset: "/assets/store/avatars/avatar_male_dark.webp",
    free: true,
  },
  {
    id: "skin_male_dark_alt",
    name: "Dark",
    asset: "/assets/store/avatars/avatar_male_dark_alt.webp",
    free: true,
  },
];

export const SKIN_IDS = SKIN_PARTS.map((part) => part.id) as readonly AvatarSkinId[];

const SKIN_BY_ID: Record<string, SkinPart> = Object.fromEntries(
  SKIN_PARTS.map((s) => [s.id, s]),
);

export const DEFAULT_SKIN_ID = "skin_male_white";

export function getSkinPart(id: string | null | undefined): SkinPart {
  if (id && SKIN_BY_ID[id]) return SKIN_BY_ID[id];
  return SKIN_BY_ID[DEFAULT_SKIN_ID];
}

/* ─────────────── Hair ─────────────── */
export const HAIR_PARTS: AvatarPart[] = [
  {
    id: "hair_boy_basic",
    slot: "hair",
    name: "Boy Basic",
    asset: "/assets/store/hair_boy_basic.webp",
    free: true,
    position: { top: -8, left: 18, width: 56 },
  },
  {
    id: "hair_girl_basic",
    slot: "hair",
    name: "Girl Basic",
    asset: "/assets/store/hair_girl_basic.webp",
    priceCoins: 5000,
    productSlug: "avatar_hair_girl_basic",
    position: { top: -5, left: 20, width: 57 },
    storePosition: { top: 0, left: 25, width: 50 },
  },
  {
    id: "hair_hamsik",
    slot: "hair",
    name: "Hamsik",
    asset: "/assets/store/hair_hamsik.webp",
    priceCoins: 10000,
    productSlug: "avatar_hair_hamsik",
    position: { top: -10, left: 23, width: 43 },
  },
  {
    id: "hair_ramos",
    slot: "hair",
    name: "Ramos",
    asset: "/assets/store/hair_ramos.webp",
    priceCoins: 20000,
    productSlug: "avatar_hair_ramos",
    position: { top: -3, left: 24, width: 42 },
  },
  {
    id: "hair_ronaldo_brazil",
    slot: "hair",
    name: "Ronaldo Nazario",
    asset: "/assets/store/hair_ronaldo_brazil.webp",
    priceCoins: 30000,
    productSlug: "avatar_hair_ronaldo_brazil",
    position: { top: -1, left: 36, width: 32 },
  },
  {
    id: "hair_ronaldo_goat",
    slot: "hair",
    name: "CR7",
    asset: "/assets/store/hair_ronaldo_goat.webp",
    priceCoins: 30000,
    productSlug: "avatar_hair_ronaldo_goat",
    // Curly afro (231×206 native — wide). Shifted up to sit on crown.
    position: { top: -8, left: 19, width: 48 },
  },
  {
    id: "hair_wave",
    slot: "hair",
    name: "Wave",
    asset: "/assets/store/hair_wave.webp",
    priceCoins: 20000,
    productSlug: "avatar_hair_wave",
    position: { top: -3, left: 17, width: 41 },
  },
  {
    id: "hair_curly_crop",
    slot: "hair",
    name: "Curly Crop",
    asset: "/assets/store/hair_curly_crop.webp",
    priceCoins: 20000,
    productSlug: "avatar_hair_curly_crop",
    position: { top: -2, left: 25, width: 41 },
  },
  {
    id: "hair_cornrows",
    slot: "hair",
    name: "Cornrows",
    asset: "/assets/store/hair_cornrows.webp",
    priceCoins: 20000,
    productSlug: "avatar_hair_cornrows",
    position: { top: -1, left: 25, width: 39 },
  },
  {
    id: "hair_buzz",
    slot: "hair",
    name: "Buzz Cut",
    asset: "/assets/store/hair_buzz.webp",
    priceCoins: 20000,
    productSlug: "avatar_hair_buzz",
    position: { top: 0, left: 26, width: 37 },
  },
  {
    id: "hair_side_part",
    slot: "hair",
    name: "Side Part",
    asset: "/assets/store/hair_side_part.webp",
    priceCoins: 20000,
    productSlug: "avatar_hair_side_part",
    position: { top: -4, left: 24, width: 41 },
  },
  {
    id: "hair_leopard",
    slot: "hair",
    name: "Leopard",
    asset: "/assets/store/hair_leopard.webp",
    priceCoins: 20000,
    productSlug: "avatar_hair_leopard",
    position: { top: -6, left: 25, width: 39 },
  },
];

export const HAIR_IDS = HAIR_PARTS.map((part) => part.id) as readonly AvatarHairId[];

/* ─────────────── Glasses ─────────────── */
// Eyes at canvas y ≈ 163 / 543 = 30%. Glasses centered vertically on eyes:
//   top% = (eye_center%) − (glasses_height/2 in canvas %)
// Each glasses PNG has its own native height — top% set so the lens sits over the eyes.
export const GLASSES_PARTS: AvatarPart[] = [
  {
    id: "glasses_wayfarer",
    slot: "glasses",
    name: "Wayfarer",
    asset: "/assets/store/accessory_glasses_wayfarer.webp",
    priceCoins: 10000,
    productSlug: "avatar_glasses_wayfarer",
    // 241 × 92 → width 48.5% of canvas, height ~17%; centered on eye y=30%
    position: { top: 13, left: 28, width: 44 },
  },
  {
    id: "glasses_round",
    slot: "glasses",
    name: "Round Shades",
    asset: "/assets/store/accessory_glasses_round.webp",
    priceCoins: 15000,
    productSlug: "avatar_glasses_round",
    // 203 × 77 → width 41%, height ~14%
    position: { top: 14, left: 32, width: 40 },
  },
  {
    id: "glasses_aviator",
    slot: "glasses",
    name: "Aviator",
    asset: "/assets/store/accessory_glasses_aviator.webp",
    priceCoins: 20000,
    productSlug: "avatar_glasses_aviator",
    // 205 × 64 → width 41%, height ~12%
    position: { top: 14, left: 30, width: 40 },
  },
];

export const GLASSES_IDS = GLASSES_PARTS.map((part) => part.id) as readonly AvatarGlassesId[];

/* ─────────────── Facial Hair ─────────────── */
// Mouth at canvas y ≈ 183 / 543 = 33.7% (top), 38.3% (bottom).
// Stache covers upper lip (slightly above mouth top). Beard covers chin/jaw.
export const FACIAL_HAIR_PARTS: AvatarPart[] = [
  {
    id: "stache",
    slot: "facialHair",
    name: "Mustache",
    asset: "/assets/store/accessory_stache.webp",
    priceCoins: 10000,
    productSlug: "avatar_facial_stache",
    // 80 × 52 → width 16%, height ~9.6%; sits just above mouth (top of stache ≈ 28%)
    position: { top: 22, left: 52, width: 16 },
  },
  {
    id: "beard",
    slot: "facialHair",
    name: "Beard",
    asset: "/assets/store/accessory_beard.webp",
    priceCoins: 15000,
    productSlug: "avatar_facial_beard",
    // 190 × 120 → width 38%, height ~22%; covers chin and lower jaw
    position: { top: 24, left: 35, width: 38 },
  },
  {
    id: "handlebar",
    slot: "facialHair",
    name: "Handlebar",
    asset: "/assets/store/accessory_handlebar.webp",
    priceCoins: 15000,
    productSlug: "avatar_facial_handlebar",
    position: { top: 22, left: 53, width: 14 },
  },
  {
    id: "stache_goatee",
    slot: "facialHair",
    name: "Stache & Goatee",
    asset: "/assets/store/accessory_stache_goatee.webp",
    priceCoins: 15000,
    productSlug: "avatar_facial_stache_goatee",
    position: { top: 22, left: 53, width: 14 },
  },
];

export const FACIAL_HAIR_IDS = FACIAL_HAIR_PARTS.map((part) => part.id) as readonly AvatarFacialHairId[];

/* ─────────────── Jerseys ─────────────── */
// Figma anchor: jersey at y=116.07 of 232-tall card slot (50% raw), content height 214.54.
// → jersey top = 116.07 / 214.54 = 54.1% of CHARACTER height.
// Our bald PNG character occupies 444 of 543 canvas. 54.1% of 444 = 240 px = 44.2% of canvas.
const JERSEY_ANCHOR = { top: 44, left: 13, width: 70 };

export const JERSEY_COLOR_PARTS: AvatarPart[] = [
  {
    id: "jersey_green",
    slot: "jersey",
    name: "Green",
    asset: "/assets/store/jersey_green.webp",
    free: true,
    position: JERSEY_ANCHOR,
  },
  {
    id: "jersey_blue",
    slot: "jersey",
    name: "Blue",
    asset: "/assets/store/jersey_blue.webp",
    free: true,
    position: JERSEY_ANCHOR,
  },
  {
    id: "jersey_yellow",
    slot: "jersey",
    name: "Yellow",
    asset: "/assets/store/jersey_yellow.webp",
    free: true,
    position: JERSEY_ANCHOR,
  },
  {
    id: "jersey_red",
    slot: "jersey",
    name: "Red",
    asset: "/assets/store/jersey_red.webp",
    free: true,
    position: JERSEY_ANCHOR,
  },
  {
    id: "jersey_violet",
    slot: "jersey",
    name: "Violet",
    asset: "/assets/store/jersey_violet.webp",
    free: true,
    position: JERSEY_ANCHOR,
  },
  {
    id: "jersey_pink",
    slot: "jersey",
    name: "Pink",
    asset: "/assets/store/jersey_pink.webp",
    free: true,
    position: JERSEY_ANCHOR,
  },
];

export const JERSEY_DESIGN_PARTS: AvatarPart[] = [
  {
    id: "jersey_real",
    slot: "jersey",
    name: "Real Madrid",
    asset: "/assets/store/jersey_real.webp",
    priceCoins: 30000,
    productSlug: "avatar_jersey_real",
    position: { top: 43, left: 13, width: 70 },
  },
  {
    id: "jersey_barcelona",
    slot: "jersey",
    name: "Barcelona",
    asset: "/assets/store/jersey_barcelona.webp",
    priceCoins: 30000,
    productSlug: "avatar_jersey_barcelona",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_milan",
    slot: "jersey",
    name: "Milan",
    asset: "/assets/store/jersey_milan.webp",
    priceCoins: 30000,
    productSlug: "avatar_jersey_milan",
    position: { top: 42, left: 13, width: 70 },
  },
  {
    id: "jersey_liverpool",
    slot: "jersey",
    name: "Liverpool",
    asset: "/assets/store/jersey_liverpool.webp",
    priceCoins: 30000,
    productSlug: "avatar_jersey_liverpool",
    position: { top: 42, left: 13, width: 70 },
  },
  {
    id: "jersey_bayern",
    slot: "jersey",
    name: "Bayern",
    asset: "/assets/store/jersey_bayern.webp",
    priceCoins: 30000,
    productSlug: "avatar_jersey_bayern",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_psg_retro",
    slot: "jersey",
    name: "PSG",
    asset: "/assets/store/jersey_psg_retro.webp",
    priceCoins: 50000,
    productSlug: "avatar_jersey_psg_retro",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_argentina_retro",
    slot: "jersey",
    name: "Argentina Retro",
    asset: "/assets/store/jersey_argentina_retro.webp",
    priceCoins: 30000,
    productSlug: "avatar_jersey_argentina_retro",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_brazil_retro",
    slot: "jersey",
    name: "Brazil Retro",
    asset: "/assets/store/jersey_brazil_retro.webp",
    priceCoins: 30000,
    productSlug: "avatar_jersey_brazil_retro",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_france_retro",
    slot: "jersey",
    name: "France Retro",
    asset: "/assets/store/jersey_france_retro.webp",
    priceCoins: 30000,
    productSlug: "avatar_jersey_france_retro",
    position: { top: 43, left: 13, width: 70 },
  },
  {
    id: "jersey_germany_retro",
    slot: "jersey",
    name: "Germany Retro",
    asset: "/assets/store/jersey_germany_retro.webp",
    priceCoins: 30000,
    productSlug: "avatar_jersey_germany_retro",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_netherlands_retro",
    slot: "jersey",
    name: "Netherlands Retro",
    asset: "/assets/store/jersey_netherlands_retro.webp",
    priceCoins: 30000,
    productSlug: "avatar_jersey_netherlands_retro",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_georgia_retro",
    slot: "jersey",
    name: "Georgia",
    asset: "/assets/store/jersey_georgia_retro.webp",
    priceCoins: 50000,
    productSlug: "avatar_jersey_georgia_retro",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_man_united",
    slot: "jersey",
    name: "Man United",
    asset: "/assets/store/jersey_man_united.webp",
    priceCoins: 50000,
    productSlug: "avatar_jersey_man_united",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_arsenal",
    slot: "jersey",
    name: "Arsenal",
    asset: "/assets/store/jersey_arsenal.webp",
    priceCoins: 50000,
    productSlug: "avatar_jersey_arsenal",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_man_city",
    slot: "jersey",
    name: "Man City",
    asset: "/assets/store/jersey_man_city.webp",
    priceCoins: 50000,
    productSlug: "avatar_jersey_man_city",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_newcastle",
    slot: "jersey",
    name: "Newcastle",
    asset: "/assets/store/jersey_newcastle.webp",
    priceCoins: 50000,
    productSlug: "avatar_jersey_newcastle",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_dinamo_tbilisi",
    slot: "jersey",
    name: "Dinamo Tbilisi",
    asset: "/assets/store/jersey_dinamo_tbilisi.webp",
    priceCoins: 50000,
    productSlug: "avatar_jersey_dinamo_tbilisi",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_dortmund",
    slot: "jersey",
    name: "Dortmund",
    asset: "/assets/store/jersey_dortmund.webp",
    priceCoins: 50000,
    productSlug: "avatar_jersey_dortmund",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_italy_home",
    slot: "jersey",
    name: "Italy Home",
    asset: "/assets/store/jersey_italy_home.webp",
    priceCoins: 50000,
    productSlug: "avatar_jersey_italy_home",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_italy_away",
    slot: "jersey",
    name: "Italy Away",
    asset: "/assets/store/jersey_italy_away.webp",
    priceCoins: 50000,
    productSlug: "avatar_jersey_italy_away",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_italy_third",
    slot: "jersey",
    name: "Italy Third",
    asset: "/assets/store/jersey_italy_third.webp",
    priceCoins: 50000,
    productSlug: "avatar_jersey_italy_third",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_england_home",
    slot: "jersey",
    name: "England Home",
    asset: "/assets/store/jersey_england_home.webp",
    priceCoins: 50000,
    productSlug: "avatar_jersey_england_home",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_england_away",
    slot: "jersey",
    name: "England Away",
    asset: "/assets/store/jersey_england_away.webp",
    priceCoins: 50000,
    productSlug: "avatar_jersey_england_away",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_atletico_madrid",
    slot: "jersey",
    name: "Atletico Madrid",
    asset: "/assets/store/jersey_atletico_madrid.webp",
    priceCoins: 50000,
    productSlug: "avatar_jersey_atletico_madrid",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_napoli",
    slot: "jersey",
    name: "Napoli",
    asset: "/assets/store/jersey_napoli.webp",
    priceCoins: 50000,
    productSlug: "avatar_jersey_napoli",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_inter",
    slot: "jersey",
    name: "Inter",
    asset: "/assets/store/jersey_inter.webp",
    priceCoins: 50000,
    productSlug: "avatar_jersey_inter",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_roma",
    slot: "jersey",
    name: "Roma",
    asset: "/assets/store/jersey_roma.webp",
    priceCoins: 50000,
    productSlug: "avatar_jersey_roma",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_juve",
    slot: "jersey",
    name: "Juventus",
    asset: "/assets/store/jersey_juve.webp",
    priceCoins: 50000,
    productSlug: "avatar_jersey_juve",
    position: { top: 44, left: 13, width: 70 },
  },
  {
    id: "jersey_ajax",
    slot: "jersey",
    name: "Ajax",
    asset: "/assets/store/jersey_ajax.webp",
    priceCoins: 50000,
    productSlug: "avatar_jersey_ajax",
    position: { top: 44, left: 13, width: 70 },
  },
];

export const JERSEY_PARTS: AvatarPart[] = [...JERSEY_COLOR_PARTS, ...JERSEY_DESIGN_PARTS];
export const JERSEY_IDS = JERSEY_PARTS.map((part) => part.id) as readonly AvatarJerseyId[];

/** Default ids used when nothing's been configured yet. */
export const DEFAULT_JERSEY_ID = "jersey_green";
export const DEFAULT_HAIR_ID = "hair_boy_basic";

export const ALL_AVATAR_PARTS: AvatarPart[] = [
  ...JERSEY_PARTS,
  ...HAIR_PARTS,
  ...GLASSES_PARTS,
  ...FACIAL_HAIR_PARTS,
];

const PART_BY_ID: Record<string, AvatarPart> = Object.fromEntries(
  ALL_AVATAR_PARTS.map((part) => [part.id, part]),
);

export function getAvatarPart(id: string | null | undefined): AvatarPart | null {
  if (!id) return null;
  return PART_BY_ID[id] ?? null;
}

export function getPartsBySlot(slot: AvatarSlot): AvatarPart[] {
  return ALL_AVATAR_PARTS.filter((part) => part.slot === slot);
}

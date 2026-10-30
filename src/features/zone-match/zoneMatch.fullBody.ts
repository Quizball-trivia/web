/**
 * Zone match full-body avatar: the colours of the drawn lower body (legs in the avatar's skin tone, shorts and socks
 * to go with its jersey, boots) and the pose library that animates it. Pure — no React, no DOM.
 *
 * Pose angles are in degrees, in the art's frame with the figure facing +x (the cut-out is mirrored to face −x):
 * hip > 0 swings the leg forward, knee > 0 bends the shin back, ankle > 0 lifts the toe. `lean` tips the upper body
 * forward about the hips; `bodyX` / `bodyY` move the hips (art units, +y down: crouching is positive).
 */

import type { AvatarCustomization } from '@/types/game';

/** The art frame: AvatarPreview's 495.25 × 543.03 canvas on top, legs below (art units). */
export const FULL_W = 496;
export const FULL_H = 840;
/** Where the soles touch the ground, as a share of the frame's height. */
export const FULL_GROUND = 830 / FULL_H;

export interface FullBodyPose {
  hipL: number;
  kneeL: number;
  ankleL: number;
  hipR: number;
  kneeR: number;
  ankleR: number;
  lean: number;
  bodyX: number;
  bodyY: number;
}

export interface FullBodyColors {
  skin: string;
  skinShade: string;
  shorts: string;
  shortsShade: string;
  socks: string;
  sockBand: string;
  boots: string;
  bootTrim: string;
}

/** Sampled from the four skin assets (public/assets/store/avatars). */
const SKIN: Record<string, [string, string]> = {
  skin_male_white: ['#FCB37C', '#E89A63'],
  skin_male_white_alt: ['#D88851', '#C0733F'],
  skin_male_dark: ['#BC6022', '#A1501B'],
  skin_male_dark_alt: ['#623313', '#4E280E'],
};

const WHITE = '#F4F6F8';
const NAVY = '#14213D';
const BLACK = '#1B1D22';

/** Shorts, socks and the sock band per jersey (the kits' real colours); anything unknown gets white shorts and socks. */
const KITS: Record<string, [string, string, string]> = {
  jersey_green: [WHITE, '#2FB84A', WHITE],
  jersey_blue: [WHITE, '#1F6FE5', WHITE],
  jersey_yellow: ['#1B3F8B', '#FFD31A', '#1B3F8B'],
  jersey_red: [WHITE, '#E23B3B', WHITE],
  jersey_violet: [WHITE, '#7B45E8', WHITE],
  jersey_pink: [WHITE, '#FF5FA8', WHITE],
  jersey_celtic: [WHITE, WHITE, '#11883F'],
  jersey_real: [WHITE, WHITE, '#C9A227'],
  jersey_barcelona: ['#004D98', '#004D98', '#A50044'],
  jersey_milan: [WHITE, BLACK, '#D6001C'],
  jersey_liverpool: ['#C8102E', '#C8102E', WHITE],
  jersey_bayern: ['#DC052D', '#DC052D', WHITE],
  jersey_psg_retro: ['#0A3A6B', '#0A3A6B', '#DA291C'],
  jersey_argentina_retro: [BLACK, WHITE, '#8EC5EA'],
  jersey_brazil_retro: ['#1D4FA3', WHITE, '#0B9C45'],
  jersey_france_retro: [WHITE, '#E1001E', '#1D2C5E'],
  jersey_germany_retro: [BLACK, WHITE, BLACK],
  jersey_netherlands_retro: [WHITE, '#F36C21', WHITE],
  jersey_georgia_retro: [WHITE, WHITE, '#D7262E'],
  jersey_man_united: [WHITE, BLACK, '#DA291C'],
  jersey_arsenal: [WHITE, WHITE, '#EF0107'],
  jersey_man_city: [WHITE, '#6CABDD', '#1C2C5B'],
  jersey_newcastle: [BLACK, BLACK, WHITE],
  jersey_dinamo_tbilisi: [WHITE, '#1F5FBF', WHITE],
  jersey_dortmund: [BLACK, '#FDE100', BLACK],
  jersey_italy_home: [WHITE, '#1F66B5', WHITE],
  jersey_italy_away: ['#1F66B5', WHITE, '#1F66B5'],
  jersey_italy_third: ['#1D3B5A', '#1D3B5A', '#C9A227'],
  jersey_england_home: [NAVY, WHITE, '#CF142B'],
  jersey_england_away: [NAVY, '#CF142B', WHITE],
  jersey_atletico_madrid: ['#272E61', '#CB3524', WHITE],
  jersey_napoli: [WHITE, '#12A0D7', WHITE],
  jersey_inter: [BLACK, BLACK, '#0A3F8C'],
  jersey_roma: [WHITE, BLACK, '#F0BC42'],
  jersey_juve: [WHITE, WHITE, BLACK],
  jersey_ajax: [WHITE, WHITE, '#D2122E'],
  jersey_chelsea: ['#034694', WHITE, '#034694'],
  jersey_tottenham: ['#132257', WHITE, '#132257'],
  jersey_benfica: [WHITE, '#E83030', WHITE],
  jersey_porto: ['#1B4D9C', '#1B4D9C', WHITE],
  jersey_sporting: [BLACK, '#008057', WHITE],
  jersey_marseille: [WHITE, WHITE, '#2FAEE0'],
  jersey_galatasaray: ['#A90432', '#A90432', '#FDB912'],
  jersey_fenerbahce: ['#00205B', '#00205B', '#FFED00'],
  jersey_boca_juniors: ['#103F79', '#103F79', '#FCB514'],
  jersey_river_plate: [BLACK, WHITE, '#E1001E'],
  jersey_portugal: ['#046A38', '#C8102E', '#FFC72C'],
  jersey_spain: [NAVY, NAVY, '#FFC400'],
  jersey_croatia: [WHITE, '#1F3B8C', '#D40000'],
  jersey_japan: [WHITE, '#0B2C6B', WHITE],
  jersey_morocco: ['#006233', '#C1272D', '#006233'],
  jersey_nigeria: [WHITE, '#008751', WHITE],
  jersey_mexico: [WHITE, '#006847', '#CE1126'],
  jersey_uruguay: [BLACK, BLACK, '#5CBFEB'],
  jersey_retro_keeper: [BLACK, '#F2A900', BLACK],
  jersey_neon_training: [BLACK, BLACK, '#C9F31D'],
  jersey_street_football: ['#24262B', '#24262B', '#FF5A1F'],
  jersey_gold_champion: [BLACK, BLACK, '#D4AF37'],
};

const BOOTS: [string, string][] = [
  ['#1B1D22', '#F4F6F8'],
  ['#F4F6F8', '#1F6FE5'],
  ['#D9F21C', '#1B1D22'],
  ['#FF5A1F', '#F4F6F8'],
  ['#1F6FE5', '#FFE500'],
];

/** A colour darkened by `amount` (0–1), for the flat shade panels. */
export function shade(hex: string, amount = 0.14): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(c * (1 - amount)).toString(16).padStart(2, '0');
  return `#${f((n >> 16) & 255)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

export function fullBodyColors(customization: AvatarCustomization | null | undefined, seed = 0): FullBodyColors {
  const [skin, skinShade] = SKIN[customization?.skin ?? ''] ?? SKIN.skin_male_white;
  const [shorts, socks, sockBand] = KITS[customization?.jersey ?? ''] ?? [WHITE, WHITE, '#C9D1DA'];
  const [boots, bootTrim] = BOOTS[Math.abs(seed) % BOOTS.length];
  return { skin, skinShade, shorts, shortsShade: shade(shorts), socks, sockBand, boots, bootTrim };
}

/* ── poses ───────────────────────────────────────────────────────────── */

/** Feet a little apart, each under its own hip: standing poses splay the legs outward so they never cross. */
export const STAND: FullBodyPose = { hipL: -4, kneeL: 0, ankleL: 0, hipR: 4, kneeR: 0, ankleR: 0, lean: 0, bodyX: 0, bodyY: 0 };

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
};
/** 0 → 1 → 0 between t0 and t1, peaking at the middle. */
const arc = (t: number, t0: number, t1: number) => Math.sin(Math.PI * clamp01((t - t0) / (t1 - t0)));

export function mixPose(a: FullBodyPose, b: FullBodyPose, k: number, out: FullBodyPose = { ...STAND }): FullBodyPose {
  for (const key of Object.keys(STAND) as (keyof FullBodyPose)[]) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}

/** Standing, shifting weight from foot to foot. */
export function idlePose(now: number, phase = 0): FullBodyPose {
  const s = Math.sin(now * 1.3 + phase);
  // Both legs sway the same way (a weight shift) from an open stance — opposite swings cross the feet.
  return { hipL: -4 + 2 * s, kneeL: 4 + 3 * Math.max(0, s), ankleL: 0, hipR: 4 + 2 * s, kneeR: 4 + 3 * Math.max(0, -s), ankleR: 0, lean: 1.5 * s, bodyX: 3 * s, bodyY: 2 * Math.abs(s) };
}

/** A run / dribble cycle: alternating strides, knees lifting on the swing, a bob on each footfall. `phase` in cycles. */
export function runPose(phase: number, speed = 1): FullBodyPose {
  const p = phase * Math.PI * 2;
  const stride = 22 + 16 * Math.min(1, speed);
  const leg = (q: number) => ({ hip: stride * Math.sin(q), knee: 12 + 62 * Math.max(0, -Math.cos(q)) * Math.min(1, 0.5 + speed * 0.5), ankle: -14 * Math.sin(q) });
  const r = leg(p);
  const l = leg(p + Math.PI);
  return { hipR: r.hip, kneeR: r.knee, ankleR: r.ankle, hipL: l.hip, kneeL: l.knee, ankleL: l.ankle, lean: 8 + 6 * Math.min(1, speed), bodyX: 0, bodyY: 6 - 10 * Math.abs(Math.sin(p)) };
}

/** The defender's jockey: low, wide, on the toes. */
export function jockeyPose(now: number, phase = 0): FullBodyPose {
  const s = Math.sin(now * 5 + phase);
  return { hipL: -22 + 5 * s, kneeL: 48, ankleL: -6, hipR: 24 + 5 * s, kneeR: 46, ankleR: -6, lean: 10, bodyX: 6 * s, bodyY: 34 + 4 * Math.abs(s) };
}

/** The keeper set: crouched, weight forward, hands ready. */
export function keeperSetPose(now: number, phase = 0): FullBodyPose {
  const s = Math.sin(now * 1.8 + phase);
  return { hipL: -26, kneeL: 62, ankleL: -8, hipR: 30, kneeR: 60, ankleR: -8, lean: 14 + 2 * s, bodyX: 4 * s, bodyY: 46 };
}

/**
 * A shot (clip time; the boot meets the ball at 0.8): plant the left foot, swing the right leg back, through the ball
 * and up into the follow-through, then settle.
 */
export function strikePose(t: number): FullBodyPose {
  const wind = smooth(t / 0.62);
  const swing = smooth((t - 0.6) / 0.24);
  const follow = smooth((t - 0.84) / 0.3);
  const settle = smooth((t - 1.2) / 0.3);
  const hipR = (-48 * wind + 78 * swing + 26 * follow) * (1 - settle);
  const kneeR = (95 * wind - 95 * swing + 12 * follow) * (1 - settle);
  return {
    hipR,
    kneeR: Math.max(0, kneeR),
    ankleR: (-20 * swing) * (1 - settle),
    hipL: (10 + 8 * wind - 6 * follow) * (1 - settle),
    kneeL: (18 * wind + 10 * swing) * (1 - settle),
    ankleL: 0,
    lean: (-10 * wind * (1 - swing) - 14 * follow) * (1 - settle) + 6 * swing * (1 - follow),
    bodyX: (-8 * wind + 14 * swing) * (1 - settle),
    bodyY: (10 * wind) * (1 - settle),
  };
}

/** A celebration jump: crouch, spring up with the knees tucked, land; repeats every 0.85 s. */
export function celebratePose(t: number): FullBodyPose {
  const c = (t % 0.85) / 0.85;
  const crouch = arc(c, 0, 0.25) * (c < 0.25 ? 1 : 0) + arc(c, 0.8, 1.05);
  const air = arc(c, 0.2, 0.85);
  return { hipL: 30 + 50 * air, kneeL: 30 * crouch + 100 * air, ankleL: -20 * air, hipR: 26 + 54 * air, kneeR: 30 * crouch + 105 * air, ankleR: -20 * air, lean: -6 * air, bodyX: 0, bodyY: 30 * crouch };
}

/** A knee slide: kneeling, sliding forward, arms (the art's) up. */
export function kneeSlidePose(): FullBodyPose {
  return { hipL: 10, kneeL: 100, ankleL: 30, hipR: 12, kneeR: 104, ankleR: 30, lean: -12, bodyX: 0, bodyY: 120 };
}

/** The slide tackle (k 0–1): the leading leg shoots out straight, the other tucks under. */
export function slidePose(k: number): FullBodyPose {
  const e = smooth(k);
  return { hipR: 95 * e, kneeR: 8, ankleR: -25 * e, hipL: 20 * e, kneeL: 115 * e, ankleL: 10 * e, lean: -20 * e, bodyX: 0, bodyY: 20 * e };
}

/** Knocked down: legs thrown up and apart as the body tips over, then a sprawl. */
export function sprawlPose(k: number, t: number): FullBodyPose {
  const e = smooth(k);
  const kick = Math.sin(t * 12) * (1 - e) * 10;
  return { hipL: 40 * e + kick, kneeL: 30 + 30 * e, ankleL: 10, hipR: -10 * e - kick, kneeR: 50 * e, ankleR: 10, lean: 0, bodyX: 0, bodyY: 0 };
}

/** The keeper's dive (k 0–1): pushing off, then both legs stretched out behind the body. */
export function divePose(k: number): FullBodyPose {
  const push = arc(k, 0, 0.45);
  const stretch = smooth((k - 0.25) / 0.6);
  return { hipL: 20 * push - 18 * stretch, kneeL: 50 * push + 8 * stretch, ankleL: -20 * stretch, hipR: -10 * push - 28 * stretch, kneeR: 30 * push + 14 * stretch, ankleR: -24 * stretch, lean: 0, bodyX: 0, bodyY: 20 * push };
}

/** A crouch (k 0–1), for sabotage on the card. */
export function crouchPose(k: number): FullBodyPose {
  const e = smooth(k);
  return { hipL: -16 * e, kneeL: 82 * e, ankleL: -10 * e, hipR: 30 * e, kneeR: 70 * e, ankleR: -10 * e, lean: 18 * e, bodyX: 0, bodyY: 70 * e };
}

/** A step-over (t 0–1): the right leg circles over the ball, the body sways the other way. */
export function stepOverPose(t: number): FullBodyPose {
  const circle = arc(t, 0, 0.6);
  const back = arc(t, 0.45, 1);
  return { hipR: 40 * circle - 10 * back, kneeR: 70 * circle, ankleR: -10 * circle, hipL: -8 * circle + 28 * back, kneeL: 14 + 50 * back, ankleL: 0, lean: 6, bodyX: 16 * circle - 16 * back, bodyY: 12 };
}

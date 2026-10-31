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

/** A hand's shape: which fingers are out (drawn by AvatarFullBody). */
export type HandShape = 'open' | 'flat' | 'fist' | 'point' | 'thumb' | 'shaka' | 'heart' | 'ok';

/**
 * One arm, as screen directions in degrees (0 = straight down, 90 = towards +x, 180 = straight up, −90 = towards −x):
 * the upper arm, the forearm and the hand (the fingers' direction), and the hand's shape.
 */
export interface ArmSegments {
  upper: number;
  fore: number;
  hand: number;
  shape: HandShape;
}
/** Both arms: L is on the viewer's left (−x), R on the right. */
export interface ArmPose {
  L: ArmSegments;
  R: ArmSegments;
}

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
  /** Moving arms (celebrations; drawn instead of the art's raised arms). Not mixed by mixPose. */
  arms?: ArmPose;
}

export interface FullBodyColors {
  skin: string;
  skinShade: string;
  shorts: string;
  shortsShade: string;
  socks: string;
  sockShade: string;
  sockBand: string;
  boots: string;
  bootShade: string;
  bootTrim: string;
  sole: string;
  laces: string;
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

/** Boot, slashes, sole. */
const BOOTS: [string, string, string][] = [
  ['#1B1D22', '#F2B705', '#F2B705'],
  ['#F4F6F8', '#1F6FE5', '#C9D1DA'],
  ['#D9F21C', '#1B1D22', '#1B1D22'],
  ['#FF5A1F', '#F4F6F8', '#F4F6F8'],
  ['#1F6FE5', '#FFE500', '#F4F6F8'],
];

const isDark = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 110;
};

/** A colour darkened by `amount` (0–1), for the flat shade panels. */
export function shade(hex: string, amount = 0.14): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(c * (1 - amount)).toString(16).padStart(2, '0');
  return `#${f((n >> 16) & 255)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

/** `a` blended towards `b` by k (0–1). */
export function mixHex(a: string, b: string, k: number): string {
  const n = (hex: string) => Number.parseInt(hex.slice(1), 16);
  const [x, y] = [n(a), n(b)];
  const ch = (shift: number) => Math.round(((x >> shift) & 255) + ((((y >> shift) & 255) - ((x >> shift) & 255)) * k)).toString(16).padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

export function fullBodyColors(customization: AvatarCustomization | null | undefined, seed = 0): FullBodyColors {
  const [skin, skinShade] = SKIN[customization?.skin ?? ''] ?? SKIN.skin_male_white;
  const [shorts, socks, sockBand] = KITS[customization?.jersey ?? ''] ?? [WHITE, WHITE, '#C9D1DA'];
  const [boots, bootTrim, sole] = BOOTS[Math.abs(seed) % BOOTS.length];
  return {
    skin,
    skinShade,
    shorts,
    shortsShade: shade(shorts, 0.08),
    socks,
    sockShade: shade(socks, 0.16),
    sockBand,
    boots,
    bootShade: isDark(boots) ? '#2C2F36' : shade(boots, 0.18),
    bootTrim,
    sole,
    laces: isDark(boots) ? '#D9DDE3' : shade(boots, 0.35),
  };
}

/* ── arms ──────────────────────────────────────────────────────────── */

/**
 * The arm skeleton in the upper body's art units (496 × 543; measured on the skin art): the shoulder joints (inside the
 * sleeves), the segment lengths, and how thick the arm is.
 */
export const ARM = { shoulder: { L: [150, 318] as [number, number], R: [345, 318] as [number, number] }, upper: 140, fore: 160, hand: 66, upperW: 54, foreW: 48 };

const dir = (deg: number): [number, number] => [Math.sin((deg * Math.PI) / 180), Math.cos((deg * Math.PI) / 180)];
const angleOf = (dx: number, dy: number) => (Math.atan2(dx, dy) * 180) / Math.PI;

/** The arm's joints: elbow, wrist and fingertips (upper-body art units). */
export function armJoints(side: 'L' | 'R', a: ArmSegments): { elbow: [number, number]; wrist: [number, number]; tip: [number, number] } {
  const [sx, sy] = ARM.shoulder[side];
  const u = dir(a.upper);
  const f = dir(a.fore);
  const h = dir(a.hand);
  const elbow: [number, number] = [sx + ARM.upper * u[0], sy + ARM.upper * u[1]];
  const wrist: [number, number] = [elbow[0] + ARM.fore * f[0], elbow[1] + ARM.fore * f[1]];
  return { elbow, wrist, tip: [wrist[0] + ARM.hand * h[0], wrist[1] + ARM.hand * h[1]] };
}

/**
 * The arm that puts its wrist at (x, y): two-bone IK. `elbowOut` bends the elbow away from the body (+1) or towards it
 * (−1), seen from the arm's own side. Out of reach, the arm points straight at it.
 */
export function reachArm(side: 'L' | 'R', x: number, y: number, hand: number, shape: HandShape, elbowOut: 1 | -1 = 1): ArmSegments {
  const [sx, sy] = ARM.shoulder[side];
  const dx = x - sx;
  const dy = y - sy;
  const d = Math.min(Math.hypot(dx, dy), ARM.upper + ARM.fore - 0.5);
  const toward = angleOf(dx, dy);
  const atShoulder = (Math.acos(Math.min(1, Math.max(-1, (ARM.upper ** 2 + d ** 2 - ARM.fore ** 2) / (2 * ARM.upper * d)))) * 180) / Math.PI;
  // Outward from the body is −x for L, +x for R.
  const out = side === 'L' ? -1 : 1;
  const upper = toward + out * elbowOut * atShoulder * Math.sign(Math.cos((toward * Math.PI) / 180) || 1);
  const elbow: [number, number] = [sx + ARM.upper * dir(upper)[0], sy + ARM.upper * dir(upper)[1]];
  const fore = angleOf(x - elbow[0], y - elbow[1]);
  return { upper, fore, hand, shape };
}

/** The art's own arms: raised, elbows out and low, thumbs up (so the moving arms can start and end there). */
export const ARMS_REST: ArmPose = {
  L: { upper: -63, fore: 170, hand: 176, shape: 'thumb' },
  R: { upper: 46, fore: 174, hand: 178, shape: 'thumb' },
};

/** Angles blended the short way round. */
const mixAngle = (a: number, b: number, k: number) => a + ((((b - a + 540) % 360) - 180) * k);
export function mixArms(a: ArmPose, b: ArmPose, k: number): ArmPose {
  const seg = (x: ArmSegments, y: ArmSegments): ArmSegments => ({
    upper: mixAngle(x.upper, y.upper, k),
    fore: mixAngle(x.fore, y.fore, k),
    hand: mixAngle(x.hand, y.hand, k),
    shape: k < 0.5 ? x.shape : y.shape,
  });
  return { L: seg(a.L, b.L), R: seg(a.R, b.R) };
}

/* ── skeleton ────────────────────────────────────────────────────────── */

/** Joints in art units (AvatarFullBody draws on them): the back leg is L, the front leg R. */
export const HIP_Y = 515;
export const KNEE_Y = 643;
export const ANKLE_Y = 793;
export const HIP_X = { L: 195, R: 295 } as const;
type Side = keyof typeof HIP_X;
const THIGH = KNEE_Y - HIP_Y;
const SHIN = ANKLE_Y - KNEE_Y;
const GROUND = FULL_GROUND * FULL_H;
/** Where a boot can touch the ground, around its ankle (stud tips and the sole's ends; toe towards +x). */
const SOLE: [number, number][] = [[-30, 37], [74, 37], [-39, 32], [79, 32]];

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** 0 → 1 → 0 between t0 and t1, peaking at the middle. */
const arc = (t: number, t0: number, t1: number) => Math.sin(Math.PI * clamp01((t - t0) / (t1 - t0)));
/** As `arc`, easing in and out (no jolt where it starts and ends). */
const bell = (t: number, t0: number, t1: number) => arc(t, t0, t1) ** 2;

/** The ankle and the lowest point of `side`'s boot (art units, the pose's hips included). */
export function footOf(p: FullBodyPose, side: Side): { x: number; y: number; low: number } {
  const { ankle, soles } = legPoints(p, side);
  return { x: ankle[0], y: ankle[1], low: Math.max(...soles.map((q) => q[1])) };
}

/** `side`'s knee, ankle and the boot's possible contact points (art units). */
function legPoints(p: FullBodyPose, side: Side): { knee: [number, number]; ankle: [number, number]; soles: [number, number][] } {
  const hip = side === 'L' ? p.hipL : p.hipR;
  const knee = side === 'L' ? p.kneeL : p.kneeR;
  const ankle = side === 'L' ? p.ankleL : p.ankleR;
  const kx = HIP_X[side] + p.bodyX + THIGH * Math.sin(rad(hip));
  const ky = HIP_Y + p.bodyY + THIGH * Math.cos(rad(hip));
  const x = kx + SHIN * Math.sin(rad(hip - knee));
  const y = ky + SHIN * Math.cos(rad(hip - knee));
  // The boot turns with the shin, then the ankle (clockwise on screen = toe down).
  const turn = rad(knee - hip - ankle);
  const soles = SOLE.map(([dx, dy]): [number, number] => [x + dx * Math.cos(turn) - dy * Math.sin(turn), y + dx * Math.sin(turn) + dy * Math.cos(turn)]);
  return { knee: [kx, ky], ankle: [x, y], soles };
}

/** A point on `side`'s boot, given around its ankle in the boot's own frame (toe towards +x, y down), in art units. */
export function bootPoint(p: FullBodyPose, side: Side, dx: number, dy: number): [number, number] {
  const hip = side === 'L' ? p.hipL : p.hipR;
  const knee = side === 'L' ? p.kneeL : p.kneeR;
  const ankle = side === 'L' ? p.ankleL : p.ankleR;
  const [x, y] = legPoints(p, side).ankle;
  const turn = rad(knee - hip - ankle);
  return [x + dx * Math.cos(turn) - dy * Math.sin(turn), y + dx * Math.sin(turn) + dy * Math.cos(turn)];
}

/** Every point of the legs that can touch the ground (kneecaps, studs, sole ends), for placing a tilted figure. */
export function groundPoints(p: FullBodyPose): [number, number][] {
  const l = legPoints(p, 'L');
  const r = legPoints(p, 'R');
  return [l.knee, r.knee, ...l.soles, ...r.soles];
}

/** How far the ankle bends against the shin: toe pointed (−) to toe pulled up (+). */
const ANKLE_MIN = -45;
const ANKLE_MAX = 45;
const clampAnkle = (a: number) => Math.min(ANKLE_MAX, Math.max(ANKLE_MIN, a));
/** A swinging foot's point, relative to its shin. */
const POINTED = -22;

/** The ankle angle that lays the boot's sole flat on the ground (`toeDown` tips it onto the toes, degrees). */
const flatAnkle = (hip: number, knee: number, toeDown = 0) => knee - hip - toeDown;

/**
 * Hip and knee that put `side`'s ankle at (x, y) with the hips moved by (bodyX, bodyY): two-bone IK, the knee bending
 * forward. Out of reach, the leg points straight at the target.
 */
function reach(side: Side, x: number, y: number, bodyX: number, bodyY: number): { hip: number; knee: number } {
  const dx = x - (HIP_X[side] + bodyX);
  const dy = y - (HIP_Y + bodyY);
  // A soft reach limit: a leg near full stretch keeps a little bend (at full stretch the knee angle swings wildly
  // for a tiny change in distance — a visible pop).
  const d = -softMax(-Math.hypot(dx, dy), -(THIGH + SHIN - 2), 3);
  const toward = Math.atan2(dx, dy);
  const atHip = Math.acos(clamp((THIGH ** 2 + d ** 2 - SHIN ** 2) / (2 * THIGH * d), -1, 1));
  const atKnee = Math.acos(clamp((THIGH ** 2 + SHIN ** 2 - d ** 2) / (2 * THIGH * SHIN), -1, 1));
  return { hip: deg(toward + atHip), knee: deg(Math.PI - atKnee) };
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** `side`'s boot flat on the ground with its ankle at `x` (art units). */
function plant(side: Side, x: number, bodyX: number, bodyY: number) {
  const { hip, knee } = reach(side, x, ANKLE_Y, bodyX, bodyY);
  return { hip, knee, ankle: flatAnkle(hip, knee) };
}

/** `side`'s leg with its ankle at (x, y), the sole level (art units; the hips at bodyX / bodyY). */
export function footAt(side: Side, x: number, y: number, bodyX: number, bodyY: number) {
  const { hip, knee } = reach(side, x, y, bodyX, bodyY);
  return { hip, knee, ankle: flatAnkle(hip, knee) };
}

/** The ground line and the ankle height of a boot standing on it (art units). */
export const GROUND_Y = FULL_GROUND * FULL_H;

/** A pose with both boots flat on the ground at these ankle positions. */
function stance(footL: number, footR: number, bodyX: number, bodyY: number, lean: number): FullBodyPose {
  const l = plant('L', footL, bodyX, bodyY);
  const r = plant('R', footR, bodyX, bodyY);
  return { hipL: l.hip, kneeL: l.knee, ankleL: l.ankle, hipR: r.hip, kneeR: r.knee, ankleR: r.ankle, lean, bodyX, bodyY };
}

/** A smooth max (within ~`width` of the true one): limits that never snap. */
const softMax = (a: number, b: number, width = 6) => Math.max(a, b) + width * Math.log1p(Math.exp(-Math.abs(a - b) / width));

/**
 * A swinging leg skims the ground, never digs in: bends `side`'s knee (the foot goes back and up) just as far as it
 * takes for the boot to clear the ground with the hips at `bodyY`. Continuous in the pose, so it never snaps.
 */
function skim(p: FullBodyPose, side: Side, bodyY: number, limit = GROUND + 6): FullBodyPose {
  const key = side === 'L' ? 'kneeL' : 'kneeR';
  const ankleKey = side === 'L' ? 'ankleL' : 'ankleR';
  const q = { ...p, bodyY };
  // By default the studs may brush the grass (a few units), never bury the boot.
  const over = () => footOf(q, side).low - limit;
  if (over() <= 0) return q;
  // Bisect the extra bend (the ankle keeps its angle to the ground, so the toe still points the same way).
  let lo = 0;
  let hi = 90;
  const base = q[key];
  const baseAnkle = q[ankleKey];
  for (let i = 0; i < 14; i += 1) {
    const mid = (lo + hi) / 2;
    q[key] = base + mid;
    q[ankleKey] = baseAnkle + mid;
    if (over() > 0) lo = mid;
    else hi = mid;
  }
  q[key] = base + hi;
  q[ankleKey] = baseAnkle + hi;
  return q;
}

/* ── poses ───────────────────────────────────────────────────────────── */

/** Where the ankles stand at rest: each just outside its hip. */
export const FOOT = { L: HIP_X.L - 12, R: HIP_X.R + 12 } as const;

/** Standing, knees soft, both boots flat on the ground. */
export const STAND: FullBodyPose = stance(FOOT.L, FOOT.R, 0, 7, 0);

/** The pose's joint numbers (everything but the arms). */
export type PoseJoint = Exclude<keyof FullBodyPose, 'arms'>;
export const POSE_JOINTS: PoseJoint[] = ['hipL', 'kneeL', 'ankleL', 'hipR', 'kneeR', 'ankleR', 'lean', 'bodyX', 'bodyY'];

export function mixPose(a: FullBodyPose, b: FullBodyPose, k: number, out: FullBodyPose = { ...STAND }): FullBodyPose {
  for (const key of POSE_JOINTS) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}

/** Standing, shifting weight from foot to foot: the hips sway over planted boots. */
export function idlePose(now: number, phase = 0): FullBodyPose {
  const s = Math.sin(now * 1.3 + phase);
  return stance(FOOT.L, FOOT.R, 6 * s, STAND.bodyY + 3 * Math.abs(s), 1.5 * s);
}

/**
 * The run's shape: a short, quick stride (the director turns it over at the rate the player moves, so a short stride
 * means quick feet) and a low heel kick, the knee fold peaking a little after mid-swing.
 */
const STRIDE = { reach: [8, 7] as const, fold: [62, 22] as const, late: 0.6 };
/** The swing's knee fold over the swing (0–1). */
const swingShape = (s: number) => Math.sin(Math.PI * s) * (1 + STRIDE.late * s);
const SWING_PEAK = Math.max(...Array.from({ length: 101 }, (_, i) => swingShape(i / 100)));

/**
 * One leg's stride, `u` in cycles from the moment it is furthest back (toe-off): the swing forward with the heel
 * kicking up and the knee folding, the heel strike with the leg nearly straight, the stance with a little give, then
 * rolling onto the toes. The hip offset and the sole angles are tuned so the landing boot meets the ground at the same
 * height the other one leaves it: the body is handed from boot to boot without a drop.
 */
function strideLeg(u: number, speed: number) {
  const reachFwd = STRIDE.reach[0] + STRIDE.reach[1] * speed;
  const swingFold = STRIDE.fold[0] + STRIDE.fold[1] * speed;
  const w = ((u % 1) + 1) % 1;
  const hip = 3 - reachFwd * Math.cos(w * Math.PI * 2);
  let knee: number;
  let toeDown: number;
  let support: number;
  let swing: number | null = null;
  if (w < 0.5) {
    const s = w / 0.5;
    swing = s;
    // Folds as the heel kicks up and stays folded through the swing, straightening only as the boot reaches the
    // ground (an early straight leg would touch down and drag the boot forward).
    knee = 8 + (swingFold * swingShape(s)) / SWING_PEAK;
    toeDown = lerp(6, -8, smooth(s));
    support = 0;
    // The foot follows the shin as the heel comes up (toe pointed), then sets flat for the landing — a sole kept
    // level all through the swing would stand the boot at a right angle to a raised shin.
    const level = flatAnkle(hip, knee, toeDown);
    const ankle = s < 0.5 ? lerp(flatAnkle(hip, knee, 6), POINTED, smooth(s / 0.35)) : lerp(POINTED, level, smooth((s - 0.5) / 0.5));
    return { hip, knee, ankle: clampAnkle(ankle), support, swing };
  } else {
    const r = (w - 0.5) / 0.5;
    knee = 8 + 8 * Math.sin(Math.PI * r);
    toeDown = r < 0.2 ? lerp(-8, 0, smooth(r / 0.2)) : r < 0.7 ? 0 : lerp(0, 6, smooth((r - 0.7) / 0.3));
    support = Math.sin(Math.PI * r);
  }
  return { hip, knee, ankle: flatAnkle(hip, knee, toeDown), support, swing };
}

/** The run's stride with every joint driven by its cycle (the stance leg is replaced by a planted one in runPose). */
function strideFk(phase: number, k: number): { pose: FullBodyPose; r: ReturnType<typeof strideLeg>; l: ReturnType<typeof strideLeg> } {
  const r = strideLeg(phase, k);
  const l = strideLeg(phase + 0.5, k);
  const p: FullBodyPose = { hipR: r.hip, kneeR: r.knee, ankleR: r.ankle, hipL: l.hip, kneeL: l.knee, ankleL: l.ankle, lean: 5 + 8 * k, bodyX: 0, bodyY: 0 };
  // Hip height from the boot carrying the weight, blended across the hand-over (the stride is tuned so both boots
  // are at the same height there), and never so low that a boot leaving or reaching the ground digs in.
  const wL = l.support + 0.02;
  const wR = r.support + 0.02;
  const lowL = footOf(p, 'L').low;
  const lowR = footOf(p, 'R').low;
  const carried = GROUND - (lowL * wL + lowR * wR) / (wL + wR);
  p.bodyY = -softMax(-carried, -(GROUND - Math.max(lowL, lowR)), 3);
  return { pose: p, r, l };
}

/** Where `side`'s ankle is in a pose, across from its hip (art units). */
const ankleAcross = (p: FullBodyPose, side: Side) => footOf(p, side).x - HIP_X[side] - p.bodyX;

/** The sole tipping onto the toes at the end of the stance (degrees, toe down). */
const toeRoll = (r: number) => (r < 0.7 ? 0 : lerp(0, 6, smooth((r - 0.7) / 0.3)));

/**
 * A run / dribble cycle, `phase` in cycles. The boot on the ground is planted: it slides back under the hips in a
 * straight line at an even speed (IK), so with the director turning the stride over at the rate the player moves
 * (runStep) it stays still on the pitch. The swinging leg follows its cycle, eased onto the planted leg's angles where
 * it leaves and where it reaches the ground, so the hand-over never pops.
 */
export function runPose(phase: number, speed = 1): FullBodyPose {
  const k = Math.min(1, Math.max(0, speed));
  const { pose, r, l } = strideFk(phase, k);
  const out = { ...pose };
  for (const side of ['L', 'R'] as const) {
    const g = side === 'L' ? l : r;
    const u = side === 'L' ? phase + 0.5 : phase;
    const w = ((u % 1) + 1) % 1;
    const planted = (stanceAt: number) => {
      // The stance of this stride: from the heel strike (w 0.5) to the toe-off (w 1), at the hips' height then.
      const at = u - w + 0.5 + stanceAt * 0.5;
      const body = strideFk(side === 'L' ? at - 0.5 : at, k).pose;
      const strike = HIP_X[side] + ankleAcross(strideFk(side === 'L' ? u - w : u - w + 0.5, k).pose, side);
      const off = HIP_X[side] + ankleAcross(strideFk(side === 'L' ? u - w + 0.5 : u - w + 1, k).pose, side);
      const roll = toeRoll(stanceAt);
      // Tipping onto the toes lifts the ankle about the toe tip.
      const ax = lerp(strike, off, stanceAt) + 79 * (1 - Math.cos(rad(roll))) + 32 * Math.sin(rad(roll));
      const ay = ANKLE_Y - 79 * Math.sin(rad(roll)) + 32 * (1 - Math.cos(rad(roll)));
      const { hip, knee } = reach(side, ax, ay, 0, body.bodyY);
      return { hip, knee, ankle: flatAnkle(hip, knee, roll) };
    };
    const keys = side === 'L' ? (['hipL', 'kneeL', 'ankleL'] as const) : (['hipR', 'kneeR', 'ankleR'] as const);
    if (g.swing === null) {
      const leg = planted((w - 0.5) / 0.5);
      out[keys[0]] = leg.hip;
      out[keys[1]] = leg.knee;
      out[keys[2]] = leg.ankle;
    } else {
      // Swinging: start from the planted leg's last angles, arrive on its first ones.
      const s = g.swing;
      const fkAt = (sw: number) => strideLeg(u - w + sw * 0.5, k);
      const leave = planted(1);
      const land = planted(0);
      const from = fkAt(0);
      const to = fkAt(1);
      const a = 1 - smooth(s / 0.3);
      const b = smooth((s - 0.7) / 0.3);
      out[keys[0]] = g.hip + (leave.hip - from.hip) * a + (land.hip - to.hip) * b;
      out[keys[1]] = g.knee + (leave.knee - from.knee) * a + (land.knee - to.knee) * b;
      out[keys[2]] = g.ankle + (leave.ankle - from.ankle) * a + (land.ankle - to.ankle) * b;
    }
  }
  out.ankleL = clampAnkle(out.ankleL);
  out.ankleR = clampAnkle(out.ankleR);
  // A pointed toe low in the swing may not go into the grass: level the foot (towards a flat sole) just enough.
  for (const side of ['L', 'R'] as const) {
    if ((side === 'L' ? l : r).swing === null) continue;
    const key = side === 'L' ? 'ankleL' : 'ankleR';
    const hip = side === 'L' ? out.hipL : out.hipR;
    const knee = side === 'L' ? out.kneeL : out.kneeR;
    const pointed = out[key];
    const level = clampAnkle(flatAnkle(hip, knee));
    const dips = (k: number) => {
      out[key] = lerp(pointed, level, k);
      return footOf(out, side).low > GROUND + 2;
    };
    if (!dips(0)) continue;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 12; i += 1) {
      const mid = (lo + hi) / 2;
      if (dips(mid)) lo = mid;
      else hi = mid;
    }
    out[key] = lerp(pointed, level, hi);
  }
  return out;
}

/**
 * How far the hips travel over a planted boot in one step of runPose at `speed` (art units): the director turns the
 * stride over at the rate that keeps a planted boot still on the pitch.
 */
export function runStep(speed: number): number {
  const k = Math.min(1, Math.max(0, speed));
  const reachX = (u: number) => {
    const g = strideLeg(u, k);
    return THIGH * Math.sin(rad(g.hip)) + SHIN * Math.sin(rad(g.hip - g.knee));
  };
  return reachX(0.5) - reachX(1);
}

/**
 * Jogging backwards, still facing the play: the stride run in reverse (the swinging leg reaches back, the boot lands
 * on its toes), short steps, the body upright and a touch back.
 */
export function backpedalPose(phase: number): FullBodyPose {
  return { ...runPose(-phase, 0.05), lean: -4 };
}

/** The defender's jockey: low, wide, side-on, bouncing on planted boots. */
export function jockeyPose(now: number, phase = 0): FullBodyPose {
  const s = Math.sin(now * 5 + phase);
  return stance(HIP_X.L - 46, HIP_X.R + 38, 6 * s, 36 + 4 * Math.abs(s), 10);
}

/** The keeper set: crouched wide, weight forward, hands ready. */
/** @param load 0–1: sinking deeper before the spring of a dive. */
export function keeperSetPose(now: number, phase = 0, load = 0): FullBodyPose {
  const s = Math.sin(now * 1.8 + phase);
  return stance(HIP_X.L - 34, HIP_X.R + 34, 4 * s, 54 + 20 * load, 14 + 2 * s);
}

/**
 * A shot (clip time; the boot meets the ball at 0.8): plant the left boot beside the ball, swing the right leg back,
 * through the ball and up into the follow-through, then settle back into the stance.
 */
export function strikePose(t: number): FullBodyPose {
  const wind = smooth(t / 0.62);
  const swing = smooth((t - 0.6) / 0.24);
  const follow = smooth((t - 0.84) / 0.3);
  const settle = smooth((t - 1.2) / 0.3);
  const on = 1 - settle;
  // The leg swings through with the knee still bent (the boot passes over the grass), whips straight into the ball,
  // the toe pointed only once it is past the bottom of the arc.
  const hipR = STAND.hipR + (-48 * wind + 86 * swing + 20 * follow) * on;
  const kneeR = Math.max(0, STAND.kneeR + (95 * wind - 95 * swing + 12 * follow + 50 * bell(swing, 0, 1.2)) * on);
  const ankleR = STAND.ankleR + (-8 * smooth((swing - 0.6) / 0.4) - 10 * wind * (1 - swing)) * on;
  const lean = (-10 * wind * (1 - swing) - 14 * follow) * on + 6 * swing * (1 - follow);
  const bodyX = (-8 * wind + 14 * swing) * on;
  // Sink onto the plant leg; the kicking boot skims the grass on its way through.
  const bodyY = STAND.bodyY + 4 * wind * (1 - swing) * on;
  const p = skim({ ...STAND, hipR, kneeR, ankleR, lean, bodyX, bodyY }, 'R', bodyY);
  const l = plant('L', FOOT.L + 22 * on * smooth(t / 0.3), bodyX, bodyY);
  return { ...p, hipL: l.hip, kneeL: l.knee, ankleL: l.ankle };
}

/** A celebration jump, every 0.85 s: dip, spring up and tuck the knees, untuck, land soft and stand up. */
export function celebratePose(t: number): FullBodyPose {
  const c = (((t % 0.85) + 0.85) % 0.85) / 0.85;
  if (c < 0.25 || c >= 0.8) {
    // On the ground: the dip before the jump and the landing, boots planted.
    const dip = c < 0.25 ? bell(c, 0, 0.25) : 0.8 * bell(c, 0.8, 1);
    return stance(FOOT.L, FOOT.R, 0, STAND.bodyY + 34 * dip, 6 * dip);
  }
  // In the air (the scene lifts the figure): knees up from the standing legs.
  const air = bell(c, 0.25, 0.8);
  return {
    ...STAND,
    hipL: STAND.hipL + 55 * air,
    kneeL: STAND.kneeL + 105 * air,
    ankleL: STAND.ankleL - 20 * air,
    hipR: STAND.hipR + 60 * air,
    kneeR: STAND.kneeR + 110 * air,
    ankleR: STAND.ankleR - 20 * air,
    lean: -6 * air,
  };
}

/** A knee slide: on both knees (kneecaps on the ground), shins flat behind, arms (the art's) up. */
export function kneeSlidePose(): FullBodyPose {
  const hip = 10;
  const bodyY = GROUND - 14 - HIP_Y - THIGH * Math.cos(rad(hip));
  // The boots lie on their laces behind, soles up.
  return { hipL: hip, kneeL: 100, ankleL: -85, hipR: hip + 4, kneeR: 104, ankleR: -85, lean: -12, bodyX: 0, bodyY };
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

/** A crouch (k 0–1), for sabotage on the card: knees bend over planted boots. */
export function crouchPose(k: number): FullBodyPose {
  const e = smooth(k);
  return stance(FOOT.L - 10 * e, FOOT.R + 10 * e, 0, STAND.bodyY + 64 * e, 18 * e);
}

/** A step-over (t 0–1): the right leg circles over the ball while the left boot stays planted, the body swaying. */
export function stepOverPose(t: number): FullBodyPose {
  const circle = bell(t, 0, 0.6);
  const back = bell(t, 0.45, 1);
  const bodyX = 16 * circle - 16 * back;
  const bodyY = STAND.bodyY + 12 * Math.max(circle, back);
  const p = skim(
    {
      ...STAND,
      hipR: STAND.hipR + 40 * circle - 10 * back,
      kneeR: STAND.kneeR + 70 * circle + 20 * back,
      ankleR: STAND.ankleR - 10 * circle,
      lean: 6 * Math.max(circle, back),
      bodyX,
      bodyY,
    },
    'R',
    bodyY,
  );
  const l = plant('L', FOOT.L, bodyX, bodyY);
  return { ...p, hipL: l.hip, kneeL: l.knee, ankleL: l.ankle };
}

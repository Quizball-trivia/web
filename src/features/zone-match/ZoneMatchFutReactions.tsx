'use client';

/**
 * The player card's reaction to each playstyle landing on it (the loadout): every card has its own — a move by the
 * avatar (`cardMotion`: the legs' pose and the figure's lift / tilt / spin / shift / blur / fade, sampled per frame by
 * the card's loop) and an effect on the card (`CardReactionFx`: the card's own sticker icon and a few shapes, played
 * once with motion keyframes). Positions are % of the card, the avatar standing about x 27–93 %, y 8–68 %.
 */

import { memo } from 'react';
import { motion } from 'motion/react';
import type { AvatarCustomization } from '@/types/game';
import { AvatarFullBody, GLOVE_HANDS } from './AvatarFullBody';
import { CardArt } from './ZoneMatchCardFace';
import type { CardId } from './zoneMatch.cards';
import {
  FOOT,
  FULL_H,
  FULL_W,
  GROUND_Y,
  STAND,
  bootPoint,
  footAt,
  groundPoints,
  runPose as runPoseFn,
  celebratePose,
  crouchPose,
  divePose,
  idlePose,
  keeperSetPose,
  kneeSlidePose,
  mixPose,
  runPose,
  slidePose,
  stepOverPose,
  strikePose,
  type FullBodyPose,
} from './zoneMatch.fullBody';

/** A ball the avatar plays with, in the figure's own art units (it moves with the figure): centre, spin, and a soft
 * ring 0–1 as a touch kills its pace. */
export interface ReactionBall {
  x: number;
  y: number;
  /** Size (1 = at his feet; smaller further back). */
  scale?: number;
  rot: number;
  ring: number;
  opacity: number;
  /** A golden ball with a glowing trail (where it was a moment ago). */
  gold?: boolean;
  trail?: [number, number][];
}

/** The golden boot (Golden Boot, on his left foot): gold upper, a darker gold sole, pale gold slashes and laces. */
export const GOLD_BOOTS = { boots: '#F5B800', bootShade: '#C98B00', bootTrim: '#FFF1A8', sole: '#A87400', laces: '#FFF6D5' };

export interface ReactionFrame {
  body: FullBodyPose;
  /** The whole figure's size (1 = as drawn): a dive shrinks a little at full stretch to stay on the card. */
  scale?: number;
  ball?: ReactionBall;
  /** A second ball (Second Ball juggles two). */
  ball2?: ReactionBall;
  /** Second Ball's reaction is moving the two balls: the pair resting on the floor isn't drawn. */
  hideRestBalls?: boolean;
  /** Muddy Pitch: the kit muddy yet, and the puddle under him (0–1). */
  muddy?: boolean;
  puddle?: number;
  /** Yellow Card: in his hand yet, and the pop as he takes it (0–1). */
  yellowCard?: { held: boolean; pop: number };
  /** Park the Bus: where the bus is (art units from its parked spot; it drives in from the left) and how far he's
   * sat on its roof (0 standing – 1 seated). */
  bus?: { x: number; seat: number };
  /** Shin Pads: on his shins yet, and the pop as they clamp on. */
  shinPads?: { on: boolean; pop: number };
  /** Home Advantage: the scarf round his neck yet, and the pop as it goes on. */
  scarf?: { on: boolean; pop: number };
  /** Marks on the grass (the lab's whole moves): skids the knees left, turf thrown up — art units on the pitch, the
   * figure's travel included. */
  grass?: {
    skids: { x0: number; x1: number; y: number }[];
    skidOpacity: number;
    /** Bits thrown up: grass blades and soil crumbs. */
    turf: { x: number; y: number; size: number; rot: number; opacity: number; kind: 'blade' | 'crumb' }[];
    /** Dust where the knees hit the grass. */
    puffs: { x: number; y: number; r: number; opacity: number }[];
    /** Churned turf heaped where the slide stopped (0 none – 1 all). */
    heap: number;
  };
  /** Tiki-Taka: the two see-through team-mates (0–1 shown) and their legs. */
  mates?: { shown: number; poses: [FullBodyPose, FullBodyPose] };
  /** Goalkeeper Gloves: on his hands yet, and the pop as they go on (0–1). */
  gloves?: { on: boolean; pop: number };
  /** Offside Trap: the flag in his hand yet, the pop as he takes it, and how far it's waved (degrees). */
  flag?: { held: boolean; pop: number; wave: number };
  /** Captain's Armband: on the arm yet, and the pop as it fits (0–1, 1 = just put on). */
  armband?: { fitted: boolean; pop: number };
  /** Wearing the golden boot yet (Golden Boot's reaction; otherwise the loadout decides). */
  goldBoots?: boolean;
  /** % of the figure's height. */
  lift: number;
  tilt: number;
  spin: number;
  /** % of the figure's width. */
  shift: number;
  blur: number;
  fade: number;
}

/** How long each card's reaction plays (s). */
export const CARD_REACTION_S: Record<CardId, number> = {
  'first-touch': 2.7,
  'fifty-fifty': 1.4,
  'golden-boot': 2.7,
  'captains-armband': 2.2,
  'second-ball': 2.9,
  'floodlight-failure': 1.6,
  'muddy-pitch': 2.6,
  fog: 2.8,
  'yellow-card': 2.2,
  'offside-trap': 2.3,
  'var-review': 1.7,
  'goalkeeper-gloves': 2.5,
  'park-the-bus': 2.6,
  'shin-pads': 2.2,
  'long-ball': 1.6,
  'counter-attack': 1.6,
  substitution: 1.8,
  'home-advantage': 2.6,
  'dummy-run': 2.0,
  'tiki-taka': 2.9,
};

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
};
/** 0 → 1 → 0 over [t0, t1], easing in and out. */
const bell = (t: number, t0: number, t1: number) => Math.sin(Math.PI * clamp01((t - t0) / (t1 - t0))) ** 2;
const still = (body: FullBodyPose): ReactionFrame => ({ body, lift: 0, tilt: 0, spin: 0, shift: 0, blur: 0, fade: 1 });

/** One frame of `card`'s reaction, `t` seconds in (`now`: the idle's clock, `seed`: which way a dive goes). */
export function cardMotion(card: CardId, t: number, now: number, seed: number): ReactionFrame {
  const end = CARD_REACTION_S[card];
  // Every reaction eases back into the idle over its last quarter second.
  const out = smooth((end - t) / 0.25);
  const settle = (frame: ReactionFrame): ReactionFrame => ({
    body: mixPose(idlePose(now), frame.body, out),
    lift: frame.lift * out,
    tilt: frame.tilt * out,
    spin: frame.spin * out,
    shift: frame.shift * out,
    blur: frame.blur * out,
    fade: 1 - (1 - frame.fade) * out,
  });
  switch (card) {
    case 'first-touch': {
      const frame = firstTouch(t, now);
      return { ...settle(frame), ball: frame.ball };
    }
    case 'fifty-fifty':
      return settle({ ...still(crouchPose(0.3 * bell(t, 0, 1.2))), shift: 7 * Math.sin(t * Math.PI * 3) * bell(t, 0, 1.2) });
    case 'golden-boot': {
      const frame = goldenBoot(t, now);
      return { ...settle(frame), ball: frame.ball, goldBoots: frame.goldBoots };
    }
    case 'captains-armband': {
      // The armband arrives (ARMBAND.fit), goes on with a pop; chest out, stood tall; it stays a few seconds.
      const proud = bell(t, ARMBAND.fit - 0.1, ARMBAND.fit + 0.9);
      const frame = settle({ ...still(mixPose(idlePose(now), { ...STAND, lean: -9 }, proud)), lift: 5 * proud });
      return { ...frame, armband: { fitted: t >= ARMBAND.fit, pop: t >= ARMBAND.fit ? 1 - clamp01((t - ARMBAND.fit) / 0.45) : 0 } };
    }
    case 'second-ball': {
      const frame = secondBall(t, now);
      return { ...settle(frame), ball: frame.ball, ball2: frame.ball2, hideRestBalls: true };
    }
    case 'floodlight-failure':
      return settle({ ...still(crouchPose(0.55 * bell(t, 0.1, 1.4))), tilt: 3 * Math.sin(t * 40) * bell(t, 0.2, 1.2) });
    case 'muddy-pitch': {
      // The puddle spreads, he steps in and slips (front foot out, down on the back leg, a wobble), the splash cakes
      // his boots and socks; he flicks the mud off his foot.
      const slip = bell(t, MUD_SLIP.at - 0.1, MUD_SLIP.at + 0.9);
      const flick = bell(t, 1.55, 2.2);
      const body = mixPose(mixPose(idlePose(now), MUD_SLIP.pose, slip), { ...STAND, hipR: STAND.hipR + 22, kneeR: STAND.kneeR + 48, ankleR: STAND.ankleR + 26 + 18 * Math.sin(t * 34) }, flick);
      const frame = settle({ ...still(body), tilt: 7 * Math.sin(t * 13) * bell(t, MUD_SLIP.at, MUD_SLIP.at + 0.8), shift: -3 * slip });
      return { ...frame, muddy: t >= MUD_SLIP.at + 0.08, puddle: smooth(t / 0.5) };
    }
    case 'fog': {
      // Swallowed by the fog (blurred, a ghost of himself), peering about; a gust clears it.
      const fog = smooth((t - FOG.in) / 0.5) * (1 - smooth((t - FOG.clear) / 0.5));
      const body = { ...crouchPose(0.25 * fog), lean: 9 * fog };
      return settle({ ...still(mixPose(idlePose(now), body, fog)), shift: 4 * Math.sin(t * 3) * fog, blur: 4.5 * fog, fade: 1 - 0.7 * fog });
    }
    case 'yellow-card': {
      // The card flies into his hand; he holds it up and shows it, leaning back, a little lift.
      const show = bell(t, YELLOW.catch - 0.05, YELLOW.catch + 1.1);
      const frame = settle({ ...still(mixPose(idlePose(now), { ...STAND, lean: -8 }, show)), lift: 3 * show });
      return { ...frame, yellowCard: { held: t >= YELLOW.catch, pop: t >= YELLOW.catch ? 1 - clamp01((t - YELLOW.catch) / 0.4) : 0 } };
    }
    case 'offside-trap': {
      // The flag lands in his hand; he puts it up and waves it hard, then lowers it a touch.
      const up = bell(t, FLAG.catch - 0.05, FLAG.catch + 1.3);
      const frame = settle({ ...still(mixPose(idlePose(now), { ...STAND, lean: -7 }, up)), lift: 3 * up });
      const wave = 16 * Math.sin((t - FLAG.catch) * 15) * bell(t, FLAG.catch + 0.1, FLAG.catch + 1.2);
      return { ...frame, flag: { held: t >= FLAG.catch, pop: t >= FLAG.catch ? 1 - clamp01((t - FLAG.catch) / 0.4) : 0, wave } };
    }
    case 'var-review':
      // Frozen mid-stride while the review runs, with a tiny jitter.
      return settle({ ...still(runPose(0.3, 0.6)), shift: 0.8 * Math.sign(Math.sin(t * 50)) * bell(t, 0.2, 1.4) });
    case 'goalkeeper-gloves': {
      const frame = keeperSave(SAVE_KINDS[Math.abs(seed) % SAVE_KINDS.length], t, now, seed % 2 ? -1 : 1);
      return { ...settle(frame), ball: frame.ball, gloves: frame.gloves, scale: frame.scale };
    }
    case 'park-the-bus': {
      // The bus drives in and parks behind him; he hops up and sits on the roof, legs swinging.
      const x = -720 * (1 - smooth(t / BUS.arrive));
      const seat = smooth((t - BUS.arrive - 0.05) / 0.35);
      const hop = 12 * Math.sin(Math.PI * clamp01((t - BUS.arrive - 0.05) / 0.35));
      const body = mixPose(idlePose(now), seatedPose(now), seat);
      return { body, lift: hop + seat * BUS.sitLift, tilt: 0, spin: 0, shift: seat * BUS.sitShift, blur: 0, fade: 1, bus: { x, seat } };
    }
    case 'shin-pads': {
      // The pads clamp onto his shins (PADS.on); he knocks his knees together twice to test them.
      const knock = Math.max(bell(t, PADS.on + 0.25, PADS.on + 0.55), bell(t, PADS.on + 0.65, PADS.on + 0.95));
      const look = bell(t, 0.1, PADS.on + 0.2);
      const body = mixPose(mixPose(idlePose(now), { ...crouchPose(0.35), lean: 12 }, look), { ...crouchPose(0.25), hipL: 6, hipR: -6, kneeL: 30, kneeR: 30 }, knock);
      const frame = settle(still(body));
      return { ...frame, shinPads: { on: t >= PADS.on, pop: t >= PADS.on ? 1 - clamp01((t - PADS.on) / 0.35) : 0 } };
    }
    case 'long-ball':
      return settle({ ...still(strikePose(t * 1.1)), tilt: -4 * bell(t, 0.8, 1.3) });
    case 'counter-attack': {
      // Sprints one way, U-turns, sprints back.
      const turn = smooth((t - 0.55) / 0.3);
      return settle({ ...still(runPose(t * 3.2, 1)), spin: t < 0.85 ? 360 * turn : 0, shift: -10 * bell(t, 0, 0.6) + 10 * bell(t, 0.8, 1.4) });
    }
    case 'substitution': {
      // Jogs off the card, the substitute (the same player) jogs back on.
      const off = smooth(t / 0.6);
      const on = smooth((t - 0.9) / 0.6);
      return settle({ ...still(runPose(t * 2.4, 0.5)), shift: t < 0.9 ? 70 * off : -70 * (1 - on), fade: t < 0.9 ? 1 - off : on });
    }
    case 'home-advantage': {
      // The scarf goes on (SCARF.on), then two jumps with the crowd.
      const j = t - SCARF.on - 0.15;
      const jumping = j >= 0 && j < 1.7;
      const body = jumping ? celebratePose(j) : idlePose(now);
      const lift = jumping ? 9 * Math.sin(Math.PI * clamp01(((j % 0.85) / 0.85 - 0.25) / 0.55)) : 0;
      const frame = settle({ ...still(body), lift });
      return { ...frame, scarf: { on: t >= SCARF.on, pop: t >= SCARF.on ? 1 - clamp01((t - SCARF.on) / 0.4) : 0 } };
    }
    case 'dummy-run': {
      // The feint: shoulder dropped one way (his afterimage keeps going that way), then the cut back with a step-over.
      const feint = bell(t, 0.05, 0.6);
      const cut = smooth((t - 0.45) / 0.25) * (1 - smooth((t - 1.5) / 0.4));
      const body = t < 0.45 ? mixPose(idlePose(now), { ...crouchPose(0.3), lean: 14 }, feint) : stepOverPose(clamp01((t - 0.45) / 0.8));
      return settle({ ...still(body), shift: -12 * feint + 10 * cut, tilt: -9 * feint + 5 * cut });
    }
    case 'tiki-taka': {
      const frame = tikiTaka(t, now);
      return { ...settle(frame), ball: frame.ball, mates: frame.mates };
    }
  }
}

/* ── First Touch: the ball dropped out of the sky, killed dead ─────────── */

const BALL_R = 46;
const FT = { watch: 0.45, takeoff: 0.62, catch: 0.88, landed: 1.2, absorbed: 1.34, up: 1.6, stepOn: 1.9 };
/** Where the ball rides on the boot: on the laces (boot frame, toe +x). */
const LACES: [number, number] = [54, -6 - BALL_R];
const ROLL_STOP_X = FOOT.R + 112;

/** The jump: % of the figure's height, up from the take-off, down by the landing. */
const ftLift = (t: number) => 19 * Math.sin(Math.PI * clamp01((t - 0.56) / (FT.landed - 0.56)));
const liftArt = (t: number) => (ftLift(t) / 100) * FULL_H;

/** Waiting for it, the catch in the air (right knee up, laces flat under the ball), the cushion down, the landing. */
const FT_CATCH: FullBodyPose = { hipL: 30, kneeL: 72, ankleL: 22, hipR: 88, kneeR: 72, ankleR: -16, lean: -9, bodyX: 0, bodyY: 0 };
const FT_CUSHIONED: FullBodyPose = { ...STAND, hipR: 16, kneeR: 24, ankleR: 8, lean: 2 };
/** The finish: the right sole resting on top of the dead ball. */
const FT_STEP: FullBodyPose = (() => {
  const bodyY = STAND.bodyY + 10;
  const r = footAt('R', ROLL_STOP_X - 22, GROUND_Y - 2 * BALL_R - 33, 0, bodyY);
  const l = footAt('L', FOOT.L, GROUND_Y - 37, 0, bodyY);
  return { hipL: l.hip, kneeL: l.knee, ankleL: l.ankle, hipR: r.hip, kneeR: r.knee, ankleR: r.ankle, lean: 4, bodyX: 0, bodyY };
})();
/** Where the ball meets the boot (figure frame, at the catch). */
const CATCH_AT = bootPoint(FT_CATCH, 'R', ...LACES);

function firstTouch(t: number, now: number): ReactionFrame {
  const keys: [number, FullBodyPose][] = [
    [0, idlePose(now)],
    [FT.watch, { ...crouchPose(0.45), lean: -8 }],
    [FT.takeoff, { ...STAND, lean: -4 }],
    [FT.catch, FT_CATCH],
    [FT.landed, FT_CUSHIONED],
    [FT.absorbed, crouchPose(0.35)],
    [FT.up, STAND],
    [FT.stepOn, FT_STEP],
  ];
  let body = keys[keys.length - 1][1];
  for (let i = 0; i < keys.length - 1; i += 1) {
    const [t0, a] = keys[i];
    const [t1, b] = keys[i + 1];
    if (t < t1) {
      body = mixPose(a, b, smooth((t - t0) / (t1 - t0)));
      break;
    }
  }

  // The ball: out of the sky (speeding up, spinning), onto the laces, ridden down, off the boot, a short roll, dead.
  let x: number;
  let y: number;
  let rot: number;
  if (t < FT.catch) {
    const u = clamp01((t - 0.05) / (FT.catch - 0.05));
    const worldY = lerp(-340, CATCH_AT[1] - liftArt(FT.catch), u * u);
    x = lerp(CATCH_AT[0] + 70, CATCH_AT[0], u);
    // The figure is lifted by the jump; the ball isn't: back out of the figure's frame.
    y = worldY + liftArt(t);
    rot = 900 * u;
  } else if (t < FT.landed) {
    [x, y] = bootPoint(body, 'R', ...LACES);
    // The spin dies on the boot.
    rot = 900 + 90 * Math.sin((Math.PI / 2) * clamp01((t - FT.catch) / (FT.landed - FT.catch)));
  } else {
    const [sx, sy] = bootPoint(FT_CUSHIONED, 'R', ...LACES);
    const u = clamp01((t - FT.landed) / (FT.up - FT.landed));
    x = lerp(sx, ROLL_STOP_X, 1 - (1 - u) ** 3);
    y = lerp(sy, GROUND_Y - BALL_R, Math.min(1, (u * 1.6) ** 2));
    rot = 990 + ((x - sx) / BALL_R) * (180 / Math.PI);
  }
  const ring = t >= FT.catch && t < FT.catch + 0.35 ? (t - FT.catch) / 0.35 : 0;
  // Fades in out of the sky, out once the move is over.
  const opacity = Math.min(smooth(t / 0.15), smooth((CARD_REACTION_S['first-touch'] - t) / 0.3));
  return { body, lift: ftLift(t), tilt: 0, spin: 0, shift: 0, blur: 0, fade: 1, ball: { x, y, rot, ring, opacity } };
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/* ── Golden Boot: the golden boots go on, then the shot ──────────────── */

/** The boots land on his feet and turn gold; he looks down at the ball, then strikes (contact at GB.contact). */
const GB = { wear: 0.6, shot: 0.95, rate: 1.15, strikeAt: 0.78 };
const GB_CONTACT = GB.shot + GB.strikeAt / GB.rate;
/** The strike with the legs swapped: the golden boot is on his left foot, so the left foot shoots. */
const leftFooted = (p: FullBodyPose): FullBodyPose => ({ ...p, hipL: p.hipR, kneeL: p.kneeR, ankleL: p.ankleR, hipR: p.hipL, kneeR: p.kneeL, ankleR: p.ankleL });
/** The ball waits just in front of where the boot's toe meets it. */
const GB_BALL: [number, number] = (() => {
  const [toeX] = bootPoint(leftFooted(strikePose(GB.strikeAt)), 'L', 84, 15);
  return [toeX + BALL_R - 8, GROUND_Y - BALL_R];
})();
/** Where the struck ball is, `dt` s after contact: up and away, out of the card. */
const gbFlight = (dt: number): [number, number] => [GB_BALL[0] + 780 * dt, GB_BALL[1] - 620 * dt + 260 * dt * dt];

function goldenBoot(t: number, now: number): ReactionFrame {
  let body: FullBodyPose;
  if (t < GB.shot) {
    // A glance down at the new boots and the ball, then set.
    const look = { ...crouchPose(0.22), lean: 10 };
    body = t < 0.7 ? mixPose(idlePose(now), look, smooth(t / 0.7)) : mixPose(look, STAND, smooth((t - 0.7) / (GB.shot - 0.7)));
  } else {
    body = leftFooted(strikePose((t - GB.shot) * GB.rate));
  }
  const appear = smooth((t - 0.6) / 0.2);
  let ball: ReactionBall | undefined;
  if (t >= 0.6) {
    if (t < GB_CONTACT) {
      ball = { x: GB_BALL[0], y: GB_BALL[1], rot: 0, ring: 0, opacity: appear };
    } else {
      const dt = t - GB_CONTACT;
      const [x, y] = gbFlight(dt);
      ball = {
        x,
        y,
        rot: dt * 1400,
        ring: dt < 0.25 ? dt / 0.25 : 0,
        opacity: smooth((0.7 - dt) / 0.2),
        gold: true,
        trail: [0.04, 0.08, 0.12, 0.16].map((back) => gbFlight(Math.max(0, dt - back))),
      };
    }
  }
  return { body, lift: 0, tilt: 0, spin: 0, shift: 0, blur: 0, fade: 1, ball, goldBoots: t >= GB.wear };
}

/** A football for the avatar to play with (CardCutout positions and spins it). */
export function BallArt() {
  return (
    <svg viewBox="-50 -50 100 100" className="size-full overflow-visible drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)]" aria-hidden>
      <circle r={46} fill="#F6F7F9" stroke="#1B1D22" strokeWidth={4} />
      <polygon points="0,-16 15,-5 9,13 -9,13 -15,-5" fill="#1B1D22" />
      {[0, 72, 144, 216, 288].map((a) => (
        <polygon key={a} points="-9,-45 9,-45 13,-33 0,-26 -13,-33" fill="#1B1D22" transform={`rotate(${a})`} />
      ))}
    </svg>
  );
}
export const REACTION_BALL_R = BALL_R;

/* ── Second Ball: two balls juggled at once, then left on the floor ──── */

/** Each foot keeps its own ball up: touches every SB.period s, the feet in turn; three touches each. */
const SB = { period: 0.6, apex: 170, spread: 95, touchesR: [0.4, 1.0, 1.6], touchesL: [0.7, 1.3, 1.9], land: 0.6 };
/** Where the two balls rest on the floor: in front of his right boot, behind his left. */
export const SECOND_BALL_REST: [number, number][] = [
  [FOOT.R + 79 + BALL_R + 6, GROUND_Y - BALL_R],
  [FOOT.L - 39 - BALL_R - 6, GROUND_Y - BALL_R],
];
/** A leg lifted to tap its ball up (laces level): 0 standing, 1 at the touch. */
const sbLift = (p: FullBodyPose, side: 'L' | 'R', a: number): FullBodyPose =>
  side === 'R'
    ? { ...p, hipR: p.hipR + 38 * a, kneeR: p.kneeR + 62 * a, ankleR: p.ankleR + 24 * a }
    : { ...p, hipL: p.hipL + 38 * a, kneeL: p.kneeL + 62 * a, ankleL: p.ankleL + 24 * a };
const SB_TOUCH = { R: bootPoint(sbLift(STAND, 'R', 1), 'R', ...LACES), L: bootPoint(sbLift(STAND, 'L', 1), 'L', ...LACES) };

/** One ball of the pair at `t`: dropped onto its foot, kept up touch after touch, then down to rest. */
function sbBall(t: number, side: 'L' | 'R'): ReactionBall {
  const touches = side === 'R' ? SB.touchesR : SB.touchesL;
  const [cx, cy] = SB_TOUCH[side];
  const [rx, ry] = SECOND_BALL_REST[side === 'R' ? 0 : 1];
  const last = touches[touches.length - 1];
  let x = cx;
  let y: number;
  if (t < touches[0]) {
    // Dropped in from its own side.
    const u = clamp01((t - 0.02) / (touches[0] - 0.02));
    y = lerp(-300, cy, u * u);
    x = cx + (side === 'R' ? 1 : -1) * SB.spread * (1 - u);
  } else if (t < last) {
    // Up and out to its own side between touches (the pair reads as two), back down onto its foot.
    const k = Math.floor((t - touches[0]) / SB.period);
    const u = (t - touches[0] - k * SB.period) / SB.period;
    y = cy - 4 * SB.apex * u * (1 - u);
    x = cx + (side === 'R' ? 1 : -1) * SB.spread * Math.sin(Math.PI * u);
  } else if (t < last + SB.land) {
    // The last touch sends it down to its place on the floor.
    const u = (t - last) / SB.land;
    x = lerp(cx, rx, u);
    y = lerp(cy, ry, u) - 4 * 130 * u * (1 - u);
  } else {
    // One small bounce, then it lies there.
    const u = clamp01((t - last - SB.land) / 0.22);
    x = rx;
    y = ry - 4 * 18 * u * (1 - u);
  }
  return { x, y, rot: t * (side === 'R' ? 520 : -480), ring: 0, opacity: smooth((t - 0.02) / 0.12) };
}

function secondBall(t: number, now: number): ReactionFrame {
  // The feet take turns: each lifts to meet its own ball at its touch.
  const lift = (touches: number[]) => Math.max(...touches.map((c) => bell(t, c - 0.17, c + 0.17)));
  let body = sbLift(sbLift(STAND, 'R', lift(SB.touchesR)), 'L', lift(SB.touchesL));
  body = { ...body, lean: -3 };
  // Into the juggle from the idle, out of it once both are down.
  body = mixPose(idlePose(now), body, smooth(t / 0.3) * smooth((SB.touchesL[2] + 0.4 - t) / 0.3));
  return { body, lift: 0, tilt: 0, spin: 0, shift: 0, blur: 0, fade: 1, ball: sbBall(t, 'R'), ball2: sbBall(t, 'L') };
}

/* ── Muddy Pitch, Fog, Yellow Card ────────────────────────────────────── */

/** The slip: the front boot shoots out along the mud, he drops onto the back leg. */
const MUD_SLIP = {
  at: 0.55,
  pose: ((): FullBodyPose => {
    const bodyY = 58;
    const l = footAt('L', FOOT.L - 8, GROUND_Y - 37, 0, bodyY);
    const r = footAt('R', FOOT.R + 105, GROUND_Y - 40, 0, bodyY);
    return { hipL: l.hip, kneeL: l.knee, ankleL: l.ankle, hipR: r.hip, kneeR: r.knee, ankleR: r.ankle + 18, lean: -12, bodyX: 0, bodyY };
  })(),
};
/** The puddle under his feet (figure art units). */
export const PUDDLE = { x: (FOOT.L + FOOT.R) / 2 + 20, y: GROUND_Y + 4, w: 330, h: 50 };

/** The fog rolls in, then a gust clears it. */
const FOG = { in: 0.25, clear: 1.75 };

/** Yellow Card: when it lands in his hand, and how it's held — gripped in the raised fist, behind the fingers and the
 * thumb (upper-body art units, 496 × 543; measured on the skin art). */
export const YELLOW = { catch: 0.62, x: 446, y: 116, w: 58, h: 84, angle: -10 };
/** Where the hand is on the card (%). */
const HAND_ON_CARD = { x: 35 + (YELLOW.x / 496) * 50, y: 15.3 + (YELLOW.y / FULL_H) * 52.8 };

/** The yellow card held in his hand (upper-body art units). */
/** The yellow card, centred on (0, 0) (art units). */
export function YellowCardShape() {
  return (
    <>
      <rect x={-YELLOW.w / 2} y={-YELLOW.h / 2} width={YELLOW.w} height={YELLOW.h} rx={7} fill="#FFD60A" stroke="#14213D" strokeWidth={3.5} />
      <path d={`M${-YELLOW.w / 2 + 8} ${-YELLOW.h / 2 + 8} L${-YELLOW.w / 2 + 22} ${-YELLOW.h / 2 + 8} L${-YELLOW.w / 2 + 8} ${YELLOW.h / 2 - 30} Z`} fill="#FFF3A0" opacity={0.9} />
    </>
  );
}

export function HeldYellowCard() {
  return (
    <g transform={`translate(${YELLOW.x} ${YELLOW.y}) rotate(${YELLOW.angle})`}>
      <YellowCardShape />
    </g>
  );
}

/**
 * Offside Trap: the linesman's flag, gripped in the same raised fist (the stick runs up out of it, the checked cloth at
 * the top, flying away from his head); waved about the grip. Upper-body art units.
 */
export const FLAG = { gripX: 448, gripY: 162, catch: 0.6 };

/** The flag around its grip (0, 0): the stick up out of the fist, the red and yellow checked cloth at the top. */
export function FlagShape() {
  const top = -150;
  const w = 74;
  const h = 52;
  return (
    <>
      <path d={`M-3 22 L2 ${top - 6}`} stroke="#14213D" strokeWidth={11} strokeLinecap="round" />
      <path d={`M-3 22 L2 ${top - 6}`} stroke="#3A3F47" strokeWidth={6} strokeLinecap="round" />
      <g transform={`translate(2 ${top})`}>
        <rect x={0} y={0} width={w} height={h} rx={3} fill="#FFD60A" stroke="#14213D" strokeWidth={3.5} />
        <rect x={0} y={0} width={w / 2} height={h / 2} fill="#FF4B4B" />
        <rect x={w / 2} y={h / 2} width={w / 2} height={h / 2} fill="#FF4B4B" />
        <rect x={0} y={0} width={w} height={h} rx={3} fill="none" stroke="#14213D" strokeWidth={3.5} />
      </g>
    </>
  );
}

/* ── Taking a card off: the gear is thrown away ─────────────────────── */

export type Discard = 'yellow-card' | 'offside-trap' | 'golden-boot' | 'shin-pads';
/** How long a throw-away plays (s): the toss, a moment on the floor, a fade. */
export const DISCARD_S = 1.8;

/** Where a discarded item flies from and lands (figure art units), how high it arcs and how it lies. */
const DISCARD_PATH: Record<Discard, { from: [number, number]; to: [number, number]; apex: number; spin: number; lie: number }> = {
  'yellow-card': { from: [YELLOW.x, YELLOW.y], to: [FOOT.R + 150, GROUND_Y - 8], apex: 150, spin: 520, lie: 78 },
  'offside-trap': { from: [FLAG.gripX + 20, FLAG.gripY - 70], to: [FOOT.R + 165, GROUND_Y - 12], apex: 120, spin: 430, lie: 82 },
  'golden-boot': { from: [FOOT.L + 20, GROUND_Y - 30], to: [FOOT.L - 150, GROUND_Y - 34], apex: 300, spin: -600, lie: -8 },
  'shin-pads': { from: [245, 700], to: [FOOT.R + 140, GROUND_Y - 14], apex: 40, spin: 180, lie: 90 },
};

/** The thrown item at `t` s into the throw: where it is (figure art units), its turn, how visible. */
export function discardSprite(item: Discard, t: number): { x: number; y: number; rot: number; opacity: number } {
  const p = DISCARD_PATH[item];
  const u = clamp01(t / 0.55);
  const x = lerp(p.from[0], p.to[0], u);
  const y = lerp(p.from[1], p.to[1], u) - 4 * p.apex * u * (1 - u);
  // Spins through the air and settles lying on the floor.
  const rot = lerp(0, p.spin, smooth(u)) + p.lie * smooth(u);
  return { x, y, rot, opacity: smooth((DISCARD_S - t) / 0.4) };
}

/** The body as he throws it: a flick of the wrist and a lean for the hand gear, a kick back for the boot. */
export function discardBody(item: Discard, t: number, now: number): FullBodyPose {
  const k = bell(t, 0, 0.5);
  if (item === 'shin-pads') return mixPose(idlePose(now), { ...crouchPose(0.45), lean: 14 }, k);
  if (item === 'golden-boot') {
    return mixPose(idlePose(now), { ...STAND, hipL: STAND.hipL - 32, kneeL: STAND.kneeL + 95, ankleL: STAND.ankleL - 25, lean: 6 }, k);
  }
  return mixPose(idlePose(now), { ...STAND, lean: 10 }, k);
}

/* ── Goalkeeper Gloves: the gloves on, a full-stretch save ──────────── */


/**
 * The keeper's saves (Goalkeeper Gloves plays one at random; the lab plays each):
 * - stretch: set and load, push off, full stretch nearly flat, the ball caught in the leading glove, down on the side;
 * - leap: set, a spring straight up with the knees tucked, caught one-handed overhead at the top of the jump;
 * - parry: a quick, low dive at a hard shot, the glove beats it away, he lands and bounces up.
 */
export type SaveKind = 'stretch' | 'leap' | 'parry';
export const SAVE_KINDS: SaveKind[] = ['stretch', 'leap', 'parry'];

const GLOVES_ON = 0.15;
const DIVES = {
  stretch: { push: 0.4, catch: 0.9, land: 1.2, up: 1.75, angle: 80, air: 10 },
  parry: { push: 0.3, catch: 0.62, land: 0.8, up: 1.45, angle: 84, air: 4 },
};
const LEAP = { push: 0.42, catch: 0.82, land: 1.18, up: 1.7, height: 24 };

const glovesFrame = (t: number) => ({ on: t >= GLOVES_ON, pop: t >= GLOVES_ON ? 1 - clamp01((t - GLOVES_ON) / 0.35) : 0 });

export function keeperSave(kind: SaveKind, t: number, now: number, dir: 1 | -1): ReactionFrame {
  return kind === 'leap' ? keeperLeap(t, now, dir) : keeperDive(kind, t, now, dir);
}

function keeperDive(kind: 'stretch' | 'parry', t: number, now: number, dir: 1 | -1): ReactionFrame {
  const D = DIVES[kind];
  const flight = smooth((t - D.push) / (D.catch - D.push));
  const down = smooth((t - D.up) / 0.5);
  let body: FullBodyPose;
  if (t < D.push) {
    // Set, sinking onto the legs before the spring.
    body = mixPose(idlePose(now), keeperSetPose(now, 0, bell(t, 0.05, D.push + 0.1)), smooth(t / 0.25));
  } else if (t < D.up) {
    // The push leg drives off, then both trail behind the body, a little scissored.
    body = mixPose(keeperSetPose(now, 0, 0.6), divePose(flight), smooth((t - D.push) / 0.2));
    body = { ...body, hipL: body.hipL - 8 * flight, hipR: body.hipR + 6 * flight };
  } else {
    body = mixPose(divePose(1), keeperSetPose(now), down);
  }
  // The figure turns about its feet; a flat dive that way would leave the card. So the turn is paid back: the figure
  // is moved so its middle stays mid-card (across: 64 % of the box's width per sin θ; up: 50 % of its height per
  // 1 − cos θ), drops low once he lands, and shrinks a touch at full stretch.
  const out = flight * (1 - down);
  const theta = (D.angle * out * Math.PI) / 180;
  const scale = 1 - 0.16 * out;
  const landed = smooth((t - D.land) / 0.2) * (1 - down);
  const air = Math.sin(Math.PI * clamp01((t - D.push) / (D.land - D.push)));
  const bounce = t > D.land ? 2.5 * Math.sin(Math.PI * clamp01((t - D.land) / 0.25)) : 0;
  const tilt = dir * D.angle * out;
  // (He stands right of the card's middle: the extra travel goes only towards the side with room.)
  const shift = dir * -64 * Math.sin(theta) * scale + (dir < 0 ? -10 : -4) * out;
  const lift = 50 * (1 - Math.cos(theta)) * scale * (1 - 0.75 * landed) + D.air * air + bounce;

  // The shot comes in at the leading glove: caught (stretch), or beaten away past the fingertips (parry).
  const hand = GLOVE_HANDS[dir > 0 ? 'R' : 'L'].centre;
  let ball: ReactionBall | undefined;
  const from = D.push - 0.1;
  if (t >= from && t < D.catch) {
    const u = clamp01((t - from) / (D.catch - from));
    const drop = kind === 'parry' ? 260 : 430;
    ball = { x: hand[0] + dir * 60 * (1 - u), y: lerp(hand[1] - drop, hand[1] - 34, u), rot: 900 * u, ring: 0, opacity: smooth(u / 0.2) };
  } else if (t >= D.catch && kind === 'stretch' && t < D.up + 0.4) {
    ball = { x: hand[0], y: hand[1] - 34, rot: 900, ring: t < D.catch + 0.3 ? (t - D.catch) / 0.3 : 0, opacity: smooth((D.up + 0.4 - t) / 0.3) };
  } else if (t >= D.catch && kind === 'parry' && t < D.catch + 0.7) {
    // Off the glove, on past the fingertips (the body's "up" is the dive's direction) and spinning away.
    const dt = t - D.catch;
    ball = { x: hand[0] + dir * 120 * dt, y: hand[1] - 34 - 900 * dt, rot: 900 - 1600 * dt, ring: dt < 0.3 ? dt / 0.3 : 0, opacity: smooth((0.7 - dt) / 0.25) };
  }
  return { body, lift, tilt, spin: 0, shift, blur: 0, fade: 1, scale, ball, gloves: glovesFrame(t) };
}

/** The high catch: set, spring straight up with the knees tucked, the ball caught one-handed at the top, land soft. */
function keeperLeap(t: number, now: number, dir: 1 | -1): ReactionFrame {
  const L = LEAP;
  const air = Math.sin(Math.PI * clamp01((t - L.push) / (L.land - L.push)));
  const tuck = { ...STAND, hipL: 34, kneeL: 88, ankleL: 30, hipR: 42, kneeR: 96, ankleR: 34, lean: -6 };
  let body: FullBodyPose;
  if (t < L.push) body = mixPose(idlePose(now), keeperSetPose(now, 0, bell(t, 0.05, L.push + 0.08)), smooth(t / 0.25));
  else if (t < L.land) body = mixPose(keeperSetPose(now, 0, 0.6), tuck, smooth((t - L.push) / 0.18));
  else if (t < L.up) body = mixPose(crouchPose(0.55), keeperSetPose(now), smooth((t - L.land - 0.12) / 0.35));
  else body = mixPose(keeperSetPose(now), idlePose(now), smooth((t - L.up) / 0.4));
  const lift = L.height * air;
  const tilt = dir * 10 * air;
  // The ball in from high on his glove side, met at the top of the jump in the raised glove, held as he lands.
  const hand = GLOVE_HANDS[dir > 0 ? 'R' : 'L'].centre;
  const catchAt: [number, number] = [hand[0], hand[1] - 40];
  const liftArt = (time: number) => ((L.height * Math.sin(Math.PI * clamp01((time - L.push) / (L.land - L.push)))) / 100) * FULL_H;
  let ball: ReactionBall | undefined;
  if (t >= L.push - 0.15 && t < L.catch) {
    const u = clamp01((t - (L.push - 0.15)) / (L.catch - L.push + 0.15));
    // On a straight line in the world (the figure is lifted beneath it).
    const worldY = lerp(catchAt[1] - liftArt(L.catch) - 260, catchAt[1] - liftArt(L.catch), u);
    ball = { x: catchAt[0] + dir * 220 * (1 - u), y: worldY + liftArt(t), rot: 800 * u, ring: 0, opacity: smooth(u / 0.2) };
  } else if (t >= L.catch && t < L.up + 0.5) {
    ball = { x: catchAt[0], y: catchAt[1], rot: 800, ring: t < L.catch + 0.3 ? (t - L.catch) / 0.3 : 0, opacity: smooth((L.up + 0.5 - t) / 0.3) };
  }
  return { body, lift, tilt, spin: 0, shift: 0, blur: 0, fade: 1, ball, gloves: glovesFrame(t) };
}

/* ── Tackles, seen on their own (the lab): the slide, and being taken down ─ */

/** The pivot the figure turns about (its feet), in its art units. */
const PIVOT: [number, number] = [FULL_W / 2, GROUND_Y];
const rotateAbout = ([x, y]: [number, number], deg: number): [number, number] => {
  const r = (deg * Math.PI) / 180;
  const dx = x - PIVOT[0];
  const dy = y - PIVOT[1];
  return [PIVOT[0] + dx * Math.cos(r) - dy * Math.sin(r), PIVOT[1] + dx * Math.sin(r) + dy * Math.cos(r)];
};
/** The lift (% of the figure's height) that puts the lowest knee or stud of `body`, turned by `tilt`, on the grass. */
function groundLift(body: FullBodyPose, tilt: number): number {
  // His seat counts too: in a slide he sits on the grass.
  const seat: [number, number] = [FULL_W / 2 + body.bodyX, 575 + body.bodyY];
  // …and the tops of the boots (lying on their laces in a knee slide).
  const uppers = (['L', 'R'] as const).flatMap((side) => [bootPoint(body, side, 70, -12), bootPoint(body, side, -30, -24), bootPoint(body, side, 20, -30)]);
  const lowest = Math.max(...[...groundPoints(body), seat, ...uppers].map((p) => rotateAbout(p, tilt)[1]));
  return ((lowest - GROUND_Y) / FULL_H) * 100;
}
/** A point on the pitch (art units, the figure unmoved) in the turned, lifted figure's own frame (where its ball is drawn). */
function intoFigure([x, y]: [number, number], tilt: number, lift: number): [number, number] {
  return rotateAbout([x, y + (lift / 100) * FULL_H], -tilt);
}

/**
 * The slide tackle: a few strides in, down on the grass leaning back with the leading leg along it, the boot knocks
 * the rolling ball away, then up again. Facing +x.
 */
export function slideTackleMove(t: number): ReactionFrame {
  const S = { drop: 0.35, contact: 0.6, rise: 1.25, up: 1.7 };
  const down = smooth((t - S.drop) / (S.contact - S.drop)) * (1 - smooth((t - S.rise) / (S.up - S.rise)));
  const tilt = -40 * down;
  const slide = slidePose(down);
  // Leaning back turns the leading leg up by the same 40°: it is brought down so it runs flat along the grass.
  const legs = { ...slide, hipR: slide.hipR - 50 * down, kneeR: 4, hipL: slide.hipL - 10 * down };
  const body = t < S.drop ? runPoseFn(t * 2.4, 0.8) : mixPose(runPoseFn(t * 2.4, 0.8), legs, smooth((t - S.drop) / 0.12) * (t < S.rise ? 1 : down));
  const lift = -groundLift(body, tilt) * (down > 0.02 ? 1 : 0);
  // The ball rolls in towards his boot, which knocks it back the way it came and up.
  const contactX = rotateAbout(bootPoint(mixPose(STAND, legs, 1), 'R', 84, 15), -40)[0];
  let world: [number, number];
  if (t < S.contact) world = [lerp(contactX + 260, contactX + BALL_R, clamp01(t / S.contact)), GROUND_Y - BALL_R];
  else {
    const dt = t - S.contact;
    world = [contactX + BALL_R + 700 * dt, GROUND_Y - BALL_R - 500 * dt + 600 * dt * dt];
  }
  const [x, y] = intoFigure(world, tilt, lift);
  const ball: ReactionBall = { x, y, rot: t * 700, ring: t >= S.contact && t < S.contact + 0.25 ? (t - S.contact) / 0.25 : 0, opacity: smooth((1.4 - t) / 0.2) };
  return { body, lift, tilt, spin: 0, shift: 0, blur: 0, fade: 1, ball };
}

/** Taken down: running, the legs swept from under him, he pitches forward, lands on his front with a bounce, gets up. */
export function tackledMove(t: number): ReactionFrame {
  const T = { swept: 0.4, land: 0.85, up: 1.5, stand: 1.95 };
  const fall = smooth((t - T.swept) / (T.land - T.swept)) * (1 - smooth((t - T.up) / (T.stand - T.up)));
  const swept: FullBodyPose = { hipL: -38, kneeL: 72, ankleL: -20, hipR: -14, kneeR: 44, ankleR: -10, lean: 4, bodyX: 0, bodyY: 0 };
  const running = runPoseFn(t * 2.4, 0.8);
  const body = t < T.up ? mixPose(running, swept, smooth((t - T.swept + 0.03) / 0.2)) : mixPose(STAND, swept, fall);
  const tilt = 80 * fall;
  const bounceT = t - T.land;
  const bounce = bounceT > 0 && t < T.up ? 3 * Math.abs(Math.sin(bounceT * 10)) * Math.exp(-bounceT * 7) : 0;
  const hop = 10 * Math.sin(Math.PI * clamp01((t - T.swept) / (T.land - T.swept)));
  const lift = -groundLift(body, tilt) + (t < T.land ? hop : 0) + bounce;
  return { body, lift, tilt, spin: 0, shift: 0, blur: 0, fade: 1 };
}

/**
 * The knee slide: a sprint in, down onto the knees, leaning back with the arms up, sliding on along the grass (turf
 * flying up behind the knees, two skid marks left), a moment held, then up. `travel` art units → the frame's shift
 * (a share of a box 1.32× the figure's width, as the player card's).
 */
const KS = { drop: 0.45, down: 0.62, stop: 1.45, rise: 2.0, up: 2.45, from: -420, touch: -150, to: 190 };
const shiftOf = (travel: number) => (travel / FULL_W) * 100 / 1.32;
const ksTravel = (t: number) => {
  if (t < KS.down) return lerp(KS.from, KS.touch, t / KS.down);
  // Slides on at the sprint's speed, slowing to a stop.
  const u = clamp01((t - KS.down) / (KS.stop - KS.down));
  return KS.touch + (KS.to - KS.touch) * (1 - (1 - u) ** 2.2);
};
function ksBody(t: number): { body: FullBodyPose; tilt: number; dip: number } {
  const kneel = kneeSlidePose();
  if (t < KS.drop) return { body: runPoseFn(t * 2.6, 1), tilt: 0, dip: 0 };
  if (t < KS.rise) {
    const k = smooth((t - KS.drop) / (KS.down - KS.drop));
    // Leaning further back as he slides (chest out), a little sway, then upright again for the hold.
    const slide = clamp01((t - KS.down) / (KS.stop - KS.down));
    const back = -8 - 7 * Math.sin(Math.PI * slide) - 3 * smooth(slide);
    const sway = 2 * Math.sin((t - KS.down) * 14) * (1 - slide) * (t > KS.down ? 1 : 0);
    // The knees take the impact: a small bounce up off the grass at touchdown.
    const dip = t > KS.down ? -1.8 * Math.sin(Math.PI * clamp01((t - KS.down) / 0.22)) : 0;
    return { body: mixPose(runPoseFn(KS.drop * 2.6, 1), { ...kneel, lean: kneel.lean - 6 * Math.sin(Math.PI * slide) }, k), tilt: back * k + sway, dip };
  }
  const k = smooth((t - KS.rise) / (KS.up - KS.rise));
  return { body: mixPose(kneel, STAND, k), tilt: -14 * (1 - k), dip: 0 };
}
/** Where his knees are on the pitch at `t` (art units, the travel included). */
function ksKnees(t: number): [number, number][] {
  const { body, tilt } = ksBody(t);
  const lift = -groundLift(body, tilt);
  return groundPoints(body)
    .slice(0, 2)
    .map((p) => {
      const [x, y] = rotateAbout(p, tilt);
      return [x + ksTravel(t), y - (lift / 100) * FULL_H] as [number, number];
    });
}

export function kneeSlideMove(t: number): ReactionFrame {
  const { body, tilt, dip } = ksBody(t);
  const lift = -groundLift(body, tilt) - dip;
  // The skids: from where the knees touched down to where they are (or stopped), fading once he is up.
  const touch = ksKnees(KS.down);
  const now = ksKnees(Math.min(t, KS.stop));
  const skids = t < KS.down ? [] : touch.map(([x0], i) => ({ x0, x1: now[i][0], y: GROUND_Y + 2 + i * 16 }));
  // Turf thrown back and up from the knees while they plough: grass blades and soil crumbs, fewer as he slows.
  const turf: NonNullable<ReactionFrame['grass']>['turf'] = [];
  for (let i = 0; i < 40; i += 1) {
    const born = KS.down + i * 0.021;
    const age = t - born;
    const pace = 1 - clamp01((born - KS.down) / (KS.stop - KS.down));
    if (age < 0 || age > 0.75 || born > KS.stop || ((i * 7) % 10) / 10 > pace + 0.15) continue;
    const [kx] = ksKnees(born)[i % 2];
    const spread = ((i * 37) % 11) / 11;
    const blade = i % 3 !== 0;
    turf.push({
      x: kx - 20 - (60 + 200 * spread) * pace * age - 40 * age,
      y: GROUND_Y - 4 - (200 + 220 * spread) * (0.5 + pace) * age + 900 * age * age,
      size: blade ? 14 + (i % 4) * 4 : 5 + (i % 3) * 2,
      rot: (blade ? 30 : 0) + age * (blade ? 900 : 300) * (i % 2 ? 1 : -1) + i * 40,
      opacity: smooth((0.75 - age) / 0.25) * (GROUND_Y - 4 - (200 + 220 * spread) * (0.5 + pace) * age + 900 * age * age > GROUND_Y + 6 ? 0 : 1),
      kind: blade ? 'blade' : 'crumb',
    });
  }
  // A puff of dust as the knees hit, spreading and settling.
  const puffs: NonNullable<ReactionFrame['grass']>['puffs'] = [];
  const pa = t - KS.down;
  if (pa >= 0 && pa < 0.9) {
    for (let i = 0; i < 5; i += 1) {
      const [kx] = touch[i % 2];
      puffs.push({ x: kx - 30 + (i - 2) * 26 - 60 * pa, y: GROUND_Y - 10 - 40 * pa * (0.6 + i * 0.15), r: 16 + 70 * pa * (0.7 + (i % 3) * 0.2), opacity: 0.45 * (1 - pa / 0.9) });
    }
  }
  const skidOpacity = t < KS.rise ? 1 : smooth((KS.up + 1.2 - t) / 1.2);
  const heap = smooth((t - KS.stop + 0.3) / 0.3) * skidOpacity;
  return { body, lift, tilt, spin: 0, shift: shiftOf(ksTravel(t)), blur: 0, fade: 1, grass: { skids, skidOpacity, turf, puffs, heap } };
}

/* ── Park the Bus: the team bus, and him sitting on its roof ─────────── */

/**
 * The bus, side on, in the figure's art units: its box (left, top = the roof, width, height down to the ground), when
 * it has parked, and how the seated figure is moved onto the roof (lift: % of the figure's height; shift: %).
 */
export const BUS = { x: 20, y: 600, w: 460, h: 236, arrive: 0.8, sitLift: -4, sitShift: -2 };

/** Sitting on the roof: thighs along it, shins hanging down the side, swinging gently; a lean back. */
export function seatedPose(now: number): FullBodyPose {
  const swing = Math.sin(now * 2.6);
  const legL = { hip: 86, knee: 90 + 9 * swing };
  const legR = { hip: 82, knee: 86 - 9 * swing };
  return {
    hipL: legL.hip,
    kneeL: legL.knee,
    ankleL: legL.knee - legL.hip + 8,
    hipR: legR.hip,
    kneeR: legR.knee,
    ankleR: legR.knee - legR.hip + 8,
    lean: -5,
    bodyX: 0,
    bodyY: 0,
  };
}

/** The bus, side on (viewBox 0 0 460 236): blue body, cyan windows, a white stripe, a shield badge, two wheels. */
export function BusArt({ wheelTurn = 0 }: { wheelTurn?: number }) {
  const wheel = (cx: number) => (
    <g transform={`translate(${cx} 204) rotate(${wheelTurn})`}>
      <circle r={30} fill="#1B1D22" stroke="#14213D" strokeWidth={4} />
      <circle r={13} fill="#C9D1DA" />
      <path d="M-13 0 H13 M0 -13 V13" stroke="#8A96A3" strokeWidth={4} />
    </g>
  );
  return (
    <svg viewBox="-6 -6 472 248" className="size-full overflow-visible" aria-hidden>
      <rect x={0} y={0} width={460} height={196} rx={26} fill="#1645FF" stroke="#14213D" strokeWidth={5} />
      <rect x={6} y={6} width={448} height={30} rx={16} fill="#3B74FF" />
      {[24, 112, 200, 288].map((x) => (
        <rect key={x} x={x} y={40} width={72} height={64} rx={10} fill="#5FD3FF" stroke="#14213D" strokeWidth={4} />
      ))}
      <rect x={376} y={40} width={66} height={118} rx={10} fill="#5FD3FF" stroke="#14213D" strokeWidth={4} />
      <rect x={0} y={122} width={366} height={14} fill="#F4F6F8" />
      <path d="M190 146 h40 v16 q0 16 -20 22 q-20 -6 -20 -22 Z" fill="#FFE500" stroke="#14213D" strokeWidth={3} />
      <rect x={446} y={150} width={14} height={22} rx={4} fill="#FFE500" />
      {wheel(92)}
      {wheel(360)}
    </svg>
  );
}

/* ── Shin Pads ──────────────────────────────────────────────────────── */

/** When they clamp on, and where his shins are on the card (%, the figure standing). */
export const PADS = { on: 0.6 };
const SHIN_ON_CARD = { L: { x: 35 + (195 / 496) * 50, y: 15.3 + (705 / FULL_H) * 52.8 }, R: { x: 35 + (295 / 496) * 50, y: 15.3 + (705 / FULL_H) * 52.8 } };

/** A shin pad, centred on (0, 0), toe direction +x: a white shield with a blue rim and a lime badge (art units). */
export function ShinPadShape() {
  return (
    <>
      <path d="M-20 -48 Q0 -56 20 -48 L22 30 Q0 52 -22 30 Z" fill="#F4F6F8" stroke="#1645FF" strokeWidth={4.5} strokeLinejoin="round" />
      <path d="M-14 -40 Q0 -46 14 -40 L15 -32 Q0 -38 -15 -32 Z" fill="#C9D6FF" />
      <path d="M-9 -12 h18 v12 q0 12 -9 16 q-9 -4 -9 -16 Z" fill="#58CC02" stroke="#14213D" strokeWidth={2} />
    </>
  );
}

/* ── Home Advantage: the club scarf ─────────────────────────────────── */

/** When it goes on, and where it sits: round the neck, the two ends down the chest (upper-body art units). */
export const SCARF = { on: 0.6, x: 235, y: 240 };

/** The scarf: a striped band round the neck, two ends hanging down, fringed (yellow and blue). */
export function ScarfArt() {
  const stripes = (id: string) => (
    <pattern id={id} width={16} height={16} patternUnits="userSpaceOnUse" patternTransform="rotate(90)">
      <rect width={8} height={16} fill="#FFE500" />
      <rect x={8} width={8} height={16} fill="#1645FF" />
    </pattern>
  );
  const end = (d: string, fringeX: number, fringeY: number, id: string) => (
    <>
      <path d={d} fill={`url(#${id})`} stroke="#14213D" strokeWidth={3} strokeLinejoin="round" />
      {[-12, -4, 4, 12].map((dx) => (
        <path key={dx} d={`M${fringeX + dx} ${fringeY} v10`} stroke="#FFE500" strokeWidth={3} strokeLinecap="round" />
      ))}
    </>
  );
  return (
    <g>
      <defs>
        {stripes('scarf-band')}
        {stripes('scarf-end')}
      </defs>
      {/* The two ends first, the wrap over them. */}
      {end('M206 246 L190 352 Q205 360 222 354 L232 252 Z', 206, 356, 'scarf-end')}
      {end('M246 252 L250 342 Q264 350 278 342 L272 248 Z', 264, 346, 'scarf-end')}
      <path
        d="M186 238 Q235 226 286 238 L284 260 Q235 250 188 262 Z"
        fill="url(#scarf-band)"
        stroke="#14213D"
        strokeWidth={3}
        strokeLinejoin="round"
      />
    </g>
  );
}
const SCARF_ON_CARD = { x: 35 + (SCARF.x / 496) * 50, y: 15.3 + (SCARF.y / FULL_H) * 52.8 };

/* ── Tiki-Taka: two team-mates, one-touch passes in a triangle ──────── */

/**
 * The team-mates, see-through and smaller (further back), behind him to the left (facing him) and to the right
 * (mirrored): their boxes in the figure's art units, and the spot at their feet each pass meets.
 */
export const MATES = { scale: 0.45, a: { left: -60, top: 316 }, b: { left: 330, top: 316 } };
const MATE_GROUND = MATES.a.top + MATES.scale * GROUND_Y;
const TT_SPOTS: [number, number][] = [
  [FOOT.R + 79 + BALL_R, GROUND_Y - BALL_R],
  [MATES.b.left + MATES.scale * (496 - FOOT.R - 80), MATE_GROUND - BALL_R * 0.55],
  [MATES.a.left + MATES.scale * (FOOT.R + 80), MATE_GROUND - BALL_R * 0.55],
];
/** The passes: him → right mate → left mate (chipped over his legs) → him, twice. */
const TT = { start: 0.45, pass: 0.3, rounds: 2, fadeIn: 0.25, out: 0.35 };
const TT_END = TT.start + TT.pass * 3 * TT.rounds;

/** A first-time touch: the leg flicks up and through, 0 at rest, 1 at the touch. */
const touchLeg = (p: FullBodyPose, k: number): FullBodyPose => ({ ...p, hipR: p.hipR + 26 * k, kneeR: p.kneeR + 38 * k, ankleR: p.ankleR + 10 * k });

function tikiTaka(t: number, now: number): ReactionFrame {
  // Arrivals at each spot: index 0 is his, 1 the right mate's, 2 the left's.
  const arrivals: number[][] = [[TT.start], [], []];
  for (let k = 0; k < 3 * TT.rounds; k += 1) arrivals[(k + 1) % 3].push(TT.start + (k + 1) * TT.pass);
  const touch = (spot: number) => Math.max(0, ...arrivals[spot].map((at) => bell(t, at - 0.12, at + 0.12)));
  const body = touchLeg(idlePose(now), touch(0));
  const mateBody = (spot: number) => touchLeg(idlePose(now + spot), touch(spot));

  let ball: ReactionBall | undefined;
  if (t >= TT.start - 0.2 && t < TT_END + TT.out + 0.3) {
    const k = Math.floor((t - TT.start) / TT.pass);
    let x: number;
    let y: number;
    if (t < TT.start || k >= 3 * TT.rounds) {
      [x, y] = TT_SPOTS[0];
    } else {
      const from = TT_SPOTS[k % 3];
      const to = TT_SPOTS[(k + 1) % 3];
      const u = (t - TT.start - k * TT.pass) / TT.pass;
      // The pass from the right mate to the left is chipped over his legs.
      const arc = k % 3 === 1 ? 150 : 20;
      x = lerp(from[0], to[0], u);
      y = lerp(from[1], to[1], u) - 4 * arc * u * (1 - u);
    }
    // Smaller further back.
    const scale = lerp(MATES.scale + 0.15, 1, clamp01((y - (MATE_GROUND - BALL_R)) / (GROUND_Y - MATE_GROUND)));
    ball = { x, y, scale, rot: t * 900, ring: 0, opacity: Math.min(smooth((t - TT.start + 0.2) / 0.15), smooth((TT_END + TT.out + 0.3 - t) / 0.25)) };
  }
  const shown = Math.min(smooth((t - 0.2) / TT.fadeIn), smooth((TT_END + TT.out - t) / TT.out));
  return { body, lift: 0, tilt: 0, spin: 0, shift: 0, blur: 0, fade: 1, ball, mates: { shown, poses: [mateBody(2), mateBody(1)] } };
}

/* ── Captain's Armband: the real armband, put on ─────────────────────── */

/**
 * Where it sits: the player's left upper arm (the viewer's right), on the short stretch of bare arm between the
 * sleeve's cuff and the elbow, wrapped across it (upper-body art units, 496 × 543; measured on the skin art — every
 * skin shares the outline), and when it arrives from the slot.
 */
export const ARMBAND = { x: 394, y: 365, angle: -47.3, fit: 0.72 };

/** The armband in the upper body's art units (CardCutout shows it, scaled and faded by the reaction). */
export function ArmbandArt() {
  return (
    <g transform={`translate(${ARMBAND.x} ${ARMBAND.y}) rotate(${ARMBAND.angle})`}>
      {/* A band wrapped round the arm: rounded ends, a darker rim top and bottom, the white C. */}
      <rect x={-26} y={-8.5} width={52} height={17} rx={4} fill="#FFE500" stroke="#14213D" strokeWidth={2.2} />
      <rect x={-24} y={-6.5} width={48} height={3} rx={1.5} fill="#FFF59A" />
      <rect x={-24} y={3.5} width={48} height={3} rx={1.5} fill="#D9A900" />
      <text x={0} y={5} textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight={900} fontSize={14} fill="#FFFFFF" stroke="#14213D" strokeWidth={1.2} paintOrder="stroke">
        C
      </text>
    </g>
  );
}

/** The armband's place on the card (%): the figure stands 35–85 % across, its upper body from 15.3 % down. */
const ARMBAND_ON_CARD = { x: 35 + (ARMBAND.x / 496) * 50, y: 15.3 + (ARMBAND.y / FULL_H) * 52.8 };

/* ── effects on the card ──────────────────────────────────────────────── */

/** A small football (art units of its own 100 box). */
function Ball({ size }: { size: string }) {
  return (
    <svg viewBox="-50 -50 100 100" style={{ width: size, height: size }} className="overflow-visible drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)]" aria-hidden>
      <circle r={46} fill="#F6F7F9" stroke="#1B1D22" strokeWidth={4} />
      <polygon points="0,-16 15,-5 9,13 -9,13 -15,-5" fill="#1B1D22" />
      {[0, 72, 144, 216, 288].map((a) => (
        <polygon key={a} points="-9,-45 9,-45 13,-33 0,-26 -13,-33" fill="#1B1D22" transform={`rotate(${a})`} />
      ))}
    </svg>
  );
}

/** The card's sticker icon as a prop, popping in at (x, y) % and doing `animate`. */
function Prop({ card, x, y, size, animate, duration, delay = 0, times }: { card: CardId; x: number; y: number; size: number; animate: Record<string, number[] | string[]>; duration: number; delay?: number; times?: number[] }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: `${x}%`, top: `${y}%`, width: `${size}%`, aspectRatio: '1', marginLeft: `${-size / 2}%`, marginTop: `${-size / 2}%` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={animate}
      transition={{ duration, delay, times, ease: 'easeOut' }}
    >
      <CardArt id={card} />
    </motion.div>
  );
}

const POP = { scale: [0, 1.25, 1, 1, 0], opacity: [0, 1, 1, 1, 0] };
const POP_TIMES = [0, 0.15, 0.25, 0.85, 1];

/**
 * The effect `card` plays on the card (keyed by the reaction, so a new landing replays it). `frameMask` cuts the
 * full-card overlays (blackout, flash, fog) to the frame's outline.
 */
function CardReactionFxInner({ card, customization, frameMask, mirror }: { card: CardId; customization: AvatarCustomization | null; frameMask: React.CSSProperties; mirror: boolean }) {
  const len = CARD_REACTION_S[card];
  const overlay = (node: React.ReactNode) => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={frameMask}>
      {node}
    </div>
  );
  const fx = (() => {
    switch (card) {
      case 'first-touch':
        // The ball is the avatar's own (CardCutout): it has to sit on the boot.
        return null;
      case 'fifty-fifty':
        return (
          <div className="absolute" style={{ left: '46%', top: '2%', width: '28%' }}>
            <div className="grid grid-cols-2 gap-[6%]">
              {[0, 1, 2, 3].map((i) => {
                const cut = i === 1 || i === 2;
                return (
                  <motion.div
                    key={i}
                    className="relative aspect-[1.6] rounded-[20%] border-2 border-white/80"
                    style={{ background: i % 3 === 0 ? '#58CC02' : '#F4F6F8' }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={cut ? { scale: [0, 1, 1, 0.8], opacity: [0, 1, 1, 0], y: [0, 0, 0, 20] } : { scale: [0, 1, 1.12, 1, 0], opacity: [0, 1, 1, 1, 0] }}
                    transition={{ duration: len - 0.1, delay: i * 0.05, times: cut ? [0, 0.2, 0.55, 0.85] : [0, 0.2, 0.6, 0.8, 1] }}
                  >
                    {cut && (
                      <motion.span
                        className="absolute left-[-10%] top-1/2 block h-[16%] w-[120%] rounded-full bg-[#FF4B4B]"
                        style={{ rotate: -20, transformOrigin: 'left center' }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: [0, 0, 1] }}
                        transition={{ duration: 0.75, times: [0, 0.55, 1] }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      case 'golden-boot': {
        const at = (sec: number) => sec / len;
        return (
          <>
            {/* The golden boot drops out of the sky onto his feet… */}
            <motion.div
              className="absolute"
              style={{ left: '60%', width: '20%', aspectRatio: '1', marginLeft: '-10%' }}
              initial={{ top: '0%', opacity: 0 }}
              animate={{ top: ['0%', '56%', '58%'], opacity: [0, 1, 0], scale: [1.2, 0.9, 0.5], rotate: [-25, 10, 0] }}
              transition={{ duration: GB.wear + 0.12, ease: 'easeIn' }}
            >
              <CardArt id="golden-boot" />
            </motion.div>
            {/* …and they turn gold: a burst at the feet. */}
            <motion.span
              className="absolute block rounded-full"
              style={{ left: '44%', top: '58%', width: '34%', aspectRatio: '2.2', background: 'radial-gradient(closest-side, rgba(255,230,90,0.95), rgba(255,180,0,0.4) 60%, transparent)' }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 0, 1, 0], scale: [0.4, 0.4, 1.3, 1.6] }}
              transition={{ duration: len, times: [0, at(GB.wear - 0.02), at(GB.wear + 0.1), at(GB.wear + 0.5)] }}
            />
            {/* The shot: a gold flash over the card and sparks off the boot. */}
            {overlay(
              <motion.div
                className="absolute inset-0"
                style={{ background: 'radial-gradient(circle at 70% 64%, rgba(255,214,10,0.8), rgba(255,170,0,0.2) 45%, transparent 70%)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0, 1, 0] }}
                transition={{ duration: len, times: [0, at(GB_CONTACT - 0.02), at(GB_CONTACT + 0.06), at(GB_CONTACT + 0.5)] }}
              />,
            )}
            {Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2;
              return (
                <motion.span
                  key={i}
                  className="absolute block size-[3%] rotate-45 rounded-[2px] bg-[#FFE500] shadow-[0_0_6px_#FFC107]"
                  style={{ left: '72%', top: '64%' }}
                  initial={{ opacity: 0 }}
                  animate={{ x: [0, Math.cos(a) * 55], y: [0, Math.sin(a) * 55 - 15], opacity: [0, 1, 0], scale: [0.4, 1.2, 0.4] }}
                  transition={{ duration: 0.7, delay: GB_CONTACT }}
                />
              );
            })}
          </>
        );
      }
      case 'captains-armband':
        return (
          <>
            {/* The armband leaves the playstyle slot and flies over to his arm… */}
            <motion.div
              className="absolute"
              style={{ width: '20%', aspectRatio: '1', marginLeft: '-10%', marginTop: '-10%' }}
              initial={{ left: '12%', top: '34%', opacity: 0, scale: 0.6 }}
              animate={{
                left: ['12%', '44%', `${ARMBAND_ON_CARD.x}%`],
                top: ['34%', '14%', `${ARMBAND_ON_CARD.y}%`],
                opacity: [0, 1, 1, 0],
                scale: [0.6, 1.15, 0.5],
                rotate: [0, -20, ARMBAND.angle],
              }}
              transition={{ duration: ARMBAND.fit + 0.06, times: [0, 0.45, 1], ease: 'easeInOut' }}
            >
              <CardArt id="captains-armband" />
            </motion.div>
            {/* …where it goes on with a flash. */}
            <motion.span
              className="absolute block rounded-full border-2 border-[#FFE500] shadow-[0_0_12px_#FFE500]"
              style={{ left: `${ARMBAND_ON_CARD.x}%`, top: `${ARMBAND_ON_CARD.y}%`, width: '14%', aspectRatio: '1', marginLeft: '-7%', marginTop: '-7%' }}
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: [0, 1, 0], scale: [0.3, 1.4, 2] }}
              transition={{ duration: 0.5, delay: ARMBAND.fit }}
            />
            {/* Captain: move 2 zones. */}
            {[0, 1].map((i) => (
              <motion.svg
                key={i}
                viewBox="0 0 40 24"
                className="absolute w-[12%]"
                style={{ left: '84%', top: '30%' }}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], y: [20, -50 - i * 22] }}
                transition={{ duration: 0.85, delay: ARMBAND.fit + 0.25 + i * 0.16, ease: 'easeOut' }}
              >
                <path d="M4 20 L20 6 L36 20" fill="none" stroke="#FFE500" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            ))}
          </>
        );
      case 'second-ball':
        // The two balls are the avatar's own (CardCutout): they have to meet his feet.
        return null;
      case 'floodlight-failure':
        return (
          <>
            {overlay(<motion.div className="absolute inset-0 bg-black" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0.2, 0.92, 0.5, 0.88, 0.88, 0] }} transition={{ duration: len, times: [0, 0.08, 0.14, 0.2, 0.26, 0.32, 0.8, 1] }} />)}
            <Prop card="floodlight-failure" x={72} y={10} size={16} animate={{ scale: [0, 1.2, 1, 1, 0], opacity: [0, 1, 1, 1, 0], rotate: [0, -8, 8, -6, 0] }} times={POP_TIMES} duration={len} />
          </>
        );
      case 'muddy-pitch':
        // The splash as he slips: drops of mud fly up and out from his feet.
        return (
          <>
            {Array.from({ length: 12 }, (_, i) => {
              const a = -Math.PI * (0.12 + (0.76 * i) / 11);
              const dist = 50 + (i % 3) * 22;
              return (
                <motion.span
                  key={i}
                  className="absolute block rounded-[50%_45%_55%_50%]"
                  style={{ left: '62%', top: '66%', width: `${2.2 + (i % 3)}%`, aspectRatio: '1', background: 'radial-gradient(circle at 35% 35%, #9A6A3A, #4A2C12 75%)' }}
                  initial={{ opacity: 0 }}
                  animate={{ x: [0, Math.cos(a) * dist], y: [0, Math.sin(a) * dist, Math.sin(a) * dist + 40], opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 0.8] }}
                  transition={{ duration: 0.75, delay: MUD_SLIP.at, times: [0, 0.4, 0.8, 1], ease: 'easeOut' }}
                />
              );
            })}
          </>
        );
      case 'fog':
        // Banks of fog roll in from both sides, sit over him, and a gust blows them away to the right; a "?" while he's lost.
        return (
          <>
            {overlay(
              <>
                {[0, 1, 2, 3, 4].map((i) => {
                  const fromLeft = i % 2 === 0;
                  const top = 6 + i * 13;
                  return (
                    <motion.span
                      key={i}
                      className="absolute block rounded-full bg-white blur-lg"
                      style={{ top: `${top}%`, width: '85%', height: '26%' }}
                      initial={{ left: fromLeft ? '-90%' : '105%', opacity: 0 }}
                      animate={{
                        left: fromLeft ? ['-90%', '-5%', '5%', '120%'] : ['105%', '15%', '5%', '120%'],
                        opacity: [0, 0.85, 0.85, 0],
                      }}
                      transition={{ duration: len - 0.3, delay: i * 0.05, times: [0, (FOG.in + 0.5) / len, FOG.clear / len, (FOG.clear + 0.6) / len], ease: 'easeInOut' }}
                    />
                  );
                })}
              </>,
            )}
            <motion.span
              className="absolute grid size-[12%] place-items-center rounded-full bg-white font-black text-[#14213D] shadow-md"
              style={{ left: '66%', top: '6%', fontSize: '1.2em' }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.2, 1, 0.6], rotate: [0, -10, 10, 0] }}
              transition={{ duration: 1.0, delay: FOG.in + 0.55 }}
            >
              ?
            </motion.span>
          </>
        );
      case 'yellow-card':
        return (
          <>
            {/* The card flies in from the top corner, into his raised hand. */}
            <motion.div
              className="absolute"
              style={{ width: '22%', aspectRatio: '1', marginLeft: '-11%', marginTop: '-11%' }}
              initial={{ left: '100%', top: '-6%', opacity: 0 }}
              animate={{ left: ['100%', '90%', `${HAND_ON_CARD.x}%`], top: ['-6%', '0%', `${HAND_ON_CARD.y}%`], opacity: [0, 1, 0], scale: [1.3, 1.1, 0.45], rotate: [40, 20, YELLOW.angle] }}
              transition={{ duration: YELLOW.catch + 0.05, times: [0, 0.4, 1], ease: 'easeIn' }}
            >
              <CardArt id="yellow-card" />
            </motion.div>
            {/* Shown: the whistle. */}
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute block h-[1.2%] w-[7%] rounded-full bg-white"
                style={{ left: `${HAND_ON_CARD.x - 22}%`, top: `${12 + i * 5}%`, rotate: 25 - i * 25 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0], x: [0, -10] }}
                transition={{ duration: 0.35, delay: YELLOW.catch + 0.1 + i * 0.05, repeat: 1 }}
              />
            ))}
          </>
        );
      case 'offside-trap': {
        const hand = { x: 35 + ((FLAG.gripX + 30) / 496) * 50, y: 15.3 + ((FLAG.gripY - 70) / FULL_H) * 52.8 };
        return (
          <>
            {/* The flag flies in from the far touchline, into his raised hand… */}
            <motion.div
              className="absolute"
              style={{ width: '22%', aspectRatio: '1', marginLeft: '-11%', marginTop: '-11%' }}
              initial={{ left: '6%', top: '20%', opacity: 0 }}
              animate={{ left: ['6%', '40%', `${hand.x}%`], top: ['20%', '2%', `${hand.y}%`], opacity: [0, 1, 0], scale: [1.1, 1.2, 0.5], rotate: [-30, -10, 0] }}
              transition={{ duration: FLAG.catch + 0.05, times: [0, 0.45, 1], ease: 'easeInOut' }}
            >
              <CardArt id="offside-trap" />
            </motion.div>
            {/* …and the line steps up under his feet. */}
            <motion.div
              className="absolute h-[1.4%] rounded-full"
              style={{ left: '26%', top: '69%', background: 'repeating-linear-gradient(90deg, #fff 0 10px, transparent 10px 16px)' }}
              initial={{ width: '0%', opacity: 0 }}
              animate={{ width: ['0%', '0%', '68%', '68%'], opacity: [0, 1, 1, 0] }}
              transition={{ duration: len, times: [0, FLAG.catch / len, (FLAG.catch + 0.4) / len, 1] }}
            />
          </>
        );
      }
      case 'var-review':
        return (
          <>
            <motion.div
              className="absolute rounded-[6%] border-[3px] border-[#1CB0F6] shadow-[0_0_14px_#1CB0F6]"
              style={{ left: '34%', top: '10%', width: '56%', height: '60%' }}
              initial={{ opacity: 0, scale: 1.2 }}
              animate={{ opacity: [0, 1, 0.6, 1, 0], scale: [1.2, 1, 1, 1, 1] }}
              transition={{ duration: len, times: [0, 0.15, 0.5, 0.8, 1] }}
            />
            <motion.div
              className="absolute h-[1%] bg-[#1CB0F6] shadow-[0_0_10px_#1CB0F6]"
              style={{ left: '34%', width: '56%' }}
              initial={{ top: '10%', opacity: 0 }}
              animate={{ top: ['10%', '70%', '10%', '70%'], opacity: [0, 1, 1, 0] }}
              transition={{ duration: len - 0.2, ease: 'linear' }}
            />
            <Prop card="var-review" x={80} y={12} size={14} animate={POP} times={POP_TIMES} duration={len} />
          </>
        );
      case 'goalkeeper-gloves':
        // The gloves and the ball are the avatar's own (CardCutout): on his hands, in his gloves.
        return null;
      case 'park-the-bus':
        // The bus is drawn with the avatar (CardCutout): he sits on it.
        return null;
      case 'shin-pads':
        return (
          <>
            {/* The pads fly from the slot to his shins… */}
            {(['L', 'R'] as const).map((leg, k) => (
              <motion.div
                key={leg}
                className="absolute"
                style={{ width: '9%', aspectRatio: '0.55', marginLeft: '-4.5%', marginTop: '-8%' }}
                initial={{ left: '12%', top: '30%', opacity: 0 }}
                animate={{ left: ['12%', '40%', `${SHIN_ON_CARD[leg].x}%`], top: ['30%', '20%', `${SHIN_ON_CARD[leg].y}%`], opacity: [0, 1, 1, 0], scale: [0.6, 1.3, 1, 1], rotate: [-30, 15, 0, 0] }}
                transition={{ duration: PADS.on + 0.04, delay: k * 0.06, times: [0, 0.45, 0.95, 1], ease: 'easeInOut' }}
              >
                <svg viewBox="-26 -58 52 112" className="size-full overflow-visible" aria-hidden>
                  <ShinPadShape />
                </svg>
              </motion.div>
            ))}
            {/* …clamp on with a shield pulse… */}
            {(['L', 'R'] as const).map((leg) => (
              <motion.span
                key={leg}
                className="absolute block rounded-[45%] border-[3px] border-[#1CB0F6] shadow-[0_0_10px_#1CB0F6]"
                style={{ left: `${SHIN_ON_CARD[leg].x}%`, top: `${SHIN_ON_CARD[leg].y}%`, width: '10%', aspectRatio: '0.6', marginLeft: '-5%', marginTop: '-8%' }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: [0, 1, 0], scale: [0.6, 1.3, 1.7] }}
                transition={{ duration: 0.5, delay: PADS.on }}
              />
            ))}
            {/* …and the knocks: a ping between the knees. */}
            {[0.3, 0.7].map((d) => (
              <motion.span
                key={d}
                className="absolute block text-[#1CB0F6]"
                style={{ left: '58%', top: '50%', fontSize: '0.9em', fontWeight: 900 }}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: [0, 1, 0], scale: [0.4, 1.3, 1] }}
                transition={{ duration: 0.35, delay: PADS.on + d }}
              >
                ✦
              </motion.span>
            ))}
          </>
        );
      case 'long-ball':
        return (
          <>
            <motion.svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute" style={{ left: '62%', top: '-6%', width: '40%', height: '70%' }} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: len, delay: 0.7 }}>
              <motion.path d="M4 96 Q 40 -10 98 6" fill="none" stroke="white" strokeWidth={2.5} strokeDasharray="6 6" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.7 }} />
            </motion.svg>
            <motion.div
              className="absolute w-[8%]"
              style={{ left: '62%', top: '60%' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0], x: ['0%', '0%', '220%', '420%'], y: ['0%', '0%', '-560%', '-640%'], rotate: [0, 0, 400, 700] }}
              transition={{ duration: 1.4, times: [0, 0.48, 0.8, 1], ease: 'easeOut' }}
            >
              <Ball size="100%" />
            </motion.div>
          </>
        );
      case 'counter-attack':
        return (
          <>
            <Prop card="counter-attack" x={62} y={6} size={18} animate={{ scale: [0, 1.2, 1, 1, 0], opacity: [0, 1, 1, 1, 0], rotate: [0, 0, 180, 180, 180] }} times={[0, 0.2, 0.55, 0.85, 1]} duration={len} />
            {overlay(
              <motion.div
                className="absolute inset-0"
                style={{ background: 'repeating-linear-gradient(0deg, transparent 0 14px, rgba(255,255,255,0.35) 14px 16px)', WebkitMaskImage: 'linear-gradient(90deg, black, transparent 40%, transparent 60%, black)', maskImage: 'linear-gradient(90deg, black, transparent 40%, transparent 60%, black)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.8, 0.2, 0.8, 0] }}
                transition={{ duration: len }}
              />,
            )}
          </>
        );
      case 'substitution':
        return <Prop card="substitution" x={60} y={34} size={26} animate={{ scale: [0, 1.15, 1, 1, 0], opacity: [0, 1, 1, 1, 0], y: [30, 0, 0, 0, 0] }} times={[0, 0.25, 0.35, 0.75, 1]} duration={len} />;
      case 'home-advantage':
        return (
          <>
            {/* The home crowd rises at the bottom of the card, scarves up, bouncing to the chant. */}
            {overlay(
              <motion.div className="absolute inset-x-0 bottom-[17%] h-[16%]" initial={{ y: '100%', opacity: 0 }} animate={{ y: ['100%', '0%', '0%', '100%'], opacity: [0, 1, 1, 0] }} transition={{ duration: len, times: [0, 0.15, 0.85, 1] }}>
                {Array.from({ length: 9 }, (_, i) => (
                  <motion.span
                    key={i}
                    className="absolute bottom-0 block"
                    style={{ left: `${-4 + i * 12}%`, width: '13%', height: '100%' }}
                    animate={{ y: ['0%', '-14%', '0%'] }}
                    transition={{ duration: 0.42, repeat: Math.ceil(len / 0.42), delay: (i % 3) * 0.12, ease: 'easeInOut' }}
                  >
                    {/* A fan: head, shoulders in the club colours, a scarf held up above. */}
                    <span className="absolute bottom-0 left-[10%] block h-[46%] w-[80%] rounded-t-[50%]" style={{ background: i % 2 ? '#1645FF' : '#FFE500', boxShadow: 'inset 0 -6px 0 rgba(0,0,0,0.2)' }} />
                    <span className="absolute bottom-[40%] left-[28%] block aspect-square w-[44%] rounded-full" style={{ background: ['#FCB37C', '#BC6022', '#D88851', '#623313'][i % 4] }} />
                    <span className="absolute left-0 top-0 block h-[16%] w-full rounded-sm" style={{ background: 'repeating-linear-gradient(90deg, #FFE500 0 6px, #1645FF 6px 12px)', rotate: `${(i % 2 ? 1 : -1) * 8}deg` }} />
                  </motion.span>
                ))}
              </motion.div>,
            )}
            {/* The scarf flies in and wraps round his neck. */}
            <motion.div
              className="absolute"
              style={{ width: '20%', aspectRatio: '1', marginLeft: '-10%', marginTop: '-10%' }}
              initial={{ left: '50%', top: '96%', opacity: 0 }}
              animate={{ left: ['50%', '70%', `${SCARF_ON_CARD.x}%`], top: ['96%', '40%', `${SCARF_ON_CARD.y}%`], opacity: [0, 1, 0], scale: [0.8, 1.1, 0.5], rotate: [0, 160, 360] }}
              transition={{ duration: SCARF.on + 0.05, times: [0, 0.5, 1], ease: 'easeOut' }}
            >
              <CardArt id="home-advantage" />
            </motion.div>
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="absolute text-[#FF4B4B]"
                style={{ left: `${44 + i * 11}%`, top: '50%', fontSize: '1.1em' }}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], y: [0, -70 - i * 10] }}
                transition={{ duration: 1.1, delay: SCARF.on + 0.2 + i * 0.15 }}
              >
                ♥
              </motion.span>
            ))}
          </>
        );
      case 'dummy-run':
        return (
          <>
            {/* The afterimage: a see-through copy keeps going the way he feinted, and fades. */}
            <motion.div
              className="absolute"
              style={{ top: '8%', width: '66%', height: '60%', left: '27%', filter: 'drop-shadow(0 0 4px #1CB0F6) saturate(0.4) brightness(1.4)' }}
              initial={{ opacity: 0, x: '0%' }}
              animate={{ opacity: [0, 0, 0.55, 0], x: ['0%', '-8%', '-40%', '-80%'] }}
              transition={{ duration: 1.2, times: [0, 0.3, 0.55, 1], delay: 0.2, ease: 'easeIn' }}
            >
              <div className="flex h-full justify-center" style={{ transform: 'scaleX(-1)' }}>
                <AvatarFullBody customization={customization} pose={runPose(0.3, 1)} style={{ height: '100%' }} />
              </div>
            </motion.div>
            {/* The fake: a sabotage card flips up over him… */}
            <motion.div
              className="absolute"
              style={{ left: '82%', top: '7%', width: '16%', aspectRatio: '0.72', marginLeft: '-8%' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: [0, 1, 1, 1, 0], y: [20, 0, 0, 0, -6], scale: [0.6, 1, 1, 1.15, 1.4] }}
              transition={{ duration: 1.5, times: [0, 0.15, 0.6, 0.75, 0.85] }}
            >
              <motion.div className="relative size-full" initial={{ rotateY: 0 }} animate={{ rotateY: [0, 0, 180, 180] }} transition={{ duration: 0.9, times: [0, 0.3, 0.6, 1] }} style={{ transformStyle: 'preserve-3d' }}>
                <div className="absolute inset-0 grid place-items-center rounded-[14%] border-2 border-white/70 text-[1.4em] font-black text-white" style={{ background: 'linear-gradient(160deg, #1D2C45, #0B1424)', backfaceVisibility: 'hidden' }}>
                  ?
                </div>
                <div className="absolute inset-0 rounded-[14%] border-2 border-[#FF4B4B] p-[10%]" style={{ background: 'linear-gradient(160deg, #6B1A1A, #2A0B0B)', transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
                  <CardArt id="floodlight-failure" />
                </div>
              </motion.div>
            </motion.div>
            {/* …and turns out to be nothing: a puff of smoke. */}
            {Array.from({ length: 7 }, (_, i) => {
              const a = (i / 7) * Math.PI * 2;
              return (
                <motion.span
                  key={i}
                  className="absolute block aspect-square w-[9%] rounded-full bg-white/80 blur-[1px]"
                  style={{ left: '78%', top: '15%' }}
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: [0, 0.9, 0], scale: [0.3, 1.3, 1.6], x: [0, Math.cos(a) * 26], y: [0, Math.sin(a) * 22] }}
                  transition={{ duration: 0.6, delay: 1.15 }}
                />
              );
            })}
            <motion.span
              className="absolute font-black text-white"
              style={{ left: '70%', top: '6%', fontSize: '0.8em', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0], y: [0, -8] }}
              transition={{ duration: 0.7, delay: 1.25 }}
            >
              DECOY!
            </motion.span>
          </>
        );
      case 'tiki-taka':
        // The team-mates and the ball are drawn with the avatar (CardCutout): the passes meet their feet.
        return null;
    }
  })();
  return (
    <div className="pointer-events-none absolute inset-0" style={{ transform: mirror ? 'scaleX(-1) translateZ(30px)' : 'translateZ(30px)' }}>
      {fx}
    </div>
  );
}

/**
 * Memoised on what it shows: the keyframes are fresh arrays each render, which motion takes as a new animation and
 * restarts — so a card that re-renders mid-reaction (the loadout's own state changing) would cut its effect short.
 */
export const CardReactionFx = memo(CardReactionFxInner, (a, b) => a.card === b.card && a.mirror === b.mirror && a.customization === b.customization);

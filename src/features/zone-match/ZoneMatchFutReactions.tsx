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
import { AvatarFullBody } from './AvatarFullBody';
import { CardArt } from './ZoneMatchCardFace';
import type { CardId } from './zoneMatch.cards';
import {
  FOOT,
  FULL_H,
  GROUND_Y,
  STAND,
  bootPoint,
  footAt,
  backpedalPose,
  celebratePose,
  crouchPose,
  divePose,
  idlePose,
  jockeyPose,
  keeperSetPose,
  mixPose,
  runPose,
  stepOverPose,
  strikePose,
  type FullBodyPose,
} from './zoneMatch.fullBody';

/** A ball the avatar plays with, in the figure's own art units (it moves with the figure): centre, spin, and a soft
 * ring 0–1 as a touch kills its pace. */
export interface ReactionBall {
  x: number;
  y: number;
  rot: number;
  ring: number;
  opacity: number;
}

export interface ReactionFrame {
  body: FullBodyPose;
  ball?: ReactionBall;
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
  'golden-boot': 1.6,
  'captains-armband': 1.4,
  'second-ball': 1.7,
  'floodlight-failure': 1.6,
  'muddy-pitch': 1.5,
  fog: 1.7,
  'yellow-card': 1.5,
  'offside-trap': 1.4,
  'var-review': 1.7,
  'goalkeeper-gloves': 1.6,
  'park-the-bus': 1.6,
  'shin-pads': 1.4,
  'long-ball': 1.6,
  'counter-attack': 1.6,
  substitution: 1.8,
  'home-advantage': 1.6,
  'dummy-run': 1.6,
  'tiki-taka': 1.5,
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
    case 'golden-boot':
      return settle({ ...still(strikePose(t * 1.05)), lift: 3 * bell(t, 0.75, 1.2) });
    case 'captains-armband':
      // Chest out, stood tall.
      return settle({ ...still({ ...STAND, lean: -8 * bell(t, 0, 1.2) }), lift: 4 * bell(t, 0.1, 1.1) });
    case 'second-ball':
      return settle(still(strikePose((t % 0.85) * 1.6 + 0.3)));
    case 'floodlight-failure':
      return settle({ ...still(crouchPose(0.55 * bell(t, 0.1, 1.4))), tilt: 3 * Math.sin(t * 40) * bell(t, 0.2, 1.2) });
    case 'muddy-pitch':
      // Slipping: the feet go, the body wobbles.
      return settle({ ...still(crouchPose(0.45 * bell(t, 0.1, 1.3))), tilt: 10 * Math.sin(t * 9) * bell(t, 0.1, 1.3), shift: 4 * Math.sin(t * 7) * bell(t, 0, 1.3) });
    case 'fog':
      return settle({ ...still({ ...crouchPose(0.25 * bell(t, 0, 1.5)), lean: 10 * bell(t, 0, 1.5) }), blur: 2.5 * bell(t, 0.3, 1.5) });
    case 'yellow-card':
      return settle({ ...still(backpedalPose(t * 1.6)), shift: -6 * bell(t, 0, 1.2), tilt: -4 * bell(t, 0.2, 1.2) });
    case 'offside-trap':
      return settle({ ...still(jockeyPose(now)), shift: 5 * bell(t, 0, 0.5) });
    case 'var-review':
      // Frozen mid-stride while the review runs, with a tiny jitter.
      return settle({ ...still(runPose(0.3, 0.6)), shift: 0.8 * Math.sign(Math.sin(t * 50)) * bell(t, 0.2, 1.4) });
    case 'goalkeeper-gloves': {
      const dir = seed % 2 ? -1 : 1;
      const k = clamp01((t - 0.25) / 0.5);
      const back = clamp01((t - 1.05) / 0.4);
      const reach = k * (1 - back);
      return settle({ ...still(t < 0.25 ? keeperSetPose(now) : divePose(k)), lift: 7 * Math.sin(Math.PI * clamp01((t - 0.25) / 0.8)) * (1 - back), tilt: 62 * dir * reach, shift: 12 * dir * reach });
    }
    case 'park-the-bus':
      return settle({ ...still(jockeyPose(now)), shift: -4 * bell(t, 0.3, 1.4) });
    case 'shin-pads':
      return settle({ ...still(crouchPose(0.4 * bell(t, 0, 1.2))), tilt: 3 * Math.sin(t * 30) * bell(t, 0.45, 0.8) });
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
    case 'home-advantage':
      return settle({ ...still(celebratePose(Math.min(t, 0.84))), lift: 9 * Math.sin(Math.PI * clamp01(((t % 0.85) / 0.85 - 0.25) / 0.55)) * (t < 0.85 ? 1 : 0) });
    case 'dummy-run':
      return settle(still(stepOverPose((t * 1.2) % 1)));
    case 'tiki-taka':
      return settle({ ...still(stepOverPose((t * 2) % 1)), shift: 2 * Math.sin(t * Math.PI * 4) });
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
      case 'golden-boot':
        return (
          <>
            {overlay(<motion.div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 66% 62%, rgba(255,214,10,0.85), rgba(255,170,0,0.25) 45%, transparent 70%)' }} initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1, 0] }} transition={{ duration: 1.2, times: [0, 0.55, 0.65, 1] }} />)}
            {Array.from({ length: 9 }, (_, i) => {
              const a = (i / 9) * Math.PI * 2;
              return (
                <motion.span
                  key={i}
                  className="absolute block size-[3%] rotate-45 rounded-[2px] bg-[#FFE500] shadow-[0_0_6px_#FFC107]"
                  style={{ left: '68%', top: '62%' }}
                  initial={{ opacity: 0 }}
                  animate={{ x: [0, Math.cos(a) * 60], y: [0, Math.sin(a) * 60 - 20], opacity: [0, 1, 0], scale: [0.4, 1.2, 0.4] }}
                  transition={{ duration: 0.8, delay: 0.75 }}
                />
              );
            })}
            <Prop card="golden-boot" x={74} y={56} size={16} animate={POP} times={POP_TIMES} duration={len} />
          </>
        );
      case 'captains-armband':
        return (
          <>
            <Prop card="captains-armband" x={44} y={30} size={15} animate={POP} times={POP_TIMES} duration={len} />
            {[0, 1].map((i) => (
              <motion.svg
                key={i}
                viewBox="0 0 40 24"
                className="absolute w-[14%]"
                style={{ left: '80%', top: '50%' }}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], y: [20, -60 - i * 25] }}
                transition={{ duration: 0.9, delay: 0.3 + i * 0.18, ease: 'easeOut' }}
              >
                <path d="M4 20 L20 6 L36 20" fill="none" stroke="#FFE500" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            ))}
          </>
        );
      case 'second-ball':
        return (
          <motion.svg
            viewBox="-60 -60 120 120"
            className="absolute w-[62%]"
            style={{ left: '29%', top: '18%' }}
            initial={{ opacity: 0, rotate: 0 }}
            animate={{ opacity: [0, 1, 1, 0], rotate: [0, 300, 660] }}
            transition={{ duration: len, times: [0, 0.15, 0.8, 1], ease: 'easeInOut' }}
          >
            <path d="M0 -52 A52 52 0 1 1 -45 26" fill="none" stroke="#58CC02" strokeWidth={8} strokeLinecap="round" />
            <path d="M-58 14 L-45 30 L-30 16" fill="none" stroke="#58CC02" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        );
      case 'floodlight-failure':
        return (
          <>
            {overlay(<motion.div className="absolute inset-0 bg-black" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0.2, 0.92, 0.5, 0.88, 0.88, 0] }} transition={{ duration: len, times: [0, 0.08, 0.14, 0.2, 0.26, 0.32, 0.8, 1] }} />)}
            <Prop card="floodlight-failure" x={72} y={10} size={16} animate={{ scale: [0, 1.2, 1, 1, 0], opacity: [0, 1, 1, 1, 0], rotate: [0, -8, 8, -6, 0] }} times={POP_TIMES} duration={len} />
          </>
        );
      case 'muddy-pitch':
        return (
          <>
            {[
              { x: 50, y: 58, s: 13 },
              { x: 70, y: 66, s: 10 },
              { x: 60, y: 72, s: 16 },
              { x: 80, y: 57, s: 8 },
              { x: 42, y: 70, s: 9 },
            ].map((b, i) => (
              <motion.span
                key={i}
                className="absolute block rounded-[45%_55%_60%_40%/50%_40%_60%_50%]"
                style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.s}%`, aspectRatio: '1.2', background: 'radial-gradient(circle at 35% 35%, #9A6A3A, #4A2C12 75%)' }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.15, 1, 1], opacity: [0, 1, 1, 0] }}
                transition={{ duration: len - 0.1, delay: 0.1 + i * 0.06, times: [0, 0.12, 0.2, 1] }}
              />
            ))}
          </>
        );
      case 'fog':
        return overlay(
          <>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute block h-[22%] w-[70%] rounded-full bg-white/70 blur-md"
                style={{ top: `${18 + i * 18}%` }}
                initial={{ left: i % 2 ? '100%' : '-70%', opacity: 0 }}
                animate={{ left: i % 2 ? ['100%', '20%', '-70%'] : ['-70%', '10%', '100%'], opacity: [0, 0.9, 0] }}
                transition={{ duration: len, delay: i * 0.1, ease: 'easeInOut' }}
              />
            ))}
          </>,
        );
      case 'yellow-card':
        return (
          <>
            <Prop card="yellow-card" x={78} y={22} size={20} animate={{ scale: [0, 1.4, 1, 1, 0], opacity: [0, 1, 1, 1, 0], rotate: [-40, 8, 0, 0, 0], y: [-60, 0, 0, 0, 0] }} times={POP_TIMES} duration={len} />
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute block h-[1.2%] w-[8%] rounded-full bg-white"
                style={{ left: '88%', top: `${16 + i * 6}%`, rotate: -25 + i * 25 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0], x: [0, 12] }}
                transition={{ duration: 0.4, delay: 0.25 + i * 0.05, repeat: 1 }}
              />
            ))}
          </>
        );
      case 'offside-trap':
        return (
          <>
            <Prop card="offside-trap" x={36} y={34} size={18} animate={{ scale: [0, 1.2, 1, 1, 0], opacity: [0, 1, 1, 1, 0], rotate: [0, -18, 14, -12, 0] }} times={POP_TIMES} duration={len} />
            <motion.div
              className="absolute h-[1.4%] rounded-full"
              style={{ left: '26%', top: '69%', background: 'repeating-linear-gradient(90deg, #fff 0 10px, transparent 10px 16px)' }}
              initial={{ width: '0%', opacity: 1 }}
              animate={{ width: ['0%', '68%', '68%'], opacity: [1, 1, 0] }}
              transition={{ duration: len, times: [0, 0.35, 1] }}
            />
          </>
        );
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
        return <Prop card="goalkeeper-gloves" x={60} y={14} size={20} animate={{ scale: [0, 1.3, 1, 1, 0], opacity: [0, 1, 1, 1, 0], rotate: [0, -10, 6, 0, 0] }} times={POP_TIMES} duration={len} />;
      case 'park-the-bus':
        return (
          <motion.div
            className="absolute"
            style={{ top: '52%', width: '30%', aspectRatio: '1' }}
            initial={{ left: '-35%' }}
            animate={{ left: ['-35%', '44%', '44%', '44%'], scale: [1, 1, 1.08, 1], opacity: [1, 1, 1, 0] }}
            transition={{ duration: len, times: [0, 0.45, 0.55, 1], ease: 'easeOut' }}
          >
            <CardArt id="park-the-bus" />
          </motion.div>
        );
      case 'shin-pads':
        return (
          <>
            <motion.span
              className="absolute block rounded-[50%] border-[3px] border-[#1CB0F6] shadow-[0_0_12px_#1CB0F6,inset_0_0_10px_rgba(28,176,246,0.6)]"
              style={{ left: '45%', top: '46%', width: '32%', height: '26%' }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 1, 0.6, 1, 0], scale: [0.5, 1.05, 1, 1.08, 1.2] }}
              transition={{ duration: len, times: [0, 0.2, 0.45, 0.6, 1] }}
            />
            <Prop card="shin-pads" x={82} y={50} size={14} animate={POP} times={POP_TIMES} duration={len} />
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
            {overlay(
              <motion.div
                className="absolute inset-x-[-10%] bottom-[18%] h-[12%]"
                style={{ background: 'repeating-linear-gradient(90deg, #FFE500 0 18px, #1645FF 18px 36px)', borderRadius: 6 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: [0, 1, 1, 0], y: [20, 0, 0, 10], skewY: [0, -4, 4, -4, 0] }}
                transition={{ duration: len }}
              />,
            )}
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="absolute text-[#FF4B4B]"
                style={{ left: `${44 + i * 11}%`, top: '50%', fontSize: '1.1em' }}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], y: [0, -70 - i * 10] }}
                transition={{ duration: 1.1, delay: 0.2 + i * 0.12 }}
              >
                ♥
              </motion.span>
            ))}
          </>
        );
      case 'dummy-run':
        // The decoy: a see-through copy of the player sprinting off the other way.
        return (
          <motion.div
            className="absolute"
            style={{ top: '8%', width: '66%', height: '60%', left: '27%', filter: 'drop-shadow(0 0 4px #1CB0F6) saturate(0.4) brightness(1.4)' }}
            initial={{ opacity: 0, x: '0%' }}
            animate={{ opacity: [0, 0.5, 0.45, 0], x: ['0%', '-10%', '-60%', '-90%'] }}
            transition={{ duration: len, times: [0, 0.15, 0.7, 1], ease: 'easeIn' }}
          >
            <div className="flex h-full justify-center" style={{ transform: 'scaleX(-1)' }}>
              <AvatarFullBody customization={customization} pose={runPose(0.3, 1)} style={{ height: '100%' }} />
            </div>
          </motion.div>
        );
      case 'tiki-taka':
        return (
          <motion.div className="absolute" style={{ left: '34%', top: '22%', width: '52%', aspectRatio: '1' }} initial={{ opacity: 0, rotate: 0 }} animate={{ opacity: [0, 1, 1, 0], rotate: [0, 240] }} transition={{ duration: len, times: [0, 0.15, 0.85, 1], ease: 'linear' }}>
            {[0, 120, 240].map((a) => (
              <span
                key={a}
                className="absolute block size-[14%] rounded-full border-2 border-white bg-[#1645FF]"
                style={{ left: `${50 + 42 * Math.cos(((a - 90) * Math.PI) / 180) - 7}%`, top: `${50 + 42 * Math.sin(((a - 90) * Math.PI) / 180) - 7}%` }}
              />
            ))}
            <motion.div className="absolute w-[11%]" style={{ left: '44.5%', top: '1%' }} animate={{ left: ['44.5%', '80%', '9%', '44.5%'], top: ['1%', '64%', '64%', '1%'] }} transition={{ duration: 0.75, repeat: 1, ease: 'easeInOut' }}>
              <Ball size="100%" />
            </motion.div>
          </motion.div>
        );
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

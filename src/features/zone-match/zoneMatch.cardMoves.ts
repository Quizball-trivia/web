/**
 * The newer playstyles' own reactions on the player card (cardMotion): Nutmeg, High Press, Time Wasting, Super Sub,
 * Feint, Poker Face and Screamer. Each has a see-through opponent where the move needs one (the defender the ball goes
 * through, the attacker who daren't shoot) — a duet drops him for the real one, and some moves end differently there
 * (`duet`). Facing +x; the ball is on the pitch (art units, the figure unmoved) and placed into the figure's frame,
 * which only shifts and lifts here. Where the see-through opponent stands, the player works further left, so the two
 * don't overlap on the narrow card.
 */

import {
  ARMS_REST,
  FOOT,
  FULL_W,
  GROUND_Y,
  STAND,
  bootPoint,
  celebratePose,
  crouchPose,
  footAt,
  idlePose,
  mixArms,
  mixPose,
  runPose,
  strikePose,
  type ArmPose,
  type ArmSegments,
  type FullBodyPose,
} from './zoneMatch.fullBody';
import { slideTackleMove, type ReactionBall, type ReactionFrame } from './ZoneMatchFutReactions';

const BALL_R = 46;
const BALL_Y = GROUND_Y - BALL_R;
/** Art units per 1 % of the frame's shift (a share of the cut-out area, 1.319 × the art's width). */
const SHIFT_ART = (FULL_W * 1.319) / 100;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => {
  const k = clamp01(t);
  return k * k * (3 - 2 * k);
};
const bell = (t: number, t0: number, t1: number) => Math.sin(Math.PI * clamp01((t - t0) / (t1 - t0))) ** 2;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Eased between keys, held before the first and after the last. */
function track<T>(keys: [number, T][], t: number, mix: (a: T, b: T, k: number) => T): T {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i += 1) {
    const [t0, a] = keys[i];
    const [t1, b] = keys[i + 1];
    if (t < t1) return mix(a, b, smooth((t - t0) / (t1 - t0)));
  }
  return keys[keys.length - 1][1];
}
const num = (a: number, b: number, k: number) => lerp(a, b, k);

/** The right sole resting on a ball at `x` (figure frame), the left boot planted. */
function soleOn(x: number): FullBodyPose {
  const bodyY = STAND.bodyY + 10;
  const r = footAt('R', x - 22, GROUND_Y - 2 * BALL_R - 33, 0, bodyY);
  const l = footAt('L', FOOT.L, GROUND_Y - 37, 0, bodyY);
  return { hipL: l.hip, kneeL: l.knee, ankleL: l.ankle, hipR: r.hip, kneeR: r.knee, ankleR: r.ankle, lean: 4, bodyX: 0, bodyY };
}
/** Legs wide and low, waiting for it (a defender's jockey with the gap between his feet). */
const WIDE: FullBodyPose = { ...crouchPose(0.35), hipL: -24, hipR: 24, kneeL: 20, kneeR: 20 };

/* Arms as screen angles (0 down, 90 towards +x, 180 up, −90 towards −x): set directly, no reach solving. */
const seg = (upper: number, fore: number, hand: number, shape: ArmSegments['shape']): ArmSegments => ({ upper, fore, hand, shape });
/** Hanging relaxed at his sides. */
const ARMS_DOWN: ArmPose = { L: seg(-12, -4, -2, 'open'), R: seg(12, 4, 2, 'open') };
/** Swinging as he runs: the elbows bent, opposite to the legs. */
const runArms = (phase: number): ArmPose => {
  const s = Math.sin(phase * Math.PI * 2);
  return { L: seg(-20 + 18 * s, -40 + 18 * s, -40, 'fist'), R: seg(20 + 18 * s, 40 + 18 * s, 40, 'fist') };
};
/** Both fists up in a V, arms straight, well clear of his head. */
const ARMS_V: ArmPose = { L: seg(-165, -172, -172, 'fist'), R: seg(165, 172, 172, 'fist') };
/** Hands on hips, elbows out: the stop between any pose and the art's own raised arms. */
const ARMS_MID: ArmPose = { L: seg(-52, 14, 14, 'flat'), R: seg(52, -14, -14, 'flat') };
/** The art's own raised arms, with the left forearm's angle wound the outward way round, so a straight blend from the
 * hips swings the hands out and up — never across his chest. */
const REST_OUT: ArmPose = { L: { ...ARMS_REST.L, fore: ARMS_REST.L.fore - 360, hand: ARMS_REST.L.hand - 360 }, R: ARMS_REST.R };
/** Arms out-down at the art's own shoulder angles, forearms still hanging: the forearm only flips up after this. */
const PREP: ArmPose = { L: seg(ARMS_REST.L.upper, -25, -25, 'open'), R: seg(ARMS_REST.R.upper, 25, 25, 'open') };
/** A straight blend of the angles (no short way round), the elbow a beat behind the shoulder. */
function mixLinear(a: ArmPose, b: ArmPose, k: number): ArmPose {
  const ku = smooth(k);
  // The forearm swings late and fast, so it never hangs level.
  const kf = smooth((k - 0.4) / 0.35);
  const side = (x: ArmSegments, y: ArmSegments): ArmSegments => ({ upper: lerp(x.upper, y.upper, ku), fore: lerp(x.fore, y.fore, kf), hand: lerp(x.hand, y.hand, kf), shape: kf < 0.5 ? x.shape : y.shape });
  return { L: side(a.L, b.L), R: side(a.R, b.R) };
}
/** A chain of arm poses, each leg a straight staggered blend. */
function chain(keys: [number, ArmPose][], t: number): ArmPose {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i += 1) {
    const [t0, a] = keys[i];
    const [t1, b] = keys[i + 1];
    if (t < t1) return mixLinear(a, b, (t - t0) / (t1 - t0));
  }
  return keys[keys.length - 1][1];
}
/** From `from` back to the art's own arms over [t0, t1]: quickly down to his sides, onto his hips, then up. */
const toRest = (from: ArmPose, t: number, t0: number, t1: number): ArmPose | undefined => {
  if (t >= t1) return undefined;
  const d = t1 - t0;
  const keys: [number, ArmPose][] = [[t0, from], [t0 + 0.2 * d, ARMS_DOWN], [t0 + 0.42 * d, ARMS_MID], [t1 - 0.17, PREP], [t1 - 0.12, REST_OUT]];
  // The forearms flip up one after the other (the right first), each in a blink: never both fists up mid-swing.
  return { L: chain(keys.map(([k, a]) => [k + 0.12, a]), t).L, R: chain(keys, t).R };
};
/** From the art's own arms (k 0) to `target` (k 1), via the hips. */
const fromRest = (target: ArmPose, k: number): ArmPose => chain([[0, REST_OUT], [0.2, PREP], [0.5, ARMS_MID], [1, target]], k);
/** Arms folded across his chest: upper arms a little out, forearms level, one over the other. */
const ARMS_FOLDED: ArmPose = { L: seg(-22, 92, 92, 'flat'), R: seg(22, -86, -86, 'flat') };

/** A ball on the pitch → in the figure's frame (which here only shifts and lifts). */
const inFigure = (p: [number, number], shift: number, lift = 0): [number, number] => [p[0] - shift * SHIFT_ART, p[1] + (lift / 100) * 840];
function ballAt(p: [number, number], shift: number, rot: number, opacity: number, extra: Partial<ReactionBall> = {}): ReactionBall {
  const [x, y] = inFigure(p, shift);
  return { x, y, rot, ring: 0, opacity, ...extra };
}
const frame = (body: FullBodyPose, rest: Partial<ReactionFrame> = {}): ReactionFrame => ({ body, lift: 0, tilt: 0, spin: 0, shift: 0, blur: 0, fade: 1, directional: true, ...rest });
/** The see-through opponent's size. */
const GHOST_SCALE = 0.62;

/* ── Nutmeg: drag it left, slip it through his legs, go round him ───────── */

/**
 * The ball is played in to him; he stops it under his sole and drags it well left across himself (the defender bites
 * and shuffles across), then pokes it right — through the defender's legs — runs round him and puts his foot on it.
 * In a duet it goes across to the rival instead, and he celebrates.
 */
export const NUTMEG = { arrive: 0.45, drag: [0.5, 1.0] as const, poke: 1.05, through: 1.3, rest: 1.8, end: 2.6 };
const NUTMEG_SHIFT = { base: -4, dragged: -16, round: 4, clear: 8 };
const NUTMEG_GHOST_X = [432, 395] as const;
/** The poke and the roll (pitch frame): out from under him, through the gap, on to where he collects it. */
const NUTMEG_FROM = -20;
const NUTMEG_REST = 405;
export const NUTMEG_POKE_POINT: [number, number] = [NUTMEG_FROM, BALL_Y];
function nutmegBallX(t: number): number {
  const start = FOOT.R + 50 + NUTMEG_SHIFT.base * SHIFT_ART;
  if (t < NUTMEG.arrive) return lerp(-200, start, smooth(t / NUTMEG.arrive));
  if (t < NUTMEG.drag[0]) return start;
  if (t < NUTMEG.poke) return lerp(start, NUTMEG_FROM, smooth((t - NUTMEG.drag[0]) / (NUTMEG.drag[1] - NUTMEG.drag[0])));
  // Hit hard as the boot comes through it, slowing on the grass.
  return lerp(NUTMEG_FROM, NUTMEG_REST, 1 - (1 - clamp01((t - NUTMEG.poke - 0.07) / (NUTMEG.rest - NUTMEG.poke - 0.07))) ** 2.2);
}
export function nutmegMove(t: number, now: number, duet = false): ReactionFrame {
  const s = NUTMEG_SHIFT;
  const shift = track<number>([[0, s.base], [NUTMEG.drag[0], s.base], [NUTMEG.drag[1], s.dragged], [NUTMEG.poke + 0.15, s.dragged], [NUTMEG.rest, s.round], [NUTMEG.rest + 0.35, duet ? s.round : s.clear], [NUTMEG.end, duet ? s.round : s.clear]], t, num);
  const bx = nutmegBallX(t);
  const figX = bx - shift * SHIFT_ART;
  let body: FullBodyPose;
  if (t < NUTMEG.arrive) body = mixPose(idlePose(now), { ...crouchPose(0.2), lean: 6 }, smooth(t / NUTMEG.arrive));
  else if (t < NUTMEG.poke) body = mixPose({ ...crouchPose(0.2), lean: 6 }, soleOn(figX), smooth((t - NUTMEG.arrive) / 0.15));
  else if (t < NUTMEG.poke + 0.2) {
    // The poke: the right boot flicks out to the right off the ball.
    const k = bell(t, NUTMEG.poke - 0.02, NUTMEG.poke + 0.2);
    body = mixPose(soleOn(NUTMEG_FROM - shift * SHIFT_ART), { ...STAND, hipR: STAND.hipR + 34, kneeR: 20, ankleR: -10, lean: -4 }, k);
  } else if (t < NUTMEG.rest) body = runPose((t - NUTMEG.poke) * 3.2, 1);
  else if (duet) body = mixPose(runPose((NUTMEG.rest - NUTMEG.poke) * 3.2, 1), celebratePose(t - NUTMEG.rest), smooth((t - NUTMEG.rest) / 0.15));
  else body = mixPose(runPose((NUTMEG.rest - NUTMEG.poke) * 3.2, 1), soleOn(NUTMEG_REST - shift * SHIFT_ART), smooth((t - NUTMEG.rest) / 0.2));
  const arms =
    t < NUTMEG.poke + 0.2
      ? track<ArmPose>([[0, ARMS_DOWN], [NUTMEG.poke - 0.1, ARMS_DOWN], [NUTMEG.poke + 0.05, { L: seg(-50, -40, -40, 'open'), R: seg(20, 10, 10, 'open') }]], t, mixArms)
      : t < NUTMEG.rest
        ? runArms((t - NUTMEG.poke) * 1.6)
        : t < NUTMEG.end - 0.45
          ? track<ArmPose>([[NUTMEG.rest, runArms(0)], [NUTMEG.rest + 0.09, ARMS_V]], t, mixArms)
          : toRest(ARMS_V, t, NUTMEG.end - 0.45, NUTMEG.end);
  // The defender: in, biting on the drag (across, low), legs wide as it goes through, turning to watch it go, gone.
  // Bites on the drag (well across), then back to block — legs wide as it comes.
  const gx = track<number>([[0, NUTMEG_GHOST_X[0]], [NUTMEG.drag[0], NUTMEG_GHOST_X[0]], [NUTMEG.drag[1] - 0.1, 365], [NUTMEG.poke, NUTMEG_GHOST_X[1]]], t, num);
  const ghostPose = track<FullBodyPose>([[0.2, STAND], [NUTMEG.drag[0], { ...crouchPose(0.3), lean: 10 }], [NUTMEG.poke, WIDE], [NUTMEG.through + 0.1, WIDE], [NUTMEG.rest, { ...STAND, lean: -8 }]], t, mixPose);
  const ghost = {
    x: gx,
    scale: GHOST_SCALE,
    pose: ghostPose,
    // Gone once he's turned, so our man runs round into clear space.
    opacity: smooth((t - 0.1) / 0.3) * (1 - smooth((t - 1.6) / 0.3)),
    facing: -1 as const,
    // Turns to watch it go once it's through — a snap, never edge-on.
    spin: t > NUTMEG.through + 0.1 ? 180 : 0,
  };
  const ballOpacity = duet ? 1 : Math.min(smooth(t / 0.12), smooth((NUTMEG.end - 0.05 - t) / 0.35));
  const rolled = (bx + 260) / BALL_R;
  return frame({ ...body, arms }, { shift, ghost, ball: ballAt([bx, BALL_Y], shift, (rolled * 180) / Math.PI, ballOpacity, { behind: !duet && Math.abs(bx - NUTMEG_GHOST_X[1]) < 70 && t > NUTMEG.poke }) });
}

/* ── High Press: sprint at him, nick it off his toe, away with it ─────────── */

export const PRESS = { go: 0.3, nick: 1.1, gone: 1.6, end: 2.6 };
const PRESS_SHIFT = { from: -26, at: -4 };
const PRESS_BALL: [number, number] = [372, BALL_Y];
const PRESS_KEEP_X = 145;
export const PRESS_NICK_POINT = PRESS_BALL;
export function highPressMove(t: number, now: number): ReactionFrame {
  const shift = track<number>([[0, PRESS_SHIFT.from], [PRESS.go, PRESS_SHIFT.from], [PRESS.nick, PRESS_SHIFT.at], [PRESS.gone, -12], [PRESS.end, -12]], t, num);
  // On his toes pointing at him, the sprint in (really covering ground), the lunge with the right boot to the ball,
  // the ball hooked back under his sole.
  const lunge = (() => {
    const bodyY = STAND.bodyY + 50;
    const r = footAt('R', PRESS_BALL[0] - PRESS_SHIFT.at * SHIFT_ART - 12, GROUND_Y - 40, 0, bodyY);
    const l = footAt('L', FOOT.L - 40, GROUND_Y - 37, 0, bodyY);
    return { hipL: l.hip, kneeL: l.knee, ankleL: l.ankle, hipR: r.hip, kneeR: r.knee, ankleR: r.ankle, lean: 26, bodyX: 0, bodyY };
  })();
  let body: FullBodyPose;
  if (t < PRESS.go) body = mixPose(idlePose(now), { ...crouchPose(0.25), lean: 10 }, smooth(t / PRESS.go));
  else if (t < PRESS.nick - 0.16) body = runPose((t - PRESS.go) * 3.8, 1.2);
  else if (t < PRESS.nick + 0.08) body = mixPose(runPose((PRESS.nick - 0.16 - PRESS.go) * 3.8, 1.2), lunge, smooth((t - PRESS.nick + 0.16) / 0.16));
  else body = mixPose(lunge, soleOn(PRESS_KEEP_X - shift * SHIFT_ART), smooth((t - PRESS.nick - 0.2) / 0.4));
  // Pointing at him (at his chest, not past him), arms pumping in the sprint, a fist when it's his.
  const point: ArmPose = { L: seg(-14, -6, 0, 'open'), R: seg(62, 58, 58, 'point') };
  const fist: ArmPose = { L: seg(-12, -4, -2, 'open'), R: seg(105, 178, 178, 'fist') };
  const arms =
    t < PRESS.go + 0.05
      ? point
      : t < PRESS.nick
        ? runArms((t - PRESS.go) * 1.9)
        : t < PRESS.end - 0.4
          ? track<ArmPose>([[PRESS.nick, { L: seg(-55, -40, -40, 'open'), R: seg(25, 15, 15, 'open') }], [PRESS.gone, ARMS_DOWN], [PRESS.gone + 0.2, fist]], t, mixArms)
          : toRest(fist, t, PRESS.end - 0.4, PRESS.end);
  // The ball: at his feet (the defender's), nicked back towards the presser's own feet.
  const bx = t < PRESS.nick ? PRESS_BALL[0] : lerp(PRESS_BALL[0], PRESS_KEEP_X, 1 - (1 - clamp01((t - PRESS.nick) / (PRESS.gone - PRESS.nick))) ** 2);
  const ball = ballAt([bx, BALL_Y], shift, t < PRESS.nick ? 0 : -((PRESS_BALL[0] - bx) / BALL_R) * 57, Math.min(smooth(t / 0.2), smooth((PRESS.end - 0.02 - t) / 0.3)));
  // The defender, ball at his feet: rushed — a flinch, a stumble as it's taken (on the spot, inside the card), gone.
  const ghostPose = { ...track<FullBodyPose>([[0, STAND], [PRESS.nick - 0.25, { ...crouchPose(0.2), lean: -8 }], [PRESS.nick + 0.1, { ...crouchPose(0.5), lean: -18 }], [PRESS.gone, { ...crouchPose(0.3), lean: -10 }]], t, mixPose), arms: fromRest({ L: seg(-25, -40, -40, 'open'), R: seg(25, 40, 40, 'open') }, smooth((t - PRESS.nick) / 0.35)) };
  // Knocked back a step as it's taken, leaning back, still inside the card.
  const knocked = smooth((t - PRESS.nick) / 0.3);
  const ghost = {
    x: lerp(440, 400, smooth(t / 0.6)) + 25 * knocked,
    front: t > PRESS.nick + 0.3,
    scale: GHOST_SCALE,
    pose: ghostPose,
    opacity: smooth(t / 0.25) * (1 - smooth((t - 1.75) / 0.35)),
    facing: -1 as const,
    tilt: -15 * bell(t, PRESS.nick - 0.05, PRESS.gone + 0.3),
  };
  return frame({ ...body, arms }, { shift, ghost, ball });
}

/* ── Time Wasting: sits on the ball and checks his watch ──────────────────── */

export const WASTE = { sit: [0.3, 0.95] as const, watch: [0.95, 1.75] as const, stretch: [1.75, 2.05] as const, up: [2.05, 2.65] as const, end: 2.85 };
const WASTE_SEAT: FullBodyPose = (() => {
  // Sat on the ball: thighs out level either side, shins straight down to the grass, leaning back.
  const bodyY = GROUND_Y - 37 - 150 - 505;
  // The left leg stretched straight out, heel on the grass; the right thigh out, shin down.
  return { hipL: -90, kneeL: -20, ankleL: 20, hipR: 90, kneeR: 90, ankleR: 0, lean: -22, bodyX: 0, bodyY };
})();
export function timeWastingMove(t: number, now: number): ReactionFrame {
  // The ball rolls in under him; he sits down on it; crosses a leg and holds his wrist up in front of him, looking at
  // the watch; a big stretch with the palms up over his head; up again, slowly.
  const seat = smooth((t - WASTE.sit[0]) / (WASTE.sit[1] - WASTE.sit[0])) * (1 - smooth((t - WASTE.up[0]) / (WASTE.up[1] - WASTE.up[0])));
  // One foot tapping, lazily.
  const tap = Math.max(0, Math.sin(t * 9)) * bell(t, WASTE.watch[0], WASTE.watch[1]);
  // Down through a squat (knees bend, hips drop), then back onto the ball.
  const down = t < WASTE.up[0] ? track<FullBodyPose>([[WASTE.sit[0], idlePose(now)], [WASTE.sit[0] + 0.35, crouchPose(0.85)], [WASTE.sit[1], WASTE_SEAT]], t, mixPose) : mixPose(idlePose(now), WASTE_SEAT, seat);
  const body = { ...down, ankleR: down.ankleR - 22 * tap };
  // The left forearm level across his chest (the watch), the right hand planted behind him on the ball.
  const watch: ArmPose = { L: seg(-15, 148, 128, 'flat'), R: seg(28, 18, 18, 'flat') };
  // The stretch: both hands up, meeting over his head (elbows bent, inside the card).
  const stretch: ArmPose = { L: seg(-150, 140, 140, 'open'), R: seg(150, -140, -140, 'open') };
  // Getting up: hands pushing on his knees.
  const push: ArmPose = { L: seg(-35, -20, -20, 'flat'), R: seg(35, 20, 20, 'flat') };
  const arms = t < WASTE.up[1] ? track<ArmPose>([[0, ARMS_DOWN], [WASTE.sit[1], ARMS_DOWN], [WASTE.watch[0], watch], [WASTE.watch[1], watch], [WASTE.stretch[0] + 0.12, stretch], [WASTE.stretch[1], stretch], [WASTE.up[0] + 0.12, push], [WASTE.up[1] - 0.05, push]], t, mixArms) : toRest(push, t, WASTE.up[1], WASTE.end);
  const bx = t < 0.35 ? lerp(620, FULL_W / 2, 1 - (1 - t / 0.35) ** 2) : FULL_W / 2;
  // Behind him once he's sat on it.
  const ballY = BALL_Y - 48 * seat;
  const ball = ballAt([bx, ballY], 0, ((620 - bx) / BALL_R) * -57, Math.min(smooth(t / 0.12), smooth((WASTE.end - 0.05 - t) / 0.25)), { behind: t >= WASTE.sit[0] });
  // A slow sway while he sits (nowhere to be), longer in the stretch.
  const shift = 4 * seat;
  return frame({ ...body, arms }, { ball: { ...ball, x: ball.x - shift * SHIFT_ART }, shift, tilt: 2 * Math.sin(t * 2.4) * seat, lift: 3 * bell(t, WASTE.stretch[0], WASTE.stretch[1] + 0.1) * seat });
}

/* ── Super Sub: on from the touchline, the star back ─────────────────────── */

export const SUPER = { inFrom: 0.1, arrive: 0.85, jump: [1.12, 2.17] as const, end: 2.6 };
export function superSubMove(t: number, now: number): ReactionFrame {
  const run = smooth((t - SUPER.inFrom) / (SUPER.arrive - SUPER.inFrom));
  // In from behind the stat column (which is drawn over him), solid, two clear strides to the middle.
  const shift = -54 * (1 - run);
  const jumping = t >= SUPER.jump[0] && t < SUPER.jump[1];
  let body: FullBodyPose;
  if (t < SUPER.arrive) body = runPose(t * 3.4, 1.1);
  else if (t < SUPER.jump[0]) body = mixPose(runPose(SUPER.arrive * 3.4, 1.1), crouchPose(0.95), smooth((t - SUPER.arrive) / 0.1));
  else if (jumping) body = celebratePose(t - SUPER.jump[0]);
  else body = mixPose(celebratePose(SUPER.jump[1] - SUPER.jump[0]), idlePose(now), smooth((t - SUPER.jump[1]) / 0.2));
  // One big jump (a crouch first), then a smaller one.
  const j = t - SUPER.jump[0];
  const lift = jumping ? (j < 0.85 ? 16 : 9) * Math.sin(Math.PI * clamp01(((j % 0.85) / 0.85 - 0.15) / 0.6)) : 0;
  // Arms down and back in the crouch, thrown up as he takes off.
  const back: ArmPose = { L: seg(-22, -30, -30, 'open'), R: seg(22, 30, 30, 'open') };
  const arms = t < SUPER.arrive ? runArms(t * 1.7) : t < SUPER.jump[1] ? track<ArmPose>([[SUPER.arrive, runArms(0)], [SUPER.arrive + 0.1, back], [SUPER.jump[0], back], [SUPER.jump[0] + 0.03, { L: seg(-60, -150, -150, 'fist'), R: seg(60, 150, 150, 'fist') }], [SUPER.jump[0] + 0.07, ARMS_V]], t, mixArms) : toRest(ARMS_V, t, SUPER.jump[1], SUPER.end);
  // He jumps a little to the right of the ratings.
  return frame({ ...body, arms }, { shift: shift + 3 * smooth((t - SUPER.arrive) / 0.3), lift, clipEdge: t < SUPER.arrive });
}

/* ── Feint: shapes to shoot, doesn't — the Cruyff turn ──────────────────── */

export const FEINT = { wind: [0.15, 0.55] as const, hold: 0.8, cut: [0.8, 1.1] as const, away: [1.1, 1.65] as const, end: 2.2 };
const FEINT_SHIFT = { base: -6, away: -22 };
const FEINT_BALL_X = FOOT.R + 50 + FEINT_SHIFT.base * SHIFT_ART;
const FEINT_CUT_X = FOOT.L - 25 + FEINT_SHIFT.base * SHIFT_ART;
export function feintMove(t: number, now: number): ReactionFrame {
  // The full shooting wind-up, held (big backlift, arm out), but the foot comes down beside the ball and drags it back
  // behind the standing leg; the hips cut and he's away the other way with it, the ball kept at his feet.
  const shift = track<number>([[0, FEINT_SHIFT.base], [FEINT.away[0], FEINT_SHIFT.base], [FEINT.away[1], FEINT_SHIFT.away], [FEINT.end, FEINT_SHIFT.away]], t, num);
  const wound = strikePose(0.62);
  let body: FullBodyPose;
  if (t < FEINT.wind[0]) body = mixPose(idlePose(now), STAND, smooth(t / FEINT.wind[0]));
  else if (t < FEINT.wind[1]) body = strikePose(lerp(0, 0.62, smooth((t - FEINT.wind[0]) / (FEINT.wind[1] - FEINT.wind[0]))));
  else if (t < FEINT.hold) body = wound;
  else if (t < FEINT.cut[1]) body = mixPose(wound, { ...soleOn(lerp(FEINT_BALL_X, FEINT_CUT_X, smooth((t - FEINT.cut[0]) / (FEINT.cut[1] - FEINT.cut[0]))) - shift * SHIFT_ART), lean: -10 }, smooth((t - FEINT.hold) / 0.12));
  else if (t < FEINT.away[1]) body = { ...runPose((t - FEINT.away[0]) * 3, 1), lean: -6 };
  else body = mixPose(runPose((FEINT.away[1] - FEINT.away[0]) * 3, 1), STAND, smooth((t - FEINT.away[1]) / 0.25));
  // The wind-up: the left arm thrown out for balance, the right back; then running arms.
  const windArms: ArmPose = { L: seg(-150, -170, -170, 'open'), R: seg(34, 20, 20, 'open') };
  const arms =
    t < FEINT.cut[1]
      ? chain([[0, ARMS_DOWN], [FEINT.wind[0] + 0.15, { L: seg(-25, 165, 165, 'open'), R: seg(20, 15, 15, 'open') }], [FEINT.wind[1], windArms], [FEINT.hold, windArms], [FEINT.cut[1], ARMS_DOWN]], t)
      : t < FEINT.away[1]
        ? runArms((t - FEINT.away[0]) * 1.5)
        : t < FEINT.end - 0.4
          ? track<ArmPose>([[FEINT.away[1], runArms(0)], [FEINT.away[1] + 0.25, ARMS_DOWN]], t, mixArms)
          : toRest(ARMS_DOWN, t, FEINT.end - 0.4, FEINT.end);
  // The ball (pitch): at his foot, dragged back behind the standing leg (behind it as it passes), then kept just ahead
  // of him the other way, stopping when he stops.
  let bx: number;
  if (t < FEINT.cut[0]) bx = FEINT_BALL_X;
  else if (t < FEINT.cut[1]) bx = lerp(FEINT_BALL_X, FEINT_CUT_X, smooth((t - FEINT.cut[0]) / (FEINT.cut[1] - FEINT.cut[0])));
  else bx = FEINT_CUT_X + (shift - FEINT_SHIFT.base) * SHIFT_ART - 30 * smooth((t - FEINT.cut[1]) / 0.3);
  const ball = ballAt([bx, BALL_Y], shift, -((FEINT_BALL_X - bx) / BALL_R) * 57, Math.min(smooth(t / 0.15), smooth((FEINT.end - 0.02 - t) / 0.3)), { behind: t > FEINT.cut[0] + 0.05 && t < FEINT.cut[1] - 0.05 });
  // The defender throws himself in front of a shot that never comes: a block slide along the grass (the slide tackle,
  // started as the wind-up peaks), then up.
  const g = slideTackleMove(Math.min(1.2, clamp01((t - 0.32) / 1.55) * 1.7));
  const ghost = {
    x: lerp(390, 350, smooth((t - 0.55) / 0.3)),
    front: t > 0.5,
    scale: 0.5,
    pose: g.body,
    opacity: smooth(t / 0.25) * (1 - smooth((t - 1.5) / 0.3)),
    facing: -1 as const,
    tilt: g.tilt,
    lift: g.lift,
  };
  return frame({ ...body, arms }, { shift, ghost, ball });
}

/* ── Poker Face: arms folded, not a flicker — the attacker daren't shoot ───── */

export const POKER = { line1: [0.3, 0.85] as const, line2: [0.95, 1.35] as const, back: [1.35, 1.8] as const, end: 2.2 };
const POKER_SHIFT = -12;
export function pokerFaceMove(t: number, duet = false): ReactionFrame {
  // Arms folded across his chest from the start, chin up, perfectly still (no idle sway).
  const arms = t < POKER.end - 0.4 ? ARMS_FOLDED : toRest(ARMS_FOLDED, t, POKER.end - 0.4, POKER.end);
  const body = { ...STAND, lean: -4 * smooth(t / 0.2) };
  // The attacker, ball at his feet: leans over it and draws the leg back… freezes; again; backs off, shoulders down.
  const held = (t0: number, t1: number) => smooth((t - t0) / 0.15) * (1 - smooth((t - t1 + 0.12) / 0.12));
  const wind = Math.max(held(POKER.line1[0], POKER.line1[1]), 0.9 * held(POKER.line2[0], POKER.line2[1]));
  const backing = smooth((t - POKER.back[0]) / (POKER.back[1] - POKER.back[0]));
  const gx = 405 + 20 * smooth((t - POKER.line1[1]) / 0.15) + 20 * smooth((t - POKER.line2[1]) / 0.15);
  const ghost = {
    x: gx,
    scale: GHOST_SCALE,
    front: true,
    // A real backlift (thigh back, leaning back, arms out wide), frozen at the top; then slumped as he backs off.
    pose: {
      ...mixPose(mixPose(STAND, { ...STAND, hipR: -52, kneeR: 80, ankleR: -10, lean: -12 }, wind), { ...crouchPose(0.15), lean: 16 }, backing),
      arms: mixArms(mixArms(ARMS_DOWN, { L: seg(-38, -28, -28, 'open'), R: seg(30, 22, 22, 'open') }, wind), { L: seg(-6, -2, -2, 'open'), R: seg(6, 2, 2, 'open') }, backing),
    },
    opacity: smooth(t / 0.25) * (1 - smooth((t - 1.7) / 0.22)),
    facing: -1 as const,
  };
  // His ball sits in front of him (towards our man), and goes back with him.
  const bx = gx - GHOST_SCALE * 120;
  const ball = { x: bx - POKER_SHIFT * SHIFT_ART, y: BALL_Y + 0.15 * BALL_R, rot: 0, ring: 0, opacity: ghost.opacity, scale: 0.85, behind: true };
  // In a duet the ball is the real attacker's, on his card.
  return frame({ ...body, arms }, { ghost, ball: duet ? undefined : ball, shift: POKER_SHIFT });
}

/* ── Screamer: the run-up and a rocket from distance ─────────────────────── */

const SCREAM_RATE = 1.3;
const SCREAM_CONTACT_PHASE = 0.78;
export const SCREAM = { run: [0.05, 0.62] as const, strikeFrom: 0.55, end: 2.4 };
export const SCREAM_CONTACT_AT = SCREAM.strikeFrom + (SCREAM_CONTACT_PHASE - 0.35) / SCREAM_RATE;
export const SCREAM_BALL: [number, number] = [bootPoint(strikePose(SCREAM_CONTACT_PHASE), 'R', 84, 15)[0] + 38, BALL_Y];
/** Up and away at about 30°, towards the top corner. */
/** The card's top-right corner, inside the frame (pitch frame, the figure unmoved). */
const SCREAM_CORNER: [number, number] = [420, -60];
const screamFlight = (d: number): [number, number] => {
  const p = 1 - (1 - Math.min(d / 0.35, 1)) ** 2;
  return [lerp(SCREAM_BALL[0], SCREAM_CORNER[0], p), lerp(SCREAM_BALL[1], SCREAM_CORNER[1], p) - 60 * Math.sin(Math.PI * p)];
};
export function screamerMove(t: number, now: number): ReactionFrame {
  // From deep: a real run-up across the card, the strike through it, the kicking leg carried on up in the
  // follow-through, the fists up.
  const shift = lerp(-36, -12, smooth((t - SCREAM.run[0]) / (SCREAM.run[1] - SCREAM.run[0])));
  // The strike runs at its own pace up to contact, then the follow-through is held a little longer.
  const phase = (u: number) => (u < SCREAM_CONTACT_AT ? 0.35 + (u - SCREAM.strikeFrom) * SCREAM_RATE : SCREAM_CONTACT_PHASE + (u - SCREAM_CONTACT_AT) * 0.7);
  let body: FullBodyPose;
  if (t < SCREAM.run[0]) body = mixPose(idlePose(now), runPose(0, 1), smooth(t / SCREAM.run[0]));
  else if (t < SCREAM.strikeFrom) body = runPose((t - SCREAM.run[0]) * 3.8, 1.25);
  else body = mixPose(runPose((SCREAM.strikeFrom - SCREAM.run[0]) * 3.8, 1.25), strikePose(phase(t)), smooth((t - SCREAM.strikeFrom) / 0.1));
  const d = t - SCREAM_CONTACT_AT;
  const follow = bell(t, SCREAM_CONTACT_AT, SCREAM_CONTACT_AT + 0.5);
  // Into the strike: the left arm thrown forward and up, the right back; then both fists up.
  const strikeArms: ArmPose = { L: seg(-150, -160, -160, 'open'), R: seg(30, 20, 20, 'open') };
  const arms =
    t < SCREAM.strikeFrom
      ? runArms((t - SCREAM.run[0]) * 1.9)
      : t < SCREAM.end - 0.45
        ? track<ArmPose>([[SCREAM.strikeFrom, runArms(0)], [SCREAM_CONTACT_AT - 0.05, strikeArms], [SCREAM_CONTACT_AT + 0.4, strikeArms], [SCREAM_CONTACT_AT + 0.48, ARMS_V]], t, mixArms)
        : toRest(ARMS_V, t, SCREAM.end - 0.45, SCREAM.end);
  let ball: ReactionBall | undefined;
  if (d < 0) ball = ballAt(SCREAM_BALL, shift, 0, smooth((t - 0.1) / 0.15));
  else if (d < 0.8) {
    // Up and away towards the top corner, shrinking into the distance, a long flame behind it.
    ball = {
      ...ballAt(screamFlight(d), shift, Math.min(d, 0.35) * 1800, smooth((0.8 - d) / 0.3)),
      scale: 1 - 0.4 * smooth(d / 0.35),
      ring: d < 0.07 ? d / 0.07 : 0,
      gold: true,
      trail: [0.025, 0.05, 0.075, 0.1].map((back) => inFigure(screamFlight(Math.max(0, d - back)), shift)),
    };
  }
  // The whole card shudders as it's struck.
  const shake = d >= 0 && d < 0.25 ? 3 * Math.sin(d * 120) * (1 - d / 0.25) : 0;
  return frame({ ...body, arms }, { shift: shift + 0.6 * shake, lift: 4 * follow, tilt: shake, ball, clipEdge: shift < -12 });
}

export { ARMS_MID, ARMS_DOWN, PREP, REST_OUT, chain, fromRest, mixLinear };

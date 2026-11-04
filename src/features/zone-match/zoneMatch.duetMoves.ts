/**
 * Moves for the showdown duets (dev/zone-match/duets): what the other player's avatar does when a playstyle lands —
 * the ball that comes over, the mud that hits them, the flag that stops them. Same frames as the card reactions
 * (ZoneMatchFutReactions), drawn facing right and marked directional: a mirrored card mirrors them whole.
 */

import {
  GROUND_Y,
  STAND,
  bootPoint,
  celebratePose,
  crouchPose,
  divePose,
  idlePose,
  mixArms,
  mixPose,
  reachArm,
  runPose,
  strikePose,
  type ArmPose,
  type ArmSegments,
  type FullBodyPose,
} from './zoneMatch.fullBody';
import { BALL_REST, SOLE_ON_BALL, keeperSave, slideTackleMove, type ReactionBall, type ReactionFrame } from './ZoneMatchFutReactions';
import { ARMS_DOWN, ARMS_MID, PREP, REST_OUT, chain, fromRest } from './zoneMatch.cardMoves';

export type DuetMove =
  | 'kick-long'
  | 'shoot'
  | 'shuffle'
  | 'dive-beaten'
  | 'step-back'
  | 'bonked'
  | 'throw'
  | 'blow'
  | 'sulk'
  | 'fake-injury'
  | 'impatient'
  | 'halted'
  | 'confident'
  | 'run-bounce'
  | 'kick-hurt'
  | 'beaten-over'
  | 'dizzy'
  | 'look-around'
  | 'rattled'
  | 'fooled'
  | 'chasing'
  | 'poke'
  | 'nutmegged'
  | 'sprint-at'
  | 'crowded'
  | 'groan'
  | 'fake-shot'
  | 'deadpan'
  | 'hesitate'
  | 'celebrate'
  | 'cheer'
  | 'chest-control'
  | 'kick-two'
  | 'block-slide';

/** Kick Long: when the boot meets the ball, and where the ball waits for it (art units, facing right). */
const KICK_RATE = 1.05;
const STRIKE_CONTACT = 0.78;
export const KICK_LONG_CONTACT = {
  at: STRIKE_CONTACT / KICK_RATE,
  ball: [bootPoint(strikePose(STRIKE_CONTACT), 'R', 84, 15)[0] + 38, GROUND_Y - 46] as [number, number],
};

/** Nutmegged: when the ball (handed over by the duet's prop at his front) rolls through him, and for how long. */
export const NUTMEGGED_BALL = { from: 0.95, dur: 0.34, enterX: 430 };
/** Arms as screen angles (0 down, 90 towards +x, 180 up). */
const seg = (upper: number, fore: number, hand: number, shape: ArmSegments['shape']): ArmSegments => ({ upper, fore, hand, shape });
const ARMS_DOWN_D: ArmPose = { L: seg(-12, -4, -2, 'open'), R: seg(12, 4, 2, 'open') };

/** How long each move plays (s). */
export const DUET_MOVE_S: Record<DuetMove, number> = {
  'kick-long': 1.3,
  shoot: 1.2,
  shuffle: 1.4,
  'dive-beaten': 2.4,
  'step-back': 1.4,
  bonked: 1.6,
  throw: 1.0,
  blow: 1.4,
  sulk: 1.8,
  'fake-injury': 2.6,
  impatient: 2.2,
  halted: 1.6,
  confident: 1.6,
  'run-bounce': 2.2,
  'kick-hurt': 2.0,
  'beaten-over': 1.8,
  dizzy: 1.8,
  'look-around': 1.8,
  rattled: 1.8,
  fooled: 2.0,
  chasing: 2.2,
  poke: 1.0,
  nutmegged: 2.1,
  'sprint-at': 1.6,
  crowded: 1.8,
  groan: 1.6,
  'fake-shot': 1.8,
  deadpan: 2.0,
  hesitate: 2.3,
  celebrate: 1.7,
  cheer: 1.6,
  'chest-control': 2.6,
  'kick-two': 2.0,
  'block-slide': 2.0,
};

/** Kick Two: one strike, a step, the second ball struck — when each meets the boot (same spot, art units). */
const KICK_TWO_RATE = 1.3;
const KICK_TWO_SECOND = 0.75;
export const KICK_TWO_CONTACT = {
  first: STRIKE_CONTACT / KICK_TWO_RATE,
  second: KICK_TWO_SECOND + STRIKE_CONTACT / KICK_TWO_RATE,
  ball: [bootPoint(strikePose(STRIKE_CONTACT), 'R', 84, 15)[0] + 38, GROUND_Y - 46] as [number, number],
};

/**
 * Chest control: set, leaning back; the ball hits the chest (CHEST.at), is cushioned up and forward, drops to the grass,
 * one small bounce out in front, and he puts his sole on it.
 */
const CHEST = { at: 0.35, cushioned: 0.62, grounded: 1.0, rest: 1.3, stepOn: 1.6 };
const CHEST_POINT: [number, number] = [272, 392];
const CUSHION_TOP: [number, number] = [CHEST_POINT[0] + 28, CHEST_POINT[1] - 34];
const FIRST_BOUNCE: [number, number] = [BALL_REST[0] - 46, BALL_REST[1]];
/** When the ball meets his chest, and where (art units, facing right), for the prop bringing it in. */
export const CHEST_CONTROL_CATCH = { at: CHEST.at, point: CHEST_POINT };

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => {
  const k = clamp01(t);
  return k * k * (3 - 2 * k);
};
const bell = (t: number, t0: number, t1: number) => Math.sin(Math.PI * clamp01((t - t0) / (t1 - t0))) ** 2;
const still = (body: FullBodyPose): ReactionFrame => ({ body, lift: 0, tilt: 0, spin: 0, shift: 0, blur: 0, fade: 1 });
const hopLift = (t: number, period: number, height: number) => height * Math.abs(Math.sin((Math.PI * t) / period));

/** One frame of a duet move, facing right. */
export function duetMoveFrame(move: DuetMove, t: number, now: number): ReactionFrame {
  const end = DUET_MOVE_S[move];
  const out = smooth((end - t) / 0.3);
  const f = rawFrame(move, t);
  return {
    ...f,
    // The arms ease back to his own as the move ends, via the hands at his waist (no cheering fists on the way).
    body: { ...mixPose(idlePose(now), f.body, out), arms: f.body.arms && out > 0.01 ? { L: chain([[0, REST_OUT], [0.03, PREP], [0.4, ARMS_MID], [0.7, ARMS_DOWN], [1, f.body.arms]], out + 0.08).L, R: chain([[0, REST_OUT], [0.03, PREP], [0.4, ARMS_MID], [0.7, ARMS_DOWN], [1, f.body.arms]], out).R } : undefined },
    lift: f.lift * out,
    tilt: f.tilt * out,
    spin: f.spin * out,
    shift: f.shift * out,
    blur: f.blur * out,
    fade: 1 - (1 - f.fade) * out,
    directional: true,
  };
}

function rawFrame(move: DuetMove, t: number): ReactionFrame {
  switch (move) {
    case 'kick-long':
      // A long lofted pass: a big wind-up and a high follow-through.
      return { ...still(strikePose(t * KICK_RATE)), tilt: -5 * bell(t, 0.7, 1.2) };
    case 'shoot':
      // Two steps in and a strike.
      return { ...still(t < 0.35 ? runPose(t * 3, 0.7) : strikePose((t - 0.35) * 1.4)), shift: 6 * smooth(t / 0.4) };
    case 'shuffle':
      // Crouched and ready, side to side.
      return { ...still(crouchPose(0.3 * bell(t, 0, 1.3))), shift: 7 * Math.sin(t * Math.PI * 3) * bell(t, 0, 1.3) };
    case 'dive-beaten': {
      // Springs up and back at it (the keeper's leap, leaning towards the ball), the far arm at full stretch, the
      // fingertips short; lands and slumps, head down.
      const leap = keeperSave('leap', t, 0, 1);
      const sag = bell(t, 1.15, 1.95);
      const air = bell(t, 0.25, 1.15);
      const reach: ArmPose = { L: seg(-132, -138, -138, 'open'), R: seg(35, 20, 20, 'open') };
      // Up to full stretch, then down (never back up into fists after the ball's gone).
      const arms = t < 0.7 ? fromRest(reach, smooth((t - 0.15) / 0.4)) : mixArms(reach, ARMS_DOWN_D, smooth((t - 0.9) / 0.4));
      return { ...still({ ...mixPose(leap.body, { ...crouchPose(0.25), lean: 22 }, sag), arms }), lift: Math.min(leap.lift, 6), tilt: -8 * air, scale: leap.scale };
    }
    case 'step-back': {
      // Taken aback: a step back, leaning away.
      const k = bell(t, 0.1, 1.3);
      return { ...still(mixPose(STAND, { ...crouchPose(0.2), lean: -10 }, k)), shift: -8 * k };
    }
    case 'bonked': {
      // The ball off his head: knocked back, wobbles, steadies.
      const hit = bell(t, 0, 0.5);
      return { ...still(mixPose(STAND, { ...crouchPose(0.35), lean: -14 }, hit)), tilt: -12 * hit + 5 * Math.sin(t * 16) * bell(t, 0.4, 1.4), shift: -6 * hit };
    }
    case 'throw':
      // An underarm throw towards the other card.
      return { ...still(mixPose(STAND, { ...crouchPose(0.35), lean: 16 }, bell(t, 0, 0.7))), shift: 4 * bell(t, 0.2, 0.7) };
    case 'blow': {
      // Leans in and blows (the fog rolls over).
      const k = bell(t, 0, 1.3);
      return { ...still(mixPose(STAND, { ...crouchPose(0.15), lean: 14 }, k)), lift: 2 * Math.sin(t * 30) * k };
    }
    case 'sulk': {
      // Head down, shoulders slumped, a kick at the grass.
      const k = bell(t, 0.1, 1.7);
      const kick = bell(t, 0.8, 1.2);
      return still(mixPose(mixPose(STAND, { ...crouchPose(0.25), lean: 18 }, k), { ...STAND, hipR: STAND.hipR + 20, kneeR: STAND.kneeR + 30 }, kick));
    }
    case 'fake-injury': {
      // Goes down clutching nothing, rolls about, then hops up as if nothing happened.
      const down = smooth((t - 0.15) / 0.35) * (1 - smooth((t - 2.0) / 0.3));
      const roll = Math.sin(t * 9) * bell(t, 0.5, 1.9);
      return { ...still(mixPose(STAND, crouchPose(0.9), down)), tilt: -70 * down + 10 * roll, lift: -12 * down, shift: 8 * down, scale: 1 - 0.28 * down };
    }
    case 'impatient': {
      // Hands on hips, taps a foot, then throws his arms out: get on with it.
      const tap = Math.max(0, Math.sin(t * 6.5)) * bell(t, 0, 1.4);
      const body = { ...STAND, hipR: STAND.hipR + 28 * tap, kneeR: STAND.kneeR + 70 * tap, ankleR: STAND.ankleR - 80 * tap, bodyY: STAND.bodyY + 4 * tap };
      const hips: ArmPose = { L: reachArm('L', 150, 520, -40, 'flat'), R: reachArm('R', 346, 520, 40, 'flat') };
      const outArms: ArmPose = { L: seg(-35, -40, -40, 'open'), R: seg(35, 40, 40, 'open') };
      const arms = t < 1.3 ? fromRest(hips, smooth(t / 0.3)) : mixArms(hips, outArms, bell(t, 1.3, 2.1));
      return { ...still({ ...mixPose(body, { ...crouchPose(0.1), lean: 10 }, bell(t, 1.3, 2.1)), arms }), tilt: 4 * Math.sin(t * 16) * bell(t, 1.4, 2.0) };
    }
    case 'halted': {
      // Running in, then stopped dead (a skid, a lean back).
      const stop = smooth((t - 0.55) / 0.2);
      const body = mixPose(runPose(t * 3, 1), { ...crouchPose(0.3), lean: -12 }, stop);
      return { ...still(body), shift: 12 * smooth(t / 0.55) - 2 * stop, tilt: -6 * bell(t, 0.5, 1.1) };
    }
    case 'confident': {
      // Chest out, a nod.
      const k = bell(t, 0, 1.5);
      return { ...still(mixPose(STAND, { ...STAND, lean: -9 }, k)), lift: 3 * k };
    }
    case 'run-bounce': {
      // Runs at it, bounces off and lands on his backside, gets up.
      if (t < 0.6) return { ...still(runPose(t * 3.2, 1)), shift: 14 * smooth(t / 0.6) };
      const down = smooth((t - 0.6) / 0.25) * (1 - smooth((t - 1.5) / 0.4));
      return { ...still(mixPose(STAND, { ...crouchPose(0.95), lean: -24 }, down)), shift: 14 - 12 * smooth((t - 0.6) / 0.35), tilt: -9 * down, lift: 8 * bell(t, 0.6, 0.9) };
    }
    case 'kick-hurt': {
      // Kicks at the shins, hits the pads: hops about holding the foot.
      if (t < 0.55) return { ...still(strikePose(t * 1.5)), shift: 5 * smooth(t / 0.5) };
      const hop = hopLift(t - 0.55, 0.32, 6);
      return { ...still({ ...STAND, hipR: STAND.hipR + 36, kneeR: STAND.kneeR + 70, lean: 8 }), lift: hop, tilt: 6 * Math.sin(t * 9), shift: 5 - 4 * smooth((t - 0.6) / 1) };
    }
    case 'beaten-over': {
      // Watches it sail over: leans back, a jump at it, turns to watch it go.
      const look = bell(t, 0, 1.2);
      const jump = bell(t, 0.35, 0.8);
      return { ...still(mixPose(STAND, { ...crouchPose(0.2), lean: -16 }, look)), lift: 9 * jump, spin: 180 * smooth((t - 0.9) / 0.4) * (1 - smooth((t - 1.45) / 0.3)) };
    }
    case 'dizzy': {
      // Turned inside out: a spin and a wobble.
      const k = bell(t, 0.1, 1.6);
      return { ...still(crouchPose(0.25 * k)), spin: 360 * smooth((t - 0.1) / 0.7), tilt: 9 * Math.sin(t * 10) * k };
    }
    case 'look-around': {
      // Where did he go? Leans one way, then the other.
      const a = bell(t, 0, 0.8);
      const b = bell(t, 0.8, 1.6);
      return { ...still(mixPose(STAND, { ...crouchPose(0.15), lean: 12 }, a + b)), shift: -6 * a + 6 * b, tilt: -5 * a + 5 * b };
    }
    case 'rattled': {
      // The noise gets to him: shaking, crouched.
      const k = bell(t, 0.05, 1.7);
      return { ...still(crouchPose(0.4 * k)), shift: 1.4 * Math.sin(t * 60) * k, tilt: 3 * Math.sin(t * 25) * k };
    }
    case 'fooled': {
      // Bites on it: dives the wrong way, down, up, shaking his head.
      const dive = smooth((t - 0.2) / 0.25) * (1 - smooth((t - 1.3) / 0.4));
      return { ...still(mixPose(STAND, divePose(1), dive)), tilt: 48 * dive, lift: 8 * bell(t, 0.2, 0.7), shift: 3 * dive, scale: 1 - 0.18 * dive };
    }
    case 'chasing': {
      // Chases shadows: running one way, then the other.
      const dir = Math.sin(t * Math.PI * 1.4);
      return { ...still(runPose(t * 3.2, 1)), shift: 12 * dir, spin: dir > 0 ? 0 : 180 };
    }
    case 'poke':
      // A little toe-poke along the grass.
      return { ...still(strikePose(t * 1.6)), shift: 3 * bell(t, 0.2, 0.7) };
    case 'nutmegged': {
      // Jockeying (low, arms out), biting across as the ball's dragged, legs planted wide as it comes; it rolls in
      // under him, between his feet (behind his shins) and out the back; a snap turn to watch it go, palms up.
      const wide: FullBodyPose = { ...crouchPose(0.35), hipL: -24, hipR: 24, kneeL: 20, kneeR: 20 };
      const bite = bell(t, 0.4, 0.9);
      const plant = smooth((t - 0.7) / 0.2) * (1 - smooth((t - 1.6) / 0.3));
      const body = mixPose(mixPose(STAND, { ...crouchPose(0.3), lean: 10 }, bite), wide, plant);
      const jockey: ArmPose = { L: seg(-40, -28, -28, 'open'), R: seg(40, 28, 28, 'open') };
      const shrug: ArmPose = { L: seg(-25, -40, -40, 'open'), R: seg(25, 40, 40, 'open') };
      const arms = t < 1.35 ? mixArms(ARMS_DOWN_D, jockey, smooth((t - 0.4) / 0.3)) : mixArms(jockey, shrug, bell(t, 1.35, 2.0));
      // The ball (his frame): in from the front (the prop hands it over at x 430), through the gap, gone behind him.
      let ball: ReactionBall | undefined;
      const u = (t - NUTMEGGED_BALL.from) / NUTMEGGED_BALL.dur;
      if (u >= 0 && u < 1) {
        const x = 430 - 640 * u;
        ball = { x, y: GROUND_Y - 46, rot: -u * 800, ring: 0, opacity: smooth((1 - u) / 0.25), behind: x < 400 };
      }
      // Twists round after it (he's drawn facing us, so the look is a lean and a step back the way it went).
      const look = bell(t, 1.3, 2.0);
      return { ...still({ ...body, lean: body.lean - 9 * look, arms }), ball, shift: -6 * bite - 4 * look, tilt: -3 * look };
    }
    case 'sprint-at':
      // Sprints at the other card and back.
      return { ...still(runPose(t * 3.4, 1)), shift: 18 * bell(t, 0, 1.4) };
    case 'crowded': {
      // Hurried: a stumble backwards, ball lost.
      // Rushed: a flinch (arms up), his touch runs away, he reaches after it and sags.
      const k = bell(t, 0.2, 1.6);
      // The heavy touch: his right boot pokes it too far as he's rushed.
      const touch = bell(t, 0.12, 0.42);
      const flinch: ArmPose = { L: seg(-55, -160, -160, 'open'), R: seg(55, 160, 160, 'open') };
      const reach: ArmPose = { L: seg(-20, -10, -10, 'open'), R: seg(55, 30, 30, 'open') };
      const arms = t < 0.85 ? fromRest(flinch, smooth((t - 0.55) / 0.25)) : mixArms(flinch, reach, smooth((t - 0.85) / 0.3));
      const base = mixPose(STAND, { ...crouchPose(0.3), lean: t < 0.6 ? -14 : 12 }, k);
      return { ...still({ ...base, hipR: base.hipR + 34 * touch, kneeR: base.kneeR - 10 * touch, arms }), shift: 4 * k, tilt: -3 * Math.sin(t * 12) * k };
    }
    case 'groan': {
      // Not him again: head back, then a slump, arms out low, palms up.
      const k = bell(t, 0.1, 1.45);
      const palms: ArmPose = { L: seg(-28, -60, -60, 'open'), R: seg(28, 60, 60, 'open') };
      return { ...still({ ...mixPose(STAND, { ...crouchPose(0.16), lean: (t < 0.6 ? -14 : 18) + 6 * Math.sin(t * 18) * bell(t, 1.3, 1.7) }, k), arms: fromRest(palms, smooth(t / 0.3) * (1 - smooth((t - 1.3) / 0.3))) }), lift: -2 * k };
    }
    case 'block-slide': {
      // Throws himself in front of the shot: a slide along the grass towards it (the slide tackle, no ball), then up.
      const f = slideTackleMove(Math.min(t, 1.25) + Math.max(0, t - 1.25) * 0.55);
      const arms: ArmPose = { L: seg(-60, -80, -80, 'flat'), R: seg(40, 60, 60, 'flat') };
      const down = bell(t, 0.3, 1.5);
      return { ...f, ball: undefined, body: { ...f.body, arms: fromRest(arms, down) }, shift: 40 * smooth((t - 0.3) / 0.6) * (1 - smooth((t - 1.45) / 0.4)), scale: 1 - 0.12 * down };
    }
    case 'fake-shot': {
      // Winds up as if to shoot, stops, then a cheeky hop.
      const wind = bell(t, 0, 0.7);
      const hop = celebratePose(t - 0.8);
      return { ...still(t < 0.8 ? mixPose(STAND, strikePose(0.35), wind) : hop), lift: t > 0.8 ? hopLift(t - 0.8, 0.45, 6) : 0 };
    }
    case 'deadpan':
      // Not a flicker: barely moves at all.
      return still(STAND);
    case 'hesitate': {
      // Lines up a shot, stops, lines it up again: second thoughts.
      // Leans over the ball, draws the leg back… freezes; again; backs off, shoulders down. Arms out for balance.
      // Each backlift held at the top a beat (a plateau), then the foot comes down.
      const hold = (t0: number, t1: number) => smooth((t - t0) / 0.2) * (1 - smooth((t - t1 + 0.15) / 0.15));
      const a = hold(0.1, 0.8);
      const b = 0.85 * hold(0.95, 1.5);
      const back = smooth((t - 1.5) / 0.3);
      const body = mixPose(mixPose(STAND, { ...STAND, hipR: -52, kneeR: 80, ankleR: -10, lean: -12 }, Math.max(a, b)), { ...crouchPose(0.15), lean: 14 }, back);
      const balance: ArmPose = { L: seg(-30, -25, -25, 'open'), R: seg(28, 20, 20, 'open') };
      // Between the two: a step back and a shake of the head.
      const between = bell(t, 0.72, 1.0);
      // Backs off a step after each attempt and for good at the end, his ball going with him.
      const shift = -12 * smooth((t - 0.8) / 0.2) - 12 * smooth((t - 1.5) / 0.2) - 4 * back;
      const ball: ReactionBall = { x: 360, y: GROUND_Y - 46, rot: 0, ring: 0, opacity: 1 - smooth((t - 1.85) / 0.12) };
      return { ...still({ ...body, arms: fromRest(mixArms(balance, ARMS_DOWN_D, back), smooth(t / 0.25)) }), shift, tilt: 4 * Math.sin(t * 22) * between, ball };
    }
    case 'celebrate':
      return { ...still(celebratePose(t)), lift: hopLift(t, 0.5, 8) };
    case 'cheer':
      return { ...still(celebratePose(t * 1.2)), lift: hopLift(t, 0.4, 5) };
    case 'chest-control':
      return chestControl(t);
    case 'kick-two': {
      // Strikes the first, a skip back to the second (dragged into place), strikes that one too.
      if (t < KICK_TWO_SECOND - 0.1) return still(strikePose(t * KICK_TWO_RATE));
      const reset = smooth((t - KICK_TWO_SECOND + 0.1) / 0.12);
      return { ...still(mixPose(strikePose((KICK_TWO_SECOND - 0.1) * KICK_TWO_RATE), strikePose((t - KICK_TWO_SECOND) * KICK_TWO_RATE), reset)), tilt: -4 * bell(t, 1.2, 1.7) };
    }
  }
}

function chestControl(t: number): ReactionFrame {
  const set: FullBodyPose = { ...crouchPose(0.18), lean: -14 };
  const keys: [number, FullBodyPose][] = [
    [0, STAND],
    [CHEST.at - 0.1, set],
    [CHEST.at, { ...set, lean: -17 }],
    [CHEST.cushioned, { ...crouchPose(0.12), lean: -4 }],
    [CHEST.grounded, { ...crouchPose(0.28), lean: 8 }],
    [CHEST.rest, STAND],
    [CHEST.stepOn, SOLE_ON_BALL],
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
  let ball: ReactionBall | undefined;
  if (t >= CHEST.at) {
    let x: number;
    let y: number;
    if (t < CHEST.cushioned) {
      // Popped up and forward off the chest, losing its pace.
      const u = (t - CHEST.at) / (CHEST.cushioned - CHEST.at);
      const k = 1 - (1 - u) ** 2;
      x = CHEST_POINT[0] + (CUSHION_TOP[0] - CHEST_POINT[0]) * k;
      y = CHEST_POINT[1] + (CUSHION_TOP[1] - CHEST_POINT[1]) * k;
    } else if (t < CHEST.grounded) {
      // Dropping to the grass, gathering speed.
      const u = (t - CHEST.cushioned) / (CHEST.grounded - CHEST.cushioned);
      x = CUSHION_TOP[0] + (FIRST_BOUNCE[0] - CUSHION_TOP[0]) * u;
      y = CUSHION_TOP[1] + (FIRST_BOUNCE[1] - CUSHION_TOP[1]) * u * u;
    } else {
      // One small bounce out in front, then still.
      const u = clamp01((t - CHEST.grounded) / (CHEST.rest - CHEST.grounded));
      x = FIRST_BOUNCE[0] + (BALL_REST[0] - FIRST_BOUNCE[0]) * u;
      y = BALL_REST[1] - 46 * Math.sin(Math.PI * u);
    }
    const spun = Math.min(t, CHEST.rest) - CHEST.at;
    ball = {
      x,
      y,
      rot: 420 * spun,
      ring: t < CHEST.at + 0.3 ? (t - CHEST.at) / 0.3 : 0,
      opacity: smooth((DUET_MOVE_S['chest-control'] - t) / 0.3),
    };
  }
  return { ...still(body), ball };
}

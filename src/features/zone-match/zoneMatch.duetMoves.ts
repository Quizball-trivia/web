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
  mixPose,
  runPose,
  strikePose,
  type FullBodyPose,
} from './zoneMatch.fullBody';
import { BALL_REST, SOLE_ON_BALL, keeperSave, type ReactionBall, type ReactionFrame } from './ZoneMatchFutReactions';

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
  | 'kick-two';

/** Kick Long: when the boot meets the ball, and where the ball waits for it (art units, facing right). */
const KICK_RATE = 1.05;
const STRIKE_CONTACT = 0.78;
export const KICK_LONG_CONTACT = {
  at: STRIKE_CONTACT / KICK_RATE,
  ball: [bootPoint(strikePose(STRIKE_CONTACT), 'R', 84, 15)[0] + 38, GROUND_Y - 46] as [number, number],
};

/** How long each move plays (s). */
export const DUET_MOVE_S: Record<DuetMove, number> = {
  'kick-long': 1.3,
  shoot: 1.2,
  shuffle: 1.4,
  'dive-beaten': 2.0,
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
  nutmegged: 1.8,
  'sprint-at': 1.6,
  crowded: 1.8,
  groan: 1.6,
  'fake-shot': 1.8,
  deadpan: 2.0,
  hesitate: 2.0,
  celebrate: 1.7,
  cheer: 1.6,
  'chest-control': 2.6,
  'kick-two': 2.0,
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
    body: mixPose(idlePose(now), f.body, out),
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
      // Springs up at it (the keeper's leap, no gloves, nothing caught): the ball is over his hands; lands, head down.
      const leap = keeperSave('leap', t, 0, 1);
      const sag = bell(t, 1.2, 1.95);
      return { ...still(mixPose(leap.body, { ...crouchPose(0.2), lean: 16 }, sag)), lift: leap.lift, scale: leap.scale };
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
      // Taps a foot, checks the time (a lean), hops on the spot.
      const tap = Math.max(0, Math.sin(t * 14)) * bell(t, 0, 1.4);
      const body = { ...STAND, hipR: STAND.hipR + 14 * tap, kneeR: STAND.kneeR + 20 * tap };
      return { ...still(mixPose(body, { ...crouchPose(0.1), lean: 10 }, bell(t, 1.3, 2.1))), lift: hopLift(t - 1.3, 0.35, 3) * (t > 1.3 ? 1 : 0) };
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
      // Feet planted wide, the ball through his legs, turns to look.
      const wide: FullBodyPose = { ...crouchPose(0.35), hipL: -22, hipR: 22, kneeL: 18, kneeR: 18 };
      const k = bell(t, 0, 1.2);
      return { ...still(mixPose(STAND, wide, k)), spin: 180 * smooth((t - 0.6) / 0.3) * (1 - smooth((t - 1.3) / 0.3)), lift: 4 * bell(t, 0.55, 0.8) };
    }
    case 'sprint-at':
      // Sprints at the other card and back.
      return { ...still(runPose(t * 3.4, 1)), shift: 18 * bell(t, 0, 1.4) };
    case 'crowded': {
      // Hurried: a stumble backwards, ball lost.
      const k = bell(t, 0.2, 1.6);
      return { ...still(mixPose(STAND, { ...crouchPose(0.3), lean: -14 }, k)), shift: -10 * k, tilt: -4 * Math.sin(t * 12) * k };
    }
    case 'groan':
      // Head back: not him again.
      return { ...still(mixPose(STAND, { ...STAND, lean: -16 }, bell(t, 0.1, 1.4))), lift: -2 * bell(t, 0.1, 1.4) };
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
      const a = bell(t, 0.1, 0.7);
      const b = bell(t, 0.9, 1.5);
      return { ...still(mixPose(STAND, strikePose(0.3), Math.max(a, b))), tilt: -4 * b, shift: 3 * a };
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

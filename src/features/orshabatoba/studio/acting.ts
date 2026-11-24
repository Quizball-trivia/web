/**
 * Acting for the seated hosts, layered over their SeatedIdle clip.
 *
 * Both rigs have articulated fingers. The body pose uses the host's own axes
 * (`up`, `left` and `forward`; a positive turn about `left` pitches forward), so the
 * same gesture reads the same in either seat. StudioHost turns them into
 * world-space bone rotations each frame.
 */

export type Gesture = 'welcome' | 'present' | 'approve' | 'flinch' | 'shake' | 'nod' | 'slap' | 'fists' | 'smash' | 'celebrate' | 'laugh'
  | 'leanToMic' | 'readLaptop' | 'doubleTake';

export interface HostAct {
  /** Who the host looks at. Defaults to the other host. */
  look?: 'other' | 'camera';
  /** 0 calm … 4 about to blow: leans in, then trembles and steams from 3. */
  anger?: number;
  /** Change `key` to replay. The optional delay is in real seconds. */
  gesture?: { name: Gesture; key: number; delaySeconds?: number };
}

export type Hand = 'Left' | 'Right';
export const DIGITS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'] as const;
export interface Grip { curl: number; thumb: number }
const REST_GRIP = 0.12;

/** Local +X flexion in degrees. Each digit has a knuckle and a second hinge. */
export function fingerFlex(grip: Grip, digit: typeof DIGITS[number], link: number) {
  const extension = digit === 'Thumb' ? grip.thumb : 0;
  const range = digit === 'Thumb' ? (link === 1 ? 29 : 37) : (link === 1 ? 49 : 65) + DIGITS.indexOf(digit) * 2;
  return range * grip.curl * (1 - extension);
}

/** Finger curl and independent thumb extension. */
export function handGrip(name: Gesture | undefined, t: number, leading: boolean): Grip {
  const grip = { curl: REST_GRIP, thumb: 0 };
  if (!name || t < 0 || t >= GESTURE_SECONDS[name]) return grip;
  const duration = GESTURE_SECONDS[name];
  const active = envelope(t, 0.19, duration * 0.65, duration * 0.35);
  switch (name) {
    case 'fists':
      grip.curl += 0.68 * active;
      break;
    case 'smash':
    case 'slap':
      if (leading) grip.curl *= 1 - active;
      break;
    case 'welcome':
    case 'present':
    case 'celebrate':
      if (leading) {
        grip.curl *= 1 - 0.7 * active;
        grip.thumb = 0.4 * active;
      }
      break;
    default:
      break;
  }
  return grip;
}

export interface BoneTurn {
  bone: string;
  axis: 'up' | 'left' | 'forward';
  /** Degrees. */
  deg: number;
}

export const GESTURE_SECONDS: Record<Gesture, number> = {
  welcome: 1.8,
  present: 1.4,
  approve: 1.45,
  flinch: 1.42,
  shake: 1.0,
  nod: 1.0,
  slap: 0.9,
  fists: 1.3,
  smash: 2.6,
  celebrate: 2.2,
  laugh: 1.9,
  leanToMic: 2.1,
  readLaptop: 2.5,
  doubleTake: 1.85,
};

/** When the near palm lands on the laptop in `smash` (s after it starts). */
export const SMASH_IMPACT_S = 0.98;
/** When the hand lands in `slap`, and the two landings in `fists`. */
export const SLAP_IMPACT_S = 0.5;
export const FISTS_IMPACT_S = [0.4, 1.0] as const;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const easeIn = (x: number) => clamp01(x) ** 2;
/** 0 → 1 over `rise`, 1 until `fall`, back to 0 over `tail`. */
const envelope = (t: number, rise: number, fall: number, tail: number) =>
  ease(t / rise) * (1 - ease((t - fall) / tail));
const wave = (t: number, hz: number) => Math.sin(t * Math.PI * 2 * hz);

/**
 * A strike: lift to 1 by `up`, hold until `hold`, drop fast to slightly past
 * rest at `hit` (the landing), then settle back to 0 by `end`.
 */
function strike(t: number, up: number, hold: number, hit: number, end: number) {
  if (t <= 0) return 0;
  if (t < up) return ease(t / up);
  if (t < hold) return 1;
  if (t < hit) return 1 - 1.15 * easeIn((t - hold) / (hit - hold));
  if (t < end) return -0.15 * (1 - ease((t - hit) / (end - hit)));
  return 0;
}

/** Lifting a forearm that rests forward on the desk is a negative turn about `left`. */
function arm(hand: Hand, lift: number, shoulderDeg: number, elbowDeg: number): BoneTurn[] {
  return [
    { bone: `${hand}Arm`, axis: 'left', deg: -shoulderDeg * lift },
    { bone: `${hand}ForeArm`, axis: 'left', deg: -elbowDeg * lift },
  ];
}

export function gesturePose(name: Gesture, t: number, hand: Hand): BoneTurn[] {
  if (t < 0 || t > GESTURE_SECONDS[name]) return [];
  switch (name) {
    case 'leanToMic': {
      // The torso moves first. Lift the chin slightly as the speaker reaches the mic.
      const approach = envelope(t, 0.46, 1.15, 0.85);
      const emphasis = envelope(t - 0.52, 0.18, 0.27, 0.36);
      return [
        { bone: 'Spine1', axis: 'left', deg: 6 * approach },
        { bone: 'Spine2', axis: 'left', deg: 6 * approach },
        { bone: 'Neck', axis: 'left', deg: -5 * approach },
        { bone: 'Head', axis: 'left', deg: -4 * approach + 6 * emphasis },
      ];
    }
    case 'readLaptop': {
      const glance = envelope(t, 0.34, 1.58, 0.58);
      const lean = envelope(t - 0.12, 0.45, 1.4, 0.83);
      const scan = envelope(t - 0.48, 0.61, 0.82, 0.52);
      const side = hand === 'Left' ? 1 : -1;
      return [
        { bone: 'Spine2', axis: 'left', deg: 5 * lean },
        { bone: 'Neck', axis: 'up', deg: side * 9 * glance },
        { bone: 'Head', axis: 'up', deg: side * (16 * glance - 6 * scan) },
        { bone: 'Head', axis: 'left', deg: 16 * glance },
      ];
    }
    case 'doubleTake': {
      // A glance at the result, a quick look back at the co-host, then the shoulders follow.
      const glance = envelope(t, 0.25, 0.37, 0.15);
      const turn = envelope(t - 0.37, 0.16, 0.61, 0.72);
      const recoil = envelope(t - 0.47, 0.18, 0.45, 0.67);
      const side = hand === 'Left' ? 1 : -1;
      return [
        { bone: 'Head', axis: 'up', deg: side * (20 * glance - 9 * turn) },
        { bone: 'Head', axis: 'left', deg: 8 * glance - 5 * turn },
        { bone: 'Head', axis: 'forward', deg: side * 6 * turn },
        { bone: 'Spine2', axis: 'left', deg: -6 * recoil },
        { bone: 'Spine1', axis: 'up', deg: -side * 4 * recoil },
      ];
    }
    case 'welcome': {
      // Lean toward the mic, then open the palm beside the laptop.
      const lean = envelope(t, 0.38, 0.94, 0.7);
      const palm = envelope(t - 0.16, 0.4, 0.87, 0.65);
      const side = hand === 'Left' ? 1 : -1;
      return [
        { bone: 'Spine1', axis: 'left', deg: 4 * lean },
        { bone: 'Head', axis: 'forward', deg: side * 4 * lean },
        { bone: `${hand}ForeArm`, axis: 'up', deg: side * 12 * palm },
        { bone: `${hand}Hand`, axis: 'forward', deg: side * 14 * palm },
      ];
    }
    case 'present': {
      const sweep = envelope(t, 0.45, 0.7, 0.68);
      const beat = envelope(t - 0.25, 0.18, 0.27, 0.38);
      const side = hand === 'Left' ? 1 : -1;
      return [
        ...arm(hand, sweep, 3, 7),
        { bone: `${hand}ForeArm`, axis: 'up', deg: side * 14 * sweep },
        { bone: `${hand}Hand`, axis: 'forward', deg: side * 12 * sweep },
        { bone: 'Spine2', axis: 'left', deg: 3 * sweep },
        { bone: 'Head', axis: 'left', deg: 5 * beat },
      ];
    }
    case 'approve': {
      const lean = envelope(t, 0.3, 0.66, 0.68);
      const nod = envelope(t - 0.15, 0.19, 0.27, 0.33);
      return [
        { bone: 'Spine2', axis: 'left', deg: 3.5 * lean },
        { bone: 'Neck', axis: 'left', deg: 2 * nod },
        { bone: 'Head', axis: 'left', deg: 9 * nod - 2 * lean },
      ];
    }
    case 'flinch': {
      const recoil = envelope(t, 0.12, 0.19, 0.58);
      const settle = envelope(t - 0.32, 0.2, 0.52, 0.58);
      const outward = hand === 'Left' ? -1 : 1;
      return [
        { bone: `${hand}Shoulder`, axis: 'up', deg: 4 * outward * recoil },
        { bone: 'Spine2', axis: 'left', deg: -12 * recoil + 5 * settle },
        { bone: 'Spine2', axis: 'forward', deg: 8 * outward * recoil },
        { bone: 'Head', axis: 'left', deg: 10 * recoil - 9 * settle + 3 * wave(t, 4) * settle },
      ];
    }
    case 'shake': {
      const env = envelope(t, 0.15, 0.75, 0.25);
      return [
        { bone: 'Head', axis: 'up', deg: 18 * wave(t, 3) * env },
        { bone: 'Neck', axis: 'up', deg: 7 * wave(t, 3) * env },
      ];
    }
    case 'nod': {
      const env = envelope(t, 0.1, 0.8, 0.2);
      return [{ bone: 'Head', axis: 'left', deg: 11 * Math.max(0, wave(t, 2)) * env }];
    }
    case 'slap': {
      const s = strike(t, 0.3, 0.4, SLAP_IMPACT_S, 0.85);
      return [...arm(hand, s, 12, 19), { bone: 'Spine2', axis: 'left', deg: 5 * envelope(t, 0.4, 0.6, 0.3) }];
    }
    case 'fists': {
      const s = t < 0.6 ? strike(t, 0.25, 0.32, FISTS_IMPACT_S[0], 0.6) : strike(t - 0.6, 0.25, 0.32, FISTS_IMPACT_S[1] - 0.6, 0.7);
      return [
        ...arm('Left', s, 9, 13),
        ...arm('Right', s, 12, 16),
        { bone: 'Spine2', axis: 'left', deg: 9 * envelope(t, 0.2, 1.0, 0.3) },
      ];
    }
    case 'smash': {
      // Look down first. Strike with the near palm while the far arm stays at the desk.
      const prepare = envelope(t, 0.32, 0.76, 0.23);
      const swing = strike(t - 0.27, 0.42, 0.57, SMASH_IMPACT_S - 0.27, 1.13);
      const follow = envelope(t - SMASH_IMPACT_S + 0.13, 0.13, 0.29, 0.72);
      const side = hand === 'Left' ? 1 : -1;
      return [
        ...arm(hand, swing, 17, 21),
        { bone: `${hand}Hand`, axis: 'left', deg: -8 * swing + 5 * follow },
        { bone: 'Spine1', axis: 'up', deg: side * (5 * prepare - 4 * follow) },
        { bone: 'Spine2', axis: 'left', deg: -3 * prepare + 11 * follow },
        { bone: 'Head', axis: 'left', deg: 8 * prepare + 5 * follow },
      ];
    }
    case 'celebrate': {
      // A pleased lean back, a small shoulder bounce, then a nod to the co-host.
      const lean = envelope(t, 0.28, 0.55, 0.8);
      const chuckle = envelope(t - 0.22, 0.12, 0.17, 0.24);
      const nod = envelope(t - 0.8, 0.24, 0.32, 0.52);
      const side = hand === 'Left' ? 1 : -1;
      return [
        { bone: 'Spine1', axis: 'left', deg: -7 * lean + 4 * nod },
        { bone: 'Spine2', axis: 'up', deg: -side * 5 * lean },
        { bone: 'LeftShoulder', axis: 'forward', deg: 3 * chuckle },
        { bone: 'RightShoulder', axis: 'forward', deg: -2 * chuckle },
        { bone: 'Head', axis: 'left', deg: -3 * lean + 9 * nod },
      ];
    }
    case 'laugh': {
      const env = envelope(t, 0.15, 1.45, 0.4);
      const chuckle = wave(t, 3.5) * env;
      return [
        ...arm(hand, env, 9, 20),
        { bone: 'Spine2', axis: 'left', deg: 9 * env + 3 * chuckle },
        { bone: 'Spine1', axis: 'forward', deg: 2 * chuckle },
        { bone: 'Head', axis: 'left', deg: -7 * env + 4 * chuckle },
      ];
    }
  }
}

/** Continuous anger: leaning in, then trembling and heavy breathing. */
export function moodPose(anger: number, time: number): BoneTurn[] {
  if (anger < 0.01) return [];
  const turns: BoneTurn[] = [{ bone: 'Spine2', axis: 'left', deg: 1.8 * anger }];
  if (anger > 2) {
    const k = anger - 2;
    turns.push(
      { bone: 'Head', axis: 'up', deg: 1.2 * k * wave(time, 9) },
      { bone: 'Spine1', axis: 'left', deg: 1.6 * k * wave(time, 1.3) },
    );
  }
  return turns;
}

/**
 * Acting for the seated hosts, layered over their SeatedIdle clip.
 *
 * The rig has no face and no fingers, so everything is body language: head
 * shakes and nods, a hand slapping the desk, both fists, the laptop smash,
 * arms up, a laugh. Each pose is a list of turns about the host's own axes
 * (`up`, and `left` — a positive turn about `left` pitches forward), so the
 * same gesture reads the same in either seat. StudioHost turns them into
 * world-space bone rotations each frame.
 */

export type Gesture = 'shake' | 'nod' | 'slap' | 'fists' | 'smash' | 'celebrate' | 'laugh';

export interface HostAct {
  /** Who the host looks at. Defaults to the other host. */
  look?: 'other' | 'camera';
  /** 0 calm … 4 about to blow: leans in, then trembles and steams from 3. */
  anger?: number;
  /** Change `key` to play the gesture again. */
  gesture?: { name: Gesture; key: number };
}

export type Hand = 'Left' | 'Right';

export interface BoneTurn {
  bone: string;
  axis: 'up' | 'left';
  /** Degrees. */
  deg: number;
}

export const GESTURE_SECONDS: Record<Gesture, number> = {
  shake: 1.0,
  nod: 1.0,
  slap: 0.9,
  fists: 1.3,
  smash: 2.6,
  celebrate: 2.2,
  laugh: 1.9,
};

/** When the fists land on the laptop in `smash` (s after it starts). */
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
      return [...arm(hand, s, 60, 35), { bone: 'Spine2', axis: 'left', deg: 5 * envelope(t, 0.4, 0.6, 0.3) }];
    }
    case 'fists': {
      const s = t < 0.6 ? strike(t, 0.25, 0.32, FISTS_IMPACT_S[0], 0.6) : strike(t - 0.6, 0.25, 0.32, FISTS_IMPACT_S[1] - 0.6, 0.7);
      return [
        ...arm('Left', s, 55, 30),
        ...arm('Right', s, 55, 30),
        { bone: 'Spine2', axis: 'left', deg: 9 * envelope(t, 0.2, 1.0, 0.3) },
      ];
    }
    case 'smash': {
      const s = strike(t, 0.62, 0.86, SMASH_IMPACT_S, 1.5);
      const after = envelope(t - SMASH_IMPACT_S, 0.06, 1.1, 0.5);
      // Back with both arms high, then everything comes down onto the laptop.
      const lean = s > 0 ? -12 * s : 0;
      return [
        ...arm('Left', s, 115, 25),
        ...arm('Right', s, 115, 25),
        { bone: 'Spine2', axis: 'left', deg: lean + 16 * after + 2.5 * wave(t, 1.6) * after },
        { bone: 'Head', axis: 'left', deg: 10 * after },
      ];
    }
    case 'celebrate': {
      const up = envelope(t, 0.35, 1.7, 0.45);
      const pump = 0.12 * wave(t, 2.2) * up;
      return [
        ...arm('Left', up + pump, 135, 20),
        ...arm('Right', up + pump, 135, 20),
        { bone: 'Spine2', axis: 'left', deg: -6 * up },
        { bone: 'Head', axis: 'left', deg: -10 * up },
      ];
    }
    case 'laugh': {
      const env = envelope(t, 0.15, 1.45, 0.4);
      const shake = wave(t, 5) * env;
      return [
        { bone: 'Spine2', axis: 'left', deg: 6 * env + 4 * shake },
        { bone: 'Spine1', axis: 'left', deg: 2 * shake },
        { bone: 'Head', axis: 'left', deg: -12 * env + 3 * shake },
      ];
    }
  }
}

/** Continuous anger: leaning in, then trembling and heavy breathing. */
export function moodPose(anger: number, time: number): BoneTurn[] {
  if (anger <= 0) return [];
  const turns: BoneTurn[] = [{ bone: 'Spine2', axis: 'left', deg: 1.8 * anger }];
  if (anger >= 3) {
    const k = anger - 2;
    turns.push(
      { bone: 'Head', axis: 'up', deg: 1.2 * k * wave(time, 9) },
      { bone: 'Spine1', axis: 'left', deg: 1.6 * k * wave(time, 1.3) },
    );
  }
  return turns;
}

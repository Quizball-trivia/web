/**
 * Ten goal celebrations after famous ones, with moving arms and hands (AvatarFullBody `movingArms`): legs, arms, the
 * whole figure's lift / tilt / spin, and a caption. Each starts and ends on the art's own raised arms (ARMS_REST), so
 * it can begin and finish anywhere. Pure — no React.
 *
 * (The labels name the players they're after for the dev lab; anything shipped would get neutral names.)
 */

import {
  ARMS_REST,
  STAND,
  celebratePose,
  crouchPose,
  idlePose,
  kneeSlidePose,
  mixArms,
  mixPose,
  reachArm,
  runPose,
  type ArmPose,
  type FullBodyPose,
  type HandShape,
} from './zoneMatch.fullBody';

export interface CelebrationFrame {
  body: FullBodyPose;
  /** % of the figure's height. */
  lift: number;
  tilt: number;
  /** Turn about the vertical (degrees): a spin. */
  spin: number;
  /** Travel (% of the figure's width). */
  shift: number;
  caption: { text: string; opacity: number; scale: number } | null;
}

export interface Celebration {
  id: string;
  label: string;
  about: string;
  length: number;
  frame: (t: number) => CelebrationFrame;
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
};
const bell = (t: number, t0: number, t1: number) => Math.sin(Math.PI * clamp01((t - t0) / (t1 - t0))) ** 2;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** The same arm on both sides (mirrored). */
const both = (upper: number, fore: number, hand: number, shape: HandShape): ArmPose => ({
  L: { upper: -upper, fore: -fore, hand: -hand, shape },
  R: { upper, fore, hand, shape },
});

/** In from the art's raised arms over the first `inS`, back to them over the last `outS`. */
function withArms(t: number, length: number, arms: ArmPose, inS = 0.3, outS = 0.35): ArmPose {
  const k = Math.min(smooth(t / inS), smooth((length - t) / outS));
  return mixArms(ARMS_REST, arms, k);
}
const frame = (body: FullBodyPose, extra: Partial<CelebrationFrame> = {}): CelebrationFrame => ({ body, lift: 0, tilt: 0, spin: 0, shift: 0, caption: null, ...extra });
/** Legs into `pose` from the idle and back. */
const legs = (t: number, length: number, pose: FullBodyPose) => mixPose(idlePose(t), pose, Math.min(smooth(t / 0.25), smooth((length - t) / 0.3)));

/** Running arms: bent at the elbow, swinging opposite to each other. */
function runningArms(phase: number): ArmPose {
  const s = Math.sin(phase * Math.PI * 2);
  return {
    L: { upper: -8 + 28 * s, fore: 115 + 30 * s, hand: 120 + 30 * s, shape: 'fist' },
    R: { upper: 8 - 28 * s, fore: 115 - 30 * s, hand: 120 - 30 * s, shape: 'fist' },
  };
}

/* ── 1. SIU: run, jump and spin, land wide, arms thrown down ──────────── */

const siu: Celebration = {
  id: 'siu',
  label: 'SIU (Ronaldo)',
  about: 'A run, a leap with a full spin, landing wide with the arms thrown down and out: “Siuuu!”',
  length: 3.4,
  frame(t) {
    const L = this.length;
    const jump = { take: 0.7, land: 1.35 };
    const wide: FullBodyPose = { ...STAND, hipL: -20, kneeL: 34, ankleL: 14, hipR: 20, kneeR: 34, ankleR: -14, bodyY: 26, lean: -6 };
    const air = Math.sin(Math.PI * clamp01((t - jump.take) / (jump.land - jump.take)));
    let body: FullBodyPose;
    let arms: ArmPose;
    if (t < jump.take) {
      body = runPose(t * 2.6, 1);
      arms = runningArms(t * 2.6);
    } else if (t < jump.land) {
      body = mixPose(celebratePose(0.5), STAND, 0.2);
      arms = mixArms(runningArms(jump.take * 2.6), both(150, 165, 172, 'open'), smooth((t - jump.take) / 0.2));
    } else {
      body = mixPose(STAND, wide, smooth((t - jump.land) / 0.12));
      // The arms come down hard and out.
      arms = mixArms(both(150, 165, 172, 'open'), both(42, 36, 30, 'open'), smooth((t - jump.land) / 0.1));
    }
    const shout = bell(t, jump.land, L - 0.3);
    return frame(
      { ...mixPose(body, idlePose(t), smooth((t - (L - 0.35)) / 0.35)), arms: withArms(t, L, arms, 0.15) },
      {
        lift: 26 * air - 1.5 * bell(t, jump.land, jump.land + 0.25),
        spin: 360 * smooth((t - jump.take) / (jump.land - jump.take)),
        shift: t < jump.take ? lerp(-40, 0, t / jump.take) : 0,
        caption: t > jump.land ? { text: 'SIUUU!', opacity: Math.min(1, shout * 2), scale: 0.7 + 0.4 * smooth((t - jump.land) / 0.15) } : null,
      },
    );
  },
};

/* ── 2. Shaka (Ronaldinho): a happy bounce, both hands shaking the shaka ─ */

const shaka: Celebration = {
  id: 'shaka',
  label: 'Shaka (Ronaldinho)',
  about: 'A bouncing little dance, both hands up giving the hang-loose shaka and shaking it.',
  length: 3,
  frame(t) {
    const L = this.length;
    const bounce = Math.abs(Math.sin(t * 7));
    const wag = Math.sin(t * 14);
    const arms: ArmPose = {
      L: { upper: -62, fore: 162 + 14 * wag, hand: 166 + 22 * wag, shape: 'shaka' },
      R: { upper: 62, fore: -162 + 14 * wag, hand: -166 + 22 * wag, shape: 'shaka' },
    };
    const body = legs(t, L, { ...STAND, kneeL: STAND.kneeL + 16 * bounce, kneeR: STAND.kneeR + 16 * bounce, bodyY: STAND.bodyY + 12 * bounce, bodyX: 8 * Math.sin(t * 3.5), lean: 3 * Math.sin(t * 3.5) });
    return frame({ ...body, arms: withArms(t, L, arms) }, { lift: 2 * bounce });
  },
};

/* ── 3. Samba (Neymar): quick samba steps, hips and arms swinging ────── */

const samba: Celebration = {
  id: 'samba',
  label: 'Samba (Neymar)',
  about: 'Quick samba steps on the spot: knees up in turn, the hips swaying, the arms swinging side to side.',
  length: 3.2,
  frame(t) {
    const L = this.length;
    const step = t * 8;
    const upR = Math.max(0, Math.sin(step));
    const upL = Math.max(0, -Math.sin(step));
    const sway = Math.sin(t * 4);
    const body = legs(t, L, {
      ...STAND,
      hipR: STAND.hipR + 28 * upR,
      kneeR: STAND.kneeR + 52 * upR,
      ankleR: STAND.ankleR + 24 * upR,
      hipL: STAND.hipL + 28 * upL,
      kneeL: STAND.kneeL + 52 * upL,
      ankleL: STAND.ankleL + 24 * upL,
      bodyX: 14 * sway,
      bodyY: STAND.bodyY + 6,
      lean: 5 * sway,
    });
    const arms: ArmPose = {
      L: { upper: -22 + 14 * sway, fore: 80 + 45 * sway, hand: 90 + 50 * sway, shape: 'open' },
      R: { upper: 22 + 14 * sway, fore: -80 + 45 * sway, hand: -90 + 50 * sway, shape: 'open' },
    };
    return frame({ ...body, arms: withArms(t, L, arms) });
  },
};

/* ── 4. To the sky (Messi): both index fingers pointed up, looking up ─── */

const sky: Celebration = {
  id: 'sky',
  label: 'To the sky (Messi)',
  about: 'A few slow steps, then both arms straight up, index fingers pointing at the sky, head back.',
  length: 3.2,
  frame(t) {
    const L = this.length;
    const walking = t < 0.9;
    const body = walking ? runPose(t * 1.6, 0.05) : legs(t, L, { ...STAND, lean: -9 });
    const reach = smooth((t - 0.8) / 0.35);
    const pump = 6 * Math.sin((t - 1.2) * 5) * bell(t, 1.2, L - 0.5);
    const up = both(165 - pump, 172 - pump, 179, 'point');
    const arms = mixArms(both(12, 8, 6, 'open'), up, reach);
    return frame({ ...body, arms: withArms(t, L, arms) }, { shift: walking ? lerp(-20, 0, t / 0.9) : 0 });
  },
};

/* ── 5. Heart hands (Bale): the hands make a heart in front of the chest ─ */

const heart: Celebration = {
  id: 'heart',
  label: 'Heart hands (Bale)',
  about: 'Standing tall, the two hands joined in a heart in front of the chest, held out to the crowd.',
  length: 3,
  frame(t) {
    const L = this.length;
    const breathe = Math.sin(t * 3);
    const arms: ArmPose = {
      L: reachArm('L', 214, 352 + 3 * breathe, 150, 'heart'),
      R: reachArm('R', 282, 352 + 3 * breathe, -150, 'heart'),
    };
    return frame({ ...legs(t, L, { ...STAND, lean: -3 }), arms: withArms(t, L, arms) }, { caption: { text: '♥', opacity: bell(t, 0.6, L - 0.3), scale: 1 + 0.12 * Math.sin(t * 9) } });
  },
};

/* ── 6. Arms folded (Mbappé): still, arms crossed, chin up ──────────── */

const folded: Celebration = {
  id: 'folded',
  label: 'Arms folded (Mbappé)',
  about: 'Dead still, arms crossed over the chest, chin up — nothing to see here.',
  length: 3,
  frame(t) {
    const L = this.length;
    const arms: ArmPose = {
      L: reachArm('L', 318, 392, 96, 'fist'),
      R: reachArm('R', 178, 382, -96, 'fist'),
    };
    return frame({ ...legs(t, L, { ...STAND, lean: -5, bodyY: STAND.bodyY - 2 * Math.sin(t * 2) }), arms: withArms(t, L, arms) });
  },
};

/* ── 7. Shush: a finger to the lips ──────────────────────────────────── */

const shush: Celebration = {
  id: 'shush',
  label: 'Shush (finger to the lips)',
  about: 'Walking towards the crowd, one finger to the lips, the other arm down.',
  length: 3,
  frame(t) {
    const L = this.length;
    const walking = t < 0.8;
    const body = walking ? runPose(t * 1.8, 0.05) : legs(t, L, { ...STAND, lean: 4 });
    const arms: ArmPose = {
      L: { upper: -10, fore: -6, hand: -4, shape: 'open' },
      R: reachArm('R', 282, 236, -176, 'point'),
    };
    return frame({ ...body, arms: withArms(t, L, arms) }, { shift: walking ? lerp(-18, 0, t / 0.8) : 0, caption: t > 0.8 ? { text: 'shh…', opacity: bell(t, 0.8, L - 0.3), scale: 0.8 } : null });
  },
};

/* ── 8. Zen (Haaland): down on the knees, hands on the thighs, calm ───── */

const zen: Celebration = {
  id: 'zen',
  label: 'Zen (Haaland)',
  about: 'Down onto the knees, sitting back, hands resting on the thighs with the fingers in an OK circle, eyes front.',
  length: 3.4,
  frame(t) {
    const L = this.length;
    const sit = { ...kneeSlidePose(), lean: 0 };
    const k = Math.min(smooth((t - 0.1) / 0.45), smooth((L - 0.2 - t) / 0.45));
    const body = mixPose(idlePose(t), sit, k);
    // The thighs, in the upper body's units (it is carried down with the hips).
    const arms: ArmPose = {
      L: reachArm('L', 168, 528, -6, 'ok'),
      R: reachArm('R', 328, 528, 6, 'ok'),
    };
    return frame({ ...body, arms: mixArms(ARMS_REST, arms, k) }, { lift: 1.2 * Math.sin(t * 2.2) * k });
  },
};

/* ── 9. Aeroplane: arms out like wings, banking round ───────────────── */

const aeroplane: Celebration = {
  id: 'aeroplane',
  label: 'Aeroplane',
  about: 'Running with the arms out wide like wings, banking one way then the other.',
  length: 3.2,
  frame(t) {
    const L = this.length;
    const bank = Math.sin(t * 2.4);
    const wings: ArmPose = {
      L: { upper: -94 + 14 * bank, fore: -94 + 16 * bank, hand: -94 + 18 * bank, shape: 'flat' },
      R: { upper: 94 + 14 * bank, fore: 94 + 16 * bank, hand: 94 + 18 * bank, shape: 'flat' },
    };
    return frame({ ...runPose(t * 2.4, 0.8), arms: withArms(t, L, wings) }, { tilt: 12 * bank * Math.min(smooth(t / 0.3), smooth((L - t) / 0.3)), shift: 6 * Math.sin(t * 1.2) });
  },
};

/* ── 10. Dab (Pogba): two quick dabs ─────────────────────────────────── */

const dab: Celebration = {
  id: 'dab',
  label: 'Dab (Pogba)',
  about: 'Two quick dabs: one arm thrown out straight and high, the head ducked into the other elbow.',
  length: 3,
  frame(t) {
    const L = this.length;
    const hit = Math.max(bell(t, 0.35, 1.25), bell(t, 1.55, 2.5));
    const pose: ArmPose = {
      L: { upper: -138, fore: -138, hand: -140, shape: 'flat' },
      R: reachArm('R', 168, 176, -120, 'fist', -1),
    };
    const ready: ArmPose = both(18, 30, 30, 'fist');
    const arms = mixArms(ready, pose, Math.min(1, hit * 1.6));
    const body = { ...mixPose(STAND, { ...crouchPose(0.3), lean: -14 }, hit), arms: withArms(t, L, arms, 0.2) };
    return frame(body, { tilt: -6 * hit, lift: 2 * bell(t, 0.3, 0.5) + 2 * bell(t, 1.5, 1.7) });
  },
};

export const CELEBRATION_LIST: Celebration[] = [siu, shaka, samba, sky, heart, folded, shush, zen, aeroplane, dab];

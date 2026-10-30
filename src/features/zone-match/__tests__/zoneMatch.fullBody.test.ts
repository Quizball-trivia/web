import { describe, expect, it } from 'vitest';
import {
  FULL_GROUND,
  FULL_H,
  STAND,
  backpedalPose,
  celebratePose,
  crouchPose,
  divePose,
  footOf,
  fullBodyColors,
  idlePose,
  jockeyPose,
  keeperSetPose,
  runPose,
  runStep,
  slidePose,
  stepOverPose,
  strikePose,
  type FullBodyPose,
} from '../zoneMatch.fullBody';

describe('full-body colours', () => {
  it('takes the legs from the skin and the shorts / socks from the jersey', () => {
    const red = fullBodyColors({ skin: 'skin_male_dark', jersey: 'jersey_red' });
    const light = fullBodyColors({ skin: 'skin_male_white', jersey: 'jersey_barcelona' });
    expect(red.skin).not.toBe(light.skin);
    expect(red.socks.toLowerCase()).toBe('#e23b3b');
    expect(light.shorts.toLowerCase()).toBe('#004d98');
  });

  it('falls back to white kit and the light skin', () => {
    const c = fullBodyColors(null);
    expect(c.shorts).toBe(c.socks);
    expect(c.skin).toBe(fullBodyColors({ skin: 'skin_male_white' }).skin);
  });
});

describe('poses', () => {
  it('alternates the legs through a run cycle', () => {
    // u 0: the right leg furthest back (toe-off), the left furthest forward; half a cycle later, the other way round.
    const a = runPose(0);
    const b = runPose(0.5);
    expect(Math.sign(a.hipR)).toBe(-Math.sign(a.hipL));
    expect(Math.sign(a.hipR)).toBe(-Math.sign(b.hipR));
  });

  it('winds the kicking leg back, then swings it through the ball', () => {
    expect(strikePose(0.55).hipR).toBeLessThan(-20);
    expect(strikePose(0.95).hipR).toBeGreaterThan(30);
    expect(strikePose(2).hipR).toBeCloseTo(STAND.hipR);
  });

  it('extends a leg in the slide, stretches both in the dive and tucks the knees in the jump', () => {
    expect(slidePose(1).hipR).toBeGreaterThan(80);
    expect(slidePose(1).kneeR).toBeLessThan(15);
    expect(divePose(1).hipL).toBeLessThan(0);
    expect(divePose(1).hipR).toBeLessThan(0);
    expect(celebratePose(0.5).kneeL).toBeGreaterThan(70);
  });
});

const GROUND = FULL_GROUND * FULL_H;
/** How far the lower boot is off the ground (+ above, − into it). */
const gap = (p: FullBodyPose) => GROUND - Math.max(footOf(p, 'L').low, footOf(p, 'R').low);
const frames = (fn: (t: number) => FullBodyPose, length: number, n = 240) => Array.from({ length: n + 1 }, (_, i) => fn((i / n) * length));
/** The biggest change of any joint between neighbouring frames. */
const biggestStep = (poses: FullBodyPose[]) => {
  let step = 0;
  for (let i = 1; i < poses.length; i += 1) {
    for (const key of Object.keys(STAND) as (keyof FullBodyPose)[]) step = Math.max(step, Math.abs(poses[i][key] - poses[i - 1][key]));
  }
  return step;
};

describe('feet on the ground', () => {
  const grounded: [string, (t: number) => FullBodyPose, number][] = [
    ['stand', () => STAND, 1],
    ['idle', (t) => idlePose(t), 5],
    ['jog', (t) => runPose(t * 1.2, 0.4), 2.5],
    ['sprint', (t) => runPose(t * 1.6, 1), 2.5],
    ['backpedal', (t) => backpedalPose(t * 1.3), 2.5],
    ['jockey', (t) => jockeyPose(t), 2.5],
    ['keeper set', (t) => keeperSetPose(t), 3.5],
    ['crouch', (t) => crouchPose(Math.min(1, t)), 1],
    ['strike', (t) => strikePose(t), 2],
    ['step-over', (t) => stepOverPose(t), 1],
  ];

  // Art units; the figure is 840 tall, so 8 is about a pixel in the match. (The leg keeps a little bend at full
  // stretch, so a landing boot can hover a few units for a moment.)
  it.each(grounded)('%s: a boot is always on the ground, never sunk into it', (_name, fn, length) => {
    for (const p of frames(fn, length)) {
      expect(gap(p)).toBeLessThan(8);
      expect(gap(p)).toBeGreaterThan(-7);
    }
  });

  it('plants both boots flat when standing', () => {
    for (const p of [STAND, idlePose(0.7), jockeyPose(0.3), keeperSetPose(1.1), crouchPose(1)]) {
      for (const side of ['L', 'R'] as const) {
        expect(Math.abs(footOf(p, side).low - GROUND)).toBeLessThan(1.5);
        // Sole flat: the boot's turn (knee − hip − ankle) is zero.
        const turn = side === 'L' ? p.kneeL - p.hipL - p.ankleL : p.kneeR - p.hipR - p.ankleR;
        expect(Math.abs(turn)).toBeLessThan(0.5);
      }
    }
  });
});

describe('smooth motion', () => {
  it.each([
    ['jog', (t: number) => runPose(t * 1.2, 0.4), 2.5],
    ['backpedal', (t: number) => backpedalPose(t * 1.3), 2.5],
    ['idle', (t: number) => idlePose(t), 5],
    ['jockey', (t: number) => jockeyPose(t), 2.5],
    ['celebrate', (t: number) => celebratePose(t), 2.55],
    ['step-over', (t: number) => stepOverPose(t), 1],
  ] as const)('%s: no joint jumps more than 12 units between 120 Hz frames', (_name, fn, length) => {
    expect(biggestStep(frames(fn, length, Math.round(length * 120)))).toBeLessThan(12);
  });

  it('the run bends the swinging knee (moving forward), not the one carrying the weight', () => {
    // Furthest back = toe-off (u 0); a quarter later the leg is mid-swing, three quarters later mid-stance.
    const midSwing = runPose(0.25, 0.4);
    const midStance = runPose(0.75, 0.4);
    expect(midSwing.kneeR).toBeGreaterThan(50);
    expect(midStance.kneeR).toBeLessThan(30);
  });

  it('the strike starts and ends in the stance', () => {
    for (const key of Object.keys(STAND) as (keyof FullBodyPose)[]) {
      expect(strikePose(0)[key]).toBeCloseTo(STAND[key], 0);
      expect(strikePose(2)[key]).toBeCloseTo(STAND[key], 0);
    }
  });

  it('the celebration loops without a jump', () => {
    for (const key of Object.keys(STAND) as (keyof FullBodyPose)[]) expect(celebratePose(0)[key]).toBeCloseTo(celebratePose(0.85 - 1e-6)[key], 1);
  });
});

describe('a planted boot stays put', () => {
  it.each([0.4, 0.7, 1])('at speed %s it slides less than 12 art units over a stance', (speed) => {
    // The director moves the hips 2 · runStep per cycle; the boot's place on the pitch is that travel plus its offset.
    const step = runStep(speed);
    let anchor: number | null = null;
    let drift = 0;
    for (let i = 0; i <= 800; i += 1) {
      const u = i / 800;
      const w = u % 1;
      if (w < 0.52 || w > 0.98) {
        anchor = null;
        continue;
      }
      const p = runPose(u, speed);
      const place = 2 * step * u + footOf(p, 'R').x - p.bodyX;
      anchor ??= place;
      drift = Math.max(drift, Math.abs(place - anchor));
    }
    expect(drift).toBeLessThan(12);
  });
});


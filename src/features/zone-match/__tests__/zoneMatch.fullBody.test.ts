import { describe, expect, it } from 'vitest';
import { celebratePose, divePose, fullBodyColors, runPose, slidePose, strikePose } from '../zoneMatch.fullBody';

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
    const a = runPose(0.25);
    const b = runPose(0.75);
    expect(Math.sign(a.hipR)).toBe(-Math.sign(a.hipL));
    expect(Math.sign(a.hipR)).toBe(-Math.sign(b.hipR));
  });

  it('winds the kicking leg back, then swings it through the ball', () => {
    expect(strikePose(0.55).hipR).toBeLessThan(-20);
    expect(strikePose(0.95).hipR).toBeGreaterThan(30);
    expect(strikePose(2).hipR).toBeCloseTo(0);
  });

  it('extends a leg in the slide, stretches both in the dive and tucks the knees in the jump', () => {
    expect(slidePose(1).hipR).toBeGreaterThan(80);
    expect(slidePose(1).kneeR).toBeLessThan(15);
    expect(divePose(1).hipL).toBeLessThan(0);
    expect(divePose(1).hipR).toBeLessThan(0);
    expect(celebratePose(0.5).kneeL).toBeGreaterThan(70);
  });
});

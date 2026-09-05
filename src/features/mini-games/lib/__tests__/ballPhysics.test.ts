import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { shotFlight, bounceHeight, netRebound } from '../ballPhysics';

describe('football flight and impacts', () => {
  it('hits the selected arrival point and time for low, high and curved shots', () => {
    const origin = new THREE.Vector3(0, .13, 9), out = new THREE.Vector3();
    for (const height of [.56, 1.9]) for (const duration of [.78, .78 * .88]) {
      const target = new THREE.Vector3(2.45, height, .42);
      expect(shotFlight(out, origin, target, 0, duration, .4).distanceTo(origin)).toBeLessThan(1e-8);
      expect(shotFlight(out, origin, target, duration, duration, .4).distanceTo(target)).toBeLessThan(1e-8);
      for (let i = 0; i <= 100; i++) expect(shotFlight(out, origin, target, duration * i / 100, duration, .4).y).toBeGreaterThanOrEqual(.13 - 1e-8);
    }
  });
  it('rebounds continuously, loses energy and stops on the turf', () => {
    let previous = 1.84;
    for (let frame = 0; frame <= 480; frame++) {
      const height = bounceHeight(1.84, -.35, frame / 120);
      expect(height).toBeGreaterThanOrEqual(.13);
      expect(Math.abs(height - previous)).toBeLessThan(.055);
      previous = height;
    }
    expect(previous).toBe(.13);
  });
  it('enters the net without a position jump and keeps sampled results deterministic', () => {
    const impact = new THREE.Vector3(-2.45, 1.84, .18), out = new THREE.Vector3();
    expect(netRebound(out, impact, 0).distanceTo(impact)).toBeLessThan(1e-8);
    const later = netRebound(out, impact, .8).clone();
    netRebound(out, impact, .2);
    expect(netRebound(out, impact, .8).distanceTo(later)).toBeLessThan(1e-8);
  });
});

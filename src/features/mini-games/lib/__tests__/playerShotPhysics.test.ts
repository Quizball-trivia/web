import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { sampleStyledShot, SHOT_PROFILES } from '../playerShotPhysics';
import type { FootballStyle } from '../footballActions';

const styles = Object.keys(SHOT_PROFILES) as FootballStyle[];
const origin = new THREE.Vector3(0, .13, 9);
const target = new THREE.Vector3(2.45, 1.9, .42);

describe('player shooting styles', () => {
  it('preserves release and keeper contact for every style and pitch orientation', () => {
    for (const style of styles) for (const axis of ['x', 'z'] as const) for (const duration of [.78, .78 * .88, .9]) {
      const out = new THREE.Vector3();
      expect(sampleStyledShot(out, origin, target, -.1, duration, style, axis).distanceTo(origin)).toBeLessThan(1e-8);
      expect(sampleStyledShot(out, origin, target, duration, duration, style, axis).distanceTo(target)).toBeLessThan(1e-8);
      expect(sampleStyledShot(out, origin, target, duration + 1, duration, style, axis).distanceTo(target)).toBeLessThan(1e-8);
    }
  });
  it('gives left-foot curl the opposite bend and curled instep more loft than power', () => {
    const point = (style: FootballStyle) => sampleStyledShot(new THREE.Vector3(), origin, target, .39, .78, style);
    expect(point('left').x).toBeLessThan(target.x / 2);
    expect(point('curl').x).toBeGreaterThan(target.x / 2);
    expect(point('curl').y).toBeGreaterThan(point('power').y + .3);
    expect(new Set(styles.map(style => point(style).toArray().join(','))).size).toBe(styles.length);
  });
  it('stays above the pitch with continuous, deterministic flight when frames are skipped', () => {
    for (const style of styles) {
      let previous = origin.clone();
      for (let frame = 0; frame <= 120; frame++) {
        const point = sampleStyledShot(new THREE.Vector3(), origin, target, .78 * frame / 120, .78, style);
        expect(point.toArray().every(Number.isFinite)).toBe(true);
        expect(point.y).toBeGreaterThanOrEqual(.13 - 1e-8);
        expect(point.distanceTo(previous)).toBeLessThan(.15);
        previous = point;
      }
      const late = sampleStyledShot(new THREE.Vector3(), origin, target, .6, .78, style);
      sampleStyledShot(new THREE.Vector3(), origin, target, .1, .78, style);
      expect(sampleStyledShot(new THREE.Vector3(), origin, target, .6, .78, style).equals(late)).toBe(true);
    }
  });
});

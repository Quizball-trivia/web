import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { sampleSavedBall } from '../keeperSaves';
describe('keeper ball responses', () => {
  it('holds a catch at the animated gloves', () => {
    const ball = new THREE.Vector3(), held = new THREE.Vector3(1,.4,.7);
    sampleSavedBall(ball, new THREE.Vector3(2,1,.42), held, .8, 'catch');
    expect(ball.equals(held)).toBe(true);
  });
  it.each(['parry', 'tip'] as const)('%s starts at contact and rebounds away from goal without crossing the turf', style => {
    const ball = new THREE.Vector3(), contact = new THREE.Vector3(2,1.8,.42), held = new THREE.Vector3();
    sampleSavedBall(ball, contact, held, 0, style); expect(ball.equals(contact)).toBe(true);
    for (let t=.01;t<4;t+=.01) { sampleSavedBall(ball, contact, held, t, style); expect(ball.z).toBeGreaterThan(contact.z); expect(ball.y).toBeGreaterThanOrEqual(.13); }
  });
  it('gives a fingertip save a higher rebound than a parry', () => {
    const target = new THREE.Vector3(2,1.8,.42), held = new THREE.Vector3();
    const parry = sampleSavedBall(new THREE.Vector3(),target,held,.2,'parry');
    const tip = sampleSavedBall(new THREE.Vector3(),target,held,.2,'tip');
    expect(tip.y).toBeGreaterThan(parry.y+.3);
  });
});

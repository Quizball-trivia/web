import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GoalNet } from '../zoneMatch3d.net';
import { intoTheNet } from '../zoneMatch3d.director';

const BACK = -1.8;

function deepest(net: GoalNet) {
  const pos = net.geometry.getAttribute('position').array as ArrayLike<number>;
  let min = Infinity;
  for (let i = 2; i < pos.length; i += 3) min = Math.min(min, pos[i]);
  return min;
}

describe('GoalNet', () => {
  it('hangs inside its frame at rest', () => {
    const net = new GoalNet();
    expect(deepest(net)).toBeGreaterThan(BACK - 0.15);
  });

  it('bulges out behind the goal where a shot hits it, then settles back', () => {
    const net = new GoalNet();
    const from = new THREE.Vector3(-6, 0.17, 11);
    const contact = new THREE.Vector3(3.1, 2.4, BACK + 0.17);
    const ball = new THREE.Vector3();
    let bulge = 0;
    for (let f = 0; f < 240; f++) {
      intoTheNet(ball, from, contact, f / 60);
      net.update(1 / 60, ball);
      bulge = Math.max(bulge, BACK - deepest(net));
    }
    expect(bulge).toBeGreaterThan(0.4);
    for (let f = 0; f < 600; f++) net.update(1 / 60, null);
    expect(deepest(net)).toBeGreaterThan(BACK - 0.15);
  });
});

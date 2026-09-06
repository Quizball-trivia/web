import { describe, expect, it } from 'vitest';
import { createRoadNet, deformRoadNet } from '../roadNet';

describe('Road goal net impact', () => {
  it('ripples the float32 back plane after a goal while leaving the front fixed', () => {
    const net = createRoadNet();
    deformRoadNet(net, -1);
    const rest = Float32Array.from(net.geometry.getAttribute('position').array);
    deformRoadNet(net, .12);
    const positions = net.geometry.getAttribute('position');
    let movingBackVertices = 0;
    for (let i = 0; i < positions.count; i++) {
      if (net.backPlane[i] && positions.getZ(i) < rest[i * 3 + 2] - .001) movingBackVertices++;
      if (net.original[i * 3 + 2] === 0) expect(positions.getZ(i)).toBe(net.original[i * 3 + 2]);
    }
    expect(movingBackVertices).toBeGreaterThan(0);
    deformRoadNet(net, 3);
    expect(Float32Array.from(positions.array)).toEqual(rest);
    net.geometry.dispose();
  });
});

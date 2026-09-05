import * as THREE from 'three';

/** Back-plane membership is recorded once, independent of Float32 coordinate rounding. */
export function createRoadNet() {
  const points: number[] = [];
  const line = (a: number[], b: number[]) => points.push(...a, ...b);
  const w = 4.25, h = 3.2, d = 1.8;
  for (let i = 0; i <= 48; i++) {
    const x = -w + i * 2 * w / 48;
    line([x, .04, -d], [x, h, -d]);
    line([x, h, 0], [x, h, -d]);
  }
  for (let i = 0; i <= 20; i++) {
    const y = .04 + i * (h - .04) / 20;
    line([-w, y, -d], [w, y, -d]);
    for (const x of [-w, w]) line([x, y, 0], [x, y, -d]);
  }
  for (let i = 0; i <= 11; i++) {
    const z = -i * d / 11;
    line([-w, h, z], [w, h, z]);
    for (const x of [-w, w]) line([x, .04, z], [x, h, z]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const original = new Float32Array(points);
  const backPlane = new Uint8Array(original.length / 3);
  for (let i = 0; i < backPlane.length; i++) backPlane[i] = Math.abs(original[i * 3 + 2] + d) < 1e-5 ? 1 : 0;
  return { geometry, original, backPlane };
}

export function deformRoadNet(net: ReturnType<typeof createRoadNet>, age: number) {
  const positions = net.geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i++) {
    const x = net.original[i * 3], y = net.original[i * 3 + 1], z = net.original[i * 3 + 2];
    const pinned = Math.sin((x + 4.25) / 8.5 * Math.PI) * Math.sin(y / 3.2 * Math.PI);
    const pocket = Math.exp(-((x - 3.15) ** 2 + (y - 2.15) ** 2) * 1.2);
    const wave = age > 0 ? Math.sin(Math.min(age * 12, Math.PI)) * Math.exp(-age * 2.8) * pocket * .65 : 0;
    positions.setZ(i, z - (net.backPlane[i] ? pinned * .1 + wave : 0));
  }
  positions.needsUpdate = true;
}

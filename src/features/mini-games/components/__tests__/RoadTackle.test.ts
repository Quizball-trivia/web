import fs from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { resolveJoints } from '../ScoreGoalsPlayer3D';
import { ROAD_TACKLE_CONTACT, sampleRoadTackle, tackleBootPoint, tackleShinPoint } from '../RoadTackle';

let model: THREE.Group;
beforeAll(async () => {
  const dir = 'public/assets/demos/score/footballer/';
  const json = JSON.parse(fs.readFileSync(dir + 'footballer.gltf', 'utf8'));
  delete json.images; delete json.textures;
  for (const material of json.materials) if (material.pbrMetallicRoughness) delete material.pbrMetallicRoughness.baseColorTexture;
  json.buffers[0].uri = 'data:application/octet-stream;base64,' + fs.readFileSync(dir + 'footballer.bin').toString('base64');
  model = (await new GLTFLoader().parseAsync(JSON.stringify(json), '')).scene;
});

function setup(x = -1.7, defenderX = 1.5) {
  const runner = new THREE.Group(); runner.add(clone(model)); runner.scale.setScalar(1.75);
  const defender = new THREE.Group(); defender.add(clone(model)); defender.scale.setScalar(1.67);
  const r = resolveJoints(runner)!, d = resolveJoints(defender)!;
  const origin = { runner: new THREE.Vector3(x, 0, 1.25), defender: new THREE.Vector3(defenderX, 0, .15), runnerYaw: 0, defenderYaw: 0 };
  return { runner, defender, r, d, origin, sample: (time: number) => sampleRoadTackle(runner, defender, r, d, origin, time) };
}

describe('Road to Goal tackle with the exported footballer', () => {
  it.each([[-1.7, 1.5], [2.4, 4.75], [31.65, 34]])('connects the leading boot to the shin at zone origins %s/%s', (x, defenderX) => {
    const s = setup(x, defenderX);
    for (const time of [ROAD_TACKLE_CONTACT, .4, .46]) {
      s.sample(time);
      const boot = tackleBootPoint(s.defender, s.d.ankleL!, new THREE.Vector3());
      const shin = tackleShinPoint(s.r, new THREE.Vector3());
      expect(boot.distanceTo(shin)).toBeLessThan(.005);
      for (const name of ['ankleL', 'ankleR', 'kneeL', 'kneeR', 'pelvis', 'torso'] as const) {
        expect(s.d[name]!.getWorldPosition(new THREE.Vector3()).y, name).toBeGreaterThan(.025);
      }
    }
  });
  it('keeps the runner upright until contact and lands after the trip', () => {
    const s = setup();
    s.sample(ROAD_TACKLE_CONTACT);
    const before = s.r.torso!.getWorldPosition(new THREE.Vector3()).y;
    s.sample(1.1);
    const after = s.r.torso!.getWorldPosition(new THREE.Vector3()).y;
    expect(before).toBeGreaterThan(1.8);
    expect(after).toBeLessThan(.5);
    expect(after).toBeGreaterThan(.23);
  });
  it('produces the same contact and landing regardless of frame rate or replay', () => {
    const a = setup(), b = setup();
    for (let t = 0; t <= 1.1; t += 1 / 30) a.sample(t);
    for (let t = 0; t <= 1.1; t += 1 / 120) b.sample(t);
    a.sample(1.1); b.sample(1.1);
    expect(a.defender.position.distanceTo(b.defender.position)).toBeLessThan(.00001);
    a.sample(0); a.sample(ROAD_TACKLE_CONTACT); b.sample(ROAD_TACKLE_CONTACT);
    expect(a.runner.position.distanceTo(b.runner.position)).toBeLessThan(.00001);
  });
});

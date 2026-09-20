import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildPlayerObject, disposeBuiltObject } from '../ScoreGoalsPlayer3D';

describe('hair binding fallback', () => {
  it.each([false, true])('uses the body head bind when hair metadata is present: %s', hasMetadata => {
    const body = new THREE.Group();
    const head = new THREE.Bone(); head.name = 'Head'; head.position.y = 1.7;
    body.add(head);
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshStandardMaterial();
    const mesh = new THREE.SkinnedMesh(geometry, material);
    body.add(mesh); body.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton([head]);
    mesh.bind(skeleton);
    const hair = new THREE.Group();
    if (hasMetadata) hair.userData.headInverseBind = new THREE.Matrix4().elements;
    const hairGeometry = new THREE.BoxGeometry(.1, .1, .1);
    const hairMesh = new THREE.Mesh(hairGeometry, material); hairMesh.name = 'Hair_Long';
    hair.add(hairMesh);
    const built = buildPlayerObject(body, { shirt: '#fff', shorts: '#000', accent: '#fff' }, 'hair-test', 1, '#fff', { hair, hairStyle: 'Hair_Long', beard: false });
    const fitted = built.getObjectByName('fitted-Hair_Long');
    expect(fitted).toBeDefined();
    expect(fitted!.parent?.name).toBe('Head');
    expect(fitted!.matrix.elements).toEqual(skeleton.boneInverses[0].elements);
    disposeBuiltObject(built);
    skeleton.dispose(); geometry.dispose(); hairGeometry.dispose(); material.dispose();
  });
});

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FootballClipPlayer } from '../FootballClipPlayer';

function fixture() {
  const root = new THREE.Group();
  const bone = new THREE.Bone();
  bone.name = 'foot';
  root.add(bone);
  const stride = new THREE.AnimationClip('stride', 1, [new THREE.VectorKeyframeTrack('foot.position', [0, 1], [0, 0, 0, 2, 0, 0])]);
  const ready = new THREE.AnimationClip('ready', 1, [new THREE.VectorKeyframeTrack('foot.position', [0, 1], [0, 1, 0, 0, 1, 0])]);
  return { bone, player: new FootballClipPlayer(root, [stride, ready]) };
}

describe('Blender clip playback', () => {
  it('samples the gameplay clock, including rewind and repeated loops', () => {
    const { bone, player } = fixture();
    player.sample('stride', 0.75);
    expect(bone.position.x).toBeCloseTo(1.5);
    player.sample('stride', 0.25);
    expect(bone.position.x).toBeCloseTo(0.5);
    player.sample('stride', 3.25, true);
    expect(bone.position.x).toBeCloseTo(0.5);
  });
  it('switches actions without mixing in the previous pose and survives effect replay', () => {
    const { bone, player } = fixture();
    player.sample('stride', 0.75);
    player.sample('ready', 0.5);
    expect(bone.position.toArray()).toEqual([0, 1, 0]);
    player.stop();
    player.sample('stride', 0.5);
    expect(bone.position.toArray()).toEqual([1, 0, 0]);
  });
  it('blends into a new action from the visible pose without a first-frame snap', () => {
    const { bone, player } = fixture();
    player.sample('stride', .75);
    player.sample('ready', 0, false, .4);
    expect(bone.position.toArray()).toEqual([1.5, 0, 0]);
    player.sample('ready', .2, false, .4);
    expect(bone.position.toArray()).toEqual([.75, .5, 0]);
    player.sample('ready', .4, false, .4);
    expect(bone.position.toArray()).toEqual([0, 1, 0]);
  });
  it('clamps one-shot clips and leaves the active pose intact for a missing clip', () => {
    const { bone, player } = fixture();
    player.sample('stride', 8);
    expect(bone.position.x).toBe(2);
    expect(player.sample('missing', 0)).toBe(false);
    expect(bone.position.x).toBe(2);
  });
});

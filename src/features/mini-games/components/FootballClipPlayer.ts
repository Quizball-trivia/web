import * as THREE from 'three';

/** Sample baked Blender clips on the existing gameplay clock. Root motion
 * stays with the game, so clips cannot change shot outcomes or zone timing. */
export class FootballClipPlayer {
  readonly mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private active: THREE.AnimationAction | null = null;
  private blendStart = 0;
  private blending = false;
  private pose: { bone: THREE.Bone; position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3; targetPosition: THREE.Vector3; targetQuaternion: THREE.Quaternion; targetScale: THREE.Vector3 }[] = [];

  constructor(root: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(root);
    root.traverse(node => { if ((node as THREE.Bone).isBone) this.pose.push({ bone: node as THREE.Bone, position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone(), targetPosition: node.position.clone(), targetQuaternion: node.quaternion.clone(), targetScale: node.scale.clone() }); });
    for (const clip of clips) {
      const action = this.mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      this.actions.set(clip.name, action);
    }
  }

  sample(name: string, time: number, loop = false, blendSeconds = 0): boolean {
    const next = this.actions.get(name);
    if (!next) return false;
    // Restore the last unblended sample: Three skips writes for constant tracks.
    if (this.active === next && this.blending) for (const pose of this.pose) {
      pose.bone.position.copy(pose.targetPosition); pose.bone.quaternion.copy(pose.targetQuaternion); pose.bone.scale.copy(pose.targetScale);
    }
    if (this.active !== next) {
      this.blending = this.active !== null && blendSeconds > 0;
      this.blendStart = time;
      if (this.blending) for (const pose of this.pose) { pose.position.copy(pose.bone.position); pose.quaternion.copy(pose.bone.quaternion); pose.scale.copy(pose.bone.scale); }
      this.active?.stop();
      next.reset().play();
      this.active = next;
    }
    const duration = next.getClip().duration;
    next.time = loop && duration > 0 ? ((time % duration) + duration) % duration : Math.max(0, Math.min(duration, time));
    next.paused = false;
    this.mixer.update(0);
    if (this.blending && blendSeconds > 0) {
      const t = THREE.MathUtils.clamp((time - this.blendStart) / blendSeconds, 0, 1);
      const weight = t * t * (3 - 2 * t);
      for (const pose of this.pose) {
        pose.targetPosition.copy(pose.bone.position); pose.targetQuaternion.copy(pose.bone.quaternion); pose.targetScale.copy(pose.bone.scale);
        pose.bone.position.lerpVectors(pose.position, pose.bone.position, weight);
        pose.bone.quaternion.slerpQuaternions(pose.quaternion, pose.bone.quaternion, weight);
        pose.bone.scale.lerpVectors(pose.scale, pose.bone.scale, weight);
      }
      if (t === 1) this.blending = false;
    }
    return true;
  }

  stop() {
    this.mixer.stopAllAction();
    this.active = null;
    this.blending = false;
  }
}

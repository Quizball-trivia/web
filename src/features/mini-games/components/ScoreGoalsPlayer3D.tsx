'use client';

/**
 * Shared Blender-remodeled footballer, based on CC0 Quaternius packs (bundled at
 * /assets/demos/score/, built by scripts/build-score-rig.mjs):
 *
 *   player-body.glb  — Universal Base Characters "Superhero Male" (real face:
 *                      textured eyes + eyebrows), UE-style 65-bone skeleton
 *   player-hair.glb  — hair styles rigged to the head bone
 *
 * The new footballer uses separate skinned garment materials. Legacy
 * kits are painted by a bind-pose banding shader (the skinned mesh's
 * `position` attribute is the T-pose, so fixed bands give stable
 * skin/shirt/shorts/socks/boots zones during animation).
 *
 * This module also owns the joint adapter Free Kicks uses for procedural poses
 * (the keeper dive/catch/save library and the wall/taker stances): poses are
 * authored in character space (x right / y up / z forward, zero = a natural
 * arms-down stance); setJoint conjugates that into each bone's parent space on
 * top of the bone's rest orientation, with a T-pose→A-pose shoulder baseline
 * folded in.
 */

import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

/** Player kit colours for the bind-pose banded shader. */
export interface KitColors {
  shirt: string;
  shorts: string;
  accent: string;
  /** Sock colour; defaults to the shorts colour when omitted. */
  socks?: string;
  boots?: string;
  gloves?: string;
}

export const SCORE_BODY_URL = '/assets/demos/score/footballer/footballer.gltf';
export const SCORE_HAIR_URL = '/assets/demos/score/player-hair.glb';

export type HairStyleName = 'Hair_Buzzed' | 'Hair_SimpleParted' | 'Hair_Long' | 'Hair_Buns';
const HAIR_POOL: (HairStyleName | null)[] = [
  'Hair_Buzzed',
  'Hair_SimpleParted',
  'Hair_Long',
  'Hair_Buns',
  'Hair_Buzzed',
  null,
];


/* ── joint adapter (UE-style skeleton) ─────────────────────────────── */

export const JOINT_NAMES = [
  'pelvis',
  'spine',
  'torso',
  'hipL',
  'hipR',
  'kneeL',
  'kneeR',
  'ankleL',
  'ankleR',
  'shoL',
  'shoR',
  'elbL',
  'elbR',
  'handL',
  'handR',
  'head',
] as const;
export type JointName = (typeof JOINT_NAMES)[number];
export type JointMap = Partial<Record<JointName, THREE.Object3D>>;

const UE_BONE: Record<JointName, string> = {
  pelvis: 'pelvis',
  spine: 'spine_01',
  torso: 'spine_02',
  hipL: 'thigh_l',
  hipR: 'thigh_r',
  kneeL: 'calf_l',
  kneeR: 'calf_r',
  ankleL: 'foot_l',
  ankleR: 'foot_r',
  shoL: 'upperarm_l',
  shoR: 'upperarm_r',
  elbL: 'lowerarm_l',
  elbR: 'lowerarm_r',
  handL: 'hand_l',
  handR: 'hand_r',
  head: 'Head',
};

export const CHEST_BONE = 'spine_03';

/** The body rests in a T-pose, but the pose library's zero is a natural
 * arms-down stance — fold that baseline into the shoulders. */
const APOSE: Partial<Record<JointName, THREE.Quaternion>> = {
  shoL: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -1.18)),
  shoR: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 1.18)),
};

const _poseEuler = new THREE.Euler();
const _poseQ = new THREE.Quaternion();
const _parInvQ = new THREE.Quaternion();

/** Resolve the skeleton's bones, caching per bone its rest local rotation and
 * its parent chain's rest rotation relative to the player root. Returns null
 * until the (suspended) model has actually mounted. */
export function resolveJoints(root: THREE.Object3D): JointMap | null {
  const joints: JointMap = {};
  for (const name of JOINT_NAMES) {
    const bone = root.getObjectByName(UE_BONE[name]);
    if (!bone) return null;
    if (!bone.userData.ftRest) {
      bone.userData.ftRest = bone.quaternion.clone();
      bone.userData.ftFlexSign = name === 'elbL' ? 1 : name === 'elbR' ? -1 : 0;
      const par = new THREE.Quaternion();
      let node: THREE.Object3D | null = bone.parent;
      while (node && node !== root) {
        par.premultiply(node.quaternion);
        node = node.parent;
      }
      bone.userData.ftPar = par;
      bone.userData.ftApose = APOSE[name] ?? null;
    }
    joints[name] = bone;
  }
  return joints;
}

/** True while the cached joints still belong to the mounted model (a
 * suspense/HMR remount swaps the skeleton out from under the cache). */
export function jointsAttached(root: THREE.Object3D, joints: JointMap): boolean {
  let node: THREE.Object3D | null | undefined = joints.pelvis;
  while (node) {
    if (node === root) return true;
    node = node.parent;
  }
  return false;
}

export function setJoint(joint: THREE.Object3D | undefined, x: number, y = 0, z = 0) {
  if (!joint) return;
  const rest = joint.userData.ftRest as THREE.Quaternion | undefined;
  if (!rest) {
    joint.rotation.set(x, y, z);
    return;
  }
  const par = joint.userData.ftPar as THREE.Quaternion;
  const apose = joint.userData.ftApose as THREE.Quaternion | null;
  // In the T-pose the forearm runs along X. Flex around its transverse Y
  // axis; rotating X twists the wrist instead of bending the elbow.
  const flexSign = joint.userData.ftFlexSign as number;
  _poseEuler.set(flexSign ? y : x, flexSign ? x * flexSign : y, z);
  _poseQ.setFromEuler(_poseEuler);
  if (apose) _poseQ.multiply(apose);
  _parInvQ.copy(par).invert();
  joint.quaternion.copy(_parInvQ).multiply(_poseQ).multiply(par).multiply(rest);
}

/* ── appearance ────────────────────────────────────────────────────── */

const SKINS = ['#b9784f', '#8f563b', '#d69a6d', '#aa6948', '#7a4a30'];
const HAIRS = ['#17100c', '#472816', '#201712', '#0d0a08', '#5a4a2a'];

function hashOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Bind-pose banded kit material. Bands are in T-pose metres (body ~1.81m). */
export function makeKitMaterial(kit: KitColors, skin: string): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.72 });
  const u = {
    uSkin: { value: new THREE.Color(skin) },
    uShirt: { value: new THREE.Color(kit.shirt) },
    uShorts: { value: new THREE.Color(kit.shorts) },
    uSocks: { value: new THREE.Color(kit.socks ?? kit.shorts) },
    uBoots: { value: new THREE.Color(kit.boots ?? '#f0f5df') },
    uGloves: { value: new THREE.Color(kit.gloves ?? skin) },
    uAccent: { value: new THREE.Color(kit.accent) },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBindPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBindPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vBindPos;
uniform vec3 uSkin;
uniform vec3 uShirt;
uniform vec3 uShorts;
uniform vec3 uSocks;
uniform vec3 uBoots;
uniform vec3 uAccent;
uniform vec3 uGloves;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  float y = vBindPos.y;
  float ax = abs(vBindPos.x);
  vec3 zone = uShirt;
  if (y > 1.55) zone = uSkin;
  else if (y > 0.94) zone = ax > 0.73 ? uSkin : uShirt;
  else if (y > 0.56) zone = uShorts;
  else if (y > 0.15) zone = uSocks;
  else zone = uBoots;
  // Tailored panels follow the bind pose, so cuffs and seams deform with
  // the kit instead of swimming across the skin during a kick.
  bool shirt = y > 0.94 && y <= 1.55 && ax <= 0.73;
  if (shirt) {
    float stripe = (1.0 - smoothstep(0.009, 0.014, abs(ax - 0.145)));
    zone = mix(zone, uAccent, stripe * 0.35);
    if ((y > 1.49 && ax < 0.085) || (ax > 0.65 && y > 1.24)) zone = uAccent;
    if (ax < 0.26 && y < 0.97) zone *= 0.78;
    // Chest shield and opposite maker mark, visible only on the front.
    if (vBindPos.z > 0.12 && y > 1.32 && y < 1.39 && ax > 0.08 && ax < 0.125) zone = uAccent;
  }
  if (y > 0.56 && y < 0.65) zone = uSkin;
  if (y > 0.50 && y < 0.54) zone = uAccent;
  if (y > 0.19 && y < 0.22) zone = mix(uSocks, uAccent, 0.8);
  if (y < 0.055) zone = vec3(0.025, 0.035, 0.05);
  if (y > 0.085 && y < 0.12 && vBindPos.z > 0.05) zone = uAccent;
  if (ax > 0.88 && y > 1.0) zone = uGloves;
  float knit = sin(vBindPos.y * 920.0) * sin(vBindPos.x * 920.0);
  diffuseColor.rgb = zone * (1.0 + (shirt ? 0.035 : 0.012) * knit);
}`,
      );
  };
  return mat;
}

export function makeNumberTexture(number: number, accent: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  ctx.font = '900 96px Poppins, "Arial Black", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 14;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(8, 12, 18, 0.55)';
  ctx.strokeText(String(number), 64, 70);
  ctx.fillStyle = accent;
  ctx.fillText(String(number), 64, 70);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface PlayerLook {
  skin?: string;
  headband?: boolean;
  hairColor?: string;
  /** Hair mesh library scene (player-hair.glb); required for hair to show. */
  hair?: THREE.Object3D;
  /** null = bald; undefined = hash-picked from the pool. */
  hairStyle?: HairStyleName | null;
  beard?: boolean;
}

/** Clone the body, paint the kit, attach hair, add the back number. */
export function buildPlayerObject(
  bodyScene: THREE.Object3D,
  kit: KitColors,
  id: string,
  number: number,
  accent: string,
  look: PlayerLook = {},
): THREE.Object3D {
  const obj = skeletonClone(bodyScene);
  const h = hashOf(id);
  const skinTone = look.skin ?? SKINS[h % SKINS.length];
  const hairColor = look.hairColor ?? HAIRS[(h >>> 3) % HAIRS.length];
  const kitMat = makeKitMaterial(kit, skinTone);
  kitMat.userData.owned = true;
  const browMat = new THREE.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.9,
  });
  browMat.userData.owned = true;
  const garmentMaterials = new Map<string, THREE.MeshStandardMaterial>();
  const garmentColors: Record<string, string> = {
    Football_Skin: skinTone,
    Football_Jersey: kit.shirt,
    Football_Shorts: kit.shorts,
    Football_Socks: kit.socks ?? kit.shorts,
    Football_Boots: kit.boots ?? '#d6ef5a',
    Football_Sole: '#101820',
    Football_Trim: kit.accent,
    Football_Gloves: kit.gloves ?? '#f3f7ed',
  };
  obj.traverse((child) => {
    const mesh = child as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const matName = (mesh.material as THREE.Material)?.name ?? '';
    if (garmentColors[matName]) {
      let material = garmentMaterials.get(matName);
      if (!material) {
        material = new THREE.MeshStandardMaterial({ color: garmentColors[matName], roughness: matName === 'Football_Boots' ? 0.48 : 0.82 });
        material.userData.owned = true;
        garmentMaterials.set(matName, material);
      }
      mesh.material = material;
      if (matName === 'Football_Gloves') mesh.visible = !!kit.gloves;
    } else if (matName === 'MI_Hair_1') mesh.material = browMat;
    else if (matName !== 'MI_Eyes') mesh.material = kitMat;
  });

  // Relax the splayed T-pose hands: gently curl the finger chains. (The
  // bundled locomotion clips don't track finger bones, so this sticks.)
  obj.traverse((node) => {
    const m = /^(index|middle|ring|pinky|thumb)_0([123])_(l|r)$/.exec(node.name);
    if (!m) return;
    const amount = m[1] === 'thumb' ? 0.12 : 0.24 + Number(m[2]) * 0.08;
    const restWorld = node.getWorldQuaternion(new THREE.Quaternion());
    const curlAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(restWorld.invert());
    node.rotateOnAxis(curlAxis, m[3] === 'l' ? -amount : amount);
  });

  // Hair: styles ship as static meshes in model (bind) space. Placing them
  // into Head-local space with the current skeleton's inverse bind matrix
  // makes them follow the same transform as the skinned head vertices.
  // The hair library metadata is a fallback for older body assets.
  const head = obj.getObjectByName(UE_BONE.head);
  const headIB = (look.hair?.userData as { headInverseBind?: number[] } | undefined)
    ?.headInverseBind;
  if (head && look.hair && headIB) {
    const inv = new THREE.Matrix4().fromArray(headIB);
    // Geometry is in model bind space; use this body's actual head bind, not
    // the old hair library rig's orientation.
    let foundHeadBind = false;
    obj.traverse(child => {
      const mesh = child as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh || foundHeadBind) return;
      const index = mesh.skeleton.bones.indexOf(head as THREE.Bone);
      if (index >= 0) { inv.copy(mesh.skeleton.boneInverses[index]); foundHeadBind = true; }
    });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.88 });
    hairMat.userData.owned = true;
    const attach = (nodeName: string, crown = false) => {
      const src = look.hair?.getObjectByName(nodeName) as THREE.Mesh | undefined;
      if (!src) return;
      const m = new THREE.Mesh(src.geometry, hairMat);
      m.matrixAutoUpdate = false;
      m.matrix.copy(inv);
      if (crown) {
        // Give the cap clearance over the remodeled scalp, including the forehead.
        m.matrix.multiply(new THREE.Matrix4().makeTranslation(0, 1.71, -.014))
          .multiply(new THREE.Matrix4().makeScale(1.045, 1.035, 1.045))
          .multiply(new THREE.Matrix4().makeTranslation(0, -1.71, .014));
      }
      m.frustumCulled = false;
      m.castShadow = true;
      m.name = `fitted-${nodeName}`;
      head.add(m);
    };
    const style = look.hairStyle === undefined ? HAIR_POOL[(h >>> 5) % HAIR_POOL.length] : look.hairStyle;
    // The long and bun assets are side/back pieces, so they need a crown cap.
    if (style === 'Hair_Long' || style === 'Hair_Buns') attach('Hair_Buzzed', true);
    if (style) attach(style);
    if (look.headband) {
      const vertices: number[] = [], indices: number[] = [];
      for (let row = 0; row < 2; row++) for (let i = 0; i <= 48; i++) {
        const angle = i / 48 * Math.PI * 2;
        vertices.push(Math.cos(angle) * .087, 1.743 + row * .031, -.014 + Math.sin(angle) * .108);
        if (row === 0 && i < 48) { const a = i, b = i + 49; indices.push(a, b, a + 1, a + 1, b, b + 1); }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
      geometry.userData.owned = true;
      const material = new THREE.MeshStandardMaterial({ color: '#10151b', roughness: .95, side: THREE.DoubleSide }); material.userData.owned = true;
      const band = new THREE.Mesh(geometry, material); band.name = 'fitted-headband'; band.matrixAutoUpdate = false; band.matrix.copy(inv); band.castShadow = true; head.add(band);
    }
    if (look.beard ?? (h >>> 8) % 5 === 0) attach('Hair_Beard');
  }

  const chest = obj.getObjectByName(CHEST_BONE);
  if (chest) {
    const numberMat = new THREE.MeshBasicMaterial({
      map: makeNumberTexture(number, accent),
      transparent: true,
      depthWrite: false,
    });
    numberMat.userData.owned = true;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), numberMat);
    // Place the number in model space, then transform into the chest's bind
    // space. Blender can reorient bone axes without moving the jersey.
    let inverseBind: THREE.Matrix4 | undefined;
    obj.traverse((child) => {
      const mesh = child as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh || inverseBind) return;
      const index = mesh.skeleton.bones.indexOf(chest as THREE.Bone);
      if (index >= 0) inverseBind = mesh.skeleton.boneInverses[index];
    });
    const mount = new THREE.Matrix4().makeTranslation(0, 1.35, -0.178)
      .multiply(new THREE.Matrix4().makeRotationY(Math.PI));
    if (inverseBind) mount.premultiply(inverseBind);
    back.applyMatrix4(mount);
    chest.add(back);
  }
  if (garmentMaterials.size) kitMat.dispose();
  return obj;
}

/**
 * Release the GPU resources `buildPlayerObject` FRESHLY allocated for this
 * instance — the kit/brow/hair/number materials and their textures (notably the
 * number CanvasTexture and the back-plane's own geometry). R3F does NOT dispose
 * objects mounted via `<primitive>`, so a component that keys/remounts these
 * must call this on unmount, or the per-instance materials and textures pile up
 * in the GL context.
 *
 * IMPORTANT: it disposes ONLY resources this instance freshly allocated, never
 * anything shared with the GLTFLoader's cached scene (skeletonClone reuses the
 * source geometries, the eyes material, its textures — disposing those would
 * corrupt every other instance and future clones). Fresh materials are tagged
 * `userData.owned = true` at creation; only those (and their textures) plus the
 * number back-plane's own geometry are freed. Pass the mixer to drop its cached
 * bindings too.
 */
export function disposeBuiltObject(obj: THREE.Object3D, mixer?: THREE.AnimationMixer): void {
  const seenMat = new Set<THREE.Material>();
  const disposeMat = (m: THREE.Material) => {
    if (seenMat.has(m) || !m.userData.owned) return;
    seenMat.add(m);
    for (const v of Object.values(m as unknown as Record<string, unknown>)) {
      if (v instanceof THREE.Texture) v.dispose();
    }
    m.dispose();
  };
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh && !(mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
    // Number planes and fitted headbands belong to this instance; the body
    // and hair geometry are shared with the loader cache.
    if (mesh.geometry instanceof THREE.PlaneGeometry || mesh.geometry?.userData.owned) mesh.geometry.dispose();
    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach(disposeMat);
    else if (mat) disposeMat(mat);
  });
  mixer?.uncacheRoot(obj);
}


/**
 * The player's own cartoon avatar, in 3D. The footballer model's skeleton (and so all its animation clips and the
 * keeper-save IK) carries the avatar rebuilt as separate solid parts: the big round head with its ears, brows, dot
 * eyes and smile, the hair, chunky arms and legs, and hands with real fingers that bend with the finger bones. The
 * kit — jersey (the avatar's jersey art printed on it), shorts, socks, boots — stays the model's skinned garments.
 * Everything is flat-shaded in two tones, like the 2D art: a lit colour and one shade.
 */

import * as THREE from 'three';
import type { AvatarCustomization } from '@/types/game';
import { HAIR_PARTS } from '@/lib/avatars/parts';
import { buildPlayerObject } from '@/features/mini-games/components/ScoreGoalsPlayer3D';
import { dressJersey, player3DLook, removeShirtNumber } from './zoneMatch3d.player';
import { shade } from './zoneMatch.fullBody';

const KEEP = new Set(['Football_Jersey', 'Football_Shorts', 'Football_Socks', 'Football_Boots', 'Football_Sole', 'Football_Trim']);
const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const;
const FACE_INK = '#1B1D22';
const HEAD_SCALE = 1.45;

export type ToonHair = 'spiky' | 'curly' | 'buzz' | 'long' | 'none';

export function toonHairFor(hairId: string | null | undefined): ToonHair {
  const id = hairId ?? '';
  if (!id) return 'spiky';
  if (/bald/.test(id)) return 'none';
  if (/buzz|shaved/.test(id)) return 'buzz';
  if (/curly|afro|twist|ronaldo_goat|cornrow|leopard/.test(id)) return 'curly';
  if (/long|girl|ramos|bun/.test(id)) return 'long';
  return 'spiky';
}

/** Two tones, hard edge: lit and shade, like the flat avatar art. */
let gradient: THREE.DataTexture | null = null;
function toonGradient() {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([150, 150, 150, 255, 255, 255, 255, 255]), 2, 1, THREE.RGBAFormat);
    gradient.minFilter = THREE.NearestFilter;
    gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return gradient;
}

export function toonMaterial(color: string): THREE.MeshToonMaterial {
  const m = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient() });
  m.userData.owned = true;
  return m;
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _inv = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

/** Mount a mesh built in the model's rest-pose world space onto a bone, so it follows the bone from then on. */
function mount(bone: THREE.Object3D, mesh: THREE.Object3D, world: THREE.Matrix4) {
  _inv.copy(bone.matrixWorld).invert();
  mesh.matrixAutoUpdate = true;
  _m.multiplyMatrices(_inv, world).decompose(mesh.position, mesh.quaternion, mesh.scale);
  mesh.castShadow = true;
  bone.add(mesh);
}

function worldPos(obj: THREE.Object3D, name: string, out: THREE.Vector3) {
  const node = obj.getObjectByName(name);
  if (!node) return null;
  return node.getWorldPosition(out);
}

/** A capsule from bone `from` to bone `to` (rest pose), mounted on `from`. */
function limb(obj: THREE.Object3D, from: string, to: string, radius: number, material: THREE.Material, stretch = 1) {
  const bone = obj.getObjectByName(from);
  if (!bone || !worldPos(obj, from, _a) || !worldPos(obj, to, _b)) return;
  const dir = _b.clone().sub(_a);
  const length = Math.max(0.001, dir.length() * stretch);
  const geometry = new THREE.CapsuleGeometry(radius, Math.max(0.001, length - radius * 0.6), 4, 14);
  geometry.userData.owned = true;
  const mesh = new THREE.Mesh(geometry, material);
  _q.setFromUnitVectors(UP, dir.normalize());
  mount(bone, mesh, new THREE.Matrix4().compose(_a.clone().addScaledVector(dir, (length / 2)), _q, new THREE.Vector3(1, 1, 1)));
}

function blob(geometry: THREE.BufferGeometry, material: THREE.Material) {
  geometry.userData.owned = true;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  return mesh;
}

/** A curved stroke (brow, smile) lying on the head sphere: an arc of points pushed onto the surface. */
function stroke(points: THREE.Vector3[], radius: number, material: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(points);
  return blob(new THREE.TubeGeometry(curve, 16, radius, 6, false), material);
}

function buildHead(hairStyle: ToonHair, skin: string): { head: THREE.Group; hairMat: THREE.MeshToonMaterial } {
  const head = new THREE.Group();
  const R = 0.165;
  const skinMat = toonMaterial(skin);
  const ink = toonMaterial(FACE_INK);
  const skull = blob(new THREE.SphereGeometry(R, 32, 24), skinMat);
  skull.scale.set(1, 1.04, 0.96);
  head.add(skull);
  // Ears, with the darker inner fold.
  for (const side of [-1, 1]) {
    const ear = blob(new THREE.SphereGeometry(0.042, 16, 12), skinMat);
    ear.scale.set(0.55, 1, 0.8);
    ear.position.set(side * R * 0.97, -0.012, -0.01);
    head.add(ear);
    const fold = blob(new THREE.SphereGeometry(0.022, 12, 8), toonMaterial(shade(skin, 0.18)));
    fold.scale.set(0.4, 1, 0.7);
    fold.position.set(side * (R * 0.97 + 0.016), -0.012, 0.0);
    head.add(fold);
  }
  const onFace = (x: number, y: number, lift = 0.004) => {
    const z = Math.sqrt(Math.max(0, R * R - x * x - y * y)) * 0.96;
    return new THREE.Vector3(x, y * 1.04, z + lift);
  };
  // Dot eyes, arched brows, a lopsided smile — the avatar's face.
  for (const side of [-1, 1]) {
    const eye = blob(new THREE.SphereGeometry(0.017, 14, 10), ink);
    eye.scale.set(1, 1.1, 0.45);
    eye.position.copy(onFace(side * 0.058, 0.004, 0.002));
    head.add(eye);
    head.add(stroke([onFace(side * 0.085, 0.052), onFace(side * 0.058, 0.064), onFace(side * 0.03, 0.056)], 0.0085, ink));
  }
  head.add(stroke([onFace(-0.045, -0.058), onFace(-0.012, -0.075), onFace(0.025, -0.07), onFace(0.05, -0.05)], 0.008, ink));

  const hairMat = toonMaterial('#24170f');
  const capOf = (scale: number, thetaLength: number) => {
    const cap = blob(new THREE.SphereGeometry(R * scale, 32, 16, 0, Math.PI * 2, 0, thetaLength), hairMat);
    cap.scale.set(1, 1.04, 0.96);
    // Further back than the brow line: tip the cap back a little.
    cap.rotation.x = -0.32;
    return cap;
  };
  if (hairStyle === 'buzz') head.add(capOf(1.012, 1.25));
  if (hairStyle === 'spiky' || hairStyle === 'curly' || hairStyle === 'long') head.add(capOf(1.04, 1.2));
  if (hairStyle === 'spiky') {
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 1.6 - Math.PI * 0.8;
      const spike = blob(new THREE.ConeGeometry(0.045, 0.11, 8), hairMat);
      const dir = new THREE.Vector3(Math.sin(a) * 0.75, 0.75, Math.cos(a) * 0.35 - 0.35).normalize();
      spike.position.copy(dir.clone().multiplyScalar(R * 0.98));
      spike.quaternion.setFromUnitVectors(UP, dir.clone().add(new THREE.Vector3(0, 0, -0.35)).normalize());
      head.add(spike);
    }
  }
  if (hairStyle === 'curly') {
    for (let i = 0; i < 46; i++) {
      const a = i * 2.39996;
      const y = 0.25 + 0.75 * ((i * 0.61803) % 1);
      const r = Math.sqrt(1 - y * y);
      const dir = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r - 0.12).normalize();
      if (dir.z > 0.55 && dir.y < 0.6) continue;
      const curl = blob(new THREE.SphereGeometry(0.038, 10, 8), hairMat);
      curl.position.copy(dir.multiplyScalar(R * 1.06));
      head.add(curl);
    }
  }
  if (hairStyle === 'long') {
    const back = blob(new THREE.SphereGeometry(R * 1.02, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
    back.scale.set(1.04, 1.25, 0.9);
    back.position.set(0, -0.03, -0.035);
    back.rotation.x = -0.6;
    head.add(back);
  }
  return { head, hairMat };
}

const hairColors = new Map<string, Promise<THREE.Color>>();

/** The 2D hair art's main colour (its average opaque pixel). */
function hairColorOf(url: string): Promise<THREE.Color> {
  let entry = hairColors.get(url);
  if (!entry) {
    entry = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 32;
        c.height = 32;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0, 32, 32);
        const d = ctx.getImageData(0, 0, 32, 32).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
        resolve(n ? new THREE.Color().setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace) : new THREE.Color('#24170f'));
      };
      img.onerror = () => resolve(new THREE.Color('#24170f'));
      img.src = url;
    });
    hairColors.set(url, entry);
  }
  return entry;
}

export interface ToonAvatar {
  object: THREE.Object3D;
  /** Resolves when the jersey print and the hair colour have loaded. */
  ready: Promise<void>;
}

export function buildToonAvatar(bodyScene: THREE.Object3D, customization: AvatarCustomization | null, seed: number, opts: { gloves?: boolean; hair?: ToonHair } = {}): ToonAvatar {
  const dressed = player3DLook(customization, seed, { gloves: opts.gloves, hairStyle: null });
  const obj = buildPlayerObject(bodyScene, dressed.kit, `toon-${seed}`, 10, dressed.kit.accent, { ...dressed.look, hairStyle: null, beard: false });
  removeShirtNumber(obj);
  const skin = dressed.look.skin ?? '#FCB37C';

  // Only the kit stays; it goes flat-shaded too.
  obj.traverse((child) => {
    const mesh = child as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    const material = mesh.material as THREE.MeshStandardMaterial;
    if (!KEEP.has(material.name)) {
      mesh.visible = false;
      return;
    }
    if (material.name !== 'Football_Jersey') {
      const toon = toonMaterial(`#${material.color.getHexString()}`);
      toon.name = material.name;
      if (material.userData.owned) material.dispose();
      mesh.material = toon;
    }
  });

  obj.updateMatrixWorld(true);
  const skinMat = toonMaterial(skin);
  const handMat = opts.gloves ? toonMaterial('#F4F6F8') : skinMat;

  limb(obj, 'neck_01', 'Head', 0.06, skinMat);
  for (const s of ['l', 'r'] as const) {
    limb(obj, `upperarm_${s}`, `lowerarm_${s}`, 0.062, skinMat);
    limb(obj, `lowerarm_${s}`, `hand_${s}`, 0.056, opts.gloves ? handMat : skinMat);
    limb(obj, `thigh_${s}`, `calf_${s}`, 0.078, skinMat);
    limb(obj, `calf_${s}`, `foot_${s}`, 0.058, skinMat);
    // The palm, a soft block between the wrist and the knuckles, flat across the hand.
    const hand = obj.getObjectByName(`hand_${s}`);
    if (hand && worldPos(obj, `hand_${s}`, _a) && worldPos(obj, `middle_01_${s}`, _b)) {
      const along = _b.clone().sub(_a);
      const index = worldPos(obj, `index_01_${s}`, new THREE.Vector3())!;
      const pinky = worldPos(obj, `pinky_01_${s}`, new THREE.Vector3())!;
      const y = along.clone().normalize();
      const x = index.sub(pinky).normalize();
      const z = new THREE.Vector3().crossVectors(x, y).normalize();
      x.crossVectors(y, z);
      const palm = blob(new THREE.SphereGeometry(1, 16, 12), handMat);
      const basis = new THREE.Matrix4().makeBasis(x, y, z);
      const world = new THREE.Matrix4()
        .compose(_a.clone().addScaledVector(along, 0.55), new THREE.Quaternion().setFromRotationMatrix(basis), new THREE.Vector3(0.056, along.length() * 0.78, 0.034));
      mount(hand, palm, world);
    }
    for (const f of FINGERS) {
      // Chubby cartoon fingers.
      const r = f === 'thumb' ? 0.022 : 0.019;
      limb(obj, `${f}_01_${s}`, `${f}_02_${s}`, r, handMat);
      limb(obj, `${f}_02_${s}`, `${f}_03_${s}`, r, handMat);
      limb(obj, `${f}_03_${s}`, `${f}_04_leaf_${s}`, r * 0.95, handMat, 0.9);
    }
  }

  // The head: big, round, sat on the neck.
  const headBone = obj.getObjectByName('Head');
  const hairPart = HAIR_PARTS.find((p) => p.id === customization?.hair);
  let hairMat: THREE.MeshToonMaterial | null = null;
  if (headBone && worldPos(obj, 'Head', _a)) {
    const built = buildHead(opts.hair ?? toonHairFor(customization?.hair), skin);
    hairMat = built.hairMat;
    // The avatar's big cartoon head: the head is drawn at a natural size, then scaled up on the neck.
    mount(headBone, built.head, new THREE.Matrix4().compose(new THREE.Vector3(_a.x, _a.y + 0.2, _a.z + 0.02), new THREE.Quaternion(), new THREE.Vector3(HEAD_SCALE, HEAD_SCALE, HEAD_SCALE)));
  }

  const ready = Promise.all([
    dressed.jerseyUrl ? dressJersey(obj, dressed.jerseyUrl, () => new THREE.MeshToonMaterial({ gradientMap: toonGradient() })) : Promise.resolve(),
    hairPart ? hairColorOf(hairPart.asset).then((c) => void hairMat?.color.copy(c)) : Promise.resolve(),
  ]).then(() => undefined);
  return { object: obj, ready };
}

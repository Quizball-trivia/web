/**
 * A player's avatar as the 3D footballer (ScoreGoalsPlayer3D's model): the same jersey, skin, shorts, socks and boots
 * as their 2D avatar. The jersey art (a flat front view of the shirt) is projected onto the 3D shirt in its bind pose —
 * the torso straight on (front and back), each sleeve along its length from the shoulder to the cuff — so stripes,
 * hoops, sashes and trims come across, not just a colour.
 */

import * as THREE from 'three';
import type { AvatarCustomization } from '@/types/game';
import { JERSEY_PARTS } from '@/lib/avatars/parts';
import type { HairStyleName, KitColors, PlayerLook } from '@/features/mini-games/components/ScoreGoalsPlayer3D';
import { fullBodyColors } from './zoneMatch.fullBody';

/** The jersey art's size and where its torso and left sleeve are, in its pixels (the jersey_* webps, 354 × ~294). */
const ART = { w: 354, h: 294, centre: 178, halfBody: 90, top: 8, bottom: 290, sleeveFrom: [98, 40], sleeveTo: [26, 120], sleeveHalf: 28 };
/** The 3D shirt in bind pose (metres): its top and hem, the torso's half width, the sleeve's line and half thickness. */
const SHIRT = { top: 1.553, hem: 0.956, halfBody: 0.2, sleeveEnd: 0.436, sleeveY: 1.44, sleeveHalf: 0.06 };

const HAIR_STYLE: [RegExp, HairStyleName | null][] = [
  [/buzz|bald|shaved/, 'Hair_Buzzed'],
  [/long|girl|ramos|hamsik/, 'Hair_Long'],
  [/bun/, 'Hair_Buns'],
  [/cornrow|crop|twist|wave|leopard/, 'Hair_Buzzed'],
];

export function hairStyleFor(hairId: string | undefined | null): HairStyleName {
  const id = hairId ?? '';
  return HAIR_STYLE.find(([re]) => re.test(id))?.[1] ?? 'Hair_SimpleParted';
}

export interface Player3DLook {
  kit: KitColors;
  look: Omit<PlayerLook, 'hair'>;
  /** The jersey art to project onto the shirt. */
  jerseyUrl: string | null;
}

export function player3DLook(customization: AvatarCustomization | null, seed: number, opts: { gloves?: boolean; hairColor?: string; hairStyle?: HairStyleName | null } = {}): Player3DLook {
  const c = fullBodyColors(customization, seed);
  const jersey = JERSEY_PARTS.find((p) => p.id === customization?.jersey) ?? null;
  return {
    kit: { shirt: c.shorts, shorts: c.shorts, socks: c.socks, accent: c.sockBand, boots: c.boots, gloves: opts.gloves ? '#F4F6F8' : undefined },
    look: { skin: c.skin, hairColor: opts.hairColor ?? '#24170f', hairStyle: opts.hairStyle === undefined ? hairStyleFor(customization?.hair) : opts.hairStyle, beard: false },
    jerseyUrl: jersey?.asset ?? null,
  };
}

const textures = new Map<string, Promise<{ texture: THREE.Texture; main: THREE.Color }>>();

/** The jersey art as a texture, and its main colour (for the bits the projection can't reach, like the neck hole). */
function jerseyTexture(url: string) {
  let entry = textures.get(url);
  if (!entry) {
    entry = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const px = ctx.getImageData(Math.round(canvas.width * 0.5), Math.round(canvas.height * 0.6), 1, 1).data;
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        // Sampled in the art's own top-down pixels.
        texture.flipY = false;
        texture.anisotropy = 8;
        resolve({ texture, main: new THREE.Color().setRGB(px[0] / 255, px[1] / 255, px[2] / 255, THREE.SRGBColorSpace) });
      };
      img.onerror = reject;
      img.src = url;
    });
    textures.set(url, entry);
  }
  return entry;
}

/** Zone match players have no shirt number: drop the builder's back-number plane. */
export function removeShirtNumber(obj: THREE.Object3D) {
  const planes: THREE.Mesh[] = [];
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry instanceof THREE.PlaneGeometry) planes.push(mesh);
  });
  for (const plane of planes) {
    plane.removeFromParent();
    plane.geometry.dispose();
    const material = plane.material as THREE.MeshBasicMaterial;
    material.map?.dispose();
    material.dispose();
  }
}

/** Swap the built player's shirt for one printed with the jersey art (async: the art loads first). */
export async function dressJersey(
  obj: THREE.Object3D,
  url: string,
  makeMaterial: () => THREE.MeshStandardMaterial | THREE.MeshToonMaterial = () => new THREE.MeshStandardMaterial({ roughness: 0.78 }),
): Promise<void> {
  const { texture, main } = await jerseyTexture(url);
  const material = makeMaterial();
  material.name = 'Football_Jersey';
  material.userData.owned = true;
  const sleeveDir = new THREE.Vector2(ART.sleeveTo[0] - ART.sleeveFrom[0], ART.sleeveTo[1] - ART.sleeveFrom[1]);
  const sleeveLen = sleeveDir.length();
  sleeveDir.normalize();
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uJersey = { value: texture };
    shader.uniforms.uMain = { value: main };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBindPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBindPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBindPos;\nuniform sampler2D uJersey;\nuniform vec3 uMain;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          vec2 px;
          float ax = abs(vBindPos.x);
          if (ax <= ${SHIRT.halfBody.toFixed(3)}) {
            // The torso, straight on (the back gets the same print).
            px = vec2(${ART.centre.toFixed(1)} + vBindPos.x / ${SHIRT.halfBody.toFixed(3)} * ${ART.halfBody.toFixed(1)},
                      ${ART.top.toFixed(1)} + (${SHIRT.top.toFixed(3)} - vBindPos.y) / ${(SHIRT.top - SHIRT.hem).toFixed(3)} * ${(ART.bottom - ART.top).toFixed(1)});
          } else {
            // A sleeve: along it from the shoulder to the cuff, across it from its top edge to its underside.
            float t = clamp((ax - ${SHIRT.halfBody.toFixed(3)}) / ${(SHIRT.sleeveEnd - SHIRT.halfBody).toFixed(3)}, 0.0, 1.0);
            float across = clamp((vBindPos.y - ${SHIRT.sleeveY.toFixed(3)}) / ${SHIRT.sleeveHalf.toFixed(3)}, -1.0, 1.0);
            vec2 dir = vec2(${sleeveDir.x.toFixed(4)}, ${sleeveDir.y.toFixed(4)});
            vec2 up = vec2(dir.y, -dir.x);
            px = vec2(${ART.sleeveFrom[0].toFixed(1)}, ${ART.sleeveFrom[1].toFixed(1)}) + dir * t * ${sleeveLen.toFixed(1)} + up * across * ${ART.sleeveHalf.toFixed(1)};
            if (vBindPos.x > 0.0) px.x = ${ART.w.toFixed(1)} - px.x;
          }
          vec4 print = texture2D(uJersey, px / vec2(${ART.w.toFixed(1)}, ${ART.h.toFixed(1)}));
          diffuseColor.rgb = print.a > 0.5 ? print.rgb : uMain;
        }`,
      );
  };
  material.customProgramCacheKey = () => `jersey-print-${material.type}`;
  obj.traverse((child) => {
    const mesh = child as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    const current = mesh.material as THREE.Material;
    if (current?.name !== 'Football_Jersey') return;
    if (current.userData.owned) current.dispose();
    mesh.material = material;
  });
}

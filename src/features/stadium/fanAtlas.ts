/**
 * The crowd's faces: a sheet of the app's own avatars (skin, jersey, hair — the same layers and placements as
 * AvatarPreview) drawn once into a canvas, one per cell, so 3,000 fans are one textured, instanced draw.
 */

import { HAIR_PARTS, JERSEY_PARTS, SKIN_PARTS, type AvatarPart } from '@/lib/avatars/parts';

/** Cells: the avatar's 495.25 × 543.03 canvas, with room above it for hair that sticks up. */
export const FAN_ATLAS = { cols: 8, rows: 6, cellW: 128, cellH: 160, headroom: 0.12 } as const;
export const FAN_VARIANTS = FAN_ATLAS.cols * FAN_ATLAS.rows;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

/** A deterministic shuffle pick (so the crowd is the same every load). */
const pick = <T,>(list: readonly T[], k: number) => list[(k * 2654435761) % list.length >>> 0];

export async function buildFanAtlas(): Promise<HTMLCanvasElement> {
  const { cols, rows, cellW, cellH, headroom } = FAN_ATLAS;
  const canvas = document.createElement('canvas');
  canvas.width = cols * cellW;
  canvas.height = rows * cellH;
  const ctx = canvas.getContext('2d')!;
  const jerseys = JERSEY_PARTS.filter((p) => !p.id.includes('wl_'));
  const hairs: (AvatarPart | null)[] = [...HAIR_PARTS, null];
  const cache = new Map<string, Promise<HTMLImageElement | null>>();
  const image = (src: string) => {
    if (!cache.has(src)) cache.set(src, loadImage(src));
    return cache.get(src)!;
  };
  const artW = cellW;
  const artH = (cellW * 543.03) / 495.25;
  const top = cellH * headroom;
  await Promise.all(
    Array.from({ length: cols * rows }, async (_, i) => {
      const skin = SKIN_PARTS[i % SKIN_PARTS.length];
      const jersey = pick(jerseys, i + 3);
      const hair = pick(hairs, i * 7 + 1);
      const [skinImg, jerseyImg, hairImg] = await Promise.all([image(skin.asset), image(jersey.asset), hair ? image(hair.asset) : Promise.resolve(null)]);
      const x0 = (i % cols) * cellW;
      const y0 = Math.floor(i / cols) * cellH + top;
      const layer = (img: HTMLImageElement | null, part: AvatarPart) => {
        if (!img) return;
        const w = (part.position.width / 100) * artW;
        const h = (w * img.naturalHeight) / img.naturalWidth;
        ctx.drawImage(img, x0 + (part.position.left / 100) * artW, y0 + (part.position.top / 100) * artH, w, h);
      };
      if (skinImg) ctx.drawImage(skinImg, x0, y0, artW, artH);
      layer(jerseyImg, jersey);
      if (hair) layer(hairImg, hair);
    }),
  );
  return canvas;
}

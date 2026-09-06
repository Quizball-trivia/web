'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';

function seededRandom(initial: number) {
  let seed = initial;
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Small, locally generated maps: no remote assets or extra model downloads. */
export function usePitchTurf(repeatX = 4, repeatY = 4) {
  const textures = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    const relief = document.createElement('canvas');
    relief.width = relief.height = 1024;
    const bump = relief.getContext('2d')!;
    bump.fillStyle = '#808080';
    bump.fillRect(0, 0, 1024, 1024);
    ctx.fillStyle = '#24643d';
    ctx.fillRect(0, 0, 1024, 1024);
    const random = seededRandom(72);
    for (let i = 0; i < 65000; i++) {
      const x = random() * 1024;
      const y = random() * 1024;
      const length = 1 + random() * 5;
      const light = random() > 0.5;
      ctx.strokeStyle = light ? 'rgba(155,180,97,.055)' : 'rgba(9,43,24,.07)';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.7, y + length); ctx.stroke();
      bump.fillStyle = light ? '#aaa' : '#555';
      bump.fillRect(x, y, 1, length);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const bumpMap = new THREE.CanvasTexture(relief);
    for (const texture of [map, bumpMap]) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = 8;
      texture.repeat.set(repeatX, repeatY);
    }
    return { map, bumpMap };
  }, [repeatX, repeatY]);
  useEffect(() => () => {
    textures.map.dispose();
    textures.bumpMap.dispose();
  }, [textures]);
  return textures;
}

/** The existing World Cup artwork, shared by both games. */
export function useMatchBallTexture() {
  const source = useLoader(THREE.TextureLoader, '/assets/brand/goal-ball.webp');
  const texture = useMemo(() => {
    const texture = source.clone();
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  }, [source]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Project the circular product artwork onto each hemisphere. Ordinary sphere
 * UVs would stretch its transparent square background across the football. */
export function useMatchBallGeometry(radius: number) {
  const geometry = useMemo(() => {
    const sphere = new THREE.SphereGeometry(radius, 48, 32);
    const normals = sphere.attributes.normal;
    const uv = sphere.attributes.uv;
    for (let i = 0; i < normals.count; i++) {
      uv.setXY(i, 0.503 + normals.getX(i) * 0.443, 0.5 + normals.getY(i) * 0.443);
    }
    return sphere;
  }, [radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

/** Crop from the grandstand base when fitting a wide backdrop; never stretch the crowd. */
export function useStadiumArtwork(url = '/assets/demos/final-third-stadium-georgia-v3.png', aspect?: number) {
  const source = useLoader(THREE.TextureLoader, url);
  const texture = useMemo(() => {
    const map = source.clone();
    map.colorSpace = THREE.SRGBColorSpace;
    if (aspect) {
      const imageAspect = source.image.width / source.image.height;
      map.repeat.set(Math.min(1, aspect / imageAspect), Math.min(1, imageAspect / aspect));
      map.offset.x = (1 - map.repeat.x) / 2;
    }
    map.needsUpdate = true;
    return map;
  }, [source, aspect]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

const WIDTH = 100;
const HEIGHT = .9;
const TILE_WIDTH = HEIGHT * 4;

/** One repeating LED texture: the real brand artwork moves across fixed pitch-side boards. */
export function RoadAdvertisingBoards() {
  const source = useLoader(THREE.TextureLoader, '/assets/brand/quizball-logo.webp');
  const reducedMotion = useRef(false);
  const map = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#1645ff';
    ctx.fillRect(0, 0, 1024, 256);
    // Preserve the supplied wordmark, including its original white/green colors.
    const logoHeight = 196;
    const logoWidth = logoHeight * source.image.width / source.image.height;
    ctx.drawImage(source.image, (1024 - logoWidth) / 2, 30, logoWidth, logoHeight);
    ctx.strokeStyle = '#ffe500';
    ctx.lineWidth = 10;
    for (const x of [132, 800]) {
      ctx.beginPath();
      ctx.moveTo(x, 96); ctx.lineTo(x + 32, 128); ctx.lineTo(x, 160);
      ctx.stroke();
    }
    // Subtle LED scan lines, baked once rather than redrawing every frame.
    ctx.fillStyle = 'rgba(0, 8, 40, .12)';
    for (let y = 0; y < 256; y += 4) ctx.fillRect(0, y, 1024, 1);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.set(WIDTH / TILE_WIDTH, 1);
    texture.anisotropy = 8;
    return texture;
  }, [source]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reducedMotion.current = media.matches; };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => () => map.dispose(), [map]);
  useFrame((_, delta) => {
    if (!reducedMotion.current) map.offset.setX((map.offset.x - Math.min(delta, .1) * .65 / TILE_WIDTH + 1) % 1);
  });

  return <group position={[20, .62, -9.4]}>
    <mesh><boxGeometry args={[WIDTH, HEIGHT + .1, .24]} /><meshStandardMaterial color="#081526" roughness={.7} /></mesh>
    <mesh position={[0, 0, .125]}><planeGeometry args={[WIDTH, HEIGHT]} /><meshBasicMaterial map={map} toneMapped={false} fog={false} /></mesh>
    {[-1, 1].map(side => <mesh key={side} position={[0, side * (HEIGHT / 2 + .025), .13]}>
      <boxGeometry args={[WIDTH, .025, .025]} /><meshBasicMaterial color={side === 1 ? '#ffe500' : '#092775'} toneMapped={false} />
    </mesh>)}
  </group>;
}

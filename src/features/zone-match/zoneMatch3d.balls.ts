/**
 * The match ball, five designs, drawn on the sphere itself (no picture wrapped round it): a fragment shader finds the
 * panel each point is in — the 12 pentagons and 20 hexagons of a truncated icosahedron, as the nearest of 32 panel
 * centres — and its seams, and colours it by design. Lit as a normal standard material, so it shades and spins true.
 * The chosen design is kept per browser (dev).
 */

import { useSyncExternalStore } from 'react';
import * as THREE from 'three';

export type BallStyle = 'classic' | 'quizball' | 'leather' | 'tournament' | 'neon';

export const BALL_STYLES: { id: BallStyle; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'quizball', label: 'Quizball' },
  { id: 'leather', label: 'Retro leather' },
  { id: 'tournament', label: 'Tournament' },
  { id: 'neon', label: 'Night neon' },
];

const LOOKS: Record<BallStyle, { pent: string; hex: string; alt: string; seam: string; style: number; seamW: number; roughness: number; glow: string }> = {
  classic: { pent: '#16181D', hex: '#F7F8FA', alt: '#F7F8FA', seam: '#2A2D33', style: 0, seamW: 0.012, roughness: 0.45, glow: '#000000' },
  quizball: { pent: '#1645FF', hex: '#F7F8FA', alt: '#FFE500', seam: '#0E2A9E', style: 1, seamW: 0.012, roughness: 0.4, glow: '#000000' },
  leather: { pent: '#8A5426', hex: '#B07038', alt: '#9C6230', seam: '#3A2312', style: 2, seamW: 0.016, roughness: 0.85, glow: '#000000' },
  tournament: { pent: '#F7F8FA', hex: '#F7F8FA', alt: '#FF6B1A', seam: '#C9D1DA', style: 3, seamW: 0.006, roughness: 0.38, glow: '#000000' },
  neon: { pent: '#B6FF1F', hex: '#0E1A33', alt: '#13234A', seam: '#B6FF1F', style: 4, seamW: 0.014, roughness: 0.5, glow: '#9CFF00' },
};

const PANELS = `
const float PHI = 1.6180339887;
vec3 icosa(int i) {
  vec3 v[12] = vec3[12](
    vec3(0.0, 1.0, PHI), vec3(0.0, -1.0, PHI), vec3(0.0, 1.0, -PHI), vec3(0.0, -1.0, -PHI),
    vec3(1.0, PHI, 0.0), vec3(-1.0, PHI, 0.0), vec3(1.0, -PHI, 0.0), vec3(-1.0, -PHI, 0.0),
    vec3(PHI, 0.0, 1.0), vec3(-PHI, 0.0, 1.0), vec3(PHI, 0.0, -1.0), vec3(-PHI, 0.0, -1.0));
  return normalize(v[i]);
}
vec3 dodeca(int i) {
  float a = 1.0 / PHI;
  vec3 v[20] = vec3[20](
    vec3(1.0, 1.0, 1.0), vec3(1.0, 1.0, -1.0), vec3(1.0, -1.0, 1.0), vec3(1.0, -1.0, -1.0),
    vec3(-1.0, 1.0, 1.0), vec3(-1.0, 1.0, -1.0), vec3(-1.0, -1.0, 1.0), vec3(-1.0, -1.0, -1.0),
    vec3(0.0, PHI, a), vec3(0.0, PHI, -a), vec3(0.0, -PHI, a), vec3(0.0, -PHI, -a),
    vec3(a, 0.0, PHI), vec3(a, 0.0, -PHI), vec3(-a, 0.0, PHI), vec3(-a, 0.0, -PHI),
    vec3(PHI, a, 0.0), vec3(PHI, -a, 0.0), vec3(-PHI, a, 0.0), vec3(-PHI, -a, 0.0));
  return normalize(v[i]);
}
// The hexagons' centres are the icosahedron's face centres (the dodecahedron dual to it, same orientation).
// The panel a direction falls in: best / second-best closeness (for the seam), whether it's a pentagon, and its index.
void ballPanel(vec3 n, out float best, out float second, out float isPent, out float index) {
  best = -2.0; second = -2.0; isPent = 0.0; index = 0.0;
  for (int i = 0; i < 12; i++) {
    // Pentagons a touch larger than plain nearest-centre would make them (the real ball's proportions).
    float d = dot(n, icosa(i)) + 0.012;
    if (d > best) { second = best; best = d; isPent = 1.0; index = float(i); }
    else if (d > second) { second = d; }
  }
  for (int i = 0; i < 20; i++) {
    float d = dot(n, dodeca(i));
    if (d > best) { second = best; best = d; isPent = 0.0; index = float(12 + i); }
    else if (d > second) { second = d; }
  }
}
`;

export function makeBallMaterial(style: BallStyle): THREE.MeshStandardMaterial {
  const look = LOOKS[style];
  const material = new THREE.MeshStandardMaterial({ roughness: look.roughness, metalness: 0.02 });
  const uniforms = {
    uPent: { value: new THREE.Color(look.pent) },
    uHex: { value: new THREE.Color(look.hex) },
    uAlt: { value: new THREE.Color(look.alt) },
    uSeam: { value: new THREE.Color(look.seam) },
    uGlow: { value: new THREE.Color(look.glow) },
    uStyle: { value: look.style },
    uSeamW: { value: look.seamW },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBallN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBallN = normalize(normal);');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vBallN;
        uniform vec3 uPent; uniform vec3 uHex; uniform vec3 uAlt; uniform vec3 uSeam; uniform vec3 uGlow;
        uniform float uStyle; uniform float uSeamW;
        ${PANELS}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 bn = normalize(vBallN);
        float best; float second; float isPent; float index;
        ballPanel(bn, best, second, isPent, index);
        float edge = best - second;
        float seam = 1.0 - smoothstep(uSeamW * 0.6, uSeamW, edge);
        vec3 col = mix(uHex, uPent, isPent);
        float glow = 0.0;
        if (uStyle == 1.0) {
          // Quizball: blue pentagons, a ring of yellow hexagons round each one.
          if (isPent < 0.5 && mod(index, 3.0) < 1.0) col = uAlt;
        } else if (uStyle == 2.0) {
          // Retro leather: every panel its own shade of tan, stitched seams (dashes).
          float h = fract(sin(index * 12.9898) * 43758.5453);
          col = mix(uHex, uAlt, h) * (0.9 + 0.2 * fract(h * 7.0));
          float stitch = step(0.5, fract((bn.x + bn.y * 1.7 + bn.z * 2.3) * 60.0));
          seam *= mix(0.55, 1.0, stitch);
        } else if (uStyle == 3.0) {
          // Tournament: white panels under three curved swooshes.
          col = uHex;
          vec3 a1 = normalize(vec3(1.0, 0.3, 0.0));
          vec3 a2 = normalize(vec3(-0.4, 1.0, 0.5));
          vec3 a3 = normalize(vec3(0.2, -0.5, 1.0));
          float s1 = abs(dot(bn, a1) + 0.22 * sin(5.0 * dot(bn, a2)));
          float s2 = abs(dot(bn, a2) + 0.22 * sin(5.0 * dot(bn, a3)));
          float s3 = abs(dot(bn, a3) + 0.22 * sin(5.0 * dot(bn, a1)));
          if (s1 < 0.13) col = uAlt;
          if (s2 < 0.1) col = vec3(0.09, 0.27, 1.0);
          if (s3 < 0.08) col = vec3(0.1, 0.1, 0.12);
          if (s1 < 0.15 && s1 > 0.13) col = vec3(0.1, 0.1, 0.12);
        } else if (uStyle == 4.0) {
          // Night neon: dark panels, glowing lime pentagons and seams.
          col = isPent > 0.5 ? uPent : mix(uHex, uAlt, step(0.5, fract(index * 0.37)));
          glow = max(isPent * 0.55, seam);
        }
        diffuseColor.rgb = mix(col, uSeam, seam);
        vec3 ballGlow = uGlow * glow;`,
      )
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += ballGlow;');
  };
  // Shaders differ per design (the program cache keys on this).
  material.customProgramCacheKey = () => `ball-${style}`;
  return material;
}

/* ── the chosen design (dev: kept per browser) ───────────────────────── */

const KEY = 'zm-ball-style';
const listeners = new Set<() => void>();
let current: BallStyle = 'classic';
try {
  const saved = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null;
  if (saved && BALL_STYLES.some((b) => b.id === saved)) current = saved as BallStyle;
} catch {
  // Storage unavailable: the default design.
}

export function setBallStyle(style: BallStyle) {
  current = style;
  try {
    window.localStorage.setItem(KEY, style);
  } catch {
    // Not kept; still used this session.
  }
  listeners.forEach((l) => l());
}

export function useBallStyle(): BallStyle {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => 'classic',
  );
}

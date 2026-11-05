/**
 * The match ball, in many designs (our own, and recreations of famous tournament balls), drawn on the sphere itself
 * (no picture wrapped round it): a fragment shader finds the panel each point is in — the 12 pentagons and 20 hexagons of a truncated icosahedron, as the nearest of 32 panel
 * centres — and its seams, and colours it by design. Lit as a normal standard material, so it shades and spins true.
 * The chosen design is kept per browser (dev).
 */

import { useSyncExternalStore } from 'react';
import * as THREE from 'three';

export type BallStyle =
  | 'classic'
  | 'quizball'
  | 'leather'
  | 'tournament'
  | 'neon'
  | 'triads78'
  | 'aztec86'
  | 'lions90'
  | 'tricolour98'
  | 'flame02'
  | 'propeller06'
  | 'goldfinal06'
  | 'triangles10'
  | 'ribbons14'
  | 'pixels18'
  | 'waves22'
  | 'starfinal';

/** Labels name the tournament a design recalls, never a maker or a ball's trade name. */
export const BALL_STYLES: { id: BallStyle; label: string; famous?: boolean }[] = [
  { id: 'classic', label: "Classic ('70)" },
  { id: 'quizball', label: 'Quizball' },
  { id: 'leather', label: 'Retro leather' },
  { id: 'tournament', label: 'Tournament' },
  { id: 'neon', label: 'Night neon' },
  { id: 'triads78', label: "Argentina '78", famous: true },
  { id: 'aztec86', label: "Mexico '86", famous: true },
  { id: 'lions90', label: "Italia '90", famous: true },
  { id: 'tricolour98', label: "France '98", famous: true },
  { id: 'flame02', label: "Korea–Japan '02", famous: true },
  { id: 'propeller06', label: "Germany '06", famous: true },
  { id: 'goldfinal06', label: "Berlin final '06", famous: true },
  { id: 'triangles10', label: "South Africa '10", famous: true },
  { id: 'ribbons14', label: "Brazil '14", famous: true },
  { id: 'pixels18', label: "Russia '18", famous: true },
  { id: 'waves22', label: "Qatar '22", famous: true },
  { id: 'starfinal', label: 'Star final', famous: true },
];

type Look = { base: string; ink: string; alt: string; ink3?: string; seam: string; style: number; seamW?: number; roughness?: number; metalness?: number; glow?: string };

const LOOKS: Record<BallStyle, Look> = {
  classic: { base: '#F7F8FA', ink: '#16181D', alt: '#F7F8FA', seam: '#2A2D33', style: 0, roughness: 0.45 },
  quizball: { base: '#F7F8FA', ink: '#1645FF', alt: '#FFE500', seam: '#0E2A9E', style: 1, roughness: 0.4 },
  leather: { base: '#B07038', ink: '#8A5426', alt: '#9C6230', seam: '#3A2312', style: 2, seamW: 0.016, roughness: 0.85 },
  tournament: { base: '#F7F8FA', ink: '#F7F8FA', alt: '#FF6B1A', seam: '#C9D1DA', style: 3, seamW: 0.006, roughness: 0.38 },
  neon: { base: '#0E1A33', ink: '#B6FF1F', alt: '#13234A', seam: '#B6FF1F', style: 4, seamW: 0.014, roughness: 0.5, glow: '#9CFF00' },
  // 20 triads whose curved arms read as 12 white circles round the pentagon spots.
  triads78: { base: '#F6F6F2', ink: '#141414', alt: '#141414', seam: '#C8C8C2', style: 5, seamW: 0.006 },
  // The same triads, filled with stepped Aztec bands.
  aztec86: { base: '#F6F6F2', ink: '#141414', alt: '#0A7A3E', ink3: '#C8102E', seam: '#C8C8C2', style: 6, seamW: 0.006 },
  // Heavy black triads, an inner line and a medallion in each (the lion heads).
  lions90: { base: '#F6F6F2', ink: '#101010', alt: '#F6F6F2', seam: '#C8C8C2', style: 7, seamW: 0.006 },
  // The first coloured one: blue triads, a red line and a red mark (the cockerels).
  tricolour98: { base: '#FFFFFF', ink: '#0B4FA8', alt: '#E2303A', seam: '#C8CCD4', style: 8, seamW: 0.006 },
  // Four big curved gold triangles, silver inside, red flame streaks off the corners.
  flame02: { base: '#FAFAF7', ink: '#C49A2C', alt: '#8E9196', ink3: '#D2232A', seam: '#D2D2CC', style: 9, seamW: 0.006 },
  // 14 curved panels; black curved triangles with gold edges on the eight round ones.
  propeller06: { base: '#FAFAFA', ink: '#111111', alt: '#C9A227', seam: '#CFCFCF', style: 10, seamW: 0.005, roughness: 0.35 },
  goldfinal06: { base: '#D4AF37', ink: '#111111', alt: '#FFFFFF', seam: '#9C7E22', style: 10, seamW: 0.005, roughness: 0.3, metalness: 0.25 },
  // Eight panels; four big triangles of thin many-coloured stripes.
  triangles10: { base: '#FAFAFA', ink: '#111111', alt: '#FAFAFA', seam: '#D0D0D0', style: 12, seamW: 0.004, roughness: 0.32 },
  // Six pinwheel panels; ribbons of blue, orange and green along every seam.
  ribbons14: { base: '#FAFAFA', ink: '#1F5FD6', alt: '#F28C1B', ink3: '#16A34A', seam: '#2A2A2A', style: 13, seamW: 0.005, roughness: 0.35 },
  // The black-pentagon pattern again, broken into pixels.
  pixels18: { base: '#F5F5F5', ink: '#121212', alt: '#8C8F94', seam: '#D2D2D2', style: 14, seamW: 0.004, roughness: 0.3 },
  // Pearl white, 20 panels, sweeping blue / red / yellow waves.
  waves22: { base: '#F4F2EE', ink: '#2B59C3', alt: '#D61F2C', ink3: '#F5C518', seam: '#D9D4CC', style: 15, seamW: 0.004, roughness: 0.28 },
  // A star on each pentagon, the hexagons left white.
  starfinal: { base: '#FAFAFA', ink: '#0B1F4F', alt: '#B9C0CC', seam: '#C9CED6', style: 16, seamW: 0.006, roughness: 0.35 },
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
vec3 axis6(int i) {
  vec3 v[6] = vec3[6](vec3(1.0, 0.0, 0.0), vec3(-1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), vec3(0.0, -1.0, 0.0), vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, -1.0));
  return v[i];
}
vec3 corner8(int i) {
  return normalize(vec3((i & 1) == 0 ? 1.0 : -1.0, (i & 2) == 0 ? 1.0 : -1.0, (i & 4) == 0 ? 1.0 : -1.0));
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
void consider(float d, float i, inout float best, inout float second, inout float index) {
  if (d > best) { second = best; best = d; index = i; }
  else if (d > second) { second = d; }
}
// The newer balls' few, curved panels: 6 (cube), 8 (corners), 14 (both) or 20, on a twisted direction.
void modernPanels(vec3 w, int set, out float best, out float second, out float index) {
  best = -2.0; second = -2.0; index = 0.0;
  if (set == 6 || set == 14) for (int i = 0; i < 6; i++) consider(dot(w, axis6(i)), float(i), best, second, index);
  if (set == 8 || set == 14) for (int i = 0; i < 8; i++) consider(dot(w, corner8(i)), float(6 + i), best, second, index);
  if (set == 20) for (int i = 0; i < 20; i++) consider(dot(w, dodeca(i)), float(i), best, second, index);
}
vec3 twist(vec3 n, float k) {
  vec3 w = n;
  float a = k * w.z; w.xy = mat2(cos(a), sin(a), -sin(a), cos(a)) * w.xy;
  a = k * w.x; w.yz = mat2(cos(a), sin(a), -sin(a), cos(a)) * w.yz;
  a = k * w.y; w.zx = mat2(cos(a), sin(a), -sin(a), cos(a)) * w.zx;
  return normalize(w);
}
vec3 nearPent(vec3 n) {
  float b = -2.0; vec3 c = vec3(0.0, 0.0, 1.0);
  for (int i = 0; i < 12; i++) { vec3 v = icosa(i); float d = dot(n, v); if (d > b) { b = d; c = v; } }
  return c;
}
vec3 nearHex(vec3 n) {
  float b = -2.0; vec3 c = vec3(0.0, 0.0, 1.0);
  for (int i = 0; i < 20; i++) { vec3 v = dodeca(i); float d = dot(n, v); if (d > b) { b = d; c = v; } }
  return c;
}
vec3 nearCorner(vec3 n) { return normalize(sign(n) + vec3(1e-4)); }
// Four corners of the cube: a tetrahedron, for designs with four big motifs.
vec3 nearTetra(vec3 n) {
  float b = -2.0; vec3 c = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    if (i != 0 && i != 3 && i != 5 && i != 6) continue;
    vec3 v = corner8(i); float d = dot(n, v); if (d > b) { b = d; c = v; }
  }
  return c;
}
// A flat 2D view of the sphere round centre c (gnomonic), y towards 'up'.
vec2 around(vec3 n, vec3 c, vec3 up) {
  vec3 y = normalize(up - c * dot(up, c));
  vec3 x = cross(y, c);
  return vec2(dot(n, x), dot(n, y)) / max(dot(n, c), 0.05);
}
vec3 upFor(vec3 c) { return abs(c.y) > 0.95 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0); }
vec2 rot2(vec2 p, float a) { return mat2(cos(a), sin(a), -sin(a), cos(a)) * p; }
float sdTri(vec2 p, float r) {
  const float k = 1.7320508;
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}
float sdStar5(vec2 p, float r, float rf) {
  const vec2 k1 = vec2(0.809016994375, -0.587785252292);
  const vec2 k2 = vec2(-k1.x, k1.y);
  p.x = abs(p.x);
  p -= 2.0 * max(dot(k1, p), 0.0) * k1;
  p -= 2.0 * max(dot(k2, p), 0.0) * k2;
  p.x = abs(p.x);
  p.y -= r;
  vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
  float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}
float angleTo(vec3 n, vec3 c) { return acos(clamp(dot(n, c), -1.0, 1.0)); }
`;

const DESIGNS = `
int design = int(uStyle + 0.5);
vec3 col = mix(uHex, uPent, isPent);
float glow = 0.0;
if (design == 1) {
  // Quizball: blue pentagons, a ring of yellow hexagons round each one.
  if (isPent < 0.5 && mod(index, 3.0) < 1.0) col = uAlt;
} else if (design == 2) {
  // Retro leather: every panel its own shade of tan, stitched seams (dashes).
  float h = fract(sin(index * 12.9898) * 43758.5453);
  col = mix(uHex, uAlt, h) * (0.9 + 0.2 * fract(h * 7.0));
  float stitch = step(0.5, fract((bn.x + bn.y * 1.7 + bn.z * 2.3) * 60.0));
  seam *= mix(0.55, 1.0, stitch);
} else if (design == 3) {
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
} else if (design == 4) {
  // Night neon: dark panels, glowing lime pentagons and seams.
  col = isPent > 0.5 ? uPent : mix(uHex, uAlt, step(0.5, fract(index * 0.37)));
  glow = max(isPent * 0.55, seam);
} else if (design >= 5 && design <= 8) {
  // Triads: each hexagon is inked except where it falls in the 12 discs round the pentagon spots, so every
  // hexagon carries a three-armed curved triangle and the arms of neighbours outline the circles.
  vec3 c = nearPent(bn);
  float th = angleTo(bn, c);
  const float R = 0.5;
  float tri = smoothstep(R, R + 0.008, th);
  vec3 ink = uPent;
  if (design == 6) {
    vec2 q = around(bn, c, upFor(c));
    float ph = atan(q.y, q.x);
    float zig = abs(floor(fract(ph * 20.0 / PI2) * 4.0) / 4.0 - 0.375) * 0.06;
    if (abs(th - R - 0.04 - zig) < 0.01) ink = uAlt;
    if (abs(th - R - 0.09 + zig) < 0.01) ink = uInk3;
  } else if (design == 7) {
    if (abs(th - R - 0.035) < 0.006) ink = uAlt;
    float hh = angleTo(bn, nearHex(bn));
    if ((hh < 0.075 && hh > 0.055) || hh < 0.03) ink = uAlt;
  } else if (design == 8) {
    if (abs(th - R - 0.032) < 0.007) ink = uAlt;
    if (angleTo(bn, nearHex(bn)) < 0.05) ink = uAlt;
  }
  col = mix(uHex, ink, tri);
} else if (design == 9) {
  // Four curved triangles (gold edge, silver inside) with red streaks off their corners.
  vec3 t = nearTetra(bn);
  vec2 q = around(bn, t, upFor(t));
  float L = length(q);
  q = rot2(q, 0.9 * L);
  float d = sdTri(q, 0.62);
  col = uHex;
  if (d < 0.0) col = uPent;
  if (d < -0.07) col = uAlt;
  if (d > 0.012 && d < 0.06 && L > 0.42 && fract(L * 14.0) > 0.35) col = uInk3;
} else if (design == 10) {
  // 14 curved panels; on the eight round ones a black curved triangle with a gold (or white) edge.
  vec3 w = twist(bn, 1.1);
  float b2; float s2; float i2;
  modernPanels(w, 14, b2, s2, i2);
  seam = 1.0 - smoothstep(uSeamW * 0.6, uSeamW, b2 - s2);
  col = uHex;
  if (i2 >= 6.0) {
    vec3 c = nearCorner(w);
    vec2 q = around(w, c, vec3(0.0, 1.0, 0.0));
    q = rot2(q, 1.4 * length(q));
    float d = sdTri(q, 0.36);
    if (d < 0.03) col = uAlt;
    if (d < 0.0) col = uPent;
  }
} else if (design == 12) {
  // Eight panels; four big triangles drawn in thin stripes of many colours.
  vec3 w = twist(bn, 0.9);
  float b2; float s2; float i2;
  modernPanels(w, 8, b2, s2, i2);
  seam = 1.0 - smoothstep(uSeamW * 0.6, uSeamW, b2 - s2);
  vec3 t = nearTetra(bn);
  vec2 q = rot2(around(bn, t, upFor(t)), 0.35);
  float d = sdTri(q, 0.66);
  col = uHex;
  if (d < 0.0 && d > -0.3) {
    float k = -d * 32.0;
    vec3 pal[6] = vec3[6](vec3(0.07), vec3(0.95, 0.45, 0.1), vec3(0.98, 0.8, 0.1), vec3(0.1, 0.62, 0.3), vec3(0.12, 0.38, 0.85), vec3(0.85, 0.12, 0.18));
    if (fract(k) > 0.32) col = pal[int(mod(floor(k), 6.0))];
  }
} else if (design == 13) {
  // Six pinwheel panels; coloured ribbons run along both sides of every seam.
  vec3 w = twist(bn, 1.7);
  float b2; float s2; float i2;
  modernPanels(w, 6, b2, s2, i2);
  float e = b2 - s2;
  seam = 1.0 - smoothstep(uSeamW * 0.6, uSeamW, e);
  col = uHex;
  float k = (e - 0.02) / 0.055;
  if (k > 0.0 && k < 3.0) {
    vec3 pal[3] = vec3[3](uPent, uAlt, uInk3);
    if (fract(k) > 0.18) col = pal[int(mod(floor(k) + i2, 3.0))];
  }
} else if (design == 14) {
  // The black-pentagon pattern in pixels: solid cores fading out along five arms.
  vec3 w = twist(bn, 1.5);
  float b2; float s2; float i2;
  modernPanels(w, 6, b2, s2, i2);
  seam = 1.0 - smoothstep(uSeamW * 0.6, uSeamW, b2 - s2);
  float th = angleTo(bn, nearPent(bn));
  float arm = smoothstep(0.972, 0.93, dot(bn, nearHex(bn)));
  float dens = max(1.0 - smoothstep(0.24, 0.3, th), (1.0 - smoothstep(0.24, 0.6, th)) * arm);
  vec3 cell = floor(bn * 30.0);
  float hsh = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  col = uHex;
  if (hsh < dens * 1.3 - 0.08) col = uAlt;
  if (hsh < dens - 0.04) col = uPent;
} else if (design == 15) {
  // Pearl white, 20 curved panels, each with a coloured wave fading in from one side of its border.
  vec3 w = twist(bn, 0.8);
  float b2; float s2; float i2;
  modernPanels(w, 20, b2, s2, i2);
  float e = b2 - s2;
  seam = 1.0 - smoothstep(uSeamW * 0.6, uSeamW, e);
  vec3 c = dodeca(int(i2));
  vec2 q = around(w, c, upFor(c));
  float side = smoothstep(0.1, 0.8, sin(atan(q.y, q.x) + i2 * 2.4));
  float wave = (1.0 - smoothstep(0.015, 0.16, e)) * side;
  vec3 pal[4] = vec3[4](uPent, uAlt, uInk3, vec3(0.35, 0.72, 0.95));
  col = mix(uHex, pal[int(mod(i2, 4.0))], wave);
  col *= 1.0 + 0.04 * vec3(sin(bn.x * 9.0), sin(bn.y * 9.0 + 2.0), sin(bn.z * 9.0 + 4.0));
} else if (design == 16) {
  // A star on each pentagon, one point towards a neighbouring hexagon.
  vec3 c = nearPent(bn);
  vec3 h0 = c;
  for (int i = 0; i < 20; i++) { vec3 v = dodeca(i); if (dot(v, c) > 0.75) { h0 = v; break; } }
  vec2 q = around(bn, c, h0);
  float d = sdStar5(q, 0.5, 0.42);
  col = uHex;
  if (d < 0.025) col = uAlt;
  if (d < 0.0) col = uPent;
}
`;

export function makeBallMaterial(style: BallStyle): THREE.MeshStandardMaterial {
  const look = LOOKS[style];
  const material = new THREE.MeshStandardMaterial({ roughness: look.roughness ?? 0.4, metalness: look.metalness ?? 0.02 });
  const uniforms = {
    uPent: { value: new THREE.Color(look.ink) },
    uHex: { value: new THREE.Color(look.base) },
    uAlt: { value: new THREE.Color(look.alt) },
    uInk3: { value: new THREE.Color(look.ink3 ?? look.alt) },
    uSeam: { value: new THREE.Color(look.seam) },
    uGlow: { value: new THREE.Color(look.glow ?? '#000000') },
    uStyle: { value: look.style },
    uSeamW: { value: look.seamW ?? 0.012 },
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
        uniform vec3 uPent; uniform vec3 uHex; uniform vec3 uAlt; uniform vec3 uInk3; uniform vec3 uSeam; uniform vec3 uGlow;
        uniform float uStyle; uniform float uSeamW;
        ${PANELS}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 bn = normalize(vBallN);
        float best; float second; float isPent; float index;
        ballPanel(bn, best, second, isPent, index);
        float seam = 1.0 - smoothstep(uSeamW * 0.6, uSeamW, best - second);
        ${DESIGNS}
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

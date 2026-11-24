/**
 * Canvas-drawn textures for the ორშაბათობა studio set.
 *
 * Everything on the set that is not a character model is procedural: wood,
 * concrete, turf and the printed props are painted here once and cached, so
 * the studio ships as code plus two character files. All painting is seeded,
 * so the set looks the same on every load.
 */

import * as THREE from 'three';
import { STUDIO_COLORS, STUDIO_FONT_FAMILY, STUDIO_FONT_URL, BETSSON_WHITE_URL } from './studioLayout';

type Paint = (ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) => void;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, THREE.CanvasTexture>();

function canvasTexture(key: string, w: number, h: number, paint: Paint, opts: { repeat?: boolean; color?: boolean } = {}) {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is unavailable');
  paint(ctx, w, h, mulberry32(key.length * 7919 + w + h));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = opts.color === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (opts.repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  cache.set(key, tex);
  return tex;
}

/** Vertical walnut grain for the wall slats and the desk. */
export function woodTexture(tone: 'slat' | 'desk') {
  return canvasTexture(`wood-${tone}`, 256, 1024, (ctx, w, h, rand) => {
    const base = tone === 'slat' ? STUDIO_COLORS.slat : STUDIO_COLORS.desk;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) {
      const x = rand() * w;
      const width = 1 + rand() * 5;
      ctx.globalAlpha = 0.08 + rand() * 0.16;
      ctx.fillStyle = rand() > 0.5 ? '#000000' : '#c58b55';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y <= h; y += 32) ctx.lineTo(x + Math.sin(y * 0.01 + i) * 3 * rand(), y);
      ctx.lineTo(x + width, h);
      ctx.lineTo(x + width, 0);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, { repeat: true });
}

/** The dark plaster of the centre panel behind the sign. */
export function concreteTexture() {
  return canvasTexture('concrete', 512, 1024, (ctx, w, h, rand) => {
    ctx.fillStyle = STUDIO_COLORS.concrete;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const r = 2 + rand() * 18;
      ctx.globalAlpha = 0.03 + rand() * 0.05;
      ctx.fillStyle = rand() > 0.55 ? '#5a5a52' : '#000000';
      ctx.beginPath();
      ctx.arc(rand() * w, rand() * h, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

/** Short artificial turf for the desk inlay. */
export function turfTexture() {
  return canvasTexture('turf', 512, 512, (ctx, w, h, rand) => {
    ctx.fillStyle = STUDIO_COLORS.turf;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const len = 4 + rand() * 9;
      const a = rand() * Math.PI * 2;
      const shade = 70 + Math.floor(rand() * 90);
      ctx.strokeStyle = `rgba(${Math.floor(shade * 0.45)}, ${shade + 30}, ${Math.floor(shade * 0.25)}, 0.8)`;
      ctx.lineWidth = 1 + rand();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }
  }, { repeat: true });
}

/** Mkhedruli → Mtavruli: the sign is set in capitals, as on the real wall. */
export function toMtavruli(text: string) {
  return [...text]
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code >= 0x10d0 && code <= 0x10fa ? String.fromCodePoint(code + 0x0bc0) : ch;
    })
    .join('');
}

let fontReady: Promise<void> | null = null;

export function loadStudioFont() {
  fontReady ??= new FontFace(STUDIO_FONT_FAMILY, `url(${STUDIO_FONT_URL})`, { weight: '900' })
    .load()
    .then((face) => {
      document.fonts.add(face);
    });
  return fontReady;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

/** The wordmark row of the betsson.sport logo in one colour, cut from the white master. */
function tintedLogoRow(img: HTMLImageElement, top: number, bottom: number, color: string) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = bottom - top;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas is unavailable');
  ctx.drawImage(img, 0, top, img.width, c.height, 0, 0, img.width, c.height);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

/**
 * The neon wall sign: ორშაბათობა in white over the betsson / .sport lockup
 * (yellow, then white), right-aligned under the show name as on the set.
 * Each glyph carries a soft halo; the bloom pass adds the rest.
 */
export async function neonSignTexture() {
  const hit = cache.get('neon-sign');
  if (hit) return hit;
  const [, logo] = await Promise.all([loadStudioFont(), loadImage(BETSSON_WHITE_URL)]);
  // Painted at 2× and drawn in a 2048×1024 coordinate space.
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w * 2;
  canvas.height = h * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is unavailable');
  ctx.scale(2, 2);

  const title = toMtavruli('ორშაბათობა');
  ctx.font = `900 250px "${STUDIO_FONT_FAMILY}"`;
  ctx.textBaseline = 'alphabetic';
  const titleWidth = ctx.measureText(title).width;
  const scale = Math.min(1, (w * 0.92) / titleWidth);
  ctx.font = `900 ${Math.floor(250 * scale)}px "${STUDIO_FONT_FAMILY}"`;
  const tw = ctx.measureText(title).width;
  const left = (w - tw) / 2;
  const right = left + tw;

  const glow = (draw: () => void, color: string) => {
    ctx.save();
    ctx.shadowColor = color;
    ctx.globalAlpha = 0.55;
    for (const blur of [40, 14]) {
      ctx.shadowBlur = blur * 2;
      draw();
    }
    ctx.restore();
    draw();
  };

  ctx.fillStyle = STUDIO_COLORS.neonWhite;
  glow(() => ctx.fillText(title, left, 330), 'rgba(255, 245, 225, 0.9)');

  // The white master is 1769×619: "betsson" sits above y≈330, ".sport" below.
  const betsson = tintedLogoRow(logo, 0, 330, STUDIO_COLORS.neonYellow);
  const sport = tintedLogoRow(logo, 330, logo.height, STUDIO_COLORS.neonWhite);
  const logoW = tw * 0.58;
  const k = logoW / logo.width;
  glow(() => ctx.drawImage(betsson, right - logoW, 420, logoW, betsson.height * k), 'rgba(255, 190, 20, 0.95)');
  glow(() => ctx.drawImage(sport, right - logoW, 420 + 330 * k + 6, logoW, sport.height * k), 'rgba(255, 245, 225, 0.9)');

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set('neon-sign', tex);
  return tex;
}

/** A crisp-bag face: colour band, a Georgian flag patch and a label. */
export function crispBagTexture(variant: number) {
  const bands = ['#e0482f', '#f2c230', '#3f7fd0'];
  return canvasTexture(`crisps-${variant}`, 256, 384, (ctx, w, h, rand) => {
    ctx.fillStyle = '#f3dc7a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = bands[variant % bands.length];
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.bezierCurveTo(w * 0.3, h * 0.45, w * 0.7, h * 0.7, w, h * 0.6);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w * 0.3, h * 0.62, w * 0.4, h * 0.2);
    ctx.fillStyle = '#d8232a';
    ctx.fillRect(w * 0.47, h * 0.62, w * 0.06, h * 0.2);
    ctx.fillRect(w * 0.3, h * 0.69, w * 0.4, h * 0.06);
    ctx.font = `900 54px "${STUDIO_FONT_FAMILY}", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8a1f12';
    ctx.fillText(toMtavruli('ჩიფსი'), w / 2, h * 0.3);
    for (let i = 0; i < 40; i++) {
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rand() * w, rand() * h, 2, 20 + rand() * 40);
    }
    ctx.globalAlpha = 1;
  });
}

/** The silver creator-award plaque on the left shelf. */
export function plaqueTexture() {
  return canvasTexture('plaque', 256, 320, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#f4f4f2');
    g.addColorStop(0.5, '#c9c9c6');
    g.addColorStop(1, '#ededea');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1b1b1b';
    const bw = w * 0.5;
    const bh = bw * 0.7;
    const x = (w - bw) / 2;
    const y = h * 0.28;
    ctx.beginPath();
    ctx.roundRect(x, y, bw, bh, 22);
    ctx.fill();
    ctx.fillStyle = '#f4f4f2';
    ctx.beginPath();
    ctx.moveTo(x + bw * 0.4, y + bh * 0.28);
    ctx.lineTo(x + bw * 0.4, y + bh * 0.72);
    ctx.lineTo(x + bw * 0.68, y + bh * 0.5);
    ctx.fill();
  });
}

function jersey(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, fill: string | CanvasPattern, tilt: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-40, -100);
  ctx.quadraticCurveTo(0, -80, 40, -100);
  ctx.lineTo(110, -70);
  ctx.lineTo(95, -20);
  ctx.lineTo(70, -30);
  ctx.lineTo(70, 110);
  ctx.lineTo(-70, 110);
  ctx.lineTo(-70, -30);
  ctx.lineTo(-95, -20);
  ctx.lineTo(-110, -70);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#10202a';
  ctx.stroke();
  ctx.restore();
}

/** The framed illustration on the right wall: KALATOZI 7 held up beside TATO 10. */
export function posterTexture() {
  return canvasTexture('poster', 640, 800, (ctx, w, h) => {
    ctx.fillStyle = '#f6f1e4';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d9d13a';
    ctx.fillRect(30, 30, w - 60, h - 60);
    ctx.strokeStyle = '#3a86a8';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(30, h * 0.35);
    ctx.bezierCurveTo(w * 0.4, h * 0.25, w * 0.6, h * 0.55, w - 30, h * 0.45);
    ctx.stroke();

    jersey(ctx, w * 0.58, h * 0.3, 1.5, '#4cc7d6', -0.08);
    ctx.font = `900 46px "${STUDIO_FONT_FAMILY}", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f6f1e4';
    ctx.fillText('KALATOZI', w * 0.58, h * 0.21);
    ctx.font = '900 150px sans-serif';
    ctx.fillText('7', w * 0.6, h * 0.41);

    const stripes = document.createElement('canvas');
    stripes.width = 60;
    stripes.height = 10;
    const sctx = stripes.getContext('2d');
    if (sctx) {
      sctx.fillStyle = '#a3123a';
      sctx.fillRect(0, 0, 30, 10);
      sctx.fillStyle = '#163c8c';
      sctx.fillRect(30, 0, 30, 10);
    }
    const pattern = ctx.createPattern(stripes, 'repeat') ?? '#163c8c';
    jersey(ctx, w * 0.68, h * 0.75, 1.3, pattern, 0.05);
    ctx.fillStyle = '#f2c230';
    ctx.font = `900 44px "${STUDIO_FONT_FAMILY}", sans-serif`;
    ctx.fillText('TATO', w * 0.69, h * 0.68);
    ctx.font = 'italic 900 140px sans-serif';
    ctx.fillText('10', w * 0.69, h * 0.85);

    // Hands holding both shirts up by the shoulders.
    ctx.fillStyle = '#e7b48a';
    for (const [x, y] of [[0.4, 0.14], [0.8, 0.12], [0.5, 0.6], [0.88, 0.6]]) {
      ctx.beginPath();
      ctx.arc(w * x, h * y, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** The psychedelic print propped at the far left of the shelf. */
export function printTexture() {
  return canvasTexture('print', 256, 360, (ctx, w, h, rand) => {
    ctx.fillStyle = '#2b1150';
    ctx.fillRect(0, 0, w, h);
    const colors = ['#ff3d8b', '#26d0ce', '#ffcf3a', '#7c4dff', '#ff7a2f'];
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.ellipse(rand() * w, rand() * h, 10 + rand() * 50, 8 + rand() * 30, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

/** A tall can: numbers over colour bands (generic, no brand marks). */
export function canTexture(kind: 'black' | 'blue') {
  return canvasTexture(`can-${kind}`, 512, 256, (ctx, w, h) => {
    if (kind === 'black') {
      ctx.fillStyle = '#141414';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#c8202a';
      ctx.fillRect(0, h * 0.6, w, h * 0.13);
      ctx.fillStyle = '#e9b81f';
      ctx.fillRect(0, h * 0.73, w, h * 0.13);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#16285c');
      g.addColorStop(1, '#0b1638');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.fillStyle = '#f6f1e4';
    ctx.font = '700 84px Georgia, serif';
    ctx.textAlign = 'center';
    for (const x of [w * 0.25, w * 0.75]) ctx.fillText(kind === 'black' ? '5,0' : '9,0', x, h * 0.5);
  });
}

/** Laptop lids: Tato's black one with a white triangle mark, Kala's silver one with betsson.sport. */
export function lidTexture(kind: 'black' | 'silver') {
  const fresh = !cache.has(`lid-${kind}`);
  const tex = canvasTexture(`lid-${kind}`, 512, 352, (ctx, w, h) => {
    ctx.fillStyle = kind === 'black' ? '#141416' : '#c9cacc';
    ctx.fillRect(0, 0, w, h);
    if (kind === 'black') {
      ctx.strokeStyle = '#f2f2f2';
      ctx.lineWidth = 9;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.32);
      ctx.lineTo(w * 0.6, h * 0.55);
      ctx.lineTo(w * 0.4, h * 0.55);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.32);
      ctx.lineTo(w * 0.5, h * 0.48);
      ctx.lineTo(w * 0.4, h * 0.55);
      ctx.moveTo(w * 0.5, h * 0.48);
      ctx.lineTo(w * 0.6, h * 0.55);
      ctx.stroke();
    }
  });
  if (kind === 'silver' && fresh) {
    // The official wordmark, darkened, in the lid's top-right corner.
    void loadImage(BETSSON_WHITE_URL).then((logo) => {
      const ctx = (tex.image as HTMLCanvasElement).getContext('2d');
      if (!ctx) return;
      const mark = tintedLogoRow(logo, 0, logo.height, '#2a2a2a');
      const mw = 512 * 0.34;
      ctx.drawImage(mark, 512 * 0.9 - mw, 352 * 0.1, mw, mark.height * (mw / mark.width));
      tex.needsUpdate = true;
    });
  }
  return tex;
}

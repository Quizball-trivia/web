#!/usr/bin/env node
/**
 * Final Third SFX — additive choir (no noise). Writes 16-bit stereo WAVs.
 */
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../public/sounds/final-third');

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function choir(seconds, seed, mode) {
  const n = Math.floor(seconds * SR);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const rand = rng(seed);
  const voices = 56;
  const formants = mode === 'cheer' ? [1, 2.2, 3.5, 4.7] : [1, 1.65, 2.35, 3.05];
  const formAmp = [1, 0.42, 0.2, 0.08];
  for (let v = 0; v < voices; v += 1) {
    const pan = rand() * 2 - 1;
    const base = mode === 'cheer' ? 210 + rand() * 170 : 130 + rand() * 80;
    const vib = 1.8 + rand() * 3.4;
    const vibAmt = 0.006 + rand() * 0.01;
    const amp = ((0.45 + rand() * 0.55) / voices) * 3.1;
    let phase = rand() * Math.PI * 2;
    for (let i = 0; i < n; i += 1) {
      const t = i / SR;
      const u = i / n;
      const env = Math.min(1, t / 0.07) * Math.pow(1 - u, mode === 'cheer' ? 0.42 : 0.58);
      const glide = mode === 'cheer' ? 1 + u * 0.26 : 1 - u * 0.2;
      const freq = base * glide * (1 + Math.sin(t * vib * Math.PI * 2) * vibAmt);
      phase += (2 * Math.PI * freq) / SR;
      let s = 0;
      for (let f = 0; f < formants.length; f += 1) s += Math.sin(phase * formants[f]) * formAmp[f];
      const sample = s * amp * env;
      left[i] += sample * (0.5 - pan * 0.5);
      right[i] += sample * (0.5 + pan * 0.5);
    }
  }
  return { left, right };
}

function kick() {
  const n = Math.floor(SR * 0.28);
  const left = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    left[i] = Math.sin(2 * Math.PI * (88 - t * 64) * t) * Math.exp(-t * 16) * 0.9;
  }
  return { left, right: Float32Array.from(left) };
}

function normalize(pair, peak = 0.74) {
  let max = 1e-6;
  for (let i = 0; i < pair.left.length; i += 1) {
    max = Math.max(max, Math.abs(pair.left[i]), Math.abs(pair.right[i]));
  }
  const g = peak / max;
  for (let i = 0; i < pair.left.length; i += 1) {
    pair.left[i] *= g;
    pair.right[i] *= g;
  }
  return pair;
}

function wav({ left, right }) {
  const n = left.length;
  const data = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i += 1) {
    data.writeInt16LE(Math.max(-32767, Math.min(32767, left[i] * 32767)), i * 4);
    data.writeInt16LE(Math.max(-32767, Math.min(32767, right[i] * 32767)), i * 4 + 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

mkdirSync(OUT, { recursive: true });
for (const name of ['crowd-loop.wav', 'cheer.wav', 'groan.wav']) {
  const path = join(OUT, name);
  if (existsSync(path)) unlinkSync(path);
}
writeFileSync(join(OUT, 'kick.wav'), wav(normalize(kick(), 0.88)));
console.log('wrote', OUT);

#!/usr/bin/env node
/**
 * Normalize every club crest to a consistent square badge:
 *   1. trim transparent borders (so the crest fills the frame),
 *   2. fit inside a square with a small uniform margin (so it never touches edges),
 *   3. output 256×256 transparent webp.
 *
 * This makes portrait crests (the legacy 139×181 set, e.g. Lazio) render at the
 * same visual size as square ones in the fixed object-contain badge box.
 *
 * Writes in place to public/clubs/*.webp. Run after backing up.
 */
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'public', 'clubs');
const SIZE = 256;
const MARGIN = 18; // px transparent margin inside the square (so crest doesn't touch edges)

const files = readdirSync(DIR).filter((f) => f.endsWith('.webp'));
let done = 0;
const issues = [];

for (const f of files) {
  const p = join(DIR, f);
  try {
    const buf = await sharp(p).ensureAlpha().toBuffer();
    const inner = SIZE - MARGIN * 2;
    const out = await sharp(buf)
      .trim() // remove uniform transparent/solid border
      .resize(inner, inner, { fit: 'inside', withoutEnlargement: false, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      // After trim+resize the width/height may differ; force exact square canvas, centered.
      .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 92 })
      .toBuffer();
    await sharp(out).toFile(p);
    done += 1;
  } catch (err) {
    issues.push(`${f}: ${String(err.message || err).split('\n')[0]}`);
  }
}

console.log(`Normalized ${done}/${files.length} logos to ${SIZE}×${SIZE} (margin ${MARGIN}px).`);
if (issues.length) {
  console.log(`\nIssues (${issues.length}):`);
  for (const i of issues) console.log('  ' + i);
}

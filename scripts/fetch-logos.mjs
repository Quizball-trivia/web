#!/usr/bin/env node
/**
 * Download the 40 new club crests from scripts/clubs-logo-sources.json, convert
 * each to a padded square .webp (transparent bg) matching the existing
 * public/clubs format, into scripts/_logos_out/. Does NOT upload — review first.
 *
 * Requires `cwebp` on PATH (brew install webp). Uses curl for downloads.
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = JSON.parse(readFileSync(join(__dirname, 'clubs-logo-sources.json'), 'utf8'));
const OUT = join(__dirname, '_logos_out');
const TMP = join(__dirname, '_logos_tmp');
for (const d of [OUT, TMP]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }

const entries = Object.entries(SRC).filter(([k]) => !k.startsWith('_'));
const ok = [];
const failed = [];

for (const [id, info] of entries) {
  const rawPath = join(TMP, `${id}.src`);
  const webpPath = join(OUT, `${id}.webp`);
  try {
    // download (follow redirects, UA so wikimedia/fb don't 403)
    execFileSync('curl', [
      '-fsSL', '-A', 'Mozilla/5.0 (logo-fetch)', '--max-time', '30',
      '-o', rawPath, info.url,
    ]);
    // convert to webp on a transparent canvas. cwebp keeps alpha; for non-square
    // sources cwebp doesn't pad, so we resize-fit to 256 and let object-contain
    // in the UI handle aspect. -resize 0 256 keeps aspect (height 256).
    execFileSync('cwebp', ['-quiet', '-q', '90', '-resize', '256', '0', rawPath, '-o', webpPath]);
    ok.push({ id, name: info.name });
  } catch (err) {
    // cwebp can't read SVG/some formats; record for manual handling.
    failed.push({ id, name: info.name, url: info.url, error: String(err.message || err).split('\n')[0] });
  }
}

writeFileSync(join(__dirname, 'fetch-logos-result.json'), JSON.stringify({ ok, failed }, null, 2) + '\n');
console.log(`Downloaded+converted: ${ok.length}/${entries.length}`);
if (failed.length) {
  console.log(`\nFAILED (${failed.length}) — likely SVG sources cwebp can't read directly:`);
  for (const f of failed) console.log(`  ${f.id} (${f.name}): ${f.error}`);
}
console.log(`\nwebp files -> ${OUT}`);

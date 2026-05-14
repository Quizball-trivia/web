#!/usr/bin/env node
/**
 * One-time: convert public/clubs/*.png to .webp (lossless, quality 90),
 * delete the source PNG, and rewrite src/data/top5leagues-clubs.json so
 * the `logo` field points to the .webp.
 *
 *   node scripts/convert-clubs-to-webp.mjs
 *
 * WebP-lossless preserves every pixel of the source PNG (including
 * transparency) but at ~25–35% smaller file size — meaningful when we
 * ship 96 logos to every client.
 */

import { readdir, readFile, writeFile, unlink, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const DIR = join(ROOT, 'public', 'clubs');
const JSON_PATH = join(ROOT, 'src', 'data', 'top5leagues-clubs.json');

async function main() {
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.png'));
  console.log(`Found ${files.length} PNGs in ${DIR}\n`);

  let totalPngBytes = 0;
  let totalWebpBytes = 0;

  for (const png of files) {
    const pngPath = join(DIR, png);
    const webpPath = pngPath.replace(/\.png$/i, '.webp');

    const pngStat = await stat(pngPath);
    await sharp(pngPath).webp({ lossless: true, effort: 6 }).toFile(webpPath);
    const webpStat = await stat(webpPath);
    await unlink(pngPath);

    totalPngBytes += pngStat.size;
    totalWebpBytes += webpStat.size;
    const delta = ((1 - webpStat.size / pngStat.size) * 100).toFixed(1);
    console.log(
      `  ${png.padEnd(40)} ${(pngStat.size / 1024).toFixed(1).padStart(7)} KB → ${(webpStat.size / 1024).toFixed(1).padStart(7)} KB  (-${delta}%)`,
    );
  }

  console.log(
    `\nTotal: ${(totalPngBytes / 1024).toFixed(1)} KB → ${(totalWebpBytes / 1024).toFixed(1)} KB ` +
      `(-${((1 - totalWebpBytes / totalPngBytes) * 100).toFixed(1)}%, saved ${((totalPngBytes - totalWebpBytes) / 1024).toFixed(1)} KB)`,
  );

  // Rewrite the JSON: png → webp paths
  const json = JSON.parse(await readFile(JSON_PATH, 'utf8'));
  for (const club of json) {
    club.logo = club.logo.replace(/\.png$/i, '.webp');
  }
  await writeFile(JSON_PATH, JSON.stringify(json, null, 2) + '\n');
  console.log(`\nUpdated ${JSON_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

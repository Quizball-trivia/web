#!/usr/bin/env node
/**
 * Pulls every team logo for the top-5 European leagues from
 * github.com/luukhopman/football-logos (current season).
 *
 *   node scripts/fetch-club-logos.mjs
 *
 * For each team:
 *   1. download PNG to public/clubs/<slug>.png
 *   2. extract a representative brand color from non-transparent / non-near-
 *      white pixels (sharp does the pixel work, no extra deps needed)
 *   3. emit a JSON entry into src/data/top5leagues-clubs.json
 *
 * The generated JSON entries have shape:
 *   { id, label, value, league, logo, primaryColor }
 *
 * Re-runnable: existing PNGs are skipped, the JSON is regenerated each run
 * so manually-tweaked colors should live in scripts/club-color-overrides.json.
 */

import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp'; // also used to write WebP output

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const OUT_DIR = join(ROOT, 'public', 'clubs');
const JSON_PATH = join(ROOT, 'src', 'data', 'top5leagues-clubs.json');
const OVERRIDES_PATH = join(__dirname, 'club-color-overrides.json');

const LEAGUES = [
  { folder: 'England - Premier League', short: 'England' },
  { folder: 'Spain - LaLiga',           short: 'Spain'   },
  { folder: 'Germany - Bundesliga',     short: 'Germany' },
  { folder: 'Italy - Serie A',          short: 'Italy'   },
  { folder: 'France - Ligue 1',         short: 'France'  },
];

const REPO_API = 'https://api.github.com/repos/luukhopman/football-logos/contents/logos';
const REPO_RAW = 'https://raw.githubusercontent.com/luukhopman/football-logos/master/logos';

function slugify(label) {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanLabel(filename) {
  // "Manchester United.png" → "Manchester United"
  return filename.replace(/\.png$/i, '');
}

async function listLeague(folder) {
  const url = `${REPO_API}/${encodeURIComponent(folder)}`;
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`List ${folder}: ${res.status}`);
  const body = await res.json();
  return body
    .filter((e) => e.type === 'file' && /\.png$/i.test(e.name))
    .map((e) => e.name);
}

async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function downloadLogo(league, filename, slug) {
  const out = join(OUT_DIR, `${slug}.webp`);
  if (await fileExists(out)) return out;
  const url = `${REPO_RAW}/${encodeURIComponent(league)}/${encodeURIComponent(filename)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${filename}: ${res.status}`);
  // Convert PNG → WebP-lossless on the fly so we never commit PNGs.
  const pngBuf = Buffer.from(await res.arrayBuffer());
  const webpBuf = await sharp(pngBuf).webp({ lossless: true, effort: 6 }).toBuffer();
  await writeFile(out, webpBuf);
  return out;
}

/**
 * Pick the most representative brand color from the logo: histogram the
 * non-transparent, non-near-white, non-near-black pixels (these are the ink
 * around the crest's edges and shapes). Tie-break by saturation so the
 * "logo color" wins over the background.
 */
async function extractPrimaryColor(pngPath) {
  // Downscale first — gives us a small but representative pixel set, fast.
  const { data, info } = await sharp(pngPath)
    .resize(64, 64, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels; // should be 4 (RGBA)
  const buckets = new Map();

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a < 200) continue;                              // skip transparent
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max > 240 && min > 240) continue;               // skip white
    if (max < 30) continue;                             // skip black

    // Quantize to 5-bit channels (32 buckets per axis = 32k bins total)
    const key = (r >> 3) << 10 | (g >> 3) << 5 | (b >> 3);
    const sat = max === 0 ? 0 : (max - min) / max;
    const prev = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0, sat: 0 };
    prev.r += r;
    prev.g += g;
    prev.b += b;
    prev.count += 1;
    prev.sat = Math.max(prev.sat, sat);
    buckets.set(key, prev);
  }

  if (buckets.size === 0) return '#1645FF'; // fallback brand-blue

  // Rank by count * (0.4 + 0.6 * saturation) so saturated buckets win ties.
  const ranked = [...buckets.values()].sort((a, b) =>
    b.count * (0.4 + 0.6 * b.sat) - a.count * (0.4 + 0.6 * a.sat)
  );

  const top = ranked[0];
  const r = Math.round(top.r / top.count);
  const g = Math.round(top.g / top.count);
  const b = Math.round(top.b / top.count);

  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0').toUpperCase()).join('');
}

async function loadOverrides() {
  if (!existsSync(OVERRIDES_PATH)) return {};
  try {
    return JSON.parse(await readFile(OVERRIDES_PATH, 'utf8'));
  } catch {
    return {};
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const overrides = await loadOverrides();
  const all = [];
  let downloaded = 0;
  let cached = 0;

  for (const league of LEAGUES) {
    console.log(`\n=== ${league.folder} ===`);
    const files = await listLeague(league.folder);
    for (const filename of files) {
      const label = cleanLabel(filename);
      const slug = slugify(label);
      const path = join(OUT_DIR, `${slug}.png`);
      const wasCached = await fileExists(path);
      await downloadLogo(league.folder, filename, slug);
      if (wasCached) cached += 1; else downloaded += 1;
      const color = overrides[slug] ?? await extractPrimaryColor(path);
      all.push({
        id: slug,
        label,
        value: label,
        league: league.short,
        logo: `/clubs/${slug}.webp`,
        primaryColor: color,
      });
      const tag = wasCached ? 'cached' : 'new   ';
      console.log(`  [${tag}] ${slug.padEnd(38)} ${color}`);
    }
  }

  // Sort: by league (in LEAGUES order) then alphabetic
  const order = Object.fromEntries(LEAGUES.map((l, i) => [l.short, i]));
  all.sort((a, b) => {
    if (order[a.league] !== order[b.league]) return order[a.league] - order[b.league];
    return a.label.localeCompare(b.label);
  });

  await writeFile(JSON_PATH, JSON.stringify(all, null, 2) + '\n');

  console.log(`\nDone. ${all.length} clubs total (${downloaded} new, ${cached} cached).`);
  console.log(`Wrote ${JSON_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Fetch REAL competition logos (Wikipedia lead images) and reuse the packaged
 * API-Sports league art, normalising both to ≤256px .webp with alpha.
 * Download/convert only — review the output, then upload with
 * scripts/upload-grid-real-logos.mjs. Owner decision 2026-09-03: real logos
 * for every grid criterion (trademark exposure accepted, same as club crests).
 *
 * Usage: node scripts/fetch-grid-real-logos.mjs <outDir>
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2];
if (!OUT) { console.error('usage: fetch-grid-real-logos.mjs <outDir>'); process.exit(1); }
const UA = 'QuizballLogoFetch/1.0 (nika@quizball.io)';

// competition id → English Wikipedia article whose lead image is the logo
export const COMPETITION_WIKI_PAGES = {
  'fifa-world-cup': 'FIFA World Cup',
  'uefa-euro': 'UEFA European Championship',
  'copa-america': 'Copa América',
  'africa-cup-of-nations': 'Africa Cup of Nations',
  'afc-asian-cup': 'AFC Asian Cup',
  'uefa-nations-league': 'UEFA Nations League',
  'uefa-champions-league': 'UEFA Champions League',
  'uefa-europa-league': 'UEFA Europa League',
  'uefa-conference-league': 'UEFA Conference League',
  'fifa-club-world-cup': 'FIFA Club World Cup',
  'copa-libertadores': 'Copa Libertadores',
  'premier-league-title': 'Premier League',
  'la-liga-title': 'La Liga',
  'serie-a-title': 'Serie A',
  'bundesliga-title': 'Bundesliga',
  'ligue-1-title': 'Ligue 1',
  'fa-cup': 'FA Cup',
  'efl-cup': 'EFL Cup',
  'copa-del-rey': 'Copa del Rey',
  'coppa-italia': 'Coppa Italia',
  'dfb-pokal': 'DFB-Pokal',
  'coupe-de-france': 'Coupe de France',
  'knvb-cup': 'KNVB Cup',
  'taca-de-portugal': 'Taça de Portugal',
};

const rawDir = join(OUT, '_raw');
for (const dir of [rawDir, join(OUT, 'competitions'), join(OUT, 'leagues')]) mkdirSync(dir, { recursive: true });

async function wikiLeadImage(title) {
  const api = new URL('https://en.wikipedia.org/w/api.php');
  api.search = new URLSearchParams({
    action: 'query', prop: 'pageimages', piprop: 'original|thumbnail', pithumbsize: '512',
    titles: title, redirects: '1', format: 'json', formatversion: '2',
  }).toString();
  const res = await fetch(api, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`wiki ${res.status}`);
  const page = (await res.json()).query?.pages?.[0];
  return page?.thumbnail?.source ?? page?.original?.source ?? null;
}

function toWebp(src, dest) {
  // Wikipedia thumbs of SVG logos arrive as PNG; rsvg handles the rare raw SVG.
  let input = src;
  if (src.endsWith('.svg')) {
    input = `${src}.png`;
    execFileSync('rsvg-convert', ['-w', '512', '-a', '-o', input, src]);
  }
  execFileSync('cwebp', ['-quiet', '-q', '90', '-resize', '256', '0', input, '-o', dest]);
}

const manifest = { fetchedAt: new Date().toISOString(), competitions: {}, leagues: {}, failed: [] };
for (const [id, title] of Object.entries(COMPETITION_WIKI_PAGES)) {
  try {
    const url = await wikiLeadImage(title);
    if (!url) throw new Error('no lead image');
    const ext = (url.split('.').pop() ?? 'png').toLowerCase().split('?')[0];
    const raw = join(rawDir, `${id}.${ext}`);
    execFileSync('curl', ['-fsSL', '-A', UA, '-o', raw, url]);
    toWebp(raw, join(OUT, 'competitions', `${id}.webp`));
    manifest.competitions[id] = { title, source: url };
    console.log(`✔ ${id} ← ${url}`);
  } catch (error) {
    manifest.failed.push({ id, title, error: String(error.message ?? error) });
    console.log(`✗ ${id}: ${error.message ?? error}`);
  }
}

const leagues = JSON.parse(readFileSync(join(ROOT, 'src/data/football-grid/launch-assets/leagues.json'), 'utf8'));
for (const league of leagues) {
  const png = join(ROOT, 'public/assets/football-grid/leagues', `${league.id}.png`);
  if (!existsSync(png)) { manifest.failed.push({ id: league.id, error: 'no packaged png' }); continue; }
  toWebp(png, join(OUT, 'leagues', `${league.id}.webp`));
  manifest.leagues[league.id] = { source: league.providerCandidate?.url ?? league.providerCandidate?.sourceUrl ?? 'packaged api-sports png' };
  console.log(`✔ league ${league.id}`);
}
writeFileSync(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\n${Object.keys(manifest.competitions).length} competitions, ${Object.keys(manifest.leagues).length} leagues, ${manifest.failed.length} failed → ${OUT}`);
// A partial set must not be uploaded by accident: fail the pipeline step.
if (manifest.failed.length > 0) process.exitCode = 1;

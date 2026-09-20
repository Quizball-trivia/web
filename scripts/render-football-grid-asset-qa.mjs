#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'src/data/football-grid/launch-assets');
const destination = path.resolve(process.argv[2] ?? path.join(root, 'tmp/football-grid-asset-qa.html'));

const readJson = async (file) => JSON.parse(await readFile(path.join(dataDir, file), 'utf8'));
const [clubs, clubReplacements, countries, managers, leagues, competitions, wildcards] = await Promise.all([
  readJson('clubs.json'), readJson('club-replacements.seed.json'), readJson('countries.json'),
  readJson('managers.json'), readJson('leagues.json'), readJson('competitions.json'), readJson('wildcards.json'),
]);

const playerSamples = [
  ['Cristiano Ronaldo', 'https://img.a.transfermarkt.technology/portrait/header/8198-1748102259.jpg?lm=1'],
  ['Erling Haaland', 'https://img.a.transfermarkt.technology/portrait/header/418560-1709108116.png?lm=1'],
  ['Giorgi Mamardashvili', 'https://img.a.transfermarkt.technology/portrait/header/502676-1716542116.jpg?lm=1'],
  ['Jude Bellingham', 'https://img.a.transfermarkt.technology/portrait/header/581678-1748102891.jpg?lm=1'],
  ['Khvicha Kvaratskhelia', 'https://img.a.transfermarkt.technology/portrait/header/502670-1777411223.jpg?lm=1'],
  ['Kylian Mbappé', 'https://img.a.transfermarkt.technology/portrait/header/342229-1682683695.jpg?lm=1'],
  ['Lamine Yamal', 'https://img.a.transfermarkt.technology/portrait/header/937958-1773173768.jpg?lm=1'],
  ['Lionel Messi', 'https://img.a.transfermarkt.technology/portrait/header/28003-1771694720.jpg?lm=1'],
  ['Luka Modrić', 'https://img.a.transfermarkt.technology/portrait/header/27992-1687776160.jpg?lm=1'],
  ['Mohamed Salah', 'https://img.a.transfermarkt.technology/portrait/header/148455-1727337594.jpg?lm=1'],
  ['Neymar', 'https://img.a.transfermarkt.technology/portrait/header/68290-1692601435.jpg?lm=1'],
  ['Zinedine Zidane', 'https://nsdfiprfmhdqhbfxfwpv.supabase.co/storage/v1/object/public/imgs/player-images/e4da368d-83e5-42c1-b1b2-4309d0299309.webp'],
];

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function resolveAsset(value) {
  if (!value) return '';
  if (/^https?:\/\//.test(value)) return value;
  return pathToFileURL(path.join(root, 'public', value.replace(/^\/+/, ''))).href;
}

function primaryUrl(row) {
  return resolveAsset(row.primary?.assetPath ?? row.primary?.publicUrl ?? row.assetPath);
}

function tile(label, src, kind = 'badge') {
  return `<div class="tile ${kind}"><img src="${escapeHtml(src)}" alt="${escapeHtml(label)}"><div>${escapeHtml(label)}</div></div>`;
}

function section(id, title, items) {
  return `<section id="${id}"><h2>${escapeHtml(title)} <span>${items.length}</span></h2><div class="grid">${items.join('')}</div></section>`;
}

const replacementIds = new Set(clubReplacements.map((row) => row.id));
const repairedClubs = clubs.filter((row) => replacementIds.has(row.id));
const flagSampleCodes = new Set(['ge', 'gb-eng', 'gb-sct', 'gb-wls', 'gb-nir', 'es', 'it', 'de', 'fr', 'pt', 'nl', 'be', 'tr', 'sa', 'us', 'br', 'ar', 'uy', 'jp', 'kr', 'cn', 'gh', 'ng', 'sn', 'ma', 'dz', 'eg', 'cm', 'ci', 'hr']);
const flagSamples = countries.filter((row) => flagSampleCodes.has(row.id));

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Football Grid asset QA</title><style>
*{box-sizing:border-box}body{margin:0;padding:24px;background:#eef1f4;color:#111827;font:14px Arial,sans-serif}h1{margin:0 0 24px}h2{margin:0 0 12px;font-size:18px}h2 span{color:#64748b;font-weight:400}section{background:#fff;margin:0 0 24px;padding:18px;border-radius:12px}.grid{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:10px}.tile{min-width:0;text-align:center;font-size:11px;line-height:1.25;overflow-wrap:anywhere}.tile img{display:block;width:100%;height:88px;object-fit:contain;background:#f8fafc;border:1px solid #dbe2ea;border-radius:8px;margin-bottom:5px}.tile.portrait img{object-fit:cover;object-position:50% 18%;height:112px}.tile.broken img{border:3px solid #dc2626;background:#fee2e2}@media(max-width:800px){.grid{grid-template-columns:repeat(5,minmax(0,1fr))}}
</style></head><body><h1>Football Grid full launch asset QA</h1>
${section('clubs', 'Repaired club primaries', repairedClubs.map((row) => tile(row.labelEn, primaryUrl(row))))}
${section('players', 'Player provider sample', playerSamples.map(([label, src]) => tile(label, src, 'portrait')))}
${section('managers', 'Manager portraits', managers.map((row) => tile(row.labelEn, primaryUrl(row), 'portrait')))}
${section('leagues', 'League primaries', leagues.map((row) => tile(row.labelEn, primaryUrl(row))))}
${section('competitions', 'Competition visuals', competitions.map((row) => tile(row.labelEn, primaryUrl(row))))}
${section('wildcards', 'Wildcard visuals', wildcards.map((row) => tile(row.labelEn, primaryUrl(row))))}
${section('flags', 'Flag package sample', flagSamples.map((row) => tile(row.labelEn, primaryUrl(row))))}
<script>window.qa={broken:[]};document.querySelectorAll('img').forEach((img)=>{img.addEventListener('error',()=>{img.closest('.tile').classList.add('broken');window.qa.broken.push(img.alt);});});</script>
</body></html>`;

await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, html);
console.log(destination);

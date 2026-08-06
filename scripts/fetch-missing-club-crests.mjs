#!/usr/bin/env node
/**
 * Fetch crests for clubs referenced by career-path questions but missing from
 * src/data/clubs.json, and upload them to the `imgs/club-logos` bucket of BOTH
 * Supabase projects (clubLogoUrl builds the URL from the active project, so
 * the same filename must exist in each).
 *
 * Source: Wikipedia page images (the page's lead image is the club crest on
 * club articles) — the same approach the auction roster ingestion used.
 *
 * Usage:
 *   node scripts/fetch-missing-club-crests.mjs missing-clubs.txt \
 *     --project https://<staging>.supabase.co:<service-key> \
 *     --project https://<prod>.supabase.co:<service-key>
 *
 * Emits crest-additions.json — entries to merge into clubs.json (hidden:true
 * so the profile club picker is unaffected).
 */

import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'QuizballCrestFetch/1.0 (nika@quizball.io)';
const args = process.argv.slice(2);
const listPath = args[0];
const projects = [];
for (let i = 1; i < args.length; i += 1) {
  if (args[i] === '--project') {
    const [url, key] = args[i + 1].split('|');
    projects.push({ url: url.replace(/\/$/, ''), key });
    i += 1;
  }
}
if (!listPath || projects.length === 0) {
  console.error('usage: fetch-missing-club-crests.mjs <list.txt> --project url|key [...]');
  process.exit(1);
}

const slug = (name) => name
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function wikiSearch(name) {
  const q = encodeURIComponent(`${name} football club`);
  const res = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&srlimit=1&format=json`,
    { headers: { 'user-agent': UA } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.query?.search?.[0]?.title ?? null;
}

async function pageImage(title) {
  // pithumbsize 240 gives a crisp crest-sized raster even from SVG originals.
  const res = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=240&titles=${encodeURIComponent(title)}&format=json&redirects=1`,
    { headers: { 'user-agent': UA } },
  );
  if (res.ok) {
    const data = await res.json();
    const first = Object.values(data?.query?.pages ?? {})[0];
    if (first?.thumbnail?.source) return first.thumbnail.source;
  }
  // pageimages excludes NON-FREE files — which most club crests are. Fall back
  // to the article's file list and pick the crest by name.
  const listRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&prop=images&imlimit=30&titles=${encodeURIComponent(title)}&format=json&redirects=1`,
    { headers: { 'user-agent': UA } },
  );
  if (!listRes.ok) return null;
  const listData = await listRes.json();
  const firstPage = Object.values(listData?.query?.pages ?? {})[0];
  const files = (firstPage?.images ?? []).map((f) => f.title);
  const crest = files.find((f) => /logo|badge|crest|escudo|emblem/i.test(f) && /\.(png|svg)$/i.test(f))
    ?? files.find((f) => /\.(png|svg)$/i.test(f) && !/icon|map|flag|kit|stadium|commons-logo|edit/i.test(f));
  if (!crest) return null;
  const infoRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&iiurlwidth=240&titles=${encodeURIComponent(crest)}&format=json`,
    { headers: { 'user-agent': UA } },
  );
  if (!infoRes.ok) return null;
  const infoData = await infoRes.json();
  const info = Object.values(infoData?.query?.pages ?? {})[0]?.imageinfo?.[0];
  return info?.thumburl ?? info?.url ?? null;
}

async function upload(project, file, bytes, contentType) {
  const res = await fetch(`${project.url}/storage/v1/object/imgs/club-logos/${file}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${project.key}`,
      'content-type': contentType,
      'x-upsert': 'true',
    },
    body: bytes,
  });
  return res.ok || res.status === 409;
}

const names = readFileSync(listPath, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
const additions = [];
const failures = [];

for (const name of names) {
  try {
    const title = await wikiSearch(name);
    if (!title) { failures.push(`${name}: no wiki page`); continue; }
    const img = await pageImage(title);
    if (!img) { failures.push(`${name}: no page image (${title})`); continue; }
    const imgRes = await fetch(img, { headers: { 'user-agent': UA } });
    if (!imgRes.ok) { failures.push(`${name}: image fetch ${imgRes.status}`); continue; }
    const bytes = Buffer.from(await imgRes.arrayBuffer());
    const ext = img.split('.').pop()?.split(/[?#]/)[0]?.toLowerCase() ?? 'png';
    const safeExt = ['png', 'jpg', 'jpeg', 'webp'].includes(ext) ? ext : 'png';
    const file = `wl-${slug(name)}.${safeExt}`;
    const type = safeExt === 'png' ? 'image/png' : safeExt === 'webp' ? 'image/webp' : 'image/jpeg';
    let allOk = true;
    for (const project of projects) {
      const ok = await upload(project, file, bytes, type);
      if (!ok) { allOk = false; failures.push(`${name}: upload failed to ${project.url}`); }
    }
    if (allOk) {
      additions.push({
        id: `wl-${slug(name)}`,
        label: name,
        value: name,
        country: '',
        logo: file,
        primaryColor: '#1f2937',
        hidden: true,
      });
      console.log(`ok  ${name} <- ${title}`);
    }
    await new Promise((r) => setTimeout(r, 350)); // polite to the wiki API
  } catch (e) {
    failures.push(`${name}: ${e.message}`);
  }
}

writeFileSync('crest-additions.json', JSON.stringify(additions, null, 2));
writeFileSync('crest-failures.txt', failures.join('\n'));
console.log(`\ndone: ${additions.length} crests, ${failures.length} failures (crest-failures.txt)`);

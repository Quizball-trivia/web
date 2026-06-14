#!/usr/bin/env node
/**
 * Upload club crests to Supabase Storage imgs/club-logos/<id>.webp and rewrite
 * src/data/clubs.json logo fields to the public CDN URLs.
 *
 * Uploads exactly the logos referenced by clubs.json (one per club id), reading
 * the local normalized webp from public/clubs/<id>.webp. Public bucket → URLs are
 * https://<ref>.supabase.co/storage/v1/object/public/imgs/club-logos/<id>.webp
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SUPA_URL = process.env.SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SVC) { console.error('FATAL: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required'); process.exit(1); }

const BUCKET = 'imgs';
const PREFIX = 'club-logos';
const publicBase = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${PREFIX}`;

const clubsPath = join(ROOT, 'src', 'data', 'clubs.json');
const clubs = JSON.parse(readFileSync(clubsPath, 'utf8'));

// Each club id maps to public/clubs/<localId>.webp. The local file id is derived
// from the current logo path (so we reuse the exact normalized file).
const uploaded = [];
const failed = [];

for (const club of clubs) {
  const localId = String(club.logo).replace(/^\/clubs\//, '').replace(/\.webp$/, '');
  const localFile = join(ROOT, 'public', 'clubs', `${localId}.webp`);
  const remoteName = `${club.id}.webp`;
  if (!existsSync(localFile)) { failed.push(`${club.id}: missing local ${localId}.webp`); continue; }
  const body = readFileSync(localFile);
  const url = `${SUPA_URL}/storage/v1/object/${BUCKET}/${PREFIX}/${remoteName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SVC}`,
      apikey: SVC,
      'Content-Type': 'image/webp',
      'x-upsert': 'true', // overwrite if present (idempotent re-runs)
    },
    body,
  });
  if (res.ok) uploaded.push(club.id);
  else failed.push(`${club.id}: HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
  // rewrite the JSON logo URL to the CDN regardless (so a re-run fixes paths)
  club.logo = `${publicBase}/${remoteName}`;
}

writeFileSync(clubsPath, JSON.stringify(clubs, null, 2) + '\n');

console.log(`Uploaded ${uploaded.length}/${clubs.length} logos to ${BUCKET}/${PREFIX}/`);
console.log(`clubs.json logo URLs -> ${publicBase}/<id>.webp`);
if (failed.length) { console.log(`\nFAILED (${failed.length}):`); for (const f of failed) console.log('  ' + f); }

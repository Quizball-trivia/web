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
import { readFileSync, existsSync } from 'node:fs';
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

// Source dir of the final normalized webp files (one per club, named <file>).
// clubs.json now stores bare filenames (e.g. "arsenal.webp"); the URL is built
// at runtime from the env (see clubLogoUrl in src/lib/clubs.ts), so this script
// ONLY uploads files — it does not rewrite clubs.json.
const SRC_DIR = join(__dirname, '_logos_out');
const uploaded = [];
const failed = [];

// Only plain webp basenames are allowed — no slashes or parent refs — so a
// stray clubs.json value can't escape SRC_DIR or write outside the bucket prefix.
const SAFE_LOGO = /^[a-z0-9][a-z0-9-]*\.webp$/;

for (const club of clubs) {
  const file = String(club.logo); // bare filename
  if (!SAFE_LOGO.test(file)) { failed.push(`${club.id}: unsafe logo filename "${file}"`); continue; }
  const localFile = join(SRC_DIR, file);
  if (!existsSync(localFile)) { failed.push(`${club.id}: missing ${SRC_DIR}/${file}`); continue; }
  const body = readFileSync(localFile);
  const url = `${SUPA_URL}/storage/v1/object/${BUCKET}/${PREFIX}/${file}`;
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
  if (res.ok) uploaded.push(file);
  else failed.push(`${file}: HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
}

console.log(`Uploaded ${uploaded.length}/${clubs.length} logos to ${SUPA_URL} → ${BUCKET}/${PREFIX}/`);
console.log(`(public base: ${publicBase}/<file>)`);
if (failed.length) { console.log(`\nFAILED (${failed.length}):`); for (const f of failed) console.log('  ' + f); }

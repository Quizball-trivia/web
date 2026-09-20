#!/usr/bin/env node
/**
 * Upload reviewed real logos to Supabase Storage imgs/<prefix>/<id>.webp.
 * Mutable prefixes (competition-logos, league-logos) sit beside club-logos so
 * artwork can be replaced without bumping the immutable grid CDN release.
 *
 * Usage: SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
 *   node scripts/upload-grid-real-logos.mjs <dir> <prefix> [--dry-run]
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, prefix] = process.argv.slice(2);
const dryRun = process.argv.includes('--dry-run');
const SUPA_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dir || !/^[a-z][a-z-]+$/.test(prefix ?? '')) {
  console.error('usage: upload-grid-real-logos.mjs <dir> <prefix> [--dry-run]');
  process.exit(1);
}
if (!dryRun && (!SUPA_URL || !SVC)) {
  console.error('FATAL: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}
const files = readdirSync(dir).filter((file) => /^[a-z0-9][a-z0-9-]*\.webp$/.test(file)).sort();
let failed = 0;
for (const file of files) {
  const target = `${SUPA_URL}/storage/v1/object/imgs/${prefix}/${file}`;
  if (dryRun) { console.log(`would upload ${file} → imgs/${prefix}/${file}`); continue; }
  const res = await fetch(target, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${SVC}`,
      'content-type': 'image/webp',
      'cache-control': 'public, max-age=31536000',
      'x-upsert': 'true',
    },
    body: readFileSync(join(dir, file)),
  });
  if (!res.ok) { failed += 1; console.log(`✗ ${file}: ${res.status} ${(await res.text()).slice(0, 160)}`); continue; }
  console.log(`✔ ${file}`);
}
console.log(`${files.length - failed}/${files.length} uploaded to imgs/${prefix}${dryRun ? ' (dry run)' : ''}`);
process.exit(failed ? 1 : 0);

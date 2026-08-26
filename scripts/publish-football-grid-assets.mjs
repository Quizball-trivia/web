#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gridAssetDir = path.join(root, 'public/assets/football-grid');
const avatarAssetDir = path.join(root, 'public/assets/store');
const cardIcon = path.join(root, 'public/assets/football-grid-card-icon.svg');
const backgroundPattern = path.join(root, 'public/assets/bg-pattern.webp');
const manifestPath = path.join(root, 'src/data/football-grid/launch-assets/cdn-manifest.json');
const supabaseUrl = (
  process.env.SUPABASE_URL
  ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? 'https://nsdfiprfmhdqhbfxfwpv.supabase.co'
).replace(/\/+$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = 'imgs';
const release = process.env.FOOTBALL_GRID_CDN_RELEASE ?? 'v1';
const objectPrefix = `football-grid/${release}`;
const publicBase = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPrefix}`;
const verifyOnly = process.argv.includes('--verify-only');
const dryRun = process.argv.includes('--dry-run');
const UPLOAD_CONCURRENCY = 12;
const VERIFY_CONCURRENCY = 24;
const MAX_ATTEMPTS = 3;

if (!/^[a-z0-9][a-z0-9._-]*$/i.test(release)) {
  throw new Error('FOOTBALL_GRID_CDN_RELEASE must contain only letters, numbers, dot, underscore, or dash');
}
if (!verifyOnly && !dryRun && !serviceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to publish Football Grid assets');
}

const MIME_BY_EXTENSION = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

function encodeObjectPath(value) {
  return value.split('/').map(encodeURIComponent).join('/');
}

function publicUrl(objectPath) {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeObjectPath(objectPath)}`;
}

function storageUrl(objectPath) {
  return `${supabaseUrl}/storage/v1/object/${bucket}/${encodeObjectPath(objectPath)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(label, operation) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await sleep(250 * (2 ** (attempt - 1)));
    }
  }
  throw new Error(`${label}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are not allowed in the CDN source set: ${path.join(directory, entry.name)}`);
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path.join(directory, entry.name), relative));
    else if (entry.isFile()) files.push({ file: path.join(directory, entry.name), relative });
  }
  return files;
}

async function loadAssets() {
  const files = (await listFiles(gridAssetDir)).map((entry) => (
    entry.relative === 'card-icon.png'
      ? {
          ...entry,
          relative: 'ui/card-icon.png',
          localPath: '/assets/football-grid/card-icon.png',
        }
      : entry
  ));
  const avatarFiles = await listFiles(avatarAssetDir);
  files.push(...avatarFiles.map((entry) => ({
    ...entry,
    relative: `avatar/${entry.relative}`,
    localPath: `/assets/store/${entry.relative}`,
  })));
  files.push({ file: cardIcon, relative: 'ui/card-icon.svg', localPath: '/assets/football-grid-card-icon.svg' });
  files.push({ file: backgroundPattern, relative: 'ui/bg-pattern.webp', localPath: '/assets/bg-pattern.webp' });
  const assets = [];
  for (const entry of files) {
    const extension = path.extname(entry.relative).toLowerCase();
    const contentType = MIME_BY_EXTENSION.get(extension);
    if (!contentType) throw new Error(`Unsupported CDN asset type: ${entry.relative}`);
    const bytes = await readFile(entry.file);
    if (bytes.length === 0) throw new Error(`Empty CDN source asset: ${entry.relative}`);
    const objectPath = `${objectPrefix}/${entry.relative}`;
    assets.push({
      localPath: entry.localPath ?? `/assets/football-grid/${entry.relative}`,
      objectPath,
      publicUrl: publicUrl(objectPath),
      contentType,
      bytes,
      byteLength: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }
  return assets.sort((a, b) => a.objectPath.localeCompare(b.objectPath));
}

async function uploadAsset(asset) {
  const response = await fetch(storageUrl(asset.objectPath), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': asset.contentType,
      'Cache-Control': 'max-age=31536000, immutable',
      'x-upsert': 'false',
    },
    body: asset.bytes,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`upload returned ${response.status}: ${(await response.text()).slice(0, 240)}`);
  }
}

async function inspectExistingAsset(asset) {
  const response = await fetch(asset.publicUrl, {
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return false;
  if (!response.ok) {
    const body = await response.text();
    // Supabase's public object endpoint currently wraps a missing object in an
    // HTTP 400 response while preserving the 404/NoSuchKey code in the body.
    if (response.status === 400 && /"statusCode":"404"|"code":"NoSuchKey"/.test(body)) return false;
    throw new Error(`existing-object check returned ${response.status}: ${body.slice(0, 240)}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== asset.sha256) {
    throw new Error(`immutable release collision; bump FOOTBALL_GRID_CDN_RELEASE before publishing ${asset.objectPath}`);
  }
  return true;
}

async function verifyAsset(asset) {
  const response = await fetch(asset.publicUrl, {
    method: 'HEAD',
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const contentType = response.headers.get('content-type')?.split(';')[0] ?? '';
  if (!response.ok || !contentType.startsWith('image/')) {
    throw new Error(`verification returned ${response.status} (${contentType || 'no content type'})`);
  }
}

async function runConcurrent(items, concurrency, operation) {
  let cursor = 0;
  const failures = [];
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      try {
        await operation(item);
      } catch (error) {
        failures.push({ objectPath: item.objectPath, error: error instanceof Error ? error.message : String(error) });
      }
    }
  });
  await Promise.all(workers);
  return failures;
}

const assets = await loadAssets();
if (dryRun) {
  console.log(JSON.stringify({ mode: 'dry-run', release, publicBase, assets: assets.length }, null, 2));
  process.exit(0);
}

let uploadFailures = [];
let uploaded = 0;
let reused = 0;
if (!verifyOnly) {
  uploadFailures = await runConcurrent(assets, UPLOAD_CONCURRENCY, async (asset) => {
    const exists = await withRetry(`inspect ${asset.objectPath}`, () => inspectExistingAsset(asset));
    if (exists) {
      reused += 1;
      return;
    }
    await withRetry(`upload ${asset.objectPath}`, () => uploadAsset(asset));
    uploaded += 1;
  });
}
const verificationFailures = await runConcurrent(assets, VERIFY_CONCURRENCY, (asset) => (
  withRetry(`verify ${asset.objectPath}`, () => verifyAsset(asset))
));
const failures = [...uploadFailures, ...verificationFailures];

if (failures.length === 0) {
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify({
    schemaVersion: 1,
    release,
    bucket,
    objectPrefix,
    publicBase,
    publishedAt: new Date().toISOString(),
    assetCount: assets.length,
    totalBytes: assets.reduce((total, asset) => total + asset.byteLength, 0),
    assets: assets.map(({ bytes: _bytes, ...asset }) => asset),
  }, null, 2)}\n`);
}

console.log(JSON.stringify({
  mode: verifyOnly ? 'verify-only' : 'publish',
  release,
  publicBase,
  assetCount: assets.length,
  totalBytes: assets.reduce((total, asset) => total + asset.byteLength, 0),
  uploaded,
  reused,
  verified: assets.length - verificationFailures.length,
  failureCount: failures.length,
  failures: failures.slice(0, 25),
}, null, 2));
if (failures.length !== 0) process.exitCode = 1;

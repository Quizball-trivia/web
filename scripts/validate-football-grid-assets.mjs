#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'src/data/football-grid/launch-assets');
const firstPartyOrigin = 'https://nsdfiprfmhdqhbfxfwpv.supabase.co';
const expectedCdnBase = `${firstPartyOrigin}/storage/v1/object/public/imgs/football-grid/v1`;
const expected = {
  clubs: 276,
  countries: 271,
  managers: 60,
  leagues: 15,
  competitions: 24,
  wildcards: 12,
};
const failures = [];
const warnings = [];
const localAssets = new Map();
const remoteAssets = [];

async function readJson(file) {
  return JSON.parse(await readFile(path.join(dataDir, file), 'utf8'));
}

function addFailure(message) {
  failures.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function collectAsset(assetPath, checksum, owner) {
  if (!assetPath?.startsWith('/')) {
    addFailure(`${owner}: invalid local asset path`);
    return;
  }
  const existing = localAssets.get(assetPath);
  if (existing?.checksum && checksum && existing.checksum !== checksum) {
    addFailure(`${owner}: conflicting checksum for ${assetPath}`);
  }
  localAssets.set(assetPath, { checksum: checksum ?? existing?.checksum ?? null, owner });
}

function validateRows(family, rows) {
  if (rows.length !== expected[family]) addFailure(`${family}: expected ${expected[family]}, received ${rows.length}`);
  const ids = new Set();
  for (const row of rows) {
    const owner = `${family}:${row.id ?? 'missing-id'}`;
    if (!row.id || ids.has(row.id)) addFailure(`${owner}: missing or duplicate id`);
    ids.add(row.id);
    if (!row.labelEn || !row.labelKa) addFailure(`${owner}: missing EN/KA label`);
    if (!row.runtimeResolved) addFailure(`${owner}: runtime is unresolved`);

    if (family === 'countries') {
      collectAsset(row.assetPath, null, owner);
      if (!row.fallback) addFailure(`${owner}: missing fallback`);
      continue;
    }

    if (!row.primary) addFailure(`${owner}: missing primary visual`);
    if (!row.fallback?.assetPath) addFailure(`${owner}: missing fallback visual`);
    else collectAsset(row.fallback.assetPath, null, owner);

    const primaryPath = row.primary?.assetPath;
    const primaryRightsStatus = row.primary?.source?.rightsStatus ?? row.primary?.rightsStatus;
    const primaryIsLaunchCleared = primaryRightsStatus === 'owned' || primaryRightsStatus === 'cleared-for-launch';
    if (primaryPath && primaryIsLaunchCleared) collectAsset(primaryPath, row.primary.sha256, owner);
    else if (row.primary?.publicUrl && primaryIsLaunchCleared) remoteAssets.push({
      url: row.primary.publicUrl,
      owner,
      hasLocalFallback: Boolean(row.fallback?.assetPath),
    });
    else if (!primaryPath && !row.primary?.publicUrl) addFailure(`${owner}: primary visual has no local path or public URL`);
    if (!row.primary?.provider && !row.primary?.source?.provider) addFailure(`${owner}: missing primary provider metadata`);
    if (primaryPath && primaryPath === row.fallback?.assetPath) {
      addFailure(`${owner}: primary and fallback must be distinct assets`);
    }
  }
}

function sniff(bytes) {
  const text = bytes.subarray(0, 256).toString('utf8').trimStart();
  if (text.includes('<svg')) return 'svg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg';
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

async function validateLocalAssets() {
  for (const [assetPath, details] of localAssets) {
    const file = path.join(root, 'public', assetPath.replace(/^\/+/, ''));
    try {
      const info = await stat(file);
      if (!info.isFile() || info.size === 0) {
        addFailure(`${details.owner}: empty or non-file asset ${assetPath}`);
        continue;
      }
      const bytes = await readFile(file);
      if (!sniff(bytes)) addFailure(`${details.owner}: unsupported or corrupt asset ${assetPath}`);
      if (details.checksum) {
        const actual = createHash('sha256').update(bytes).digest('hex');
        if (actual !== details.checksum) addFailure(`${details.owner}: checksum mismatch ${assetPath}`);
      }
    } catch (error) {
      addFailure(`${details.owner}: cannot read ${assetPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

async function validateRemoteAssets() {
  let cursor = 0;
  const workers = Array.from({ length: 20 }, async () => {
    while (cursor < remoteAssets.length) {
      const current = remoteAssets[cursor++];
      try {
        const parsed = new URL(current.url);
        if (parsed.origin !== firstPartyOrigin || !parsed.pathname.startsWith('/storage/v1/object/public/imgs/')) {
          addFailure(`${current.owner}: runtime remote asset is not on the first-party CDN`);
          continue;
        }
        const response = await fetch(current.url, {
          method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(15_000),
        });
        const contentType = response.headers.get('content-type') ?? '';
        if (!response.ok || !contentType.startsWith('image/')) {
          const message = `${current.owner}: remote primary failed (${response.status}, ${contentType || 'no content type'})`;
          if (current.hasLocalFallback) addWarning(message);
          else addFailure(message);
        }
      } catch (error) {
        const message = `${current.owner}: remote primary request failed: ${error instanceof Error ? error.message : String(error)}`;
        if (current.hasLocalFallback) addWarning(message);
        else addFailure(message);
      }
    }
  });
  await Promise.all(workers);
}

async function listPackagedAssetPaths(directory, prefix = '/assets/football-grid') {
  const entries = await readdir(directory, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    const localPath = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) output.push(...await listPackagedAssetPaths(path.join(directory, entry.name), localPath));
    else if (entry.isFile()) output.push(localPath);
  }
  return output;
}

async function validateCdnManifest(manifest) {
  if (manifest.schemaVersion !== 1) addFailure('cdn-manifest: unsupported schema version');
  if (manifest.release !== 'v1') addFailure('cdn-manifest: unexpected release');
  if (manifest.bucket !== 'imgs') addFailure('cdn-manifest: unexpected bucket');
  if (manifest.publicBase !== expectedCdnBase) addFailure('cdn-manifest: unexpected public base');
  if (manifest.assetCount !== manifest.assets?.length) addFailure('cdn-manifest: asset count does not match entries');

  const expectedPaths = new Set([
    ...await listPackagedAssetPaths(path.join(root, 'public/assets/football-grid')),
    ...await listPackagedAssetPaths(path.join(root, 'public/assets/store'), '/assets/store'),
    '/assets/football-grid-card-icon.svg',
  ]);
  const entriesByPath = new Map();
  let totalBytes = 0;
  for (const entry of manifest.assets ?? []) {
    if (!entry.localPath || entriesByPath.has(entry.localPath)) {
      addFailure(`cdn-manifest: missing or duplicate local path ${entry.localPath ?? '<missing>'}`);
      continue;
    }
    entriesByPath.set(entry.localPath, entry);
    totalBytes += entry.byteLength ?? 0;
    if (!expectedPaths.has(entry.localPath)) addFailure(`cdn-manifest: unknown local asset ${entry.localPath}`);
    if (!entry.publicUrl?.startsWith(`${expectedCdnBase}/`)) addFailure(`cdn-manifest: non-CDN URL for ${entry.localPath}`);
    if (!entry.objectPath?.startsWith('football-grid/v1/')) addFailure(`cdn-manifest: invalid object path for ${entry.localPath}`);
    if (!entry.contentType?.startsWith('image/')) addFailure(`cdn-manifest: invalid content type for ${entry.localPath}`);

    const localFile = path.join(root, 'public', entry.localPath.replace(/^\/+/, ''));
    try {
      const bytes = await readFile(localFile);
      if (bytes.length !== entry.byteLength) addFailure(`cdn-manifest: byte length mismatch ${entry.localPath}`);
      if (!sniff(bytes)) addFailure(`cdn-manifest: corrupt local source ${entry.localPath}`);
      const digest = createHash('sha256').update(bytes).digest('hex');
      if (digest !== entry.sha256) addFailure(`cdn-manifest: checksum mismatch ${entry.localPath}`);
    } catch (error) {
      addFailure(`cdn-manifest: cannot read ${entry.localPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  for (const assetPath of expectedPaths) {
    if (!entriesByPath.has(assetPath)) addFailure(`cdn-manifest: unpublished packaged asset ${assetPath}`);
  }
  for (const assetPath of localAssets.keys()) {
    if (!entriesByPath.has(assetPath)) addFailure(`cdn-manifest: runtime asset missing from CDN ${assetPath}`);
  }
  if (totalBytes !== manifest.totalBytes) addFailure('cdn-manifest: total byte count mismatch');
  return { expectedPaths, entriesByPath };
}

const families = {};
for (const family of Object.keys(expected)) {
  const rows = await readJson(`${family}.json`);
  families[family] = rows;
  validateRows(family, rows);
}

const coverage = await readJson('coverage.json');
if (coverage.runtimeUnresolved !== 0) addFailure(`coverage: ${coverage.runtimeUnresolved} runtime unresolved`);
for (const [family, count] of Object.entries(expected)) {
  if (coverage.families?.[family]?.total !== count) addFailure(`coverage:${family}: incorrect total`);
  if (coverage.families?.[family]?.runtimeUnresolved !== 0) addFailure(`coverage:${family}: unresolved rows`);
  if (coverage.families?.[family]?.rightsCleared !== count) addFailure(`coverage:${family}: uncleared launch visuals`);
  if (!Number.isInteger(coverage.families?.[family]?.primaryRightsCleared)) {
    addFailure(`coverage:${family}: missing primary-rights counter`);
  }
}

const players = await readJson('players-summary.json');
if (players.runtimeUnresolved !== 0) addFailure(`players: ${players.runtimeUnresolved} runtime unresolved`);
if (players.externalPortraits !== 0) addFailure(`players: ${players.externalPortraits} portraits remain outside the first-party CDN`);
if (players.domains.some((domain) => domain.domain !== new URL(firstPartyOrigin).hostname)) {
  addFailure('players: non-first-party portrait domain remains');
}
if (players.usableRows !== players.primaryPortraits + players.deterministicFallbacks) addFailure('players: usable coverage does not add up');
if (players.providerProbes.length === 0 || players.providerProbes.some((probe) => !probe.ok)) addFailure('players: provider probe failed');

const cdnManifest = await readJson('cdn-manifest.json');
const cdn = await validateCdnManifest(cdnManifest);
await Promise.all([validateLocalAssets(), validateRemoteAssets()]);

const result = {
  validatedAt: new Date().toISOString(),
  families: Object.fromEntries(Object.entries(families).map(([family, rows]) => [family, rows.length])),
  players: { usable: players.usableRows, primaryPortraits: players.primaryPortraits, fallbacks: players.deterministicFallbacks },
  localAssets: localAssets.size,
  remoteAssets: remoteAssets.length,
  cdnAssets: cdn.entriesByPath.size,
  failureCount: failures.length,
  remotePrimaryWarnings: warnings.length,
  warnings,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length !== 0) process.exitCode = 1;

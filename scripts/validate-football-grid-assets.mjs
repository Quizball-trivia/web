#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'src/data/football-grid/launch-assets');
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
    if (primaryPath) collectAsset(primaryPath, row.primary.sha256, owner);
    else if (row.primary?.publicUrl) remoteAssets.push({
      url: row.primary.publicUrl,
      owner,
      hasLocalFallback: Boolean(row.fallback?.assetPath),
    });
    else addFailure(`${owner}: primary visual has no local path or public URL`);
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
if (players.usableRows !== players.primaryPortraits + players.deterministicFallbacks) addFailure('players: usable coverage does not add up');
if (players.providerProbes.length === 0 || players.providerProbes.some((probe) => !probe.ok)) addFailure('players: provider probe failed');

await Promise.all([validateLocalAssets(), validateRemoteAssets()]);

const result = {
  validatedAt: new Date().toISOString(),
  families: Object.fromEntries(Object.entries(families).map(([family, rows]) => [family, rows.length])),
  players: { usable: players.usableRows, primaryPortraits: players.primaryPortraits, fallbacks: players.deterministicFallbacks },
  localAssets: localAssets.size,
  remoteAssets: remoteAssets.length,
  failureCount: failures.length,
  remotePrimaryWarnings: warnings.length,
  warnings,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length !== 0) process.exitCode = 1;

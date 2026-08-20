#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'src/data/football-grid/launch-assets/players-summary.json');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const pageSize = 1000;
const players = [];
for (let from = 0; ; from += pageSize) {
  const { data, error } = await supabase
    .from('football_players')
    .select('id,name,display_name,image_url,data_quality_status,active_status')
    .order('id', { ascending: true })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  players.push(...data);
  if (data.length < pageSize) break;
}

const usable = players.filter((player) => player.data_quality_status === 'usable');
const excluded = players.filter((player) => player.data_quality_status !== 'usable');
const withImage = usable.filter((player) => typeof player.image_url === 'string' && player.image_url.trim() !== '');
const withImageIds = new Set(withImage.map((player) => player.id));
const withFallback = usable.filter((player) => !withImageIds.has(player.id));
const missingEnglishLabel = usable.filter((player) => !(player.display_name?.en || player.name));
const missingGeorgianLabel = usable.filter((player) => !(player.display_name?.ka || player.name));
const malformedImageUrls = withImage.filter((player) => {
  try {
    return new URL(player.image_url).protocol !== 'https:';
  } catch {
    return true;
  }
});
const malformedImageUrlIds = new Set(malformedImageUrls.map((player) => player.id));
const parsableImages = withImage.filter((player) => !malformedImageUrlIds.has(player.id));
const domains = Object.entries(parsableImages.reduce((result, player) => {
  const domain = new URL(player.image_url).hostname;
  result[domain] = (result[domain] ?? 0) + 1;
  return result;
}, {})).sort((a, b) => b[1] - a[1]).map(([domain, count]) => ({ domain, count }));

const probeRows = [];
for (const domain of domains) {
  const candidates = parsableImages.filter((player) => new URL(player.image_url).hostname === domain.domain).slice(0, 3);
  for (const player of candidates) {
    try {
      const response = await fetch(player.image_url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(15_000),
      });
      probeRows.push({ playerId: player.id, domain: domain.domain, status: response.status, ok: response.ok });
    } catch (error) {
      probeRows.push({ playerId: player.id, domain: domain.domain, status: null, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
}

const runtimeUnresolved = missingEnglishLabel.length + missingGeorgianLabel.length + malformedImageUrls.length;
const summary = {
  auditedAt: new Date().toISOString(),
  source: 'public.football_players',
  totalRows: players.length,
  usableRows: usable.length,
  excludedRows: excluded.length,
  excludedByStatus: Object.entries(excluded.reduce((result, player) => {
    result[player.data_quality_status ?? 'missing'] = (result[player.data_quality_status ?? 'missing'] ?? 0) + 1;
    return result;
  }, {})).map(([status, count]) => ({ status, count })),
  primaryPortraits: withImage.length,
  deterministicFallbacks: withFallback.length,
  fallbackPlayerIds: withFallback.map((player) => player.id),
  labelPolicy: {
    en: 'display_name.en, then canonical name',
    ka: 'display_name.ka, then official canonical name',
  },
  imagePolicy: {
    primary: 'validated HTTPS provider URL',
    fallback: 'Quizball generated initials avatar',
  },
  domains,
  providerProbes: probeRows,
  malformedImageUrls: malformedImageUrls.map((player) => player.id),
  runtimeUnresolved,
};

await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
if (runtimeUnresolved !== 0 || probeRows.length < domains.length || probeRows.some((probe) => !probe.ok)) process.exitCode = 1;

#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const dataDir = path.join(root, 'src/data/football-grid/launch-assets');
const publicDir = path.join(root, 'public/assets/football-grid');
const flagSourceDir = path.join(root, 'node_modules/flag-icons/flags/4x3');
const shouldFetch = process.argv.includes('--fetch');
const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const userAgent = 'QuizballFootballGridAssets/1.0 (nika@quizball.io)';

const corruptClubIds = new Set([
  'wl-anzhi-makhachkala', 'wl-barnet', 'wl-beveren', 'wl-bournemouth',
  'wl-coventry-city', 'wl-crystal-palace', 'wl-cska-moscow', 'wl-d-c-united',
  'wl-den-bosch', 'wl-dijon', 'wl-envigado', 'wl-espanyol',
  'wl-heerenveen', 'wl-lille', 'wl-malaga', 'wl-mallorca',
  'wl-metalurh-donetsk', 'wl-new-york-red-bulls', 'wl-nice', 'wl-nimes',
  'wl-paok', 'wl-perth-glory', 'wl-qingdao-huanghai', 'wl-sagan-tosu',
  'wl-sporting-gijon', 'wl-stoke-city', 'wl-willem-ii', 'wl-zaragoza',
]);

const customFlagLabels = {
  arab: ['Arab League', 'არაბული ლიგა', 'organization'],
  asean: ['ASEAN', 'ASEAN', 'organization'],
  cefta: ['CEFTA', 'CEFTA', 'organization'],
  eac: ['East African Community', 'აღმოსავლეთ აფრიკის გაერთიანება', 'organization'],
  'es-ct': ['Catalonia', 'კატალონია', 'subdivision'],
  'es-ga': ['Galicia', 'გალისია', 'subdivision'],
  'es-pv': ['Basque Country', 'ბასკეთი', 'subdivision'],
  'gb-eng': ['England', 'ინგლისი', 'football-nation'],
  'gb-nir': ['Northern Ireland', 'ჩრდილოეთ ირლანდია', 'football-nation'],
  'gb-sct': ['Scotland', 'შოტლანდია', 'football-nation'],
  'gb-wls': ['Wales', 'უელსი', 'football-nation'],
  pc: ['Pacific Community', 'წყნარი ოკეანის გაერთიანება', 'organization'],
  'sh-ac': ['Ascension Island', 'ასენსიონის კუნძული', 'territory'],
  'sh-hl': ['Saint Helena', 'წმინდა ელენეს კუნძული', 'territory'],
  'sh-ta': ['Tristan da Cunha', 'ტრისტან-და-კუნია', 'territory'],
  xx: ['Unknown / neutral', 'უცნობი / ნეიტრალური', 'fallback'],
};

function html(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function initials(value, max = 3) {
  const words = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, max).toUpperCase();
  return words.slice(0, max).map((word) => word[0]).join('').toUpperCase();
}

function hashColor(id) {
  const digest = createHash('sha256').update(id).digest();
  const hue = ((digest[0] << 8) + digest[1]) % 360;
  return `hsl(${hue} 52% 32%)`;
}

function badgeSvg({ id, label, short, color, icon = 'shield' }) {
  const safeLabel = html(label);
  const safeShort = html(short || initials(label));
  const safeIcon = html(icon);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" role="img" aria-labelledby="title desc">
  <title id="title">${safeLabel}</title><desc id="desc">Quizball ${safeIcon} badge fallback</desc>
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#111827"/></linearGradient></defs>
  <path d="M160 18 279 62v87c0 76-45 128-119 153C86 277 41 225 41 149V62Z" fill="url(#g)" stroke="#fff" stroke-opacity=".74" stroke-width="8"/>
  <circle cx="160" cy="142" r="70" fill="#fff" fill-opacity=".12" stroke="#fff" stroke-opacity=".3" stroke-width="4"/>
  <text x="160" y="162" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="800" fill="#fff">${safeShort}</text>
  <text x="160" y="249" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#fff" fill-opacity=".88">QUIZBALL</text>
</svg>`;
}

async function readJson(file) {
  return JSON.parse(await readFile(path.join(dataDir, file), 'utf8'));
}

async function writeJson(file, value) {
  await writeFile(path.join(dataDir, file), `${JSON.stringify(value, null, 2)}\n`);
}

async function writeBadge(family, id, options) {
  const dir = path.join(publicDir, family);
  await mkdir(dir, { recursive: true });
  const filename = `${id}.svg`;
  await writeFile(path.join(dir, filename), badgeSvg({ id, ...options }));
  return `/assets/football-grid/${family}/${filename}`;
}

async function buildCountries() {
  const names = (await import('node:fs/promises')).readdir(flagSourceDir);
  const files = (await names).filter((file) => file.endsWith('.svg')).sort();
  const en = new Intl.DisplayNames(['en'], { type: 'region' });
  const ka = new Intl.DisplayNames(['ka'], { type: 'region' });
  const outputDir = path.join(publicDir, 'flags');
  await mkdir(outputDir, { recursive: true });

  const rows = [];
  for (const file of files) {
    const code = file.slice(0, -4);
    const custom = customFlagLabels[code];
    let labelEn;
    let labelKa;
    let kind = 'region';
    if (custom) {
      [labelEn, labelKa, kind] = custom;
    } else {
      labelEn = en.of(code.toUpperCase());
      labelKa = ka.of(code.toUpperCase());
    }
    await copyFile(path.join(flagSourceDir, file), path.join(outputDir, file));
    rows.push({
      id: code,
      labelEn,
      labelKa,
      kind,
      assetPath: `/assets/football-grid/flags/${file}`,
      fallback: code.toUpperCase(),
      source: {
        provider: 'flag-icons',
        packageVersion: '7.5.0',
        license: 'MIT',
        url: 'https://github.com/lipis/flag-icons',
      },
      runtimeResolved: Boolean(labelEn && labelKa),
    });
  }
  await writeJson('countries.json', rows);
  return rows;
}

async function fetchWikipediaClubCrest(replacement, club) {
  const listParams = new URLSearchParams({
    action: 'query', prop: 'images', imlimit: '100', redirects: '1',
    titles: replacement.wikipediaTitle, format: 'json', origin: '*',
  });
  const listResponse = await fetch(`https://en.wikipedia.org/w/api.php?${listParams}`, {
    headers: { 'user-agent': userAgent },
  });
  if (!listResponse.ok) throw new Error(`Wikipedia page request ${listResponse.status}`);
  const listData = await listResponse.json();
  const page = Object.values(listData?.query?.pages ?? {})[0];
  const files = (page?.images ?? []).map((row) => row.title);
  const excluded = /commons-logo|wikidata|edit-clear|question-book|flag|map|kit|stadium|location|icon|ambox|crystal-clear|disambig/i;
  const imageFiles = files.filter((file) => /\.(svg|png|jpe?g)$/i.test(file) && !excluded.test(file));
  const crestFile = replacement.wikipediaFile
    ? `File:${replacement.wikipediaFile}`
    : imageFiles.find((file) => /logo|badge|crest|emblem|escudo|armoiries/i.test(file))
      ?? imageFiles[0];
  if (!crestFile) throw new Error(`no crest candidate on ${replacement.wikipediaTitle}`);

  const infoParams = new URLSearchParams({
    action: 'query', prop: 'imageinfo', iiprop: 'url|mime|size|sha1|extmetadata',
    iiurlwidth: '480', titles: crestFile, format: 'json', origin: '*',
  });
  const infoResponse = await fetch(`https://en.wikipedia.org/w/api.php?${infoParams}`, {
    headers: { 'user-agent': userAgent },
  });
  if (!infoResponse.ok) throw new Error(`Wikipedia image request ${infoResponse.status}`);
  const infoData = await infoResponse.json();
  const info = Object.values(infoData?.query?.pages ?? {})[0]?.imageinfo?.[0];
  if (!info?.thumburl && !info?.url) throw new Error(`no image URL for ${crestFile}`);
  const downloadUrl = info.thumburl ?? info.url;
  const imageResponse = await fetch(downloadUrl, { headers: { 'user-agent': userAgent } });
  if (!imageResponse.ok) throw new Error(`crest download ${imageResponse.status}`);
  const mime = imageResponse.headers.get('content-type')?.split(';')[0] || info.mime || 'image/png';
  const ext = mime === 'image/svg+xml' ? 'svg' : mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
  const bytes = Buffer.from(await imageResponse.arrayBuffer());
  const filename = `${club.id}.${ext}`;
  await writeFile(path.join(publicDir, 'clubs', filename), bytes);
  const metadata = info.extmetadata ?? {};
  return {
    provider: 'Wikimedia / Wikipedia',
    assetPath: `/assets/football-grid/clubs/${filename}`,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    mime,
    width: info.thumbwidth ?? info.width ?? null,
    height: info.thumbheight ?? info.height ?? null,
    sourcePage: `https://en.wikipedia.org/wiki/${encodeURIComponent(replacement.wikipediaTitle.replaceAll(' ', '_'))}`,
    filePage: info.descriptionurl ?? null,
    sourceFile: crestFile,
    license: metadata.LicenseShortName?.value ?? null,
    licenseUrl: metadata.LicenseUrl?.value ?? null,
    rightsStatus: 'metadata-captured-review-required',
  };
}

async function fetchDirectClubCrest(replacement, club) {
  const response = await fetch(replacement.directUrl, { headers: { 'user-agent': userAgent } });
  if (!response.ok) throw new Error(`direct crest download ${response.status}`);
  const mime = response.headers.get('content-type')?.split(';')[0] || 'image/svg+xml';
  if (!mime.startsWith('image/')) throw new Error(`unexpected content type ${mime}`);
  const ext = mime === 'image/svg+xml' ? 'svg' : mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
  const bytes = Buffer.from(await response.arrayBuffer());
  const filename = `${club.id}.${ext}`;
  await writeFile(path.join(publicDir, 'clubs', filename), bytes);
  return {
    provider: replacement.provider,
    assetPath: `/assets/football-grid/clubs/${filename}`,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    mime,
    sourcePage: replacement.sourcePage,
    sourceFile: replacement.directUrl,
    rightsStatus: 'official-provider-review-required',
  };
}

async function loadCachedClubCrest(replacement) {
  if (!replacement.cachedFile) return null;
  try {
    const bytes = await readFile(path.join(publicDir, 'clubs', replacement.cachedFile));
    const ext = path.extname(replacement.cachedFile).toLowerCase();
    const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
    return {
      provider: 'Wikimedia / Wikipedia',
      assetPath: `/assets/football-grid/clubs/${replacement.cachedFile}`,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      mime,
      sourcePage: `https://en.wikipedia.org/wiki/${encodeURIComponent(replacement.wikipediaTitle.replaceAll(' ', '_'))}`,
      sourceFile: replacement.wikipediaFile ? `File:${replacement.wikipediaFile}` : null,
      rightsStatus: 'metadata-captured-review-required',
      cacheStatus: 'reused-after-provider-fetch-failure',
    };
  } catch {
    return null;
  }
}

async function buildClubs() {
  const clubs = JSON.parse(await readFile(path.join(root, 'src/data/clubs.json'), 'utf8'));
  const replacements = await readJson('club-replacements.seed.json');
  const replacementById = new Map(replacements.map((replacement) => [replacement.id, replacement]));
  const clubById = new Map(clubs.map((club) => [club.id, club]));
  const rows = [];
  for (const club of clubs) {
    const fallbackPath = await writeBadge('clubs', club.id, {
      label: club.label,
      short: initials(club.label),
      color: club.primaryColor || hashColor(club.id),
      icon: 'club crest',
    });
    const sourcePath = `club-logos/${club.logo}`;
    let primary = {
      provider: 'Quizball Supabase Storage',
      objectPath: sourcePath,
      publicUrl: supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/imgs/${sourcePath}` : null,
      provenance: club.id.startsWith('wl-') ? 'wikipedia-import' : 'quizball-club-registry',
      rightsStatus: 'trademark-provider-review',
    };
    let primaryError = null;
    if (corruptClubIds.has(club.id)) {
      const replacement = replacementById.get(club.id);
      if (replacement?.aliasAssetPath) {
        const bytes = await readFile(path.join(root, 'public', replacement.aliasAssetPath.replace(/^\/+/, '')));
        primary = {
          provider: 'Quizball static assets',
          assetPath: replacement.aliasAssetPath,
          sha256: createHash('sha256').update(bytes).digest('hex'),
          provenance: `verified-local-alias:${replacement.aliasAssetPath}`,
          rightsStatus: 'trademark-provider-review',
        };
      } else if (replacement?.aliasClubId || replacement?.aliasLogo) {
        const alias = replacement.aliasClubId ? clubById.get(replacement.aliasClubId) : null;
        const aliasLogo = replacement.aliasLogo ?? alias?.logo;
        if (aliasLogo) {
          const aliasPath = `club-logos/${aliasLogo}`;
          primary = {
            provider: 'Quizball Supabase Storage',
            objectPath: aliasPath,
            publicUrl: supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/imgs/${aliasPath}` : null,
            provenance: `verified-alias:${replacement.aliasClubId ?? replacement.aliasLogo}`,
            rightsStatus: 'trademark-provider-review',
          };
        } else {
          primary = null;
          primaryError = `missing alias ${replacement.aliasClubId ?? replacement.aliasLogo}`;
        }
      } else if (replacement?.directUrl && shouldFetch) {
        try {
          primary = await fetchDirectClubCrest(replacement, club);
        } catch (error) {
          primary = null;
          primaryError = error instanceof Error ? error.message : String(error);
        }
      } else if (replacement?.wikipediaTitle && shouldFetch) {
        try {
          primary = await fetchWikipediaClubCrest(replacement, club);
        } catch (error) {
          primary = await loadCachedClubCrest(replacement);
          primaryError = primary ? null : (error instanceof Error ? error.message : String(error));
        }
      } else {
        primary = null;
        primaryError = 'replacement source not configured or fetch disabled';
      }
    }
    rows.push({
      id: club.id,
      labelEn: club.label,
      labelKa: club.label,
      labelKaPolicy: 'official-name',
      countryEn: club.country || null,
      countryKa: club.countryKa || null,
      primary,
      fallback: { type: 'quizball-monogram', assetPath: fallbackPath },
      primaryDisabledReason: primary ? null : (corruptClubIds.has(club.id) ? 'known-corrupt-placeholder' : null),
      primaryError,
      runtimeResolved: true,
    });
  }
  await writeJson('clubs.json', rows);
  return rows;
}

async function fetchWikipediaPortrait(manager) {
  let fileTitle = manager.wikimediaFile ? `File:${manager.wikimediaFile}` : null;
  let apiBase = manager.wikimediaFile
    ? 'https://commons.wikimedia.org/w/api.php'
    : 'https://en.wikipedia.org/w/api.php';
  if (!fileTitle) {
    const params = new URLSearchParams({
      action: 'query', prop: 'pageimages', piprop: 'name|thumbnail', pithumbsize: '640',
      redirects: '1', titles: manager.wikipediaTitle, format: 'json', origin: '*',
    });
    const pageResponse = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      headers: { 'user-agent': userAgent },
    });
    if (!pageResponse.ok) throw new Error(`Wikipedia page request ${pageResponse.status}`);
    const pageData = await pageResponse.json();
    const page = Object.values(pageData?.query?.pages ?? {})[0];
    if (!page?.pageimage) throw new Error('Wikipedia page has no page image');
    fileTitle = `File:${page.pageimage}`;
  }

  const infoParams = new URLSearchParams({
    action: 'query', prop: 'imageinfo',
    iiprop: 'url|mime|size|sha1|extmetadata', iiurlwidth: '640',
    titles: fileTitle, format: 'json', origin: '*',
  });
  const infoResponse = await fetch(`${apiBase}?${infoParams}`, {
    headers: { 'user-agent': userAgent },
  });
  if (!infoResponse.ok) throw new Error(`Wikipedia image request ${infoResponse.status}`);
  const infoData = await infoResponse.json();
  const info = Object.values(infoData?.query?.pages ?? {})[0]?.imageinfo?.[0];
  if (!info?.thumburl && !info?.url) throw new Error('Wikipedia image has no URL');
  const downloadUrl = info.thumburl ?? info.url;
  const imageResponse = await fetch(downloadUrl, { headers: { 'user-agent': userAgent } });
  if (!imageResponse.ok) throw new Error(`Portrait download ${imageResponse.status}`);
  const mime = imageResponse.headers.get('content-type')?.split(';')[0] || info.mime || 'image/jpeg';
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const bytes = Buffer.from(await imageResponse.arrayBuffer());
  const file = `${manager.id}.${ext}`;
  await writeFile(path.join(publicDir, 'managers', file), bytes);
  const metadata = info.extmetadata ?? {};
  return {
    assetPath: `/assets/football-grid/managers/${file}`,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    mime,
    width: info.thumbwidth ?? info.width ?? null,
    height: info.thumbheight ?? info.height ?? null,
    source: {
      provider: 'Wikimedia / Wikipedia',
      pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(manager.wikipediaTitle.replaceAll(' ', '_'))}`,
      fileUrl: info.descriptionurl ?? null,
      artist: metadata.Artist?.value ?? null,
      credit: metadata.Credit?.value ?? null,
      license: metadata.LicenseShortName?.value ?? null,
      licenseUrl: metadata.LicenseUrl?.value ?? null,
      usageTerms: metadata.UsageTerms?.value ?? null,
      rightsStatus: 'metadata-captured-review-required',
    },
  };
}

async function buildManagers() {
  const seeds = await readJson('managers.seed.json');
  const rows = [];
  await mkdir(path.join(publicDir, 'managers'), { recursive: true });
  for (const manager of seeds) {
    const fallbackPath = await writeBadge('managers', `${manager.id}-fallback`, {
      label: manager.labelEn,
      short: initials(manager.labelEn, 2),
      color: hashColor(manager.id),
      icon: 'manager portrait',
    });
    let primary = null;
    let primaryError = null;
    if (shouldFetch) {
      try {
        primary = await fetchWikipediaPortrait(manager);
      } catch (error) {
        primaryError = error instanceof Error ? error.message : String(error);
      }
    }
    rows.push({
      ...manager,
      primary,
      fallback: { type: 'quizball-manager-badge', assetPath: fallbackPath },
      primaryError,
      runtimeResolved: true,
    });
  }
  await writeJson('managers.json', rows);
  return rows;
}

async function fetchProviderAsset(url, outputFile) {
  const response = await fetch(url, { headers: { 'user-agent': userAgent } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const mime = response.headers.get('content-type')?.split(';')[0] ?? '';
  if (!mime.startsWith('image/')) throw new Error(`unexpected content type ${mime || 'missing'}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(outputFile, bytes);
  return { bytes, mime };
}

async function buildLeagues() {
  const seeds = await readJson('leagues.seed.json');
  const rows = [];
  await mkdir(path.join(publicDir, 'leagues'), { recursive: true });
  for (const league of seeds) {
    const fallbackPath = await writeBadge('leagues', `${league.id}-fallback`, {
      label: league.labelEn, short: league.short, color: league.color, icon: 'league',
    });
    let primary = null;
    let primaryError = null;
    if (shouldFetch) {
      try {
        const file = `${league.id}.png`;
        const { bytes, mime } = await fetchProviderAsset(league.providerUrl, path.join(publicDir, 'leagues', file));
        primary = {
          assetPath: `/assets/football-grid/leagues/${file}`,
          sha256: createHash('sha256').update(bytes).digest('hex'),
          mime,
          source: {
            provider: 'API-Sports',
            sourceUrl: league.providerUrl,
            rightsStatus: 'provider-review-required',
          },
        };
      } catch (error) {
        primaryError = error instanceof Error ? error.message : String(error);
      }
    }
    rows.push({ ...league, primary, fallback: { type: 'quizball-league-badge', assetPath: fallbackPath }, primaryError, runtimeResolved: true });
  }
  await writeJson('leagues.json', rows);
  return rows;
}

async function buildOwnedBadges(seedFile, outputFile, family, fallbackType) {
  const seeds = await readJson(seedFile);
  const rows = [];
  for (const item of seeds) {
    const assetPath = await writeBadge(family, item.id, {
      label: item.labelEn, short: item.short || initials(item.labelEn), color: item.color, icon: item.icon,
    });
    rows.push({
      ...item,
      primary: {
        type: fallbackType,
        assetPath,
        source: { provider: 'Quizball', license: 'proprietary', rightsStatus: 'owned' },
      },
      fallback: { type: fallbackType, assetPath },
      runtimeResolved: true,
    });
  }
  await writeJson(outputFile, rows);
  return rows;
}

function unresolved(rows) {
  return rows.filter((row) => !row.runtimeResolved || !row.id || !row.labelEn || !row.labelKa || !row.fallback).length;
}

async function main() {
  await mkdir(dataDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });
  const [clubs, countries, managers, leagues, competitions, wildcards] = await Promise.all([
    buildClubs(),
    buildCountries(),
    buildManagers(),
    buildLeagues(),
    buildOwnedBadges('competitions.seed.json', 'competitions.json', 'competitions', 'quizball-competition-badge'),
    buildOwnedBadges('wildcards.seed.json', 'wildcards.json', 'wildcards', 'quizball-wildcard-badge'),
  ]);

  const coverage = {
    generatedAt: new Date().toISOString(),
    fetchMode: shouldFetch ? 'provider-assets-fetched' : 'fallbacks-only',
    families: {
      clubs: { total: clubs.length, primaryReady: clubs.filter((row) => row.primary).length, fallbackReady: clubs.filter((row) => row.fallback).length, runtimeUnresolved: unresolved(clubs) },
      countries: { total: countries.length, primaryReady: countries.filter((row) => row.assetPath).length, fallbackReady: countries.filter((row) => row.fallback).length, runtimeUnresolved: countries.filter((row) => !row.runtimeResolved).length },
      managers: { total: managers.length, primaryReady: managers.filter((row) => row.primary).length, fallbackReady: managers.filter((row) => row.fallback).length, runtimeUnresolved: unresolved(managers) },
      leagues: { total: leagues.length, primaryReady: leagues.filter((row) => row.primary).length, fallbackReady: leagues.filter((row) => row.fallback).length, runtimeUnresolved: unresolved(leagues) },
      competitions: { total: competitions.length, primaryReady: competitions.filter((row) => row.primary).length, fallbackReady: competitions.filter((row) => row.fallback).length, runtimeUnresolved: unresolved(competitions) },
      wildcards: { total: wildcards.length, primaryReady: wildcards.filter((row) => row.primary).length, fallbackReady: wildcards.filter((row) => row.fallback).length, runtimeUnresolved: unresolved(wildcards) },
    },
  };
  coverage.runtimeUnresolved = Object.values(coverage.families).reduce((sum, family) => sum + family.runtimeUnresolved, 0);
  await writeJson('coverage.json', coverage);
  console.log(JSON.stringify(coverage, null, 2));
  if (coverage.runtimeUnresolved !== 0) process.exitCode = 1;
}

await main();

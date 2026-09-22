'use client';

/* eslint-disable @next/next/no-img-element -- Grid criterion art is resolved from a reviewed runtime registry. */

import { useMemo, useState } from 'react';
import clubs from '@/data/football-grid/launch-assets/clubs.json';
import countries from '@/data/football-grid/launch-assets/countries.json';
import leagues from '@/data/football-grid/launch-assets/leagues.json';
import managers from '@/data/football-grid/launch-assets/managers.json';
import competitions from '@/data/football-grid/launch-assets/competitions.json';
import wildcards from '@/data/football-grid/launch-assets/wildcards.json';
import reviewedArt from '@/data/football-grid/criterion-art-overrides.json';
import logoViewboxes from '@/data/football-grid/logo-viewboxes.json';
import { footballGridAssetUrl, footballGridClubLogoUrl, footballGridRealLogoUrl } from '@/lib/football-grid/assets';
import masterClubs from '@/data/clubs.json';
import type { FootballGridCriterionView } from '@/lib/realtime/socket.types';
import { cn } from '@/lib/utils';
import { resolveClubCrestByName } from '@/lib/clubs';
import { wildcardKey } from '../criterionPresentation';
import { footballGridPortraitSources } from '../portraitSources';
import { CriterionIllustration } from './CriterionIllustration';
import { CriterionFallbackArt } from './CriterionFallbackArt';

type RegistryItem = {
  id: string;
  labelEn?: string;
  labelKa?: string;
  assetPath?: string;
  primary?: {
    assetPath?: string;
    publicUrl?: string;
    rightsStatus?: string;
    source?: { rightsStatus?: string };
  };
  fallback?: { assetPath?: string };
  providerCandidate?: { assetPath?: string } | null;
};

const MASTER_CLUB_LOGO_BY_ID = new Map(
  (masterClubs as Array<{ id: string; logo?: string }>).map((club) => [club.id, club.logo ?? null]),
);

// Crests uploaded for clubs that exist only as grid criteria (not in the
// app-wide registry) — sourced 2026-08-28, files live in imgs/club-logos.
const GRID_EXTRA_CLUB_LOGOS: Record<string, string> = {
  'stade-rennais': 'stade-rennais.png',
  'locomotive-tbilisi': 'locomotive-tbilisi.png',
  'saburtalo-tbilisi': 'saburtalo-tbilisi.png',
  'san-lorenzo': 'san-lorenzo.png',
  'santos': 'santos-fc-brazil.png',
};

// Exact aliases only: suffix matching confused Nacional with Atlético Nacional.
const MASTER_CLUB_LOGO_BY_COMPARABLE = new Map<string, string>();
for (const club of masterClubs as Array<{ id: string; label?: string; logo?: string }>) {
  if (!club.logo) continue;
  MASTER_CLUB_LOGO_BY_COMPARABLE.set(club.id, club.logo);
  if (club.label) MASTER_CLUB_LOGO_BY_COMPARABLE.set(comparable(club.label), club.logo);
}
for (const [key, logo] of Object.entries(GRID_EXTRA_CLUB_LOGOS)) {
  MASTER_CLUB_LOGO_BY_COMPARABLE.set(key, logo);
}

function masterClubLogoFor(candidates: string[]): string | null {
  for (const candidate of candidates) {
    const direct = MASTER_CLUB_LOGO_BY_COMPARABLE.get(candidate);
    if (direct) return direct;
  }
  return null;
}

const REGISTRIES: Partial<Record<FootballGridCriterionView['family'], RegistryItem[]>> = {
  club: clubs as RegistryItem[],
  country: countries as RegistryItem[],
  league: leagues as RegistryItem[],
  manager: managers as RegistryItem[],
  trophy_award: competitions as RegistryItem[],
  wildcard: wildcards as RegistryItem[],
};

function comparable(value: string | null | undefined): string {
  return (value ?? '')
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u10a0-\u10ff]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Criterion labels that differ from the registry's canonical label.
const LABEL_ALIASES: Record<string, string[]> = {
  barcelona: ['fc-barcelona'],
  turkey: ['turkiye'],
  'ivory-coast': ['cote-d-ivoire'],
  'united-states': ['usa', 'united-states-of-america'],
  'czech-republic': ['czechia'],
};

const LOCAL_CLUB_ART: Record<string, string> = {
  toulouse: '/clubs/fc-toulouse.webp',
  '1-fc-heidenheim': '/clubs/1-fc-heidenheim-1846.webp',
  // Official club identity page; source recorded beside the local asset.
  'america-de-cali': '/assets/football-grid/clubs/america-de-cali-official.png',
  'locomotive-tbilisi': '/assets/football-grid/clubs/locomotive-tbilisi.png',
  'saburtalo-tbilisi': '/assets/football-grid/clubs/saburtalo-tbilisi.png',
  'san-lorenzo': '/assets/football-grid/clubs/san-lorenzo.png',
};

function isLaunchClearedPrimary(item: RegistryItem): boolean {
  const status = item.primary?.source?.rightsStatus ?? item.primary?.rightsStatus;
  return status === 'owned' || status === 'cleared-for-launch';
}

/** Ordered candidate URLs for a criterion's artwork — the first that loads wins. */
export function criterionAssetSources(criterion: FootballGridCriterionView): string[] {
  if (wildcardKey(criterion) || criterion.family === 'trophy_award') return [];
  // Never resurrect the old initials-on-a-shield artwork after an image fails.
  return resolveRegistryAssets(criterion).filter((source) => !isLegacyBadge(source));
}

function resolveRegistryAssets(criterion: FootballGridCriterionView): string[] {
  const key = criterion.assetKey?.trim() ?? '';
  const suppliedAsset = footballGridAssetUrl(key);
  // Keys are from reviewed release snapshots; never infer a different club
  // from a partial name. These files ship with the app in both environments.
  const reviewed = (reviewedArt as Record<string, string>)[criterion.key];
  if (reviewed) return [reviewed];
  if (criterion.family === 'country') {
    const flag = countries.find((item) => item.assetPath === key
      || [item.id, item.labelEn, item.labelKa].some((value) =>
        [key, criterion.labelEn, criterion.labelKa].some((label) => comparable(value) === comparable(label))));
    if (flag) return [flag.assetPath];
  }
  const preferRealLogo = ['club', 'league', 'trophy_award', 'manager'].includes(criterion.family);
  // Published boards can carry a generated badge's full path. That path must
  // not bypass the registry's real crest/logo preference. Portraits and flags
  // still use their supplied asset directly.
  if (suppliedAsset && !preferRealLogo) {
    return criterion.family === 'teammate' ? footballGridPortraitSources(key) : [suppliedAsset];
  }

  if (criterion.family === 'club') {
    const local = LOCAL_CLUB_ART[comparable(criterion.labelEn)];
    const existing = resolveClubCrestByName(criterion.labelEn)?.logo;
    // Reuse the app's reviewed crest lookup, including packaged clubs and its
    // explicit exclusion of corrupt provider placeholders.
    const crest = local ?? (existing?.startsWith('/clubs/') ? existing
      : footballGridAssetUrl(existing) ?? footballGridClubLogoUrl(existing?.replace(/^\//, '')));
    if (crest) return [crest, ...(suppliedAsset ? [suppliedAsset] : [])];
  }

  const candidates = [key, criterion.key, criterion.id, criterion.labelEn, criterion.labelKa]
    .map(comparable)
    .filter(Boolean)
    .flatMap((value) => [value, ...(LABEL_ALIASES[value] ?? [])]);
  const registry = REGISTRIES[criterion.family] ?? [];
  const valuesOf = (candidate: RegistryItem) => (
    [candidate.id, candidate.labelEn, candidate.labelKa].map(comparable)
  );
  const item = registry.find((candidate) => (
    candidates.some((value) => valuesOf(candidate).includes(value))
  )) ?? (criterion.family === 'club' ? undefined : registry.find((candidate) => (
    candidates.some((value) => valuesOf(candidate).some((registryValue) => (
      registryValue.endsWith(`-${value}`) || value.endsWith(`-${registryValue}`)
    )))
  )));
  if (!item) {
    // Clubs added by roster expansion exist only as criteria; resolve their
    // crest straight from the master/extra registries.
    if (criterion.family === 'club') {
      const logo = masterClubLogoFor(candidates);
      const url = footballGridClubLogoUrl(logo);
      if (url) return [url, ...(suppliedAsset ? [suppliedAsset] : [])];
    }
    return suppliedAsset ? [suppliedAsset] : [];
  }

  if (criterion.family === 'manager') {
    const bundledPortrait = [item.providerCandidate?.assetPath, item.primary?.assetPath]
      .filter((path) => path && /\.(?:jpg|jpeg|png|webp)$/i.test(path));
    return [...bundledPortrait, footballGridAssetUrl(item.primary?.publicUrl), suppliedAsset,
      ...[item.assetPath, item.primary?.assetPath, item.fallback?.assetPath].map(footballGridAssetUrl)]
      .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
  }

  // Owner decision 2026-08-27: render the real club crests, accepting the
  // trademark exposure the launch-rights gate previously blocked. The real
  // artwork lives in the legacy imgs/club-logos bucket keyed by the master
  // registry's logo filename (the grid CDN's clubs/<id>.svg files are
  // generated monograms). The public resolver filters those legacy badges;
  // missing originals use original Quizball illustrations instead.
  if (criterion.family === 'club') {
    const masterClub = MASTER_CLUB_LOGO_BY_ID.get(item.id);
    return [
      footballGridClubLogoUrl(masterClub),
      suppliedAsset,
      ...[
        isLaunchClearedPrimary(item) ? item.primary?.publicUrl ?? item.primary?.assetPath : null,
        item.fallback?.assetPath,
      ].map(footballGridAssetUrl),
    ].filter((value): value is string => Boolean(value));
  }
  // Packaged originals are stable and have measured optical bounds. Remote
  // originals remain a fallback; old generated letter shields are not artwork.
  const realLogo = criterion.family === 'trophy_award'
    ? footballGridRealLogoUrl('competition-logos', item.id)
    : criterion.family === 'league'
      ? footballGridRealLogoUrl('league-logos', item.id)
      : null;
  const bundledLogo = realLogo ? item.providerCandidate?.assetPath : null;
  return [bundledLogo, realLogo, suppliedAsset, ...[item.assetPath, item.primary?.assetPath, item.fallback?.assetPath].map(footballGridAssetUrl)]
    .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
}

function isLegacyBadge(source: string): boolean {
  // Flags are real SVG artwork. All legacy badge families below were generated
  // with initials; published content can still point at these historical paths.
  return /\/(?:clubs|leagues|competitions|managers|wildcards)\/[^/?]+\.svg(?:[?#]|$)/i.test(source);
}

interface CriterionAssetProps {
  criterion: FootballGridCriterionView;
  className?: string;
}

export function CriterionAsset({ criterion, className }: CriterionAssetProps) {
  const identity = `${criterion.family}:${criterion.id}:${criterion.assetKey ?? ''}`;
  // Every state broadcast carries fresh criterion objects; resolve per identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sources = useMemo(() => criterionAssetSources(criterion), [identity]);
  const [failures, setFailures] = useState({ identity, sources: [] as string[] });
  // Keep identity and failures in the same React snapshot. An abandoned render
  // must not reset the committed clue's failures through a surviving ref write.
  if (failures.identity !== identity) {
    setFailures({ identity, sources: [] });
  }
  const failedSources = failures.identity === identity ? failures.sources : [];
  const source = sources.find((candidate) => !failedSources.includes(candidate)) ?? null;


  if (wildcardKey(criterion)) return <CriterionIllustration criterion={criterion} className={className} />;
  if (criterion.family === 'trophy_award') return <CriterionFallbackArt criterion={criterion} className={className} />;

  if (source) {
    const bounds = (logoViewboxes as Record<string, { width: number; height: number; viewBox: string }>)[source];
    const onError = () => setFailures((current) => current.identity !== identity || current.sources.includes(source)
      ? current : { identity, sources: [...current.sources, source] });
    if (bounds) return (
      <svg aria-hidden="true" viewBox={bounds.viewBox} className={className} preserveAspectRatio="xMidYMid meet">
        <image href={source} width={bounds.width} height={bounds.height} onError={onError} />
      </svg>
    );
    return (
      <img
        src={source}
        alt=""
        className={cn(
          criterion.family === 'manager' || criterion.family === 'teammate'
            ? 'rounded-full object-cover'
            : 'object-contain',
          criterion.family === 'manager' && 'object-top',
          className,
        )}
        onError={onError}
      />
    );
  }

  return <CriterionFallbackArt criterion={criterion} className={className} />;
}

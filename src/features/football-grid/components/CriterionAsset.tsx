'use client';

/* eslint-disable @next/next/no-img-element -- Grid criterion art is resolved from a reviewed runtime registry. */

import { useMemo, useState, useRef } from 'react';
import { Award, Globe2, Shield, Trophy, UserRound, UsersRound, Zap } from 'lucide-react';
import clubs from '@/data/football-grid/launch-assets/clubs.json';
import countries from '@/data/football-grid/launch-assets/countries.json';
import leagues from '@/data/football-grid/launch-assets/leagues.json';
import managers from '@/data/football-grid/launch-assets/managers.json';
import competitions from '@/data/football-grid/launch-assets/competitions.json';
import wildcards from '@/data/football-grid/launch-assets/wildcards.json';
import { footballGridAssetUrl, footballGridClubLogoUrl, footballGridRealLogoUrl } from '@/lib/football-grid/assets';
import masterClubs from '@/data/clubs.json';
import type { FootballGridCriterionView } from '@/lib/realtime/socket.types';
import { cn } from '@/lib/utils';

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

// Label/id lookup across BOTH registries for clubs, with the same suffix
// tolerance the launch-registry matcher uses ("Santos" ↔ "santos-fc").
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
  for (const candidate of candidates) {
    for (const [key, logo] of MASTER_CLUB_LOGO_BY_COMPARABLE) {
      if (key.endsWith(`-${candidate}`) || candidate.endsWith(`-${key}`)) return logo;
    }
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
  turkey: ['turkiye'],
  'ivory-coast': ['cote-d-ivoire'],
  'united-states': ['usa', 'united-states-of-america'],
  'czech-republic': ['czechia'],
};

function isLaunchClearedPrimary(item: RegistryItem): boolean {
  const status = item.primary?.source?.rightsStatus ?? item.primary?.rightsStatus;
  return status === 'owned' || status === 'cleared-for-launch';
}

/** Ordered candidate URLs for a criterion's artwork — the first that loads wins. */
export function criterionAssetSources(criterion: FootballGridCriterionView): string[] {
  return resolveRegistryAssets(criterion);
}

function resolveRegistryAssets(criterion: FootballGridCriterionView): string[] {
  const key = criterion.assetKey?.trim() ?? '';
  if (key.startsWith('/')) {
    const resolved = footballGridAssetUrl(key);
    return resolved ? [resolved] : [];
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
  )) ?? registry.find((candidate) => (
    candidates.some((value) => valuesOf(candidate).some((registryValue) => (
      registryValue.endsWith(`-${value}`) || value.endsWith(`-${registryValue}`)
    )))
  ));
  if (!item) {
    // Clubs added by roster expansion exist only as criteria; resolve their
    // crest straight from the master/extra registries.
    if (criterion.family === 'club') {
      const logo = masterClubLogoFor(candidates);
      const url = footballGridClubLogoUrl(logo);
      if (url) return [url];
    }
    return [];
  }

  // Owner decision 2026-08-27: render the real club crests, accepting the
  // trademark exposure the launch-rights gate previously blocked. The real
  // artwork lives in the legacy imgs/club-logos bucket keyed by the master
  // registry's logo filename (the grid CDN's clubs/<id>.svg files are
  // generated monograms). Cleared primaries and the monogram remain as
  // onError fallbacks so a missing file still degrades gracefully.
  if (criterion.family === 'club') {
    const masterClub = MASTER_CLUB_LOGO_BY_ID.get(item.id);
    return [
      footballGridClubLogoUrl(masterClub),
      ...[
        isLaunchClearedPrimary(item) ? item.primary?.publicUrl ?? item.primary?.assetPath : null,
        item.fallback?.assetPath,
      ].map(footballGridAssetUrl),
    ].filter((value): value is string => Boolean(value));
  }
  // Owner decision 2026-09-03: same call for competitions and leagues — the
  // real logo first, the drawn Quizball badge only as an onError fallback.
  const realLogo = criterion.family === 'trophy_award'
    ? footballGridRealLogoUrl('competition-logos', item.id)
    : criterion.family === 'league'
      ? footballGridRealLogoUrl('league-logos', item.id)
      : null;
  return [realLogo, ...[item.assetPath, item.primary?.assetPath, item.fallback?.assetPath].map(footballGridAssetUrl)]
    .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
}

const FAMILY_ICONS = {
  club: Shield,
  country: Globe2,
  league: Trophy,
  manager: UserRound,
  teammate: UsersRound,
  trophy_award: Award,
  wildcard: Zap,
} satisfies Record<FootballGridCriterionView['family'], typeof Shield>;

interface CriterionAssetProps {
  criterion: FootballGridCriterionView;
  className?: string;
}

export function CriterionAsset({ criterion, className }: CriterionAssetProps) {
  const identity = `${criterion.family}:${criterion.id}:${criterion.assetKey ?? ''}`;
  // Every state broadcast carries fresh criterion objects; resolve per identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sources = useMemo(() => resolveRegistryAssets(criterion), [identity]);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const failedForRef = useRef(identity);
  if (failedForRef.current !== identity) {
    failedForRef.current = identity;
    if (failedSources.length > 0) setFailedSources([]);
  }
  const source = sources.find((candidate) => !failedSources.includes(candidate)) ?? null;
  const Icon = FAMILY_ICONS[criterion.family];

  if (source) {
    return (
      <img
        src={source}
        alt=""
        className={cn(
          criterion.family === 'manager' || criterion.family === 'teammate'
            ? 'rounded-full object-cover'
            : 'object-contain',
          className,
        )}
        onError={() => setFailedSources((current) => current.includes(source) ? current : [...current, source])}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid place-items-center rounded-full bg-white/10 text-white/80 ring-1 ring-inset ring-white/15',
        className,
      )}
    >
      <Icon className="size-1/2" strokeWidth={2.2} />
    </span>
  );
}

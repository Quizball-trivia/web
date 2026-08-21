'use client';

/* eslint-disable @next/next/no-img-element -- Grid criterion art is resolved from a reviewed runtime registry. */

import { useMemo, useState } from 'react';
import { Award, Globe2, Shield, Trophy, UserRound, UsersRound, Zap } from 'lucide-react';
import clubs from '@/data/football-grid/launch-assets/clubs.json';
import countries from '@/data/football-grid/launch-assets/countries.json';
import leagues from '@/data/football-grid/launch-assets/leagues.json';
import managers from '@/data/football-grid/launch-assets/managers.json';
import competitions from '@/data/football-grid/launch-assets/competitions.json';
import wildcards from '@/data/football-grid/launch-assets/wildcards.json';
import { footballGridAssetUrl } from '@/lib/football-grid/assets';
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

function isLaunchClearedPrimary(item: RegistryItem): boolean {
  const status = item.primary?.source?.rightsStatus ?? item.primary?.rightsStatus;
  return status === 'owned' || status === 'cleared-for-launch';
}

function resolveRegistryAssets(criterion: FootballGridCriterionView): string[] {
  const key = criterion.assetKey?.trim() ?? '';
  if (key.startsWith('/')) {
    const resolved = footballGridAssetUrl(key);
    return resolved ? [resolved] : [];
  }

  const candidates = [key, criterion.key, criterion.id, criterion.labelEn, criterion.labelKa]
    .map(comparable)
    .filter(Boolean);
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
  if (!item) return [];

  // Third-party candidates remain recorded in the registries for audit, but
  // the runtime only renders primaries whose launch rights are explicitly
  // cleared. Every row has a packaged Quizball fallback.
  if (criterion.family === 'club') {
    return [
      isLaunchClearedPrimary(item) ? item.primary?.publicUrl ?? item.primary?.assetPath : null,
      item.fallback?.assetPath,
    ].map(footballGridAssetUrl).filter((value): value is string => Boolean(value));
  }
  return [item.assetPath, item.primary?.assetPath, item.fallback?.assetPath]
    .map(footballGridAssetUrl)
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
  const sources = useMemo(() => resolveRegistryAssets(criterion), [criterion]);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const source = sources.find((candidate) => !failedSources.includes(candidate)) ?? null;
  const Icon = FAMILY_ICONS[criterion.family];

  if (source) {
    return (
      <img
        src={source}
        alt=""
        className={cn('object-contain', className)}
        onError={() => setFailedSources((current) => current.includes(source) ? current : [...current, source])}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid place-items-center rounded-2xl bg-white/10 text-white/80 ring-1 ring-inset ring-white/10',
        className,
      )}
    >
      <Icon className="size-1/2" strokeWidth={2.2} />
    </span>
  );
}

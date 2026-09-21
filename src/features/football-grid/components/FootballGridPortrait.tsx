'use client';

/* eslint-disable @next/next/no-img-element -- Sources are reviewed local files or allowlisted first-party URLs. */
import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { footballGridPortraitSources } from '../portraitSources';

export function FootballGridPortrait({ source, playerId, className }: {
  source: string | null | undefined;
  playerId?: string | null;
  className?: string;
}) {
  return <PortraitImage key={`${playerId ?? ''}:${source ?? ''}`} sources={footballGridPortraitSources(source, playerId)} className={className} />;
}

function PortraitImage({ sources, className }: { sources: string[]; className?: string }) {
  const [failed, setFailed] = useState<string[]>([]);
  const source = sources.find((candidate) => !failed.includes(candidate));
  if (!source) return (
    <span aria-hidden="true" className={cn('grid place-items-center rounded-full bg-white/10 text-white/55 ring-2 ring-white/15', className)}>
      <UserRound className="size-1/2" />
    </span>
  );
  return <img src={source} alt="" className={cn('rounded-full object-cover object-top ring-2 ring-white/25', className)}
    onError={() => setFailed((current) => current.includes(source) ? current : [...current, source])} />;
}

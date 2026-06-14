'use client';

/**
 * Dev playground for reviewing every favorite-team club LOGO exactly as it
 * appears in-game: inside the tier-frame avatar with the crest as the top-right
 * badge (the real ShowdownScreen `FramedAvatar` layout) plus the plain crest.
 *
 * Lets us eyeball all ~97 club logos (incl. the 40 newly sourced ones and the
 * owms-only "Zlatan F.C.") on different tier frames before shipping.
 *
 * Guarded by NODE_ENV — production code paths are untouched.
 */

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { clubs, type Club } from '@/lib/clubs';
import { AvatarPreview } from '@/components/AvatarPreview';
import { getTierFrameSrc } from '@/utils/tierVisuals';
import { cn } from '@/lib/utils';

const TIERS = [
  'Academy', 'Youth Prospect', 'Reserve', 'Bench', 'Rotation',
  'Starting11', 'Key Player', 'Captain', 'World-Class', 'Legend', 'GOAT',
] as const;

const DEMO_AVATAR = { base: 'avatar-1' };

/** Faithful copy of ShowdownScreen's FramedAvatar: frame + avatar + club badge top-right. */
function FramedClub({ club, frameSrc, width }: { club: Club; frameSrc: string; width: number }) {
  const frameW = width;
  const frameH = Math.round(frameW * 1.58);
  const chipW = Math.round(frameW * 0.22);
  return (
    <div className="relative" style={{ width: frameW, height: frameH }}>
      <Image src={frameSrc} alt="" width={frameW} height={frameH} className="absolute inset-0 z-0 h-full w-full object-contain pointer-events-none" />
      <div className="absolute inset-x-0 bottom-[8%] top-[22%] z-10 flex items-center justify-center overflow-hidden">
        <AvatarPreview customization={DEMO_AVATAR} width={Math.round(frameW * 0.64)} />
      </div>
      {/* Club badge — top-right (identical to the showdown card) */}
      <div
        className="absolute right-[10%] top-[8%] z-20 flex items-center justify-center"
        style={{ width: Math.round(chipW * 1.25), height: Math.round(chipW * 1.25) }}
      >
        <Image src={club.logo} alt={club.label} width={80} height={80} unoptimized className="h-full w-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]" />
      </div>
    </div>
  );
}

export default function DevLogosPage() {
  const router = useRouter();
  const [tier, setTier] = useState<(typeof TIERS)[number]>('Legend');
  const [showHidden, setShowHidden] = useState(true);
  const frameSrc = getTierFrameSrc(tier);

  const grouped = useMemo(() => {
    const only = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('only') : null;
    let list = showHidden ? clubs : clubs.filter((c) => !c.hidden);
    if (only) list = list.filter((c) => c.country.toLowerCase() === only.toLowerCase());
    const byCountry = new Map<string, Club[]>();
    for (const c of list) {
      const arr = byCountry.get(c.country) ?? [];
      arr.push(c);
      byCountry.set(c.country, arr);
    }
    return [...byCountry.entries()];
  }, [showHidden]);

  if (process.env.NODE_ENV === 'production') {
    return <div className="p-8 text-white">Not available in production.</div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Controls */}
      <div className="sticky top-0 z-50 flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#0a0e1a]/95 px-5 py-3 backdrop-blur">
        <button onClick={() => router.back()} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20">← Back</button>
        <h1 className="font-poppins text-lg font-bold">Club logos preview</h1>
        <span className="text-sm text-white/50">{clubs.length} clubs</span>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-white/70">Tier frame:</label>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as (typeof TIERS)[number])}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold"
          >
            {TIERS.map((t) => <option key={t} value={t} className="bg-[#0a0e1a]">{t}</option>)}
          </select>
          <label className="ml-3 flex items-center gap-1.5 text-sm text-white/70">
            <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
            show hidden (Zlatan)
          </label>
        </div>
      </div>

      {/* Grouped by country */}
      <div className="space-y-10 px-5 py-6">
        {grouped.map(([country, list]) => (
          <section key={country}>
            <h2 className="mb-4 flex items-center gap-2 font-poppins text-xl font-bold">
              <span className="text-2xl">{list[0]?.flag}</span>
              {country}
              <span className="text-sm font-normal text-white/40">({list.length})</span>
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {list.map((club) => (
                <div key={club.id} className={cn('flex flex-col items-center gap-2', club.hidden && 'rounded-xl bg-amber-400/10 p-2 ring-1 ring-amber-400/40')}>
                  <FramedClub club={club} frameSrc={frameSrc} width={120} />
                  {/* Plain crest for reference */}
                  <div className="flex size-12 items-center justify-center rounded-lg bg-white/5">
                    <Image src={club.logo} alt={club.label} width={44} height={44} unoptimized className="size-11 object-contain" />
                  </div>
                  <div className="text-center text-xs font-semibold leading-tight">{club.label}</div>
                  {club.hidden && <div className="text-[10px] font-bold uppercase text-amber-400">owms-only</div>}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

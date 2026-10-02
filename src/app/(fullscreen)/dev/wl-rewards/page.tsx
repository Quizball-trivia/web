'use client';

// Dev playground for Weekend League reward delivery: the result screen with its
// "Your rewards" block, and the pack-opening / coin ceremony for every band.
// Fixture receipts only — nothing here touches a wallet or the backend.

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

import { AvatarPreview } from '@/components/AvatarPreview';
import { ChampionScreen } from '@/features/weekend-league/gauntlet/GauntletScreens';
import { BoardStrip } from '@/features/weekend-league/live/WlLiveFlow';
import { WlRewardCeremony } from '@/features/weekend-league/rewards/WlRewardCeremony';
import { WlRewardsEarnedCard } from '@/features/weekend-league/rewards/WlRewardsEarnedCard';
import type { WlRewardBand, WlRewardReceipt } from '@/features/weekend-league/rewards/wlRewards';
import { REWARD_JERSEY_PARTS } from '@/lib/avatars/parts';
import type { WlBoardRow } from '@/lib/realtime/socket.types';
import type { AvatarCustomization } from '@/types/game';

const SELF = 'dev-self';

const BANDS: Array<{ band: WlRewardBand; label: string; rank: number | null; coins: number; jersey?: string }> = [
  { band: 'winner', label: '1st — Champion', rank: 1, coins: 40000, jersey: 'home' },
  { band: 'second', label: '2nd', rank: 2, coins: 25000, jersey: 'away' },
  { band: 'third', label: '3rd', rank: 3, coins: 15000, jersey: 'training' },
  { band: 'top10', label: 'Top 10', rank: 7, coins: 8000 },
  { band: 'finalist', label: 'Top 24', rank: 18, coins: 4000 },
  { band: 'participant', label: 'Played Saturday', rank: null, coins: 1500 },
];

const LOOKS: Array<{ label: string; customization: AvatarCustomization }> = [
  { label: 'Default', customization: { hair: 'hair_boy_basic' } as AvatarCustomization },
  { label: 'Dark skin · afro', customization: { skin: 'skin_male_dark', hair: 'hair_high_afro' } as AvatarCustomization },
  { label: 'Alt skin · mullet', customization: { skin: 'skin_male_white_alt', hair: 'hair_mullet' } as AvatarCustomization },
];

function receiptFor(index: number, seen: boolean): WlRewardReceipt {
  const def = BANDS[index];
  return {
    id: `dev-${def.band}`,
    tournamentId: 'dev-tournament',
    weekKey: '2026-10-03',
    band: def.band,
    finalRank: def.rank,
    coins: def.coins,
    items: def.jersey
      ? [{ slug: `avatar_jersey_wl_retro_${def.jersey}`, avatarPartId: `jersey_wl_retro_${def.jersey}`, slot: 'jersey' }]
      : [],
    grantedAt: '2026-10-04T12:00:00Z',
    seen,
  };
}

function boardFor(rank: number | null): WlBoardRow[] {
  const names = ['Lasha', 'Nika06', 'TsotneL', 'AchiLFC', 'Gio_10', 'Saba', 'Luka', 'Dato', 'Irakli', 'Beka'];
  return names.map((nickname, i) => ({
    user_id: rank === i + 1 ? SELF : `dev-${i}`,
    nickname: rank === i + 1 ? 'You' : nickname,
    points: 1240 - i * 62,
    time_ms_total: 60000 + i * 4100,
    rank: i + 1,
  }));
}

export default function DevWlRewardsPage() {
  const [bandIndex, setBandIndex] = useState(0);
  const [lookIndex, setLookIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [open, setOpen] = useState(false);
  const [run, setRun] = useState(0);
  const [seen, setSeen] = useState(false);
  const [equipped, setEquipped] = useState<string | null>(null);

  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-deep font-poppins text-white">Dev only</div>
    );
  }

  const def = BANDS[bandIndex];
  const receipt = receiptFor(bandIndex, seen);
  const customization: AvatarCustomization = {
    ...LOOKS[lookIndex].customization,
    ...(equipped ? { jersey: equipped } : {}),
  };
  const select = (index: number) => {
    setBandIndex(index);
    setSeen(false);
    setEquipped(null);
    setOpen(false);
  };
  const chip = (active: boolean) =>
    `rounded-xl px-3.5 py-2 font-poppins text-[13px] font-black uppercase ${
      active ? 'bg-brand-green text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
    }`;

  return (
    <div className="min-h-screen bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-poppins text-2xl font-black uppercase">WL reward delivery</h1>
          <p className="mt-1 font-poppins text-[13px] font-semibold text-white/60">
            Result screen + pack opening, per reward band. Fixtures only: no wallet or inventory changes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {BANDS.map((b, i) => (
            <button key={b.band} type="button" onClick={() => select(i)} className={chip(i === bandIndex)}>
              {b.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {LOOKS.map((look, i) => (
            <button key={look.label} type="button" onClick={() => setLookIndex(i)} className={chip(i === lookIndex)}>
              {look.label}
            </button>
          ))}
          <button type="button" onClick={() => setPending((v) => !v)} className={chip(pending)}>Pending receipt</button>
          <button type="button" onClick={() => setReduced((v) => !v)} className={chip(reduced)}>Reduced motion</button>
          <button
            type="button"
            onClick={() => { setSeen(false); setRun((n) => n + 1); setOpen(true); }}
            className="flex items-center gap-1.5 rounded-xl bg-brand-purple px-3.5 py-2 font-poppins text-[13px] font-black uppercase text-white hover:opacity-90"
          >
            <RotateCcw className="size-4" /> Replay ceremony
          </button>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-surface-page/80 py-6">
          <ChampionScreen
            champion={def.band === 'winner'}
            finalRank={def.rank}
            score={def.rank ? 1240 - (def.rank - 1) * 62 : 310}
            onExit={() => undefined}
            rewards={
              <WlRewardsEarnedCard
                receipt={pending ? undefined : receipt}
                onOpen={() => { setRun((n) => n + 1); setOpen(true); }}
              />
            }
          >
            <BoardStrip board={boardFor(def.rank)} selfUserId={SELF} rows={5} yourRankFallback={def.rank} />
          </ChampionScreen>
        </div>

        <div>
          <h2 className="mb-3 font-poppins text-[12px] font-black uppercase tracking-widest text-white/50">
            Jersey fit check (all three, current look, three sizes)
          </h2>
          <div className="flex flex-wrap items-end gap-6">
            {REWARD_JERSEY_PARTS.map((part) => (
              <div key={part.id} className="flex flex-col items-center gap-2">
                <div className="flex items-end gap-3">
                  {[170, 96, 48].map((width) => (
                    <AvatarPreview
                      key={width}
                      width={width}
                      customization={{ ...LOOKS[lookIndex].customization, jersey: part.id }}
                    />
                  ))}
                </div>
                <span className="font-poppins text-[11px] font-bold uppercase text-white/60">{part.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <WlRewardCeremony
        key={`${def.band}-${run}`}
        receipt={receipt}
        open={open}
        customization={customization}
        weekLabel="3 Oct"
        forceReducedMotion={reduced || undefined}
        onEquip={async (item) => {
          await new Promise((resolve) => setTimeout(resolve, 600));
          setEquipped(item.avatarPartId);
        }}
        onClose={() => { setOpen(false); setSeen(true); }}
      />
    </div>
  );
}

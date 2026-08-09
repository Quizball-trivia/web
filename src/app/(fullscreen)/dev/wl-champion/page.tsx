'use client';

// Dev playground for the Weekend League podium ceremony: the login unlock
// overlay (1st/2nd/3rd) + the profile badge card, replayable. Same pattern as
// /dev/wc-badges — iterate here, then wire to wl_awards.

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { WlChampionMedal, type WlMedalPlace } from '@/components/shared/WlChampionMedal';
import { WlChampionUnlockOverlay } from '@/components/shared/WlChampionUnlockOverlay';
import { WlChampionAchievementCard } from '@/components/shared/WlChampionAchievementCard';
import { WorldCupAchievementCard } from '@/components/shared/WorldCupAchievementCard';

export default function DevWlChampionPage() {
  const [place, setPlace] = useState<WlMedalPlace>(1);
  const [run, setRun] = useState(0);
  const [open, setOpen] = useState(true);

  return (
    <div className="min-h-screen bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="font-poppins text-2xl font-black uppercase">WL champion ceremony</h1>
          <p className="mt-1 font-poppins text-[13px] font-semibold text-white/60">
            The login unlock moment + the profile badge, per podium place. Wire target: wl_awards → ceremony on next login, badge on profile.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[1, 2, 3].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { setPlace(p as WlMedalPlace); setRun((n) => n + 1); setOpen(true); }}
              className={`rounded-xl px-4 py-2 font-poppins text-sm font-black uppercase ${
                place === p ? 'bg-brand-green text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {p === 1 ? '1st — Champion' : p === 2 ? '2nd' : '3rd'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { setRun((n) => n + 1); setOpen(true); }}
            className="flex items-center gap-1.5 rounded-xl bg-brand-purple px-4 py-2 font-poppins text-sm font-black uppercase text-white hover:opacity-90"
          >
            <RotateCcw className="size-4" /> Replay ceremony
          </button>
        </div>

        <div>
          <h2 className="mb-3 font-poppins text-[12px] font-black uppercase tracking-widest text-white/50">
            Profile badges (all three)
          </h2>
          <div className="flex flex-wrap items-end gap-6">
            {[1, 2, 3].map((p) => (
              <div key={p} className="flex flex-col items-center gap-2">
                <WlChampionMedal place={p as WlMedalPlace} className={p === 1 ? 'w-36' : 'w-28'} />
                <span className="font-poppins text-[11px] font-bold uppercase text-white/60">
                  {p === 1 ? 'Champion' : p === 2 ? '2nd place' : '3rd place'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-poppins text-[12px] font-black uppercase tracking-widest text-white/50">
            On the profile (achievements section)
          </h2>
          <div className="max-w-md rounded-[20px] border border-white/10 bg-surface-card-deep p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-brand-green font-poppins text-lg font-black text-white">K</div>
              <div>
                <div className="font-poppins text-[15px] font-black uppercase text-white">კირილე მიმინოშვილი</div>
                <div className="font-poppins text-[12px] font-semibold text-white/50">@kirile · Legend League</div>
              </div>
            </div>
            <div className="mb-2 font-poppins text-[11px] font-black uppercase tracking-widest text-white/45">
              სეზონის მიღწევები
            </div>
            <div className="space-y-2.5">
              <WorldCupAchievementCard place={2} />
              <WlChampionAchievementCard place={place} weekLabel="Weekend League · 9 აგვისტო 2026" />
              <WlChampionAchievementCard place={3} weekLabel="Weekend League · 2 აგვისტო 2026" />
            </div>
          </div>
        </div>
      </div>

      <WlChampionUnlockOverlay
        key={`${place}-${run}`}
        place={place}
        open={open}
        weekLabel="9 აგვისტო"
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

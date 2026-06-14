'use client';
import { useState } from 'react';
import ClubSelect from '@/features/onboarding/ClubSelect';

export default function DevClubSelectPage() {
  const [value, setValue] = useState('Real Madrid CF');
  if (process.env.NODE_ENV === 'production') return null;
  return (
    <div className="min-h-screen bg-[#0a0e1a] p-8 text-white">
      <h1 className="mb-6 font-poppins text-lg font-bold">ClubSelect preview (profile-row width)</h1>
      {/* Mimic the profile "preferences" card width (~360px) and the club row */}
      <div className="max-w-[360px] rounded-2xl bg-white/[0.04] p-4">
        <div className="flex items-center justify-between gap-3 py-3.5">
          <span className="shrink-0 font-poppins text-sm font-semibold uppercase text-white/50">CLUB</span>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="w-full min-w-0">
              <ClubSelect value={value} onChange={setValue} />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex max-w-[360px] flex-wrap gap-2">
        {['Real Madrid CF', 'Arsenal', 'FC Dinamo Tbilisi', 'Borussia Mönchengladbach'].map((v) => (
          <button key={v} onClick={() => setValue(v)} className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20">{v}</button>
        ))}
      </div>
    </div>
  );
}

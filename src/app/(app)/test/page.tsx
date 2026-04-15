'use client';

export default function TestVariants() {
  const rp = 7;
  const targetRp = 300;
  const rpToNext = 293;
  const tierName = 'Youth Prospect';
  const winRate = 22;
  const games = 37;
  const pct = Math.round((rp / targetRp) * 100);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10 font-fun">
      <h1 className="text-2xl font-black text-white uppercase">Pick a variant — vibrant stats</h1>

      {/* ── VARIANT 1: Electric Cyan ── */}
      <div>
        <h2 className="text-sm font-black text-[#56707A] uppercase mb-3">Variant 1 — Electric Cyan</h2>
        <div className="rounded-[28px] bg-[#38B60E] border-t-[3px] border-[#1CB0F6] p-7">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-5xl font-black uppercase text-white">Ranked Match</h3>
              <p className="mt-1.5 text-lg font-black uppercase text-white/90">1v1 Competitive</p>
            </div>
            <div className="w-[300px] text-right">
              <div className="text-4xl font-black text-[#00E5FF]">{rp}/{targetRp} RP</div>
              <div
                className="mt-2 h-4 w-full rounded-full bg-[#0a2000]/50 overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="h-full rounded-full bg-[#00E5FF]" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 text-xs font-black uppercase tracking-wide text-[#00E5FF]/80">
                {winRate}% win rate · {games} ranked games
              </div>
              <div className="mt-1 text-sm font-black uppercase text-[#00E5FF]">
                {rpToNext} RP to {tierName}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── VARIANT 2: Hot Magenta ── */}
      <div>
        <h2 className="text-sm font-black text-[#56707A] uppercase mb-3">Variant 2 — Hot Magenta</h2>
        <div className="rounded-[28px] bg-[#38B60E] border-t-[3px] border-[#1CB0F6] p-7">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-5xl font-black uppercase text-white">Ranked Match</h3>
              <p className="mt-1.5 text-lg font-black uppercase text-white/90">1v1 Competitive</p>
            </div>
            <div className="w-[300px] rounded-2xl bg-[#0a2000]/50 p-4">
              <div className="text-4xl font-black text-[#FF2D8A] text-right">{rp}/{targetRp} RP</div>
              <div
                className="mt-2 h-4 w-full rounded-full bg-[#0a2000]/60 overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="h-full rounded-full bg-[#FF2D8A]" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 text-xs font-black uppercase tracking-wide text-[#FF7EB8] text-right">
                {winRate}% win rate · {games} ranked games
              </div>
              <div className="mt-1 text-sm font-black uppercase text-[#FF2D8A] text-right">
                {rpToNext} RP to {tierName}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── VARIANT 3: Purple Glow ── */}
      <div>
        <h2 className="text-sm font-black text-[#56707A] uppercase mb-3">Variant 3 — Purple Glow</h2>
        <div className="rounded-[28px] bg-[#38B60E] border-t-[3px] border-[#1CB0F6] overflow-hidden">
          <div className="p-7 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-5xl font-black uppercase text-white">Ranked Match</h3>
                <p className="mt-1.5 text-lg font-black uppercase text-white/90">1v1 Competitive</p>
              </div>
              <div className="text-right w-[300px]">
                <div className="text-4xl font-black text-[#CE82FF]">{rp}/{targetRp} RP</div>
                <div
                  className="mt-2 h-4 w-full rounded-full bg-[#2D950B] overflow-hidden"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full rounded-full bg-[#CE82FF]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-[#1a4a00] px-7 py-3 flex items-center justify-between">
            <span className="text-sm font-black uppercase text-[#CE82FF]">
              {winRate}% Win Rate · {games} Ranked Games
            </span>
            <span className="text-sm font-black uppercase text-[#CE82FF]">
              {rpToNext} RP to {tierName}
            </span>
          </div>
        </div>
      </div>

      {/* ── VARIANT 4: Deep Black Panel + Cyan/Magenta Split ── */}
      <div>
        <h2 className="text-sm font-black text-[#56707A] uppercase mb-3">Variant 4 — Black Panel, Dual Accent</h2>
        <div className="rounded-[28px] bg-[#38B60E] border-t-[3px] border-[#1CB0F6] p-7">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-5xl font-black uppercase text-white">Ranked Match</h3>
              <p className="mt-1.5 text-lg font-black uppercase text-white/90">1v1 Competitive</p>
            </div>
            <div className="w-[300px] rounded-2xl bg-black/70 p-4 backdrop-blur-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-black uppercase text-[#1CB0F6]">Ranked Points</span>
                <span className="text-3xl font-black text-[#1CB0F6]">{rp}<span className="text-lg text-[#1CB0F6]/60">/{targetRp}</span></span>
              </div>
              <div
                className="mt-2 h-3 w-full rounded-full bg-[#1CB0F6]/20 overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="h-full rounded-full bg-[#1CB0F6]" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 flex justify-between">
                <span className="text-xs font-black text-[#FF2D8A]">{winRate}% WR</span>
                <span className="text-xs font-black text-[#1CB0F6]">{games} Games</span>
              </div>
              <div className="mt-1 text-center text-sm font-black uppercase text-[#FF2D8A]">
                {rpToNext} RP to {tierName}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

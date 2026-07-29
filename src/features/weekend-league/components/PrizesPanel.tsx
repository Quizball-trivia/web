'use client';

import { ACCENT_BG, ACCENT_BORDER, ACCENT_TEXT } from '../constants';
import { PRIZES } from '../mock-data';

/** The prize ladder — rank bands → reward. Optionally highlights the viewer's band. */
export function PrizesPanel({ highlightRank }: { highlightRank?: number | null }) {
  return (
    <section>
      <h2 className="mb-3 font-poppins text-lg font-black uppercase tracking-wide text-white">Prizes</h2>
      <div className="flex flex-col gap-2">
        {PRIZES.map((prize) => {
          const mine = highlightRank != null && highlightRank >= prize.rankFrom && highlightRank <= prize.rankTo;
          return (
            <div
              key={prize.id}
              className={`flex items-center gap-3 rounded-2xl border-2 px-3.5 py-3 ${
                mine ? `${ACCENT_BORDER[prize.accent]} ${ACCENT_BG[prize.accent]}` : 'border-white/8 bg-surface-card-deep'
              }`}
            >
              <span className="text-2xl leading-none">{prize.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-poppins text-sm font-black uppercase ${ACCENT_TEXT[prize.accent]}`}>{prize.rankLabel}</span>
                  <span className="font-poppins text-[11px] font-bold uppercase tracking-wide text-white/45">{prize.label}</span>
                  {mine && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 font-poppins text-[9px] font-black uppercase tracking-wide text-white">
                      You
                    </span>
                  )}
                </div>
                <div className="mt-0.5 font-poppins text-[13px] font-semibold text-white/85">{prize.prize}</div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2.5 px-1 font-poppins text-[11px] font-medium text-white/35">
        Prizes are awarded on final placement. Fair-play review applies before payout.
      </p>
    </section>
  );
}

'use client';

import { motion } from 'motion/react';
import { SLOTS, type Squad } from '../lib/squad';
import { MiniFutCard } from './MiniFutCard';

/** 4-3-3 pitch with a card (or an empty shirt) per slot. GK is a fixed generic. */
export function Pitch({ squad, active, compact = false, tint = '#1645FF' }: { squad: Squad; active?: string | null; compact?: boolean; tint?: string }) {
  return (
    <div className={`relative mx-auto w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#1f4a1f] to-[#0f260f] ${compact ? 'aspect-[4/3] max-w-[320px]' : 'aspect-[4/3] max-w-sm lg:aspect-[3/4]'}`}>
      <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-white/15" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/15" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-0.5 w-full -translate-x-1/2 bg-white/15" />
      <div className="pointer-events-none absolute bottom-3 left-1/2 h-12 w-36 -translate-x-1/2 border-2 border-b-0 border-white/15" />
      {SLOTS.map((s) => {
        const card = squad[s.id];
        const isActive = active === s.id;
        return (
          <div key={s.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
            {card ? (
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 20 }}>
                {/* Phones (4:3 pitch) get a rating chip — full cards only fit the tall desktop pitch. */}
                <div className={`flex flex-col items-center ${compact ? '' : 'lg:hidden'}`}>
                  <span className="flex size-9 items-center justify-center rounded-full border-2 border-[#7c5e1e]/50 font-poppins text-sm font-black text-[#241b05] shadow-md" style={{ background: 'linear-gradient(160deg, #f7e7a8 0%, #d3ab46 100%)' }}>{card.overall}</span>
                  <span className="mt-0.5 max-w-[64px] truncate rounded bg-black/50 px-1 font-poppins text-[8px] font-black uppercase text-white">{card.name.split(' ').pop()}</span>
                </div>
                {!compact && (
                  <div className="hidden lg:block">
                    <MiniFutCard card={card} size="xs" showEdition={false} />
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }} transition={isActive ? { repeat: Infinity, duration: 1.1 } : undefined} className="flex size-10 items-center justify-center rounded-full border-2 font-poppins text-[10px] font-black text-white" style={{ borderColor: isActive ? '#FFE500' : 'rgba(255,255,255,0.35)', background: isActive ? tint : 'rgba(0,0,0,0.35)' }}>
                {s.label}
              </motion.div>
            )}
          </div>
        );
      })}
      <div className="absolute bottom-[6%] left-1/2 flex size-10 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white/35 bg-black/40 font-poppins text-[10px] font-black text-white/70">GK</div>
    </div>
  );
}

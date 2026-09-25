'use client';

import { Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { PERF_DOTS, RoundIconsRow, TD_DISPLAY, TicketGlyph } from '../components/brand';
import { TD } from '../lib/copy';
import { DailyCards, type DailyKey } from './DailyScreen';
import { BsGroup, BsRow, SectionTitle } from './ui';

/** Ranked hero — the one show-styled surface in the shell (orange
 *  sticker, hard shadow, tilt), everything around it is Betsson chrome. */
export function RankedHero({ onPlay }: { onPlay: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onPlay}
      className="relative w-full overflow-hidden rounded-[18px] p-5 text-left md:p-7"
      style={{ background: 'var(--td-orange)', boxShadow: '6px 6px 0 #000', transform: 'rotate(-0.8deg)' }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0" style={PERF_DOTS} />
      <div className="relative flex flex-col gap-2.5">
        {/* meta as solid chips — full contrast on the dotted orange */}
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="bs-text rounded-full bg-black px-2.5 py-1 text-[11px] font-bold leading-none text-white md:text-[12px]">
            {TD.rankedLabel}
          </span>
          <span
            className="bs-text flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold leading-none text-black md:text-[12px]"
            style={{ background: 'var(--td-paper)' }}
          >
            <TicketGlyph size={12} /> {TD.ticketCost}
          </span>
        </span>
        <span className="text-3xl md:text-4xl" style={{ ...TD_DISPLAY, color: '#0d0d0d' }}>
          {TD.title}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {TD.rankedRounds.map((name) => (
            <span
              key={name}
              className="bs-text rounded-full border-[1.5px] border-black px-2.5 py-[3px] text-[12px] font-bold leading-none text-black md:text-[13px]"
            >
              {name}
            </span>
          ))}
        </span>
        <div className="mt-1 flex items-center justify-between gap-3">
          <RoundIconsRow size={28} tone="black" />
        </div>
        <span className="mt-2 block w-full rounded-[12px] bg-black py-3.5 text-center text-lg text-white" style={TD_DISPLAY}>
          {TD.playNow}
        </span>
      </div>
    </motion.button>
  );
}

export function HomeScreen({
  onPlayRanked,
  onDaily,
  onSolo,
  dailyDone,
}: {
  onPlayRanked: () => void;
  onDaily: (key: DailyKey) => void;
  onSolo: () => void;
  dailyDone: Partial<Record<DailyKey, string>>;
}) {
  return (
    <>
      <RankedHero onPlay={onPlayRanked} />
      <SectionTitle>{TD.tabDaily}</SectionTitle>
      <DailyCards onOpen={onDaily} done={dailyDone} />
      <BsGroup>
        <BsRow icon={<Zap size={20} color="var(--bs-primary)" />} label={TD.menuSolo} sub={TD.menuSoloSub} onClick={onSolo} />
      </BsGroup>
    </>
  );
}

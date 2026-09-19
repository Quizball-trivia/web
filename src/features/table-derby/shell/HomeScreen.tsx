'use client';

import { Trophy, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { PERF_DOTS, RoundIconsRow, TD_DISPLAY, TicketGlyph } from '../components/brand';
import { TD } from '../lib/copy';
import { DailyCards, type DailyKey } from './DailyScreen';
import { BsGroup, BsRow, NewBadge, SectionTitle } from './ui';

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
      <div className="relative flex flex-col gap-2">
        <span className="bs-text flex items-center gap-1.5 text-[11px] font-bold" style={{ color: 'rgba(0,0,0,0.65)' }}>
          {TD.rankedLabel} · <TicketGlyph size={11} /> {TD.ticketCost}
        </span>
        <span className="text-3xl md:text-4xl" style={{ ...TD_DISPLAY, color: '#0d0d0d' }}>
          {TD.title}
        </span>
        <span className="bs-text text-[12px] md:text-[13px]" style={{ color: 'rgba(0,0,0,0.7)' }}>
          {TD.rankedSub}
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
  onLeaderboard,
  myRank,
  dailyDone,
}: {
  onPlayRanked: () => void;
  onDaily: (key: DailyKey) => void;
  onSolo: () => void;
  onLeaderboard: () => void;
  myRank: number;
  dailyDone: Partial<Record<DailyKey, string>>;
}) {
  return (
    <>
      <RankedHero onPlay={onPlayRanked} />
      <SectionTitle badge={<NewBadge>{TD.badgeNew}</NewBadge>}>{TD.tabDaily}</SectionTitle>
      <DailyCards onOpen={onDaily} done={dailyDone} />
      <BsGroup>
        <BsRow icon={<Zap size={20} color="var(--bs-primary)" />} label={TD.menuSolo} sub={TD.menuSoloSub} onClick={onSolo} />
        <BsRow
          icon={<Trophy size={20} color="var(--bs-primary)" />}
          label={TD.menuLb}
          sub={`${TD.lbYourRank} #${myRank}`}
          onClick={onLeaderboard}
        />
      </BsGroup>
    </>
  );
}

'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Camera, Lock } from 'lucide-react';
import { ClubCrest } from '@/features/mini-games/components/Badges';
import { LeagueBadge } from '@/features/mini-games/components/FutCard';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import type { FifaCardStats } from '@/features/mini-games/data/guessFifaCard';
import { STAT_SHORT, type StatKey } from '../lib/data';
import { Silhouette } from './MiniFutCard';
import { Flag } from './ui';

export type ClueKey = 'nation' | 'position' | 'club' | 'league' | 'rating' | 'photo' | StatKey;
export type ClueCosts = Record<ClueKey, number>;
/** Free-play prices; the daily gets its prices from the session. */
export const DEFAULT_CLUE_COSTS: ClueCosts = { photo: 90, rating: 25, club: 20, league: 15, nation: 10, position: 10, pac: 5, sho: 5, pas: 5, dri: 5, def: 5, phy: 5 };

const STAT_CLUES: ClueKey[] = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];

/**
 * Clues every card starts with, for free: the position and two stats. Enough
 * to reason from, never enough to name the player outright. Fixed per card id
 * so a reload (or the same card months later) shows the same free slots.
 */
export function freeCluesFor(cardId: string): Set<ClueKey> {
  let h = 7;
  for (const ch of cardId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const first = h % STAT_CLUES.length;
  const second = (first + 1 + ((h >>> 8) % (STAT_CLUES.length - 1))) % STAT_CLUES.length;
  return new Set<ClueKey>(['position', STAT_CLUES[first], STAT_CLUES[second]]);
}

/** Everything the board shows — satisfied by a dataset card or a daily session card. */
export interface DetectiveCardData {
  editionLabel: string;
  name: string;
  overall: number;
  position: string;
  nation: string;
  nationCode: string;
  league: string;
  club: string;
  stats: FifaCardStats;
  /** null = no photo available; the photo lock is then disabled. */
  faceUrl: string | null;
}

const GOLD_BG = [
  'radial-gradient(135% 85% at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 40%)',
  'radial-gradient(130% 110% at 50% 104%, rgba(112,80,18,0.4) 0%, rgba(112,80,18,0) 52%)',
  'linear-gradient(180deg, #f9e6a4 0%, #f0d488 20%, #e5c164 48%, #d3ab46 76%, #c69b38 100%)',
].join(', ');

/**
 * The Card Detective board: a full-size gold card where every slot starts as a
 * locked chip showing its clue price. Tapping a chip spends coins and reveals
 * that slot in place, so the card fills in as you investigate.
 */
export function DetectiveCard({
  card,
  costs = DEFAULT_CLUE_COSTS,
  open,
  coins,
  over,
  solved,
  onReveal,
}: {
  card: DetectiveCardData;
  costs?: ClueCosts;
  open: Set<ClueKey>;
  coins: number;
  over: boolean;
  solved: boolean;
  onReveal: (k: ClueKey) => void;
}) {
  const t = useMiniT();
  const is = (k: ClueKey) => over || open.has(k);
  const can = (k: ClueKey) => !over && !open.has(k) && coins >= costs[k] && (k !== 'photo' || !!card.faceUrl);
  const clueName = (k: ClueKey) => (k === 'rating' ? 'OVR' : k === 'photo' ? t('photo') : k.length === 3 ? STAT_SHORT[k as StatKey] : t(k));
  const chip = (k: ClueKey, size: 'lg' | 'md' | 'sm' = 'md', hint?: string) => (
    <span className="flex flex-col items-center gap-0.5">
      <LockChip cost={costs[k]} enabled={can(k)} size={size} onClick={() => onReveal(k)} label={t('Reveal {clue} for {n} coins', { clue: clueName(k), n: costs[k] })} />
      {hint && <span className="font-poppins text-[8px] font-black uppercase tracking-wider text-fut-ink/55">{hint}</span>}
    </span>
  );
  const frame = over ? (solved ? '0 0 0 2px #38B60E, 0 20px 50px rgba(56,182,14,0.4)' : '0 0 0 2px #FB3101, 0 20px 50px rgba(251,49,1,0.32)') : '0 18px 44px rgba(0,0,0,0.55)';
  const statCols: StatKey[][] = [['pac', 'sho', 'pas'], ['dri', 'def', 'phy']];

  return (
    // Fixed-height inner layout: below ~300px the frame would clip the stat
    // rows, so keep a floor and let very narrow screens scroll instead.
    <div className="relative mx-auto w-full min-w-[300px] max-w-[336px] select-none" style={{ aspectRatio: '300 / 424' }}>
      <div className="absolute inset-0 overflow-hidden rounded-[22px]" style={{ background: GOLD_BG, boxShadow: frame }}>
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(116deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 24%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.32) 78%, rgba(255,255,255,0) 100%)', mixBlendMode: 'soft-light' }} />
        <div aria-hidden className="pointer-events-none absolute inset-[5px] rounded-[17px] border border-fut-border/25" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)' }} />

        {/* the edition is free information */}
        <div className="absolute right-3.5 top-3.5 z-30">
          <span className="rounded-lg bg-fut-badge/85 px-3 py-1.5 font-poppins text-[15px] font-black uppercase tracking-wider text-fut-gold-light shadow-sm">{card.editionLabel}</span>
        </div>

        <div className="relative h-[264px]">
          {/* portrait: silhouette with the photo lock on top of it */}
          <div className="absolute inset-x-0 bottom-0 z-0 flex items-end justify-end pr-1">
            <div className="relative flex h-[240px] w-[212px] items-end justify-end">
              <AnimatePresence initial={false}>
                {is('photo') && card.faceUrl ? (
                  <Face key="face" card={card} />
                ) : (
                  <motion.div key="sil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-0 right-2">
                    <Silhouette height={224} />
                  </motion.div>
                )}
              </AnimatePresence>
              {!is('photo') && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pl-8 pt-12">
                  <LockChip cost={costs.photo} enabled={can('photo')} size="lg" icon={Camera} onClick={() => onReveal('photo')} label={t('Reveal {clue} for {n} coins', { clue: t('photo'), n: costs.photo })} />
                </div>
              )}
            </div>
          </div>

          {/* rating / identity column */}
          <div className="relative z-20 flex w-[96px] flex-col items-center pl-3.5 pt-5 text-fut-ink">
            <Slot revealed={is('rating')} h={48} locked={chip('rating', 'lg', 'OVR')}>
              <span className="font-poppins text-[49px] font-black leading-[0.82] tracking-tight">{card.overall}</span>
            </Slot>
            <Slot revealed={is('position')} h={30} locked={chip('position', 'sm', t('POS'))}>
              <span className="font-poppins text-[18px] font-black uppercase leading-none tracking-wide">{card.position}</span>
            </Slot>
            <span className="my-2 h-px w-10 bg-fut-ink/40" />
            <Slot revealed={is('nation')} h={40} locked={chip('nation', 'md', t('NATION'))}>
              <Flag code={card.nationCode} width={34} height={23} />
              <SlotLabel>{card.nation}</SlotLabel>
            </Slot>
            <Slot revealed={is('league')} h={40} locked={chip('league', 'md', t('LEAGUE'))}>
              <LeagueBadge league={card.league} />
              <SlotLabel>{card.league || '—'}</SlotLabel>
            </Slot>
            <Slot revealed={is('club')} h={40} locked={chip('club', 'md', t('CLUB'))}>
              <ClubCrest club={card.club} size={30} />
              <SlotLabel>{card.club}</SlotLabel>
            </Slot>
          </div>
        </div>

        {/* name plate */}
        <div className="relative z-10 mx-4 flex h-10 items-center justify-center">
          <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fut-ink/45 to-transparent" />
          <AnimatePresence mode="wait" initial={false}>
            {over ? (
              <motion.span key="name" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="truncate px-2 font-poppins text-[21px] font-black uppercase tracking-wide text-fut-ink-deep">{card.name}</motion.span>
            ) : (
              <motion.span key="masked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-poppins text-[23px] font-black tracking-[0.5em] text-fut-ink/45">? ? ?</motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* stats: each one its own lock */}
        <div className="relative z-10 mt-2 flex items-stretch justify-center px-4 pb-4 text-fut-ink-deep">
          {statCols.map((col, i) => (
            <div key={i} className={`flex flex-col gap-2 ${i === 0 ? 'pr-5' : 'border-l border-fut-ink/25 pl-5'}`}>
              {col.map((k) => (
                <div key={k} className="flex h-[26px] items-center gap-1.5">
                  <span className="flex w-[52px] justify-end">
                    {is(k) ? (
                      <motion.span initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className="font-poppins text-[23px] font-black leading-none tabular-nums">{card.stats[k]}</motion.span>
                    ) : (
                      chip(k, 'sm')
                    )}
                  </span>
                  <span className="font-poppins text-[12px] font-bold uppercase tracking-wide text-fut-ink/85">{STAT_SHORT[k]}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Slot({ revealed, locked, h, children }: { revealed: boolean; locked: React.ReactNode; h: number; children: React.ReactNode }) {
  return (
    <div className="relative mb-1 flex w-full flex-col items-center justify-center" style={{ height: h }}>
      <AnimatePresence mode="wait" initial={false}>
        {revealed ? (
          <motion.div key="v" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 18 }} className="flex flex-col items-center gap-0.5">{children}</motion.div>
        ) : (
          <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.6 }}>{locked}</motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SlotLabel({ children }: { children: React.ReactNode }) {
  return <span className="max-w-[86px] truncate text-center font-poppins text-[9px] font-bold uppercase leading-none tracking-wide text-fut-ink/80">{children}</span>;
}

/** A locked slot: lock icon + coin price. Pulses while affordable, dims when not. */
function LockChip({ cost, enabled, onClick, label, size = 'md', icon: Icon = Lock }: { cost: number; enabled: boolean; onClick: () => void; label: string; size?: 'lg' | 'md' | 'sm'; icon?: typeof Lock }) {
  const reduceMotion = useReducedMotion();
  const dims = size === 'lg' ? 'h-[34px] px-2.5 text-[13px]' : size === 'md' ? 'h-[27px] px-2 text-[11px]' : 'h-[22px] px-1.5 text-[10px]';
  const iconCls = size === 'lg' ? 'size-4' : 'size-3';
  return (
    <motion.button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      aria-label={label}
      whileTap={enabled ? { scale: 0.92 } : undefined}
      animate={enabled ? { boxShadow: reduceMotion ? '0 0 10px rgba(255,213,74,0.6)' : ['0 0 6px rgba(255,213,74,0.35)', '0 0 12px rgba(255,213,74,0.7)', '0 0 6px rgba(255,213,74,0.35)'] } : { boxShadow: '0 0 0 rgba(0,0,0,0)' }}
      transition={reduceMotion ? { duration: 0.2 } : { duration: 1.4, repeat: Infinity }}
      className={`inline-flex items-center gap-1 rounded-[6px] border-2 font-poppins font-black tabular-nums ${dims} ${enabled ? 'border-brand-yellow bg-fut-badge/85 text-brand-yellow' : 'border-dashed border-fut-ink/40 bg-fut-ink/12 text-fut-ink/60'}`}
    >
      <Icon className={iconCls} /> {cost}
    </motion.button>
  );
}

function Face({ card }: { card: DetectiveCardData }) {
  const [failed, setFailed] = useState(false);
  const src = card.faceUrl;
  if (!src || failed) return <div className="absolute bottom-0 right-2"><Silhouette height={224} /></div>;
  return <motion.img key="face" src={src} alt="" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} onError={() => setFailed(true)} className="absolute bottom-0 right-1 h-[236px] w-auto object-contain drop-shadow-[0_8px_10px_rgba(60,44,8,0.4)]" />;
}

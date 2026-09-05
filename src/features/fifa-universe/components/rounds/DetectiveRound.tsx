'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, Coins, Flag as FlagIcon, Lock, MapPin, Shield, Star, Trophy } from 'lucide-react';
import { ClubCrest } from '@/features/mini-games/components/Badges';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { matchesName } from '@/features/mini-games/lib/matching';
import { STAT_KEYS, STAT_SHORT, drawCard, editionLabel, tierAtLeast, type StatKey } from '../../lib/data';
import type { RoundProps } from '../../lib/runner';
import { faceUrl, Silhouette } from '../MiniFutCard';
import { Flag, NameInput, PrimaryButton, ResultBanner, GOLD } from '../ui';

export const START_COINS = 100;
const WRONG_GUESS_COST = 15;
type ClueKey = 'nation' | 'position' | 'club' | 'league' | 'rating' | 'photo' | StatKey;
const COST: Record<ClueKey, number> = { nation: 10, position: 10, club: 20, league: 15, rating: 25, photo: 50, pac: 5, sho: 5, pas: 5, dri: 5, def: 5, phy: 5 };

/** FIFA Card Detective — everything starts hidden; spend clue coins to reveal, then name the player. */
export function DetectiveRound({ level, used, onDone }: RoundProps) {
  const t = useMiniT();
  const [card] = useState(() => {
    const c = drawCard({ tiers: tierAtLeast(level), exclude: used });
    return c;
  });
  useEffect(() => { used.add(card.name); }, [used, card]);
  const [coins, setCoins] = useState(START_COINS);
  const [open, setOpen] = useState<Set<ClueKey>>(() => new Set());
  const [result, setResult] = useState<{ correct: boolean; gaveUp: boolean } | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const over = result !== null;

  const reveal = (k: ClueKey) => {
    if (over || open.has(k) || coins < COST[k]) return;
    setCoins((c) => c - COST[k]);
    setOpen((s) => new Set(s).add(k));
  };
  const guess = (v: string) => {
    if (over) return;
    if (matchesName(v, card.accepted).ok) setResult({ correct: true, gaveUp: false });
    else {
      setWrong(v);
      setCoins((c) => Math.max(0, c - WRONG_GUESS_COST));
    }
  };
  const points = result?.correct ? coins * 10 : 0;
  const is = (k: ClueKey) => open.has(k) || over;

  const tile = (k: ClueKey, icon: typeof Lock, label: string, children: React.ReactNode) => (
    <ClueTile key={k} icon={icon} label={label} cost={COST[k]} opened={is(k)} disabled={over || coins < COST[k]} onReveal={() => reveal(k)}>{children}</ClueTile>
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-poppins text-[11px] font-black uppercase tracking-wider text-white/55">{editionLabel(card.edition)} · {t('identify with the least information')}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-yellow/15 px-2.5 py-1 font-poppins text-sm font-black text-brand-yellow"><Coins className="size-4" /> {coins}</span>
      </div>

      <div className="flex gap-3">
        <div className="relative flex h-[150px] w-[112px] shrink-0 items-end justify-center overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(180deg, #f9e6a4 0%, #e5c164 60%, #c69b38 100%)' }}>
          {is('photo') && faceUrl(card) ? (
            <motion.img key="f" initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={faceUrl(card)!} alt="" className="h-[120px] w-auto object-contain" />
          ) : (
            <Silhouette height={104} />
          )}
          {!is('photo') && (
            <button type="button" disabled={over || coins < COST.photo} onClick={() => reveal('photo')} className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-lg bg-[#3a2c08]/85 py-1.5 font-poppins text-[11px] font-black text-[#f4e3a2] disabled:opacity-50">
              <Camera className="size-3.5" /> {COST.photo}
            </button>
          )}
        </div>
        <div className="grid flex-1 grid-cols-2 gap-1.5">
          {tile('rating', Star, 'OVR', <span className="text-xl" style={{ color: GOLD }}>{card.overall}</span>)}
          {tile('position', MapPin, t('Position'), card.position)}
          {tile('nation', FlagIcon, t('Nation'), <><Flag code={card.nationCode} /> <span className="truncate">{card.nation}</span></>)}
          {tile('league', Trophy, t('League'), <span className="truncate text-xs">{card.league}</span>)}
          {tile('club', Shield, t('Club'), <><ClubCrest club={card.club} size={18} /> <span className="truncate text-xs">{card.club}</span></>)}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-6 gap-1.5">
        {STAT_KEYS.map((k) => tile(k, Lock, STAT_SHORT[k], card.stats[k]))}
      </div>

      <div className="mt-4 space-y-2.5">
        {!over ? (
          <>
            <NameInput onSubmit={guess} autoFocus={false} />
            <div className="flex items-center justify-between">
              <span className="font-poppins text-[11px] font-black uppercase tracking-wider" style={{ color: wrong ? '#FB3101' : 'rgba(255,255,255,0.4)' }}>
                {wrong ? t('Not {name} · −{n} coins', { name: wrong, n: WRONG_GUESS_COST }) : t('Correct now = {n} pts', { n: coins * 10 })}
              </span>
              <button type="button" onClick={() => setResult({ correct: false, gaveUp: true })} className="font-poppins text-[11px] font-black uppercase tracking-wider text-white/45 underline-offset-2 hover:underline">{t('Give up')}</button>
            </div>
          </>
        ) : (
          <ResultBanner correct={result.correct} points={points} headline={result.correct ? t('Solved with {n} coins left', { n: coins }) : t('The answer')} answer={card.name} detail={`${card.club} · ${card.overall} OVR · ${editionLabel(card.edition)}`} onNext={() => onDone({ correct: result.correct, points, label: card.name, tag: editionLabel(card.edition), maxPoints: START_COINS * 10 })} />
        )}
        {!over && <PrimaryButton tone="ghost" onClick={() => reveal('nation')} disabled={is('nation') || coins < COST.nation} className="!h-10 !min-h-0 !text-xs">{t('Cheapest clue')}: {t('Nation')} · {COST.nation}</PrimaryButton>}
      </div>
    </div>
  );
}

function ClueTile({ icon: Icon, label, cost, opened, disabled, onReveal, children }: { icon: typeof Lock; label: string; cost: number; opened: boolean; disabled: boolean; onReveal: () => void; children: React.ReactNode }) {
  return (
    <button type="button" disabled={opened || disabled} onClick={onReveal} className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center transition-colors ${opened ? 'bg-white/[0.06]' : !disabled ? 'bg-brand-blue/50 hover:bg-brand-blue/70' : 'bg-white/[0.03] opacity-50'}`}>
      <span className="font-poppins text-[9px] font-black uppercase tracking-wider text-white/50">{label}</span>
      <AnimatePresence mode="wait" initial={false}>
        {opened ? (
          <motion.span key="v" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5 font-poppins text-sm font-black text-white">{children}</motion.span>
        ) : (
          <motion.span key="c" className="flex items-center gap-1 font-poppins text-[11px] font-black text-brand-yellow">
            <Icon className="size-3.5" /> {cost}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

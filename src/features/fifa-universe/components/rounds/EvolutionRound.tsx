'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ClubCrest } from '@/features/mini-games/components/Badges';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { drawJourney, editionLabel, nameChoices, tierAtLeast } from '../../lib/data';
import type { RoundProps } from '../../lib/runner';
import { MiniFutCard } from '../MiniFutCard';
import { Choices, Flag, ResultBanner, GOLD, GREEN, RED } from '../ui';

const CARD_MS = 2200;
const CLUE_MS = 2000;
const WRONG_PENALTY = 25;
const LOCKOUT_MS = 2000;
const CARD_W = 88;
const GAP = 10;
const CURVE_H = 56;

type Clue = 'nation' | 'position' | 'club';
const CLUES: Clue[] = ['nation', 'position', 'club'];
const pointsFor = (cardsShown: number, clues: number) => Math.max(30, 100 - (cardsShown - 1) * 12 - clues * 10);

/**
 * FIFA Evolution — the same player's cards slide in year after year with the
 * OVR curve drawn above them; faces and names stay hidden. Buzz whenever you
 * recognise the career: a wrong buzz costs points and a 2s lockout, two end it.
 */
export function EvolutionRound({ level, used, onDone }: RoundProps) {
  const t = useMiniT();
  const [journey] = useState(() => drawJourney({ tiers: tierAtLeast(level), exclude: used }));
  useEffect(() => { used.add(journey.name); }, [used, journey]);
  const [options] = useState(() => nameChoices(journey.peak));
  const [shown, setShown] = useState(1);
  const [clues, setClues] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [wrongs, setWrongs] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const total = journey.cards.length;
  const rowRef = useRef<HTMLDivElement>(null);
  const resolved = picked === journey.name;
  const over = picked !== null;

  // Reveal clock: one card per tick, then one clue per tick.
  useEffect(() => {
    if (over) return;
    if (shown < total) {
      const id = window.setTimeout(() => setShown((s) => s + 1), CARD_MS);
      return () => window.clearTimeout(id);
    }
    if (clues < CLUES.length) {
      const id = window.setTimeout(() => setClues((c) => c + 1), CLUE_MS);
      return () => window.clearTimeout(id);
    }
  }, [over, shown, clues, total]);

  useEffect(() => {
    if (lockedUntil <= now) return;
    const id = window.setTimeout(() => setNow(Date.now()), lockedUntil - now + 20);
    return () => window.clearTimeout(id);
  }, [lockedUntil, now]);

  const locked = lockedUntil > now;
  const live = Math.max(0, pointsFor(shown, clues) - wrongs * WRONG_PENALTY);
  const points = resolved ? live : 0;

  const pick = (name: string) => {
    if (over || locked) return;
    if (name === journey.name) { setPicked(name); return; }
    setWrongs((w) => w + 1);
    setLockedUntil(Date.now() + LOCKOUT_MS);
    setNow(Date.now());
    if (wrongs + 1 >= 2) setPicked(name);
  };

  const visible = over ? total : shown;
  // Keep the newest card in view as the row grows past the phone width.
  useEffect(() => {
    const el = rowRef.current;
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
  }, [visible]);
  const peak = journey.peak;
  const chips: Array<{ key: Clue; node: React.ReactNode }> = [
    { key: 'nation', node: <><Flag code={journey.nationCode} /> {journey.nation}</> },
    { key: 'position', node: <>{peak.position}</> },
    { key: 'club', node: <><ClubCrest club={peak.club} size={18} /> {peak.club}</> },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between font-poppins text-[11px] font-black uppercase tracking-wider text-white/55">
        <span>{t('Same player, year after year')}</span>
        <span className="text-brand-yellow">{over ? '' : `${live} ${t('pts')}`}</span>
      </div>

      <div ref={rowRef} className="-mx-4 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none]">
        <div className="relative min-w-max">
          <RatingCurve overalls={journey.cards.map((c) => c.overall)} visible={visible} peak={peak.overall} />
          <div className="flex items-end" style={{ gap: GAP }}>
            <AnimatePresence initial={false}>
              {journey.cards.slice(0, visible).map((c) => (
                <motion.div key={c.id} initial={{ opacity: 0, x: 70, rotate: 6 }} animate={{ opacity: 1, x: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }} className="flex flex-col items-center gap-1">
                  <MiniFutCard card={c} size="sm" showStats showFace={over} showName={over} showIdentity={over} highlight={over && c.id === peak.id ? 'pick' : null} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="mt-2 flex min-h-[28px] flex-wrap gap-1.5">
        {chips.map((c, i) =>
          i < clues || over ? (
            <motion.span key={c.key} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/40 px-2.5 py-1 font-poppins text-[11px] font-black uppercase tracking-wide text-white">
              {c.node}
            </motion.span>
          ) : null,
        )}
      </div>

      <div className="mt-3">
        <Choices options={options.map((o) => ({ id: o.name, label: o.name }))} picked={over ? picked : null} correctId={over ? journey.name : null} onPick={pick} disabled={locked} />
        {!over && (locked || wrongs > 0) && (
          <p className="mt-2 text-center font-poppins text-[11px] font-black uppercase tracking-wider" style={{ color: locked ? RED : GREEN }}>
            {locked ? t('Wrong — locked for 2s (−{n})', { n: WRONG_PENALTY }) : t('One more miss ends the round')}
          </p>
        )}
        {over && (
          <div className="mt-3">
            <ResultBanner correct={resolved} points={points} answer={journey.name} detail={`${editionLabel(journey.cards[0].edition)} → ${editionLabel(journey.cards[total - 1].edition)} · ${t('peak')} ${peak.overall} · ${peak.club}`} onNext={() => onDone({ correct: resolved, points, label: journey.name, tag: `${total} ${t('cards')}`, maxPoints: 100 })} />
          </div>
        )}
      </div>
    </div>
  );
}

/** The OVR curve above the card row: one point per card, drawn as cards arrive. */
function RatingCurve({ overalls, visible, peak }: { overalls: number[]; visible: number; peak: number }) {
  const step = CARD_W + GAP;
  const width = overalls.length * step - GAP;
  const min = Math.min(...overalls);
  const max = Math.max(...overalls);
  const y = (v: number) => (max === min ? CURVE_H / 2 : CURVE_H - 8 - ((v - min) / (max - min)) * (CURVE_H - 16));
  const x = (i: number) => i * step + CARD_W / 2;
  const pts = overalls.slice(0, visible).map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return (
    <svg width={width} height={CURVE_H + 6} className="mb-1 block overflow-visible" aria-hidden>
      <motion.polyline points={pts} fill="none" stroke={GOLD} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" initial={false} animate={{ opacity: 1 }} />
      {overalls.slice(0, visible).map((v, i) => (
        <g key={i}>
          <motion.circle cx={x(i)} cy={y(v)} r={v === peak ? 5 : 3.5} fill={v === peak ? GOLD : '#0f1420'} stroke={GOLD} strokeWidth={2} initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ transformOrigin: `${x(i)}px ${y(v)}px` }} />
          <motion.text x={x(i)} y={y(v) - 9} textAnchor="middle" fontSize={11} fontWeight={900} fill={v === peak ? GOLD : '#fff'} fontFamily="Poppins, sans-serif" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {v}
          </motion.text>
        </g>
      ))}
    </svg>
  );
}

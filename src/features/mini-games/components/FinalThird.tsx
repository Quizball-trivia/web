'use client';

/**
 * FINAL THIRD — house-banked football risk game.
 *
 * Loop: stake → one football question → the RNG has pre-assigned 4 GOAL and
 * 2 SAVE zones on the goal. A correct answer runs a SCOUT REPORT that reveals
 * (and locks) one SAVE zone, so the shot is 4/5 = 80% at 1.20x (then ×1.25 per
 * continued attack). A wrong answer means a BLIND shot at 4/6 = 66.7% but a
 * bigger 1.40x. After every goal: TAKE the pot or NEXT ATTACK. Knowledge
 * improves your vision of the goal — it never removes the risk (max RTP 96%).
 *
 * The social layer (live-wins ticker, crowd pulse, longest runs) is purely
 * cosmetic client-side flavour — it never influences the RNG or payouts.
 * Virtual points only.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Coins, Eye, Radio, Trophy, X } from 'lucide-react';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { KeeperGlove } from './PenaltyShootout';
import { getTrivia, type TriviaQuestion } from '../data/trivia';
import { useMiniLocale, useMiniT } from '../lib/i18n';

const BALL_URL = '/assets/brand/goal-ball-small.webp';
const STAKE = 10;
const START_BALANCE = 100;
const SAVE_ZONES = 2;
const INFORMED_FIRST_MULT = 1.2;
const INFORMED_NEXT_MULT = 1.25;
const BLIND_MULT = 1.4;
/** Informed-path ladder shown under the HUD. */
const LADDER = [1.2, 1.5, 1.875, 2.34, 2.93, 3.66];

interface Zone {
  id: string;
  x: number;
  y: number;
}
const ZONES: Zone[] = [
  { id: 'TL', x: 22, y: 24 },
  { id: 'TC', x: 50, y: 22 },
  { id: 'TR', x: 78, y: 24 },
  { id: 'BL', x: 22, y: 52 },
  { id: 'BC', x: 50, y: 54 },
  { id: 'BR', x: 78, y: 52 },
];

function pickSaveZones(): Set<string> {
  const ids = ZONES.map((z) => z.id);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return new Set(ids.slice(0, SAVE_ZONES));
}

/** Tiny deterministic PRNG so the fake crowd numbers are stable per attack. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const CROWD_NAMES = [
  'გიორგი7', 'ნიკა77', 'ლუკა99', 'თაზო10', 'საბა_fc', 'დათო21',
  'ბექა_მ', 'სანდრო9', 'ვატო_ზ', 'რეზი_კ', 'ილია21', 'ანზორი',
] as const;

type Beat = 'bet' | 'question' | 'shoot' | 'resolving' | 'goal' | 'saved' | 'cashed';

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

/** The app's actual coin sprite (same asset as the daily hub reward pills). */
function Coin({ size = 16 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/assets/coin-1.png?v=2"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className="inline-block object-contain align-[-2px]"
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

interface TickerEntry {
  id: number;
  name: string;
  amount: number;
  mult: number;
  minutesAgo: number;
}

export function FinalThird({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const miniLocale = useMiniLocale();
  const trivia = useMemo(() => getTrivia(miniLocale), [miniLocale]);

  const [balance, setBalance] = useState(START_BALANCE);
  const [beat, setBeat] = useState<Beat>('bet');
  const [attack, setAttack] = useState(0);
  const [pot, setPot] = useState(0);
  const [qIndex, setQIndex] = useState(() => Math.floor(Math.random() * 1000));
  const [selected, setSelected] = useState<number | null>(null);
  const [informed, setInformed] = useState<boolean | null>(null);
  const [saves, setSaves] = useState<Set<string>>(() => new Set());
  const [revealedSave, setRevealedSave] = useState<string | null>(null);
  const [shotZone, setShotZone] = useState<Zone | null>(null);
  const [scored, setScored] = useState<boolean | null>(null);
  const [lastTake, setLastTake] = useState<number | null>(null);
  const [bestRun, setBestRun] = useState<number | null>(null);
  const [ticker, setTicker] = useState<TickerEntry[]>([]);
  const [playingNow, setPlayingNow] = useState(1284);
  const tickerId = useRef(0);
  const timersRef = useRef<number[]>([]);

  // ── Fake stadium: live-wins ticker + drifting player count. Cosmetic only.
  useEffect(() => {
    const push = () => {
      const rnd = seeded(Date.now() % 1_000_000);
      const mult = [1.2, 1.5, 1.5, 1.875, 1.875, 2.34, 2.93, 4.58][Math.floor(rnd() * 8)];
      setTicker((cur) => [
        {
          id: (tickerId.current += 1),
          name: CROWD_NAMES[Math.floor(rnd() * CROWD_NAMES.length)],
          amount: Math.round(STAKE * mult * 100) / 100,
          mult,
          minutesAgo: 0,
        },
        ...cur.slice(0, 3).map((e) => ({ ...e, minutesAgo: e.minutesAgo + (rnd() > 0.5 ? 1 : 0) })),
      ]);
      setPlayingNow((n) => Math.max(900, n + Math.floor(rnd() * 21) - 10));
    };
    push();
    const id = window.setInterval(push, 4200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);
  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  };

  const question: TriviaQuestion = trivia[qIndex % trivia.length];
  const mult = informed ? (attack === 0 ? INFORMED_FIRST_MULT : INFORMED_NEXT_MULT) : BLIND_MULT;
  const potential = useMemo(() => Math.round(pot * mult * 100) / 100, [pot, mult]);
  const runMult = pot > 0 ? Math.round((pot / STAKE) * 100) / 100 : 0;

  // Deterministic crowd-pulse numbers per attack (stable across re-renders).
  const pulse = useMemo(() => {
    const rnd = seeded(qIndex * 7919 + attack * 104729);
    return {
      answered: 55 + Math.floor(rnd() * 30),
      scored: 55 + Math.floor(rnd() * 25),
      cashed: 20 + Math.floor(rnd() * 25),
      going: 900 + Math.floor(rnd() * 700),
    };
  }, [qIndex, attack]);

  const beginAttack = () => {
    setSelected(null);
    setInformed(null);
    setRevealedSave(null);
    setShotZone(null);
    setScored(null);
    setSaves(pickSaveZones());
    setQIndex((q) => q + 1);
    setBeat('question');
  };

  const startRound = () => {
    if (balance < STAKE) return;
    setBalance((b) => b - STAKE);
    setPot(STAKE);
    setAttack(0);
    setLastTake(null);
    beginAttack();
  };

  const answer = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    const correct = i === question.answer;
    setInformed(correct);
    later(() => {
      if (correct) {
        setSaves((cur) => {
          const first = [...cur][Math.floor(Math.random() * cur.size)];
          setRevealedSave(first);
          return cur;
        });
      }
      setBeat('shoot');
    }, 950);
  };

  const shoot = (zone: Zone) => {
    if (beat !== 'shoot' || shotZone) return;
    if (zone.id === revealedSave) return;
    setShotZone(zone);
    setBeat('resolving');
    const isSave = saves.has(zone.id);
    later(() => {
      if (isSave) {
        setScored(false);
        setBeat('saved');
      } else {
        setScored(true);
        const next = potential;
        setPot(next);
        setBestRun((b) => Math.max(b ?? 0, Math.round((next / STAKE) * 100) / 100));
        setBeat('goal');
      }
    }, 880);
  };

  const cashOut = () => {
    setBalance((b) => Math.round((b + pot) * 100) / 100);
    setLastTake(pot);
    setBeat('cashed');
  };

  const nextAttack = () => {
    setAttack((a) => a + 1);
    beginAttack();
  };

  const ladderIndex = pot > 0 ? LADDER.findIndex((m) => Math.abs(m - runMult * (beat === 'goal' ? 1 : mult)) < 0.01) : -1;

  return (
    <MiniGameShell
      backHref={backHref}
      title="Final Third"
      subtitle={t('Know football. Read the goal. Take the shot.')}
      accent="#58CC02"
      headerRight={<StatPill label={t('Balance')} value={fmt(balance)} color="#FFD700" />}
    >
      {/* Live stadium strip: player count + rotating last win. Cosmetic. */}
      <div className="mt-1 flex items-center justify-between gap-2 px-1 py-1">
        <span className="flex items-center gap-1.5 font-poppins text-[10px] font-black uppercase tracking-wide text-brand-red-soft">
          <Radio className="size-3.5 animate-pulse" /> {t('{n} playing now', { n: playingNow.toLocaleString() })}
        </span>
        <div className="relative h-4 min-w-0 flex-1 overflow-hidden text-right">
          <AnimatePresence mode="popLayout">
            {ticker[0] && (
              <motion.span
                key={ticker[0].id}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute right-0 top-0 truncate font-poppins text-[10px] font-bold text-white/60"
              >
                {ticker[0].name} <span className="text-brand-gold">+{fmt(ticker[0].amount)} <Coin size={12} /></span>{' '}
                <span className="text-white/40">×{ticker[0].mult}</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* HUD: stake | pot | next multiplier */}
      <div className="mt-2 flex items-center justify-center gap-2 font-poppins text-[12px] font-black uppercase tracking-wide text-white/70">
        <span className="rounded-full bg-white/[0.06] px-3 py-1.5">{t('Stake')} {STAKE} <Coin size={14} /></span>
        {pot > 0 && beat !== 'cashed' && (
          <motion.span
            key={pot}
            initial={{ scale: 1.25 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="rounded-full bg-brand-yellow/15 px-3 py-1.5 text-brand-yellow"
          >
            {t('Pot')} {fmt(pot)} <Coin size={14} />
          </motion.span>
        )}
        {(beat === 'question' || beat === 'shoot') && (
          <span className="rounded-full bg-brand-green/15 px-3 py-1.5 text-brand-green">×{mult}</span>
        )}
      </div>

      {/* Multiplier ladder (informed path) */}
      <div className="mt-2 flex items-center justify-center gap-1">
        {LADDER.map((m, i) => {
          const reached = pot > 0 && runMult >= m - 0.01;
          const isNext = i === (ladderIndex >= 0 ? ladderIndex : LADDER.findIndex((x) => x > runMult));
          return (
            <span
              key={m}
              className={`rounded-md px-1.5 py-0.5 font-poppins text-[9px] font-black tabular-nums ${
                reached
                  ? 'bg-brand-green/25 text-brand-green'
                  : isNext && pot > 0
                    ? 'bg-brand-yellow/20 text-brand-yellow'
                    : 'bg-white/[0.05] text-white/35'
              }`}
            >
              {m}x
            </span>
          );
        })}
      </div>

      {/* Goal — shakes on a save, bursts on a goal */}
      <motion.div
        className="mt-3"
        animate={
          beat === 'saved'
            ? { x: [0, -7, 7, -5, 5, 0] }
            : beat === 'goal'
              ? { scale: [1, 1.015, 1] }
              : { x: 0, scale: 1 }
        }
        transition={{ duration: 0.45 }}
      >
        <FinalThirdGoal
          picking={beat === 'shoot'}
          revealedSave={revealedSave}
          scouting={beat === 'shoot' && informed === true}
          shotZone={shotZone}
          resolving={beat === 'resolving'}
          settled={beat === 'goal' || beat === 'saved'}
          scored={scored}
          onPick={shoot}
        />
      </motion.div>

      {/* Beat area */}
      <div className="mt-3 flex-1">
        <AnimatePresence mode="wait">
          {beat === 'bet' && (
            <motion.div key="bet" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {lastTake != null && (
                <div className="text-center font-poppins text-lg font-black text-brand-gold">
                  <Coins className="mr-1 inline size-5" /> {t('Cashed out {amount}!', { amount: fmt(lastTake) })}
                </div>
              )}
              <p className="text-center font-poppins text-xs font-semibold text-white/55">
                {t('Answer to scout the keeper — knowledge sharpens the shot, the risk stays.')}
              </p>
              {balance >= STAKE ? (
                <button
                  type="button"
                  onClick={startRound}
                  className="h-14 w-full rounded-2xl bg-brand-green font-poppins text-lg font-black uppercase tracking-wide text-white shadow-[0_8px_24px_rgba(88,204,2,0.25)] active:scale-[0.98]"
                >
                  {t('Stake {n} & attack', { n: STAKE })}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setBalance(START_BALANCE)}
                  className="h-14 w-full rounded-2xl bg-brand-yellow font-poppins text-lg font-black uppercase tracking-wide text-black active:scale-[0.98]"
                >
                  {t('Top up (demo)')}
                </button>
              )}
              <StadiumBoard t={t} bestRun={bestRun} />
            </motion.div>
          )}

          {beat === 'question' && (
            <motion.div key={`q-${qIndex}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl border border-white/15 bg-brand-blue p-4">
              <div className="mb-2 flex items-center justify-between font-poppins text-[10px] font-black uppercase tracking-wider text-white/80">
                <span>{t('Attack {n}', { n: attack + 1 })}</span>
                <span>{t('Answer to scout the keeper')}</span>
              </div>
              <p className="mb-3 font-poppins text-base font-bold leading-snug text-white">{question.q}</p>
              <div className="grid grid-cols-1 gap-2">
                {question.options.map((opt, i) => {
                  const state = selected === null ? 'idle' : i === question.answer ? 'correct' : selected === i ? 'wrong' : 'dim';
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={selected !== null}
                      onClick={() => answer(i)}
                      className={`flex items-center justify-between rounded-xl border-2 px-3.5 py-3 text-left font-poppins text-sm font-bold transition-colors ${
                        state === 'idle'
                          ? 'border-brand-yellow/70 bg-transparent text-white shadow-[0_0_6px_1px_rgba(255,229,0,0.12)] hover:border-brand-yellow'
                          : state === 'correct'
                            ? 'border-brand-green bg-brand-green/20 text-white'
                            : state === 'wrong'
                              ? 'border-brand-red bg-brand-red/20 text-white'
                              : 'border-white/15 bg-transparent text-white/40'
                      }`}
                    >
                      {opt}
                      {state === 'correct' && <Check className="size-4 text-brand-green" />}
                      {state === 'wrong' && <X className="size-4 text-brand-red" />}
                    </button>
                  );
                })}
              </div>
              {selected !== null && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-center font-poppins text-[10px] font-bold uppercase tracking-wide text-white/50">
                  {t('{pct}% answered correctly', { pct: pulse.answered })}
                </motion.p>
              )}
            </motion.div>
          )}

          {beat === 'shoot' && (
            <motion.div key="shoot" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2 text-center">
              {informed ? (
                <motion.div
                  initial={{ scale: 0.7, opacity: 0, rotate: -3 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                  className="mx-auto inline-flex items-center gap-2 rounded-full bg-brand-green/15 px-4 py-2 font-poppins text-sm font-black uppercase text-brand-green"
                >
                  <Eye className="size-4" /> {t('SCOUT REPORT ✓ — one save zone revealed')}
                </motion.div>
              ) : (
                <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-brand-orange/15 px-4 py-2 font-poppins text-sm font-black uppercase text-brand-orange">
                  {t('No scout — blind shot pays more')}
                </div>
              )}
              <p className="font-poppins text-xs font-bold uppercase tracking-wide text-white/60">
                {t('Pick your shot zone')} · {informed ? t('4 GOAL · 1 SAVE') : t('4 GOAL · 2 SAVE')} · {fmt(pot)} → {fmt(potential)} <Coin size={13} />
              </p>
            </motion.div>
          )}

          {beat === 'goal' && (
            <motion.div key="goal" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3 text-center">
              <motion.div
                initial={{ scale: 2.2, opacity: 0, rotate: -6 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                className="font-poppins text-3xl font-black uppercase text-brand-green drop-shadow-[0_0_18px_rgba(88,204,2,0.5)]"
              >
                {t('GOAL!')}
              </motion.div>
              <div className="flex flex-wrap items-center justify-center gap-2 font-poppins text-[10px] font-bold uppercase tracking-wide text-white/50">
                <span>{t('{pct}% scored', { pct: pulse.scored })}</span>
                <span>·</span>
                <span>{t('{pct}% cashed out', { pct: pulse.cashed })}</span>
                <span>·</span>
                <span className="text-brand-orange">🔥 {t('{n} going NEXT ATTACK', { n: pulse.going.toLocaleString() })}</span>
              </div>
              <div className="flex gap-2">
                <motion.button
                  type="button"
                  onClick={cashOut}
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="h-14 flex-1 rounded-2xl bg-brand-yellow font-poppins text-base font-black uppercase tracking-wide text-black active:scale-[0.98]"
                >
                  {t('TAKE {amount}', { amount: fmt(pot) })} <Coin size={18} />
                </motion.button>
                <button
                  type="button"
                  onClick={nextAttack}
                  className="h-14 flex-1 rounded-2xl bg-brand-green font-poppins text-base font-black uppercase tracking-wide text-white active:scale-[0.98]"
                >
                  {t('NEXT ATTACK')} ⚽
                </button>
              </div>
              <p className="font-poppins text-[11px] font-semibold text-white/45">
                {t('Next attack risks the whole pot — the keeper resets.')}
              </p>
            </motion.div>
          )}

          {beat === 'saved' && (
            <motion.div key="saved" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3 text-center">
              <motion.div
                initial={{ scale: 1.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className="font-poppins text-3xl font-black uppercase text-brand-red drop-shadow-[0_0_18px_rgba(255,75,75,0.45)]"
              >
                {t('SAVED!')}
              </motion.div>
              <p className="font-poppins text-xs font-semibold text-white/55">{t('The keeper read it — pot lost.')}</p>
              <button
                type="button"
                onClick={() => setBeat('bet')}
                className="h-14 w-full rounded-2xl bg-brand-green font-poppins text-lg font-black uppercase tracking-wide text-white active:scale-[0.98]"
              >
                {t('New round')}
              </button>
              <StadiumBoard t={t} bestRun={bestRun} />
            </motion.div>
          )}

          {beat === 'cashed' && (
            <motion.div key="cashed" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3 text-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 15 }}
                className="font-poppins text-3xl font-black text-brand-gold drop-shadow-[0_0_18px_rgba(255,215,0,0.4)]"
              >
                <Coins className="mr-1.5 inline size-7" /> +{fmt(lastTake ?? 0)}
              </motion.div>
              <button
                type="button"
                onClick={() => setBeat('bet')}
                className="h-14 w-full rounded-2xl bg-brand-green font-poppins text-lg font-black uppercase tracking-wide text-white active:scale-[0.98]"
              >
                {t('New round')}
              </button>
              <StadiumBoard t={t} bestRun={bestRun} />
            </motion.div>
          )}

          {beat === 'resolving' && <motion.div key="resolving" className="h-14" />}
        </AnimatePresence>
      </div>
    </MiniGameShell>
  );
}

/** Longest-runs leaderboard styled like the Betsson event leaderboard:
 *  orange border, orange #1 row, tilted "Powered by" badge. Flavour rows +
 *  the player's own best run. */
function StadiumBoard({ t, bestRun }: { t: (k: string, v?: Record<string, string | number>) => string; bestRun: number | null }) {
  const rows: Array<{ name: string; mult: number; you?: boolean }> = [
    { name: 'თაზო10', mult: 18.31 },
    { name: 'გიორგი7', mult: 14.66 },
    { name: 'ნიკა77', mult: 9.16 },
    { name: 'საბა_fc', mult: 5.72 },
  ];
  if (bestRun != null && bestRun > 1) rows.push({ name: t('You'), mult: bestRun, you: true });
  rows.sort((a, b) => b.mult - a.mult);

  return (
    <div className="relative mt-2">
      {/* Betsson badge — same treatment as the event leaderboard. */}
      <div
        className="absolute -top-1 -right-2 z-20 flex flex-col items-start rounded-md px-2 py-1"
        style={{ backgroundColor: '#FF6C0A', width: 120, height: 34, rotate: '-5.8deg', border: '2px solid #000', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
      >
        <span className="text-[6px] font-bold uppercase tracking-wider text-white/80 leading-none">Powered by</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/betsson/3.png" alt="Betsson Sport" width={96} height={18} className="mt-0.5 h-4 w-auto object-contain" />
      </div>

      <div className="mb-2 flex items-center gap-1.5 px-1 font-poppins text-[10px] font-black uppercase tracking-wider text-white/60">
        <Trophy className="size-3.5 text-[#FF6C0A]" /> {t('Longest runs today')}
      </div>
      <div className="overflow-hidden rounded-[10px] border-2" style={{ borderColor: '#FF6C0A' }}>
        <div className="divide-y divide-white/5">
          {rows.slice(0, 5).map((r, i) => (
            <div
              key={r.name}
              className={`flex items-center justify-between px-3 py-2.5 font-poppins text-sm font-bold ${
                i === 0 ? 'text-white' : r.you ? 'bg-brand-green text-white' : 'text-white/70 hover:bg-white/[0.03]'
              }`}
              style={i === 0 ? { backgroundColor: '#FF6C0A' } : undefined}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-lg font-black tabular-nums">#{i + 1}</span>
                {r.name}
              </span>
              <span className="text-base font-black tabular-nums">{r.mult.toFixed(2)}x</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CONFETTI = ['#58CC02', '#FFE500', '#1CB0F6', '#FF9600', '#CE82FF', '#FFD700'];

function FinalThirdGoal({
  picking,
  revealedSave,
  scouting,
  shotZone,
  resolving,
  settled,
  scored,
  onPick,
}: {
  picking: boolean;
  revealedSave: string | null;
  scouting: boolean;
  shotZone: Zone | null;
  resolving: boolean;
  settled: boolean;
  scored: boolean | null;
  onPick: (z: Zone) => void;
}) {
  const inFlight = resolving || (settled && !!shotZone);
  const isSave = settled && scored === false;
  const showGoalFx = settled && scored === true;
  const dest = shotZone;
  const peakX = dest ? 50 + (dest.x - 50) * 0.45 : 50;
  const peakY = dest ? Math.min(dest.y, 70) - 16 : 50;

  return (
    <div className="relative mx-auto aspect-[16/9] w-full overflow-hidden rounded-[24px] border border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md">
      {/* Stadium atmosphere: floodlight beams + crowd band + pitch wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(60% 42% at 18% 0%, rgba(255,255,255,0.10), transparent 70%)',
            'radial-gradient(60% 42% at 82% 0%, rgba(255,255,255,0.10), transparent 70%)',
            'linear-gradient(180deg, rgba(6,10,22,0.55) 0%, rgba(6,10,22,0.15) 22%, transparent 34%)',
            'radial-gradient(110% 70% at 50% 8%, rgba(88,204,2,0.16), transparent 62%)',
            'linear-gradient(180deg, rgba(56,182,14,0.06), rgba(8,24,14,0.16))',
            'repeating-linear-gradient(90deg, rgba(56,182,14,0.08) 0 28px, rgba(56,182,14,0.02) 28px 56px)',
          ].join(', '),
        }}
      />
      {/* Crowd dots band */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[12%] opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 4px 4px, rgba(255,255,255,0.35) 1.1px, transparent 1.4px)',
          backgroundSize: '11px 8px',
        }}
      />

      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 400 225" preserveAspectRatio="none" aria-hidden>
        <defs>
          <pattern id="ft-net" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0h14M0 0v14" stroke="rgba(255,255,255,0.28)" strokeWidth="0.7" />
          </pattern>
          <linearGradient id="ft-post" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d6d6d6" />
            <stop offset="45%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#b8b8b8" />
          </linearGradient>
        </defs>
        <path d="M78 210 V168 H322 V210" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.6" />
        <circle cx="200" cy="204" r="3.2" fill="rgba(255,255,255,0.55)" />
        {/* side netting depth */}
        <path d="M42 18 L58 30 V140 L42 148 Z" fill="url(#ft-net)" opacity="0.45" />
        <path d="M358 18 L342 30 V140 L358 148 Z" fill="url(#ft-net)" opacity="0.45" />
        <path d="M42 18 H358 V148 H42 Z" fill="url(#ft-net)" opacity="0.9" />
        <rect x="36" y="12" width="10" height="140" rx="2" fill="url(#ft-post)" />
        <rect x="354" y="12" width="10" height="140" rx="2" fill="url(#ft-post)" />
        <rect x="36" y="8" width="328" height="10" rx="2" fill="url(#ft-post)" />
        <path d="M46 152 H354" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" />
      </svg>

      {/* VAR sweep on scout */}
      <AnimatePresence>
        {scouting && (
          <motion.div
            key="var-sweep"
            className="pointer-events-none absolute inset-y-[4%] z-30 w-10"
            initial={{ left: '-12%', opacity: 0 }}
            animate={{ left: ['-12%', '104%'], opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(88,204,2,0.5), rgba(255,255,255,0.65), rgba(88,204,2,0.5), transparent)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Outcome washes */}
      <AnimatePresence>
        {showGoalFx && (
          <motion.div
            key="fx-goal"
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.55, 0.18] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            style={{ background: 'radial-gradient(circle at 50% 42%, rgba(88,204,2,0.45), transparent 62%)' }}
          />
        )}
        {isSave && (
          <motion.div
            key="fx-save"
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.55, 0.18] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            style={{ background: 'radial-gradient(circle at 50% 42%, rgba(255,75,75,0.4), transparent 62%)' }}
          />
        )}
      </AnimatePresence>

      {/* Confetti burst on goal */}
      <AnimatePresence>
        {showGoalFx && dest && (
          <motion.div key="confetti" className="pointer-events-none absolute inset-0 z-30" initial={false} exit={{ opacity: 0 }}>
            {CONFETTI.map((c, i) => {
              const angle = (i / CONFETTI.length) * Math.PI * 2;
              return (
                <motion.span
                  key={c + i}
                  className="absolute size-2 rounded-[2px]"
                  style={{ left: `${dest.x}%`, top: `${dest.y}%`, backgroundColor: c }}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                  animate={{
                    x: Math.cos(angle) * (46 + (i % 3) * 18),
                    y: Math.sin(angle) * (34 + (i % 3) * 14) + 30,
                    opacity: 0,
                    rotate: 200 + i * 40,
                    scale: 0.6,
                  }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zones */}
      {(picking || revealedSave) &&
        ZONES.map((z) => {
          const locked = z.id === revealedSave;
          if (!picking && !locked) return null;
          return (
            <motion.button
              key={z.id}
              type="button"
              disabled={locked || !picking}
              onClick={() => onPick(z)}
              aria-label={locked ? 'Locked save zone' : `Zone ${z.id}`}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={locked ? { opacity: 1, scale: [1.3, 1] } : { opacity: 1, scale: [1, 1.08, 1] }}
              transition={locked ? { duration: 0.35, ease: 'easeOut' } : { scale: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } }}
              className={`group absolute z-20 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border sm:size-11 ${
                locked
                  ? 'cursor-not-allowed border-brand-red/70 bg-brand-red/25 shadow-[0_0_14px_2px_rgba(255,75,75,0.35)]'
                  : 'border-white/40 bg-white/10 transition-colors hover:border-brand-yellow hover:bg-brand-yellow/25 hover:shadow-[0_0_14px_2px_rgba(255,229,0,0.3)]'
              }`}
              style={{ left: `${z.x}%`, top: `${z.y}%` }}
            >
              {locked ? (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="scale-[0.55]"><KeeperGlove /></span>
                </span>
              ) : (
                <>
                  <span className="pointer-events-none absolute inset-[6px] rounded-full border border-white/45 group-hover:border-brand-yellow" />
                  <span className="pointer-events-none absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2 bg-white/50 group-hover:bg-brand-yellow" />
                  <span className="pointer-events-none absolute top-1/2 left-2 right-2 h-px -translate-y-1/2 bg-white/50 group-hover:bg-brand-yellow" />
                </>
              )}
            </motion.button>
          );
        })}

      {/* Keeper — dives to the shot on a save, wrong way on a goal */}
      <motion.div
        className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
        initial={false}
        animate={
          dest && inFlight && isSave
            ? { left: `${dest.x}%`, top: `${dest.y}%`, rotate: dest.x < 40 ? -58 : dest.x > 60 ? 58 : 22, scale: 1.16 }
            : dest && inFlight
              ? { left: `${100 - dest.x}%`, top: '42%', rotate: dest.x < 50 ? 45 : -45, scale: 1.05 }
              : { left: '50%', top: '40%', rotate: 0, scale: 1 }
        }
        transition={inFlight ? { type: 'spring', stiffness: 380, damping: 14, mass: 0.7 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          animate={inFlight ? { y: 0 } : { y: [0, -3, 0] }}
          transition={inFlight ? { duration: 0.2 } : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <KeeperGlove />
        </motion.div>
      </motion.div>

      {/* Ball with flight trail */}
      {dest && resolving && (
        <motion.div
          className="pointer-events-none absolute z-[15] -translate-x-1/2 -translate-y-1/2"
          initial={{ left: '50%', top: '88%', opacity: 0.5 }}
          animate={{ left: [`50%`, `${peakX}%`, `${dest.x}%`], top: ['88%', `${peakY}%`, `${dest.y}%`], opacity: [0.4, 0.25, 0] }}
          transition={{ duration: 0.72, ease: [0.18, 0.7, 0.28, 1], times: [0, 0.45, 1], delay: 0.06 }}
        >
          <span className="block size-7 rounded-full bg-white/40 blur-[6px]" />
        </motion.div>
      )}
      <motion.div
        className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
        initial={false}
        animate={
          dest && inFlight
            ? resolving
              ? { left: ['50%', `${peakX}%`, `${dest.x}%`], top: ['88%', `${peakY}%`, `${dest.y}%`], scale: [1, 0.88, 0.7], rotate: [0, 220, 420] }
              : { left: `${dest.x}%`, top: `${isSave ? dest.y + 10 : dest.y}%`, scale: isSave ? 0.82 : 0.62, rotate: isSave ? 480 : 520 }
            : { left: '50%', top: '88%', scale: 1, rotate: 0 }
        }
        transition={
          dest && resolving
            ? { duration: 0.72, ease: [0.18, 0.7, 0.28, 1], times: [0, 0.45, 1] }
            : dest && settled
              ? { type: 'spring', stiffness: 380, damping: 16 }
              : { duration: 0.35 }
        }
      >
        <motion.img
          src={BALL_URL}
          alt=""
          width={40}
          height={40}
          className="size-9 drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)] sm:size-10"
          animate={!inFlight ? { y: [0, -4, 0] } : { y: 0 }}
          transition={!inFlight ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
          draggable={false}
        />
      </motion.div>
    </div>
  );
}

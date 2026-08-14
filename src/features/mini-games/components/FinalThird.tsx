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
 * Virtual points only.
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Coins, Eye, X } from 'lucide-react';
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

type Beat = 'bet' | 'question' | 'shoot' | 'resolving' | 'goal' | 'saved' | 'cashed';

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

export function FinalThird({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const miniLocale = useMiniLocale();
  const trivia = useMemo(() => getTrivia(miniLocale), [miniLocale]);

  const [balance, setBalance] = useState(START_BALANCE);
  const [beat, setBeat] = useState<Beat>('bet');
  const [attack, setAttack] = useState(0); // 0-based attack within the round
  const [pot, setPot] = useState(0);
  const [qIndex, setQIndex] = useState(() => Math.floor(Math.random() * 1000));
  const [selected, setSelected] = useState<number | null>(null);
  const [informed, setInformed] = useState<boolean | null>(null);
  const [saves, setSaves] = useState<Set<string>>(() => new Set());
  const [revealedSave, setRevealedSave] = useState<string | null>(null);
  const [shotZone, setShotZone] = useState<Zone | null>(null);
  const [scored, setScored] = useState<boolean | null>(null);
  const [lastTake, setLastTake] = useState<number | null>(null);

  const question: TriviaQuestion = trivia[qIndex % trivia.length];
  const mult = informed ? (attack === 0 ? INFORMED_FIRST_MULT : INFORMED_NEXT_MULT) : BLIND_MULT;
  const potential = useMemo(() => Math.round(pot * mult * 100) / 100, [pot, mult]);

  const startRound = () => {
    if (balance < STAKE) return;
    setBalance((b) => b - STAKE);
    setPot(STAKE);
    setAttack(0);
    setLastTake(null);
    beginAttack();
  };

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

  const answer = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    const correct = i === question.answer;
    setInformed(correct);
    window.setTimeout(() => {
      if (correct) {
        // SCOUT REPORT: reveal one of the save zones and lock it.
        setSaves((cur) => {
          const first = [...cur][Math.floor(Math.random() * cur.size)];
          setRevealedSave(first);
          return cur;
        });
      }
      setBeat('shoot');
    }, 900);
  };

  const shoot = (zone: Zone) => {
    if (beat !== 'shoot' || shotZone) return;
    if (zone.id === revealedSave) return;
    setShotZone(zone);
    setBeat('resolving');
    const isSave = saves.has(zone.id);
    window.setTimeout(() => {
      if (isSave) {
        setScored(false);
        setBeat('saved');
      } else {
        setScored(true);
        setPot(potential);
        setBeat('goal');
      }
    }, 850);
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

  const zoneCountLabel = informed
    ? t('4 GOAL · 1 SAVE')
    : t('4 GOAL · 2 SAVE');

  return (
    <MiniGameShell
      backHref={backHref}
      title="Final Third"
      subtitle={t('Know football. Read the goal. Take the shot.')}
      accent="#58CC02"
      headerRight={<StatPill label={t('Balance')} value={fmt(balance)} color="#FFD700" />}
    >
      {/* HUD: stake | pot | next multiplier */}
      <div className="mt-1 flex items-center justify-center gap-2 font-poppins text-[12px] font-black uppercase tracking-wide text-white/70">
        <span className="rounded-full bg-white/[0.06] px-3 py-1.5">{t('Stake')} {STAKE} 🪙</span>
        {pot > 0 && beat !== 'cashed' && (
          <span className="rounded-full bg-brand-yellow/15 px-3 py-1.5 text-brand-yellow">{t('Pot')} {fmt(pot)} 🪙</span>
        )}
        {(beat === 'question' || beat === 'shoot') && (
          <span className="rounded-full bg-brand-green/15 px-3 py-1.5 text-brand-green">×{mult}</span>
        )}
      </div>

      {/* Goal */}
      <div className="mt-3">
        <FinalThirdGoal
          picking={beat === 'shoot'}
          revealedSave={revealedSave}
          shotZone={shotZone}
          resolving={beat === 'resolving'}
          settled={beat === 'goal' || beat === 'saved'}
          scored={scored}
          onPick={shoot}
        />
      </div>

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
            </motion.div>
          )}

          {beat === 'shoot' && (
            <motion.div key="shoot" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2 text-center">
              {informed ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
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
                {t('Pick your shot zone')} · {zoneCountLabel} · {fmt(pot)} → {fmt(potential)} 🪙
              </p>
            </motion.div>
          )}

          {beat === 'goal' && (
            <motion.div key="goal" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3 text-center">
              <div className="font-poppins text-2xl font-black uppercase text-brand-green">{t('GOAL!')}</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cashOut}
                  className="h-14 flex-1 rounded-2xl bg-brand-yellow font-poppins text-base font-black uppercase tracking-wide text-black active:scale-[0.98]"
                >
                  {t('TAKE {amount}', { amount: fmt(pot) })} 🪙
                </button>
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
              <div className="font-poppins text-2xl font-black uppercase text-brand-red">{t('SAVED!')}</div>
              <p className="font-poppins text-xs font-semibold text-white/55">{t('The keeper read it — pot lost.')}</p>
              <button
                type="button"
                onClick={() => setBeat('bet')}
                className="h-14 w-full rounded-2xl bg-brand-green font-poppins text-lg font-black uppercase tracking-wide text-white active:scale-[0.98]"
              >
                {t('New round')}
              </button>
            </motion.div>
          )}

          {beat === 'cashed' && (
            <motion.div key="cashed" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3 text-center">
              <div className="font-poppins text-2xl font-black text-brand-gold">
                <Coins className="mr-1.5 inline size-6" /> +{fmt(lastTake ?? 0)}
              </div>
              <button
                type="button"
                onClick={() => setBeat('bet')}
                className="h-14 w-full rounded-2xl bg-brand-green font-poppins text-lg font-black uppercase tracking-wide text-white active:scale-[0.98]"
              >
                {t('New round')}
              </button>
            </motion.div>
          )}

          {beat === 'resolving' && <motion.div key="resolving" className="h-14" />}
        </AnimatePresence>
      </div>
    </MiniGameShell>
  );
}

function FinalThirdGoal({
  picking,
  revealedSave,
  shotZone,
  resolving,
  settled,
  scored,
  onPick,
}: {
  picking: boolean;
  revealedSave: string | null;
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(110% 70% at 50% 8%, rgba(88,204,2,0.16), transparent 62%)',
            'linear-gradient(180deg, rgba(56,182,14,0.06), rgba(8,24,14,0.16))',
            'repeating-linear-gradient(90deg, rgba(56,182,14,0.08) 0 28px, rgba(56,182,14,0.02) 28px 56px)',
          ].join(', '),
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
        <path d="M42 18 H358 V148 H42 Z" fill="url(#ft-net)" opacity="0.9" />
        <rect x="36" y="12" width="10" height="140" rx="2" fill="url(#ft-post)" />
        <rect x="354" y="12" width="10" height="140" rx="2" fill="url(#ft-post)" />
        <rect x="36" y="8" width="328" height="10" rx="2" fill="url(#ft-post)" />
        <path d="M46 152 H354" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" />
      </svg>

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
              animate={locked ? { opacity: 1, scale: 1 } : { opacity: 1, scale: [1, 1.08, 1] }}
              transition={locked ? { duration: 0.3 } : { scale: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } }}
              className={`group absolute z-20 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border sm:size-11 ${
                locked
                  ? 'cursor-not-allowed border-brand-red/70 bg-brand-red/20'
                  : 'border-white/40 bg-white/10 transition-colors hover:border-brand-yellow hover:bg-brand-yellow/25'
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

      {/* Keeper — dives to the shot zone only when it's a save */}
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

      {/* Ball */}
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

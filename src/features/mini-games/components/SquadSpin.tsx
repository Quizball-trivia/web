'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, LockOpen, RotateCw, Send, Sparkles } from 'lucide-react';
import { ClubCrest, FlagChip } from './Badges';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { useMiniT } from '../lib/i18n';
import { useCountdown } from '../lib/useCountdown';
import { matchesName } from '../lib/matching';
import {
  SQUAD_COMBOS,
  POSITION_LABEL,
  POSITION_COLOR,
  ERA_POOL,
  TROPHY_POOL,
  TROPHY_META,
  rarityMultiplier,
  difficultyMultiplier,
  validAnswers,
  SQUAD_BASE_POINTS,
  type SquadCombo,
  type SquadAnswer,
  type ReelPosition,
  type Era,
  type Trophy,
} from '../data/squadSpin';

type CoreReel = 'club' | 'position' | 'nation';
type Phase = 'idle' | 'spinning' | 'answering' | 'result';
const RESPIN_COST = 50;
const ANSWER_MS = 5000;

const CLUB_POOL = Array.from(new Set(SQUAD_COMBOS.map((c) => c.club)));
const POS_POOL: ReelPosition[] = ['GK', 'DEF', 'MID', 'FWD'];
const NATION_POOL = Array.from(new Set(SQUAD_COMBOS.map((c) => c.nation)));
const rand = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

const DIFFICULTIES = [
  { reels: 3, label: 'Easy' },
  { reels: 4, label: 'Hard' },
  { reels: 5, label: 'Expert' },
] as const;

interface Display {
  club: string;
  position: ReelPosition;
  nation: string;
  era: Era;
  trophy: Trophy;
}

interface SpinResult {
  combo: SquadCombo;
  reels: number;
  valid: SquadAnswer[];
  outcome: 'win' | 'miss';
  answerName?: string;
  pct?: number;
  points?: number;
}

export function SquadSpin({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const [phase, setPhase] = useState<Phase>('idle');
  const [reels, setReels] = useState(3);
  const [combo, setCombo] = useState<SquadCombo>(() => SQUAD_COMBOS[0]);
  const [constraints, setConstraints] = useState<{ era: Era | null; trophy: Trophy | null }>({ era: null, trophy: null });
  const [display, setDisplay] = useState<Display>(() => ({
    club: SQUAD_COMBOS[0].club,
    position: SQUAD_COMBOS[0].position,
    nation: SQUAD_COMBOS[0].nation,
    era: ERA_POOL[1],
    trophy: TROPHY_POOL[0],
  }));
  const [held, setHeld] = useState<Record<CoreReel, boolean>>({ club: false, position: false, nation: false });
  const [points, setPoints] = useState(200);
  const [input, setInput] = useState('');
  const [wrongShake, setWrongShake] = useState(0);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [history, setHistory] = useState<SpinResult[]>([]);
  const timersRef = useRef<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const reelsRef = useRef(reels);
  useEffect(() => {
    reelsRef.current = reels;
  }, [reels]);

  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };
  useEffect(() => () => clearTimers(), []);

  const finishMiss = useCallback(() => {
    setPhase((p) => {
      if (p !== 'answering') return p;
      const valid = validAnswers(combo, constraints.era, constraints.trophy);
      const r: SpinResult = { combo, reels: reelsRef.current, valid, outcome: 'miss' };
      setResult(r);
      setHistory((h) => [r, ...h].slice(0, 3));
      return 'result';
    });
  }, [combo, constraints]);

  const timer = useCountdown(ANSWER_MS, { onExpire: finishMiss });

  // Roll the active reels, land on `target` + chosen constraints, then open the
  // 5s answer window. Only core reels can be held; era/trophy re-roll each spin.
  const roll = useCallback(
    (target: SquadCombo, holds: Record<CoreReel, boolean>, r: number) => {
      const eras = Array.from(new Set(target.answers.map((a) => a.era)));
      const chosenEra: Era | null = r >= 4 ? rand(eras) : null;
      const afterEra = validAnswers(target, chosenEra, null);
      const trophies = Array.from(new Set(afterEra.map((a) => a.trophy)));
      const chosenTrophy: Trophy | null = r >= 5 ? rand(trophies) : null;
      setConstraints({ era: chosenEra, trophy: chosenTrophy });

      clearTimers();
      setPhase('spinning');
      setResult(null);
      setInput('');

      const targetDisplay: Display = {
        club: target.club,
        position: target.position,
        nation: target.nation,
        era: chosenEra ?? display.era,
        trophy: chosenTrophy ?? display.trophy,
      };

      const stops: Record<keyof Display, number> = { club: 600, position: 800, nation: 1000, era: 1200, trophy: 1400 };
      const active: (keyof Display)[] = ['club', 'position', 'nation', ...(r >= 4 ? (['era'] as const) : []), ...(r >= 5 ? (['trophy'] as const) : [])];

      active.forEach((reel) => {
        if ((reel === 'club' || reel === 'position' || reel === 'nation') && holds[reel]) return;
        const iv = window.setInterval(() => {
          setDisplay((d) => ({
            ...d,
            [reel]:
              reel === 'club'
                ? rand(CLUB_POOL)
                : reel === 'position'
                  ? rand(POS_POOL)
                  : reel === 'nation'
                    ? rand(NATION_POOL)
                    : reel === 'era'
                      ? rand(ERA_POOL)
                      : rand(TROPHY_POOL),
          }));
        }, 70);
        const stop = window.setTimeout(() => {
          window.clearInterval(iv);
          setDisplay((d) => ({ ...d, [reel]: targetDisplay[reel] }));
        }, stops[reel]);
        timersRef.current.push(iv as unknown as number, stop);
      });

      const lastStop = Math.max(...active.map((reel) => stops[reel]));
      const done = window.setTimeout(() => {
        setCombo(target);
        setDisplay(targetDisplay);
        setPhase('answering');
        timer.start(ANSWER_MS);
        window.setTimeout(() => inputRef.current?.focus(), 50);
      }, lastStop + 140);
      timersRef.current.push(done);
    },
    [timer, display.era, display.trophy],
  );

  const spin = useCallback(() => {
    setHeld({ club: false, position: false, nation: false });
    roll(rand(SQUAD_COMBOS), { club: false, position: false, nation: false }, reels);
  }, [roll, reels]);

  const respin = useCallback(() => {
    if (points < RESPIN_COST) return;
    if (!held.club && !held.position && !held.nation) return;
    setPoints((p) => p - RESPIN_COST);
    const candidates = SQUAD_COMBOS.filter(
      (c) =>
        (!held.club || c.club === combo.club) &&
        (!held.position || c.position === combo.position) &&
        (!held.nation || c.nation === combo.nation) &&
        c.id !== combo.id,
    );
    roll(candidates.length ? rand(candidates) : combo, held, reelsRef.current);
  }, [points, held, combo, roll]);

  const submit = useCallback(() => {
    if (phase !== 'answering' || !input.trim()) return;
    const valid = validAnswers(combo, constraints.era, constraints.trophy);
    const hit = valid.find((a) => matchesName(input, a.accepted).ok);
    if (!hit) {
      setWrongShake((n) => n + 1);
      setInput('');
      return;
    }
    timer.stop();
    const earned = Math.round(SQUAD_BASE_POINTS * rarityMultiplier(hit.pct) * difficultyMultiplier(reelsRef.current));
    setPoints((p) => p + earned);
    const r: SpinResult = { combo, reels: reelsRef.current, valid, outcome: 'win', answerName: hit.name, pct: hit.pct, points: earned };
    setResult(r);
    setHistory((h) => [r, ...h].slice(0, 3));
    setPhase('result');
  }, [phase, input, combo, constraints, timer, reels]);

  const toggleHold = (reel: CoreReel) => {
    if (phase !== 'answering') return;
    setHeld((h) => ({ ...h, [reel]: !h[reel] }));
  };

  const anyHeld = held.club || held.position || held.nation;
  const iconSize = reels >= 5 ? 26 : reels >= 4 ? 32 : 40;
  const activeReels: (keyof Display)[] = ['club', 'position', 'nation', ...(reels >= 4 ? (['era'] as const) : []), ...(reels >= 5 ? (['trophy'] as const) : [])];

  return (
    <MiniGameShell
      backHref={backHref}
      title="Squad Spin"
      subtitle={t('Name a player who fits every reel')}
      accent="#FFE500"
      headerRight={<StatPill label={t('Points')} value={points.toLocaleString()} color="#FFE500" />}
    >
      {/* Reels */}
      <div className="mt-2 grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${reels}, minmax(0, 1fr))` }}>
        {activeReels.map((reel) => {
          const isCore = reel === 'club' || reel === 'position' || reel === 'nation';
          const label = t(reel.charAt(0).toUpperCase() + reel.slice(1));
          return (
            <ReelCard
              key={reel}
              label={label}
              held={isCore ? held[reel as CoreReel] : false}
              spinning={phase === 'spinning' && !(isCore && held[reel as CoreReel])}
              onHold={isCore ? () => toggleHold(reel as CoreReel) : undefined}
              holdable={isCore && phase === 'answering'}
              extra={!isCore}
            >
              <ReelContent reel={reel} display={display} iconSize={iconSize} />
            </ReelCard>
          );
        })}
      </div>

      {/* Timer bar (answering) */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        {phase === 'answering' && (
          <motion.div
            className="h-full rounded-full"
            style={{ width: `${(1 - timer.progress) * 100}%`, background: timer.secondsLeft <= 2 ? '#FB3101' : '#FFE500' }}
          />
        )}
      </div>

      {/* Action zone */}
      <div className="mt-4 flex-1">
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {/* Difficulty selector */}
              <div className="flex gap-2">
                {DIFFICULTIES.map((d) => {
                  const sel = d.reels === reels;
                  return (
                    <button
                      key={d.reels}
                      type="button"
                      onClick={() => setReels(d.reels)}
                      className={`flex flex-1 flex-col items-center rounded-2xl border-2 py-2.5 transition-colors ${
                        sel ? 'border-brand-yellow bg-brand-yellow/10' : 'border-white/10 bg-white/[0.03]'
                      }`}
                    >
                      <span className={`font-poppins text-base font-black ${sel ? 'text-brand-yellow' : 'text-white'}`}>{t('{n} reels', { n: d.reels })}</span>
                      <span className="font-poppins text-[10px] font-bold uppercase tracking-wide text-white/45">
                        {t(d.label)} · ×{difficultyMultiplier(d.reels)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={spin}
                className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-brand-yellow font-poppins text-xl font-black uppercase tracking-wide text-black shadow-[0_8px_24px_rgba(255,229,0,0.25)] active:scale-[0.98]"
              >
                <RotateCw className="size-6" /> {t('Spin')}
              </button>
            </motion.div>
          )}

          {phase === 'spinning' && (
            <motion.div key="spinning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-16 items-center justify-center font-poppins text-sm font-black uppercase tracking-[0.2em] text-white/40">
              {t('Spinning…')}
            </motion.div>
          )}

          {phase === 'answering' && (
            <motion.div key="answer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <motion.div key={wrongShake} animate={wrongShake ? { x: [0, -8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.35 }} className="relative">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder={t('Name a player…')}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-poppins h-14 w-full rounded-[14px] border-none bg-brand-blue px-5 pr-14 text-center text-base uppercase text-white outline-none placeholder:text-white/55 placeholder:uppercase placeholder:tracking-[0.08em] focus:outline-none"
                  style={{ fontWeight: 600 }}
                />
                <button
                  type="button"
                  onClick={submit}
                  disabled={!input.trim()}
                  aria-label={t('Go')}
                  className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <Send className="size-4" />
                </button>
              </motion.div>

              <div className="flex items-center justify-between gap-2">
                <span className="font-poppins text-xs font-semibold text-white/40">{t('Hold a reel, respin the rest')}</span>
                <button
                  type="button"
                  onClick={respin}
                  disabled={!anyHeld || points < RESPIN_COST}
                  className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-2 font-poppins text-xs font-black uppercase text-white/80 transition-colors enabled:hover:bg-white/10 disabled:opacity-35"
                >
                  <RotateCw className="size-3.5" /> {t('Respin −{n}', { n: RESPIN_COST })}
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'result' && result && <ResultCard key="result" result={result} onNext={() => setPhase('idle')} />}
        </AnimatePresence>
      </div>

      {/* History strip */}
      <div className="mt-4">
        <div className="mb-1.5 font-poppins text-[10px] font-black uppercase tracking-wider text-white/35">{t('Last 3 spins')}</div>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => {
            const h = history[i];
            return (
              <div key={i} className="flex h-16 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-1 text-center">
                {h ? (
                  <>
                    <span className="truncate font-poppins text-[10px] font-bold text-white/60">
                      {t('{n} reels', { n: h.reels })} · {h.combo.position}
                    </span>
                    {h.outcome === 'win' ? (
                      <>
                        <span className="truncate font-poppins text-xs font-black text-white">{h.answerName}</span>
                        <span className="font-poppins text-[11px] font-black text-brand-green">+{h.points}</span>
                      </>
                    ) : (
                      <span className="font-poppins text-[11px] font-black uppercase text-brand-red">{t('Missed')}</span>
                    )}
                  </>
                ) : (
                  <span className="font-poppins text-[10px] font-semibold text-white/20">—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </MiniGameShell>
  );
}

function ReelContent({ reel, display, iconSize }: { reel: keyof Display; display: Display; iconSize: number }) {
  const t = useMiniT();
  if (reel === 'club')
    return (
      <>
        <IconBox><ClubCrest club={display.club} size={iconSize} /></IconBox>
        <ReelText>{display.club.replace(/ (CF|FC)$/i, '')}</ReelText>
      </>
    );
  if (reel === 'position')
    return (
      <>
        <IconBox>
          <span className="flex items-center justify-center rounded-xl font-poppins font-black text-black" style={{ width: iconSize, height: iconSize, backgroundColor: POSITION_COLOR[display.position], fontSize: iconSize * 0.4 }}>
            {display.position}
          </span>
        </IconBox>
        <ReelText>{t(POSITION_LABEL[display.position])}</ReelText>
      </>
    );
  if (reel === 'nation')
    return (
      <>
        <IconBox><FlagChip country={display.nation} width={iconSize} height={Math.round(iconSize * 0.68)} /></IconBox>
        <ReelText>{display.nation}</ReelText>
      </>
    );
  if (reel === 'era')
    return (
      <>
        <IconBox>
          <span className="flex items-center justify-center rounded-xl bg-brand-purple/25 font-poppins font-black text-brand-purple" style={{ width: iconSize, height: iconSize, fontSize: iconSize * 0.34 }}>
            {display.era.slice(2)}
          </span>
        </IconBox>
        <ReelText>{display.era}</ReelText>
      </>
    );
  // trophy
  return (
    <>
      <IconBox>
        <span className="flex items-center justify-center" style={{ width: iconSize, height: iconSize, fontSize: iconSize * 0.7 }}>
          {TROPHY_META[display.trophy].emoji}
        </span>
      </IconBox>
      <ReelText>{t(TROPHY_META[display.trophy].short)}</ReelText>
    </>
  );
}

/** Equal flexible icon zone so crest/flag/badge sit on the same line across cards. */
function IconBox({ children }: { children: React.ReactNode }) {
  return <span className="flex min-h-11 w-full flex-1 items-center justify-center">{children}</span>;
}

function ReelCard({
  label,
  held,
  spinning,
  holdable,
  extra,
  onHold,
  children,
}: {
  label: string;
  held: boolean;
  spinning: boolean;
  holdable: boolean;
  extra?: boolean;
  onHold?: () => void;
  children: React.ReactNode;
}) {
  const t = useMiniT();
  return (
    <div
      className={`relative flex flex-col items-center gap-1.5 rounded-2xl border-2 px-0.5 py-3 transition-colors ${
        held ? 'border-brand-yellow/70 bg-brand-yellow/[0.06]' : extra ? 'border-brand-purple/25 bg-brand-purple/[0.06]' : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <span className="font-poppins text-[9px] font-black uppercase tracking-wider text-white/40">{label}</span>
      <motion.div
        animate={spinning ? { y: [0, -3, 0], filter: ['blur(0px)', 'blur(1.5px)', 'blur(0px)'] } : { filter: 'blur(0px)' }}
        transition={spinning ? { duration: 0.16, repeat: Infinity } : { duration: 0.2 }}
        className="flex w-full flex-1 flex-col items-center gap-1"
      >
        {children}
      </motion.div>
      {holdable && onHold && (
        <button
          type="button"
          onClick={onHold}
          aria-label={held ? t('Release reel') : t('Hold reel')}
          className={`absolute -right-1.5 -top-1.5 z-10 flex size-6 items-center justify-center rounded-full border-2 border-surface-page ${held ? 'bg-brand-yellow text-black' : 'bg-surface-card text-white/80'}`}
        >
          {held ? <Lock className="size-3" /> : <LockOpen className="size-3" />}
        </button>
      )}
    </div>
  );
}

function ReelText({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex min-h-[26px] w-full items-center justify-center">
      <span className="line-clamp-2 max-w-full text-center font-poppins text-[9px] font-black uppercase leading-tight text-white sm:text-[10px]">{children}</span>
    </span>
  );
}

function ResultCard({ result, onNext }: { result: SpinResult; onNext: () => void }) {
  const t = useMiniT();
  const win = result.outcome === 'win';
  const rMult = win && result.pct != null ? rarityMultiplier(result.pct) : 1;
  const dMult = difficultyMultiplier(result.reels);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="space-y-3"
    >
      <div className="rounded-2xl border-2 p-4 text-center" style={{ borderColor: win ? '#38B60E66' : '#FB310166', background: win ? 'rgba(56,182,14,0.08)' : 'rgba(251,49,1,0.06)' }}>
        {win ? (
          <>
            <div className="font-poppins text-sm font-black uppercase tracking-wide text-brand-green">{t('Correct!')}</div>
            <div className="mt-1 font-poppins text-2xl font-black text-white">{result.answerName}</div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 font-poppins text-xs font-bold text-white/60">
              <span>{t('Only {pct}% named this', { pct: result.pct ?? 0 })}</span>
              <span className="flex items-center gap-1 rounded-full bg-brand-yellow/15 px-2 py-1 text-brand-yellow"><Sparkles className="size-3" /> ×{rMult} {t('rarity')}</span>
              {dMult > 1 && <span className="rounded-full bg-brand-purple/20 px-2 py-1 text-brand-purple">×{dMult} {t('{n} reels', { n: result.reels })}</span>}
            </div>
            <div className="mt-2 font-poppins text-3xl font-black text-brand-green">+{result.points}</div>
          </>
        ) : (
          <>
            <div className="font-poppins text-sm font-black uppercase tracking-wide text-brand-red">{t("Time's up")}</div>
            <div className="mt-1.5 font-poppins text-xs font-semibold text-white/55">
              {result.valid.length ? t("You could've said:") : t('No valid player for that combo!')}
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
              {result.valid.map((a) => (
                <span key={a.name} className="rounded-full bg-white/[0.06] px-2.5 py-1 font-poppins text-xs font-bold text-white/80">
                  {a.name} <span className="text-white/40">{a.pct}%</span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
      <button type="button" onClick={onNext} className="h-14 w-full rounded-2xl bg-brand-yellow font-poppins text-lg font-black uppercase tracking-wide text-black">
        {t('Spin again')}
      </button>
    </motion.div>
  );
}

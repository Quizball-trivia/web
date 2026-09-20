'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpDown, Flame } from 'lucide-react';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { editionLabel, statValue } from '../lib/data';
import { HiLoBoard, judge, makeHiLoStep, type Call, type HiLoStep } from '../components/rounds/HiLoRound';
import { FifaShell, Intro, StatPill, Summary, GOLD, GREEN, RED } from '../components/ui';

const BEST_KEY = 'qb-fifa-hilo-best';
const readBest = () => { try { return Number(window.localStorage.getItem(BEST_KEY) ?? 0) || 0; } catch { return 0; } };
const writeBest = (n: number) => { try { window.localStorage.setItem(BEST_KEY, String(n)); } catch { /* private mode */ } };

/** Higher or Lower — infinite survival. One wrong call ends the run. */
export function HigherLower({ backHref }: { backHref?: string }) {
  const t = useMiniT();
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro');
  const [step, setStep] = useState<HiLoStep | null>(null);
  const [picked, setPicked] = useState<Call | null>(null);
  const [streak, setStreak] = useState(0);
  // Read lazily: the header (the only place it renders) is hidden until play starts, so no hydration mismatch.
  const [best, setBest] = useState(() => (typeof window === 'undefined' ? 0 : readBest()));
  const [history, setHistory] = useState<Array<{ label: string; ok: boolean }>>([]);
  const used = useRef<Set<string>>(new Set());
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const nextStep = useCallback((s: number) => {
    if (used.current.size > 200) used.current = new Set();
    const next = makeHiLoStep(Math.min(3, Math.floor(s / 6)), used.current);
    used.current.add(next.a.name);
    used.current.add(next.b.name);
    setStep(next);
    setPicked(null);
  }, []);

  const start = () => {
    used.current = new Set();
    setStreak(0);
    setHistory([]);
    setPhase('play');
    nextStep(0);
  };

  const call = (c: Call) => {
    if (!step || picked !== null) return;
    setPicked(c);
    const ok = judge(step, c);
    const label = step.kind === 'seasons' ? `${step.a.name} ${editionLabel(step.a.edition)}→${editionLabel(step.b.edition)} ${statValue(step.a, step.stat)}→${statValue(step.b, step.stat)}` : `${step.a.name} ${statValue(step.a, step.stat)} vs ${step.b.name} ${statValue(step.b, step.stat)}`;
    setHistory((h) => [...h, { label, ok }]);
    if (ok) {
      const s = streak + 1;
      setStreak(s);
      if (s > best) { setBest(s); writeBest(s); }
      timer.current = window.setTimeout(() => nextStep(s), 1100);
    } else {
      timer.current = window.setTimeout(() => setPhase('over'), 1400);
    }
  };

  return (
    <FifaShell
      title={t('Higher or Lower')}
      subtitle={t('Call the next rating — one miss and the run is over')}
      backHref={backHref}
      headerRight={phase !== 'intro' ? (
        <div className="flex items-center gap-2">
          <StatPill label={t('Streak')} value={streak} color={GOLD} />
          <StatPill label={t('Best')} value={best} color={GREEN} />
        </div>
      ) : undefined}
    >
      <AnimatePresence mode="wait">
        {phase === 'intro' ? (
          <Intro key="intro" icon={ArrowUpDown} title={t('Higher or Lower')} tagline={t('Infinite survival. How long can you read the ratings?')} chips={[t('Solo · endless'), t('Daily leaderboard-ready')]} onStart={start}
            steps={[t("A player's card and one stat. Will the next season — or a rival's card — be higher, the same, or lower?"), t('Every correct call extends your streak; categories widen from OVR to pace, shooting and the rest.'), t('One wrong call ends the run. Beat your best.')]} />
        ) : phase === 'over' ? (
          <Summary key="over" title={t('Run over')} score={streak} subline={streak >= best && streak > 0 ? t('New best streak!') : t('Best: {n}', { n: best })} rows={history.slice(-8).map((h, i) => ({ key: String(i), label: h.label, right: h.ok ? '✓' : '✗', ok: h.ok }))} onPlayAgain={start} />
        ) : step ? (
          <motion.div key={step.a.id + step.b.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }} className="flex flex-1 flex-col pt-2">
            <HiLoBoard step={step} picked={picked} onCall={call} />
            <div className="mt-4 flex h-8 items-center justify-center">
              {picked !== null && (
                <motion.span initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center gap-1.5 font-poppins text-sm font-black uppercase tracking-wider" style={{ color: judge(step, picked) ? GREEN : RED }}>
                  {judge(step, picked) ? <><Flame className="size-4" /> {t('Correct — streak {n}', { n: streak })}</> : t('Wrong — run over')}
                </motion.span>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </FifaShell>
  );
}

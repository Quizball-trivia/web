'use client';

import { useCallback, useMemo, useState, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Skull } from 'lucide-react';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { fmtPoints, rand } from '../lib/data';
import type { RoundProps, RoundResult } from '../lib/runner';
import { DetectiveRound } from '../components/rounds/DetectiveRound';
import { DuelRound } from '../components/rounds/DuelRound';
import { EvolutionRound } from '../components/rounds/EvolutionRound';
import { FakeStatRound } from '../components/rounds/FakeStatRound';
import { GuessCardRound } from '../components/rounds/GuessCardRound';
import { HiLoRound } from '../components/rounds/HiLoRound';
import { MissingRound } from '../components/rounds/MissingRound';
import { OrderRound } from '../components/rounds/OrderRound';
import { WonderkidRound } from '../components/rounds/WonderkidRound';
import { YearRound } from '../components/rounds/YearRound';
import { FifaShell, Intro, Lives, StatPill, Summary, GOLD, GREEN } from '../components/ui';

export interface RoundKind {
  id: string;
  name: string;
  Round: ComponentType<RoundProps>;
  /** Multiplier applied to the round's own points (long rounds pay more). */
  weight: number;
}

/** Every chainable round, shared by Survival and Gauntlet. */
export const ROUND_KINDS: RoundKind[] = [
  { id: 'card', name: 'Guess the Card', Round: GuessCardRound, weight: 1 },
  { id: 'hilo', name: 'Higher or Lower', Round: HiLoRound, weight: 1 },
  { id: 'year', name: 'Guess the Year', Round: YearRound, weight: 1 },
  { id: 'duel', name: 'Stat Duel', Round: DuelRound, weight: 1 },
  { id: 'fake', name: 'One Stat Is Fake', Round: FakeStatRound, weight: 1 },
  { id: 'evolution', name: 'Evolution', Round: EvolutionRound, weight: 1.2 },
  { id: 'wonderkid', name: 'Wonderkid', Round: WonderkidRound, weight: 1.2 },
  { id: 'order', name: 'Cards in Order', Round: OrderRound, weight: 1.2 },
  { id: 'missing', name: "Who's Missing", Round: MissingRound, weight: 1.4 },
  { id: 'detective', name: 'Card Detective', Round: DetectiveRound, weight: 0.4 },
];

export const LEVEL_LABEL = ['Easy', 'Medium', 'Hard', 'Brutal'];
export const levelForRound = (i: number) => Math.min(3, Math.floor(i / 5));

/** Pick the next round kind, never the same twice in a row; Detective is rare (it is long). */
export function nextKind(prev: string | null): RoundKind {
  const pool = ROUND_KINDS.filter((k) => k.id !== prev && (k.id !== 'detective' || Math.random() < 0.3));
  return rand(pool);
}

const MAX_LIVES = 3;

/** FIFA Survival — three hearts, an endless mix of every round, difficulty climbing every five. */
export function Survival({ backHref }: { backHref?: string }) {
  const t = useMiniT();
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro');
  const [lives, setLives] = useState(MAX_LIVES);
  const [index, setIndex] = useState(0);
  const [kind, setKind] = useState<RoundKind>(ROUND_KINDS[0]);
  const [results, setResults] = useState<Array<RoundResult & { kind: string }>>([]);
  const [run, setRun] = useState(0);
  const [used, setUsed] = useState(() => new Set<string>());
  const score = useMemo(() => results.reduce((s, r) => s + r.points, 0), [results]);

  const start = () => {
    setUsed(new Set());
    setLives(MAX_LIVES);
    setIndex(0);
    setResults([]);
    setKind(nextKind(null));
    setRun((r) => r + 1);
    setPhase('play');
  };

  const done = useCallback((r: RoundResult) => {
    const level = levelForRound(index);
    const pts = Math.round(r.points * kind.weight * (1 + level * 0.5));
    setResults((prev) => [...prev, { ...r, points: pts, kind: kind.name }]);
    if (!r.correct) {
      const left = lives - 1;
      setLives(left);
      if (left <= 0) { setPhase('over'); return; }
    }
    if (used.size > 150) setUsed(new Set());
    setIndex((i) => i + 1);
    setKind(nextKind(kind.id));
  }, [index, kind, lives, used]);

  const level = levelForRound(index);
  // Illustrative percentile so the end screen feels like a daily board; not real data.
  const percentile = Math.max(1, Math.min(99, Math.round(100 - Math.min(96, score / 60))));

  return (
    <FifaShell
      title={t('FIFA Survival')}
      subtitle={t('Every round type, three lives, rising difficulty')}
      backHref={backHref}
      headerRight={phase !== 'intro' ? (
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end rounded-2xl bg-white/[0.06] px-3 py-1.5"><span className="font-poppins text-[9px] font-black uppercase tracking-wider text-white/45">{t('Lives')}</span><Lives lives={lives} /></div>
          <StatPill label={t('Score')} value={fmtPoints(score)} color={GREEN} />
        </div>
      ) : undefined}
    >
      <AnimatePresence mode="wait">
        {phase === 'intro' ? (
          <Intro key="intro" icon={Skull} title={t('FIFA Survival')} tagline={t('The solo meta-mode: how deep does your FIFA knowledge go?')} chips={[t('Solo · endless'), t('3 lives'), t('Daily-ready')]} onStart={start}
            steps={[t('Rounds rotate through every FIFA Universe game — cards, Hi-Lo, years, journeys, fake stats, squads…'), t('Difficulty steps up every five rounds; later rounds pay more.'), t('A miss costs a heart. Three misses and the run ends with a score for the board.')]} />
        ) : phase === 'over' ? (
          <Summary key="over" title={t('Game over')} score={score} subline={t('{n} rounds · top {p}% today (illustrative)', { n: results.length, p: percentile })} onPlayAgain={start}
            rows={results.map((r, i) => ({ key: String(i), label: `${r.kind} · ${r.label}`, tag: LEVEL_LABEL[levelForRound(i)], right: r.correct ? `+${fmtPoints(r.points)}` : '💔', ok: r.correct }))} />
        ) : (
          <motion.div key={`${run}-${index}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }} className="flex flex-1 flex-col">
            <div className="mb-3 flex items-center justify-between rounded-xl bg-white/[0.05] px-3 py-2">
              <span className="font-poppins text-[11px] font-black uppercase tracking-wider text-white/60">{t('Round')} {index + 1} · {t(kind.name)}</span>
              <span className="font-poppins text-[11px] font-black uppercase tracking-wider" style={{ color: GOLD }}>{t(LEVEL_LABEL[level])} · ×{(1 + level * 0.5).toFixed(1)}</span>
            </div>
            <kind.Round level={level} used={used} onDone={done} />
          </motion.div>
        )}
      </AnimatePresence>
    </FifaShell>
  );
}

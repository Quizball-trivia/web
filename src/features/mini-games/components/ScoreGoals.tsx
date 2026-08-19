'use client';

/**
 * SCORE! — recreate five of the most famous goals ever, swipe by swipe.
 *
 * The scene freezes at the moment history happened; the player has to know
 * (or discover) where the ball went and swipe each pass, run and shot.
 * Ships with both a 3D (three.js) and a 2D top-down view so we can compare —
 * toggle lives on the play screen. Trivia integration TBD.
 */

import { useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'motion/react';
import { Play, RotateCcw, Star, Trophy } from 'lucide-react';
import { MiniGameShell } from './MiniGameShell';
import { ScoreGoals2D } from './ScoreGoals2D';
import { FAMOUS_GOALS, positionsAfter } from '../data/scoreGoals';
import { judgeAim, type Flight } from '../lib/scoreGoalsFlight';
import { playKick, setCrowdMood, startCrowd } from '../lib/crowdAudio';

const ScoreGoals3D = dynamic(() => import('./ScoreGoals3D').then((m) => m.ScoreGoals3D), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 animate-pulse rounded-[22px] bg-[#0b1f12]" />
  ),
});

const ACCENT = '#FFE500';
const MISS_LINES = [
  "That's not how it happened. Run it back.",
  'History disagrees. Try again.',
  'The archive says otherwise. Once more.',
];

type Phase = 'aim' | 'fly' | 'scored' | 'reveal';

interface GoalResult {
  points: number;
  stars: number;
}

function starsFor(misses: number): number {
  if (misses === 0) return 3;
  if (misses <= 2) return 2;
  return 1;
}

export function ScoreGoals({ backHref = '/dev/mini-games' }: { backHref?: string }) {
  const [view, setView] = useState<'3d' | '2d'>('3d');
  const [goalId, setGoalId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('aim');
  const [flight, setFlight] = useState<Flight | null>(null);
  const [misses, setMisses] = useState(0);
  const [missLine, setMissLine] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, GoalResult>>({});

  const goal = useMemo(
    () => FAMOUS_GOALS.find((g) => g.id === goalId) ?? null,
    [goalId],
  );
  const step = goal?.steps[stepIndex] ?? null;
  const positions = useMemo(
    () => (goal ? positionsAfter(goal, stepIndex) : {}),
    [goal, stepIndex],
  );
  const totalPoints = Object.values(results).reduce((s, r) => s + r.points, 0);

  const startGoal = useCallback((id: string) => {
    startCrowd();
    setCrowdMood('build');
    setGoalId(id);
    setStepIndex(0);
    setPhase('aim');
    setFlight(null);
    setMisses(0);
    setMissLine(null);
  }, []);

  const handleAim = useCallback(
    (aim: [number, number], drawnCurve?: number, swipeMs?: number) => {
      if (!goal || !step || phase !== 'aim') return;
      playKick();
      setMissLine(null);
      setFlight(judgeAim(step, aim, drawnCurve, swipeMs));
      setPhase('fly');
    },
    [goal, step, phase],
  );

  const handleFlightEnd = useCallback(() => {
    if (!goal || !flight) return;
    if (!flight.success) {
      setCrowdMood('miss');
      setMisses((m) => {
        setMissLine(MISS_LINES[m % MISS_LINES.length]);
        return m + 1;
      });
      setFlight(null);
      setPhase('aim');
      return;
    }
    if (stepIndex >= goal.steps.length - 1) {
      setCrowdMood('cheer');
      const points = Math.max(20, 100 - 20 * misses);
      setResults((r) => {
        const prev = r[goal.id];
        const next = { points, stars: starsFor(misses) };
        if (prev && prev.points >= points) return r;
        return { ...r, [goal.id]: next };
      });
      setPhase('scored');
      window.setTimeout(() => setPhase('reveal'), 1500);
      return;
    }
    setCrowdMood('build');
    setStepIndex((i) => i + 1);
    setFlight(null);
    setPhase('aim');
  }, [goal, flight, stepIndex, misses]);

  const nextGoalId = useMemo(() => {
    if (!goal) return null;
    const after = FAMOUS_GOALS.filter((g) => g.id !== goal.id && !results[g.id]);
    return after[0]?.id ?? null;
  }, [goal, results]);

  const viewPhase = phase === 'aim' ? 'aim' : phase === 'fly' ? 'fly' : 'done';
  const caption =
    phase === 'scored' || phase === 'reveal'
      ? goal?.steps[goal.steps.length - 1]?.successCaption
      : missLine ?? step?.caption;

  return (
    <MiniGameShell
      title="Score! Classics"
      subtitle="Recreate the greatest goals ever — swipe by swipe"
      accent={ACCENT}
      backHref={backHref}
      wide
      headerRight={
        <div className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5">
          <Trophy className="size-4" style={{ color: ACCENT }} />
          <span className="font-poppins text-sm font-bold tabular-nums">{totalPoints}</span>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-3xl px-4 pb-8 sm:px-6">
        {!goal ? (
          <GoalPicker results={results} onPick={startGoal} />
        ) : (
          <div className="flex flex-col gap-3">
            {/* Match header + view toggle */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setGoalId(null)}
                className="truncate text-left font-poppins text-[13px] font-bold uppercase tracking-wide text-white/60 transition-colors hover:text-white"
              >
                ← {goal.match} · {goal.year}
              </button>
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/[0.06] p-1">
                {(['3d', '2d'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={`rounded-full px-3 py-1 font-poppins text-[11px] font-black uppercase transition-colors ${
                      view === v ? 'bg-[#FFE500] text-black' : 'text-white/55 hover:text-white'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Scene */}
            <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#07130b]">
              <div className={view === '3d' ? 'relative aspect-[16/10] w-full' : 'relative h-[62dvh] max-h-[640px] min-h-[420px] w-full'}>
                {view === '3d' ? (
                  <ScoreGoals3D
                    goal={goal}
                    stepIndex={stepIndex}
                    positions={positions}
                    phase={viewPhase}
                    flight={flight}
                    showHint={misses > 0 && phase === 'aim'}
                    onAim={handleAim}
                    onFlightEnd={handleFlightEnd}
                  />
                ) : (
                  <ScoreGoals2D
                    goal={goal}
                    stepIndex={stepIndex}
                    positions={positions}
                    phase={viewPhase}
                    flight={flight}
                    showHint={misses > 0 && phase === 'aim'}
                    onAim={handleAim}
                    onFlightEnd={handleFlightEnd}
                  />
                )}
              </div>

              {/* Step dots */}
              <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5">
                {goal.steps.map((s, i) => (
                  <span
                    key={i}
                    className="size-2 rounded-full transition-colors"
                    style={{
                      background:
                        i < stepIndex || phase === 'scored' || phase === 'reveal'
                          ? ACCENT
                          : i === stepIndex
                            ? 'rgba(255,255,255,0.9)'
                            : 'rgba(255,255,255,0.25)',
                    }}
                  />
                ))}
              </div>

              {/* GOAL splash */}
              <AnimatePresence>
                {phase === 'scored' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-black/45"
                  >
                    <motion.div
                      initial={{ scale: 0.4, rotate: -6 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 15 }}
                      className="font-poppins text-6xl font-black italic tracking-tight sm:text-7xl"
                      style={{ color: ACCENT, textShadow: '0 6px 40px rgba(255,229,0,0.45)' }}
                    >
                      GOAL!
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reveal card */}
              <AnimatePresence>
                {phase === 'reveal' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4"
                  >
                    <motion.div
                      initial={{ y: 24, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.05 }}
                      className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101a12] p-5 text-center"
                    >
                      <div className="font-poppins text-[11px] font-black uppercase tracking-[0.2em] text-white/45">
                        {goal.minute} · {goal.year}
                      </div>
                      <div className="mt-1 font-poppins text-2xl font-black" style={{ color: ACCENT }}>
                        {goal.scorer}
                      </div>
                      <div className="text-sm font-semibold text-white/75">{goal.match}</div>
                      <div className="mt-0.5 text-xs text-white/45">{goal.competition}</div>
                      <div className="mt-3 flex items-center justify-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <Star
                            key={i}
                            className="size-6"
                            style={{
                              color: i < (results[goal.id]?.stars ?? 0) ? ACCENT : 'rgba(255,255,255,0.18)',
                              fill: i < (results[goal.id]?.stars ?? 0) ? ACCENT : 'transparent',
                            }}
                          />
                        ))}
                      </div>
                      <p className="mt-3 text-[13px] leading-relaxed text-white/70">{goal.fact}</p>
                      <div className="mt-4 flex flex-col gap-2">
                        {nextGoalId && (
                          <button
                            type="button"
                            onClick={() => startGoal(nextGoalId)}
                            className="flex items-center justify-center gap-2 rounded-xl bg-[#FFE500] px-4 py-2.5 font-poppins text-sm font-black uppercase text-black transition-transform active:scale-[0.98]"
                          >
                            <Play className="size-4" /> Next classic
                          </button>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startGoal(goal.id)}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/[0.08] px-4 py-2.5 font-poppins text-sm font-bold text-white/80 transition-colors hover:bg-white/[0.12]"
                          >
                            <RotateCcw className="size-4" /> Replay
                          </button>
                          <button
                            type="button"
                            onClick={() => setGoalId(null)}
                            className="flex flex-1 items-center justify-center rounded-xl bg-white/[0.08] px-4 py-2.5 font-poppins text-sm font-bold text-white/80 transition-colors hover:bg-white/[0.12]"
                          >
                            All goals
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Commentary lower-third */}
            <motion.div
              key={`${stepIndex}-${caption}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="flex min-h-[58px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
            >
                <span
                  className="h-8 w-1 shrink-0 rounded-full"
                  style={{ background: missLine ? '#ff5d5d' : ACCENT }}
                />
                <p className="text-[13px] font-medium leading-snug text-white/85 sm:text-sm">
                  {caption}
                  {missLine && (
                    <span className="ml-1 text-white/45">The target is glowing now.</span>
                  )}
                </p>
              </motion.div>

            <p className="text-center text-[11px] text-white/35">
              {step?.kind === 'shot'
                ? 'Drag from the ball toward the goal, release to shoot'
                : 'Drag from the ball to where history sent it, release to play'}
            </p>
          </div>
        )}
      </div>
    </MiniGameShell>
  );
}

function GoalPicker({
  results,
  onPick,
}: {
  results: Record<string, GoalResult>;
  onPick: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] leading-relaxed text-white/55">
        Five moments that made football history. The scene is frozen the instant before each
        one — swipe every pass, run and shot exactly as it happened.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {FAMOUS_GOALS.map((g, i) => {
          const done = results[g.id];
          return (
            <motion.button
              key={g.id}
              type="button"
              onClick={() => onPick(g.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-colors ${
                done
                  ? 'border-[#FFE500]/35 bg-[#FFE500]/[0.05]'
                  : 'border-white/10 bg-white/[0.04] hover:border-white/25'
              } ${i === FAMOUS_GOALS.length - 1 ? 'sm:col-span-2' : ''}`}
            >
              <div
                className="pointer-events-none absolute -right-3 -top-6 font-poppins text-[64px] font-black leading-none tracking-tighter text-white/[0.06]"
                aria-hidden
              >
                {g.year}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-md px-1.5 py-0.5 font-poppins text-[10px] font-black tabular-nums"
                  style={{ background: '#FFE500', color: '#000' }}
                >
                  {g.year}
                </span>
                <span className="font-poppins text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  {g.minute}
                </span>
                {done && (
                  <span className="ml-auto flex items-center gap-0.5">
                    {[0, 1, 2].map((s) => (
                      <Star
                        key={s}
                        className="size-3.5"
                        style={{
                          color: s < done.stars ? '#FFE500' : 'rgba(255,255,255,0.18)',
                          fill: s < done.stars ? '#FFE500' : 'transparent',
                        }}
                      />
                    ))}
                  </span>
                )}
              </div>
              <div className="mt-2 font-poppins text-lg font-black leading-tight text-white">
                {g.scorer}
              </div>
              <div className="text-[12px] font-semibold text-white/60">{g.match}</div>
              <div className="text-[11px] text-white/35">{g.competition}</div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

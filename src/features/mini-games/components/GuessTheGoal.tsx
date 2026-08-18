'use client';

/**
 * GUESS THE GOAL — a coaching-diagram replay of an iconic goal builds up move
 * by move; name the goal early for more points, then bank a bonus trivia
 * question about it. Desktop: pitch left, question/answers right. Mobile:
 * stacked. Answer cards follow the ranked-match style (yellow border + glow,
 * green fill for correct, red for a wrong pick).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Play, RotateCcw } from 'lucide-react';
import { MiniGameShell } from './MiniGameShell';
import { TacticsBoard2D, BOARD_VIEW_W, BOARD_VIEW_H } from './TacticsBoard2D';
import { TACTICS_GOALS } from '../data/tacticsGoals';
import { buildTimeline, type TacticsStepKind } from '../lib/tacticsEngine';

const MAX_POINTS = 100;
const MIN_POINTS = 40;
const BONUS_POINTS = 40;
const LOOP_HOLD = 1.6;

type Phase = 'idle' | 'watch' | 'reveal' | 'bonus' | 'summary';
type OptionState = 'idle' | 'correct' | 'wrong' | 'dim';

function shuffled<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function potentialFor(revealed: number, mainCount: number, looped: boolean): number {
  if (looped) return MIN_POINTS;
  const step = Math.max(0, Math.min(revealed - 1, mainCount - 1));
  return Math.round(MAX_POINTS - ((MAX_POINTS - MIN_POINTS) * step) / Math.max(1, mainCount - 1));
}

/** Ranked-match answer card look (PossessionQuestionPanel). */
function optionStyle(state: OptionState): CSSProperties {
  return {
    backgroundColor: state === 'correct' ? '#38B60E' : 'transparent',
    border: state === 'correct' ? '2px solid transparent' : state === 'wrong' ? '2px solid #FB3101' : '2px solid #FFE500',
    color: state === 'wrong' ? '#FB3101' : '#FFFFFF',
    boxShadow:
      state === 'correct'
        ? '0 1.76px 6.334px 1.32px rgba(56,182,14,0.25)'
        : state === 'wrong'
          ? '0 1.76px 6.334px 1.32px rgba(251,49,1,0.25)'
          : '0 0 6.334px 1.32px rgba(255,229,0,0.25)',
    opacity: state === 'dim' ? 0.4 : 1,
  };
}

const OPTION_CLASS =
  'flex min-h-[52px] items-center justify-center rounded-[16px] px-4 py-2.5 text-center font-poppins text-[13px] font-bold uppercase leading-[1.15] transition-shadow duration-150 sm:min-h-[56px] sm:text-sm';

const ACTION_META: Record<TacticsStepKind, { label: string; color: string }> = {
  carry: { label: 'Dribble', color: '#1c2b21' },
  run: { label: 'Run', color: '#1c2b21' },
  pass: { label: 'Pass', color: '#ffffff' },
  shot: { label: 'Shot!', color: '#FFE500' },
};

function ActionGlyph({ kind, color }: { kind: TacticsStepKind; color: string }) {
  if (kind === 'pass') {
    return (
      <svg width="26" height="8" viewBox="0 0 26 8">
        <path d="M1 4h19" stroke={color} strokeWidth="1.2" />
        <circle cx="22.5" cy="4" r="2.6" fill="none" stroke={color} strokeWidth="1.2" />
      </svg>
    );
  }
  if (kind === 'run') {
    return (
      <svg width="26" height="8" viewBox="0 0 26 8">
        <path d="M1 4h20" stroke={color} strokeWidth="1.6" strokeDasharray="3 3" />
        <path d="M18 1l6 3-6 3z" fill={color} />
      </svg>
    );
  }
  return (
    <svg width="26" height="8" viewBox="0 0 26 8">
      <path d="M1 4h20" stroke={color} strokeWidth="2.4" />
      <path d="M18 1l6 3-6 3z" fill={color} />
    </svg>
  );
}

export function GuessTheGoal({ backHref }: { backHref?: string } = {}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [order, setOrder] = useState(() => TACTICS_GOALS.map((_, i) => i));
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const [maxReveal, setMaxReveal] = useState(1);
  const [looped, setLooped] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [gained, setGained] = useState(0);
  const [bonusPicked, setBonusPicked] = useState<number | null>(null);
  const timeRef = useRef(0);

  const goal = TACTICS_GOALS[order[round]];
  const timeline = useMemo(() => buildTimeline(goal), [goal]);
  const correct = picked === goal.answerIndex;
  const potential = potentialFor(maxReveal, timeline.mainCount, looped);

  useEffect(() => {
    if (phase !== 'watch') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const id = requestAnimationFrame(() => {
        timeRef.current = timeline.duration;
        setTime(timeline.duration);
        setMaxReveal(timeline.mainCount);
        setLooped(true);
      });
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (document.visibilityState !== 'visible') {
        last = now;
        raf = requestAnimationFrame(tick);
        return;
      }
      // dt is clamped so the replay pauses (rather than skipping ahead and
      // burning the early-answer bonus) while the tab is hidden/throttled.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let next = timeRef.current + dt;
      if (next > timeline.duration + LOOP_HOLD) {
        next = 0;
        setLooped(true);
      }
      timeRef.current = next;
      setTime(next);
      setMaxReveal((prev) => {
        let revealed = 0;
        for (const step of timeline.steps) if (step.main && step.start <= next) revealed += 1;
        return Math.max(prev, Math.max(1, revealed));
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, timeline]);

  const startRound = useCallback((index: number) => {
    setRound(index);
    setPicked(null);
    setBonusPicked(null);
    setGained(0);
    setMaxReveal(1);
    setLooped(false);
    timeRef.current = 0;
    setTime(0);
    setPhase('watch');
  }, []);

  const start = () => {
    setOrder(shuffled(TACTICS_GOALS.map((_, i) => i)));
    setScore(0);
    startRound(0);
  };

  const pick = (i: number) => {
    if (phase !== 'watch') return;
    setPicked(i);
    timeRef.current = timeline.duration;
    setTime(timeline.duration);
    if (i === goal.answerIndex) {
      setGained(potential);
      setScore((s) => s + potential);
    }
    setPhase('reveal');
  };

  const answerBonus = (i: number) => {
    if (bonusPicked !== null) return;
    setBonusPicked(i);
    if (i === goal.bonus.answerIndex) setScore((s) => s + BONUS_POINTS);
  };

  const next = () => {
    if (round + 1 >= order.length) {
      setPhase('summary');
    } else {
      startRound(round + 1);
    }
  };

  const goalFlash = time >= timeline.duration - 0.05;

  const activeKind = useMemo<TacticsStepKind | null>(() => {
    if (phase !== 'watch') return null;
    let current: TacticsStepKind | null = null;
    for (const s of timeline.steps) {
      if (s.start <= time && time < s.end && s.kind !== 'run') current = s.kind;
    }
    if (!current) {
      for (const s of timeline.steps) if (s.start <= time && time < s.end) current = s.kind;
    }
    return current;
  }, [phase, time, timeline]);

  const pitchColumn = (
    <div className="flex flex-col gap-1.5 lg:flex-[3]">
      <div className="flex items-baseline justify-between px-1">
        <div className="flex items-baseline gap-3">
          <span className="font-poppins text-[11px] font-black uppercase tracking-wider text-white/45">
            Goal {round + 1}/{order.length}
          </span>
          <span className="font-poppins text-[11px] font-black uppercase tracking-wider text-white/45">
            Score <span className="text-brand-green-bright">{score}</span>
          </span>
        </div>
        {phase === 'watch' ? (
          <span className="font-poppins text-[11px] font-black uppercase tracking-wider text-brand-yellow">
            Answer now · +{potential}
          </span>
        ) : (
          <span
            className={`font-poppins text-[11px] font-black uppercase tracking-wider ${correct ? 'text-brand-green-bright' : 'text-brand-red'}`}
          >
            {correct ? `+${gained} points` : 'Missed'}
          </span>
        )}
      </div>

      <div
        className="relative w-full overflow-hidden rounded-2xl"
        style={{ aspectRatio: `${BOARD_VIEW_W} / ${BOARD_VIEW_H}` }}
      >
        <TacticsBoard2D goal={goal} timeline={timeline} t={time} goalFlash={goalFlash} />
        {phase === 'watch' && (
          <div className="absolute left-2 top-2 flex items-center gap-1.5">
            <div className="rounded-full bg-black/50 px-3 py-1.5 font-poppins text-[11px] font-black uppercase tracking-wide text-white/80 backdrop-blur">
              Move {Math.min(maxReveal, timeline.mainCount)}/{timeline.mainCount}
            </div>
            {activeKind && !goalFlash && (
              <div
                className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 font-poppins text-[11px] font-black uppercase tracking-wide backdrop-blur"
                style={{ color: activeKind === 'shot' ? '#FFE500' : '#ffffff' }}
              >
                <ActionGlyph kind={activeKind} color={activeKind === 'shot' ? '#FFE500' : '#ffffff'} />
                {ACTION_META[activeKind].label}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5 font-poppins text-[9px] font-bold uppercase tracking-wider">
        {(['carry', 'run', 'pass', 'shot'] as const).map((kind) => (
          <span
            key={kind}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ backgroundColor: '#5da95b', color: '#12241a' }}
          >
            <ActionGlyph kind={kind} color={ACTION_META[kind].color} />
            {ACTION_META[kind].label.replace('!', '')}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <MiniGameShell
      title="Guess the Goal"
      subtitle="Read the tactics board, name the iconic goal"
      accent="#58CC02"
      backHref={backHref}
      wide
    >
      {phase === 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 flex-col items-center justify-center gap-5 text-center"
        >
          <div className="text-6xl">📋</div>
          <div>
            <h2 className="font-poppins text-2xl font-black uppercase text-white">Guess the Goal</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm font-semibold leading-relaxed text-white/60">
              A legendary goal replays on the coaching board, move by move. The earlier you name it, the more you
              score — then answer a bonus question about the goal.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.05] px-4 py-2.5 font-poppins text-[11px] font-black uppercase tracking-wide text-white/55">
            <span>Instant guess · {MAX_POINTS}</span>
            <span className="text-white/25">→</span>
            <span>Full replay · {MIN_POINTS}</span>
            <span className="text-white/25">·</span>
            <span className="text-brand-yellow">Bonus +{BONUS_POINTS}</span>
          </div>
          <button
            type="button"
            onClick={start}
            className="flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-brand-green-bright font-poppins text-lg font-black uppercase tracking-wide text-black"
          >
            <Play className="size-5 fill-current" /> Kick off
          </button>
        </motion.div>
      )}

      {phase !== 'idle' && phase !== 'summary' && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 pt-1 lg:my-auto lg:flex-none lg:flex-row lg:items-start lg:justify-center lg:gap-6">
          {pitchColumn}

          <div className="flex flex-col gap-2 lg:flex-[2]">
            <AnimatePresence mode="wait">
              {(phase === 'watch' || phase === 'reveal') && (
                <motion.div
                  key={`options-${round}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex flex-col gap-1.5"
                >
                  <p className="flex items-baseline px-1 font-poppins text-[11px] font-black uppercase tracking-wider text-white/45">
                    Which goal is this?
                  </p>
                  <div className="flex flex-col gap-2.5">
                  {goal.options.map((option, i) => {
                    const isAnswer = i === goal.answerIndex;
                    const isPicked = picked === i;
                    const state: OptionState =
                      phase === 'reveal' ? (isAnswer ? 'correct' : isPicked ? 'wrong' : 'dim') : 'idle';
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={phase !== 'watch'}
                        onClick={() => pick(i)}
                        className={OPTION_CLASS}
                        style={optionStyle(state)}
                      >
                        {option}
                      </button>
                    );
                  })}
                  </div>
                  {phase === 'reveal' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 flex flex-col gap-2">
                      <p className="rounded-xl bg-white/[0.05] px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-white/65">
                        {goal.funFact}
                      </p>
                      <button
                        type="button"
                        onClick={() => (correct ? setPhase('bonus') : next())}
                        className="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-brand-green-bright font-poppins text-sm font-black uppercase tracking-wide text-black"
                      >
                        {correct ? `Bonus question · +${BONUS_POINTS}` : round + 1 >= order.length ? 'See result' : 'Next goal'}
                        <ChevronRight className="size-4" />
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {phase === 'bonus' && (
                <motion.div
                  key={`bonus-${round}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex flex-col gap-1.5"
                >
                  <p className="flex items-baseline px-1 font-poppins text-[11px] font-black uppercase tracking-wider text-brand-yellow">
                    Bonus question · +{BONUS_POINTS}
                  </p>
                  <p className="px-1 pb-1 font-poppins text-sm font-black uppercase leading-snug text-white">
                    {goal.bonus.question}
                  </p>
                  <div className="flex flex-col gap-2.5">
                  {goal.bonus.options.map((option, i) => {
                    const isAnswer = i === goal.bonus.answerIndex;
                    const isPicked = bonusPicked === i;
                    const state: OptionState =
                      bonusPicked !== null ? (isAnswer ? 'correct' : isPicked ? 'wrong' : 'dim') : 'idle';
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={bonusPicked !== null}
                        onClick={() => answerBonus(i)}
                        className={OPTION_CLASS}
                        style={optionStyle(state)}
                      >
                        {option}
                      </button>
                    );
                  })}
                  </div>
                  {bonusPicked !== null && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      type="button"
                      onClick={next}
                      className="mt-1 flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-brand-green-bright font-poppins text-sm font-black uppercase tracking-wide text-black"
                    >
                      {round + 1 >= order.length ? 'See result' : 'Next goal'}
                      <ChevronRight className="size-4" />
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {phase === 'summary' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-1 flex-col items-center justify-center gap-4 text-center"
        >
          <div className="text-6xl">🏆</div>
          <div>
            <div className="font-poppins text-[11px] font-black uppercase tracking-wider text-white/45">Final score</div>
            <div className="font-poppins text-5xl font-black tabular-nums text-brand-green-bright">{score}</div>
            <div className="mt-1 font-poppins text-[11px] font-black uppercase tracking-wider text-white/45">
              of {order.length * (MAX_POINTS + BONUS_POINTS)} possible
            </div>
          </div>
          <button
            type="button"
            onClick={start}
            className="flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-brand-green-bright font-poppins text-lg font-black uppercase tracking-wide text-black"
          >
            <RotateCcw className="size-5" /> Play again
          </button>
        </motion.div>
      )}
    </MiniGameShell>
  );
}

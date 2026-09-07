'use client';

/** Daily challenges rebuilt in Betsson/TD branding (Quizball's demo data
 *  + engines, TD gameplay UI). All three run against timers; the first
 *  completion of each challenge per Georgian day earns +1 ticket. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { matchesName } from '@/features/mini-games/lib/matching';
import { buildDemoDailySession } from '@/features/demos/data/demoDailySessions';
import type { PutInOrderSession, CareerPathSession } from '@/lib/domain/dailyChallenge';
import { TacticsBoard2D, BOARD_VIEW_W, BOARD_VIEW_H } from '@/features/mini-games/components/TacticsBoard2D';
import { TACTICS_GOALS } from '@/features/mini-games/data/tacticsGoals';
import { buildTimeline } from '@/features/mini-games/lib/tacticsEngine';
import { TD } from '../lib/copy';
import { TD_DISPLAY, TicketGlyph } from './brand';
import { CategoryBand, TurnTimerBar } from './chrome';
import { claimDailyReward } from '../lib/state';

export type TdDailyType = 'putInOrder' | 'careerPath' | 'guessTheGoal';

const TITLES: Record<TdDailyType, string> = {
  putInOrder: TD.dailyPio,
  careerPath: TD.dailyCp,
  guessTheGoal: TD.dailyGtg,
};

/* ── shared chrome ──────────────────────────────────────────────── */

function Flash({ flash }: { flash: { key: number; text: string; good: boolean } | null }) {
  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          key={flash.key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-[8px] px-3 py-1 text-[12px]"
          style={{
            ...TD_DISPLAY,
            background: flash.good ? 'var(--td-orange)' : 'var(--td-steel-deep)',
            color: flash.good ? '#0d0d0d' : 'var(--td-white)',
            boxShadow: '3px 3px 0 rgba(0,0,0,0.5)',
          }}
        >
          {flash.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function GameHeader({ title, onExit }: { title: string; onExit: () => void }) {
  return (
    <div className="flex w-full items-center gap-3">
      <button
        type="button"
        onClick={onExit}
        className="flex items-center gap-1 rounded-[10px] px-3 py-2 text-[11px]"
        style={{ ...TD_DISPLAY, background: 'var(--td-charcoal)', color: 'var(--td-white)', boxShadow: '3px 3px 0 #000' }}
      >
        ‹ {TD.back}
      </button>
      <h2 className="flex-1 text-center text-lg text-white md:text-xl" style={TD_DISPLAY}>
        {title}
      </h2>
      <span className="w-[68px]" aria-hidden />
    </div>
  );
}

/* ── Put in Order — tap-arrow reordering vs a 45s round clock ───── */

const PIO_ROUND_MS = 45_000;

function TdPutInOrder({ onDone }: { onDone: (score: number) => void }) {
  const session = useMemo(() => buildDemoDailySession('putInOrder', 'ka') as PutInOrderSession, []);
  const [roundIdx, setRoundIdx] = useState(0);
  const [order, setOrder] = useState(() => session.rounds[0].items.map((it) => it.id));
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState<{ key: number; text: string; good: boolean } | null>(null);
  const round = session.rounds[roundIdx];
  const done = useRef(false);

  const submit = () => {
    if (done.current) return;
    const correctIds = [...round.items].sort((a, b) => a.sortValue - b.sortValue).map((it) => it.id);
    const correct = order.filter((id, i) => id === correctIds[i]).length;
    const gained = correct * 25;
    setFlash({ key: Date.now(), text: `+${gained}`, good: correct > 0 });
    const total = score + gained;
    setScore(total);
    if (roundIdx + 1 >= session.rounds.length) {
      done.current = true;
      setTimeout(() => onDone(total), 900);
    } else {
      setTimeout(() => {
        setRoundIdx((i) => i + 1);
        setOrder(session.rounds[roundIdx + 1].items.map((it) => it.id));
      }, 900);
    }
  };

  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });
  useEffect(() => {
    const t = setTimeout(() => submitRef.current(), PIO_ROUND_MS);
    return () => clearTimeout(t);
  }, [roundIdx]);

  const move = (idx: number, dir: -1 | 1) => {
    setOrder((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <CategoryBand prompt={round.prompt} compact />
      <div className="flex flex-col gap-2">
        {order.map((id, i) => {
          const item = round.items.find((it) => it.id === id)!;
          return (
            <div
              key={id}
              className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5"
              style={{ background: 'var(--td-charcoal)', boxShadow: '3px 3px 0 rgba(0,0,0,0.5)' }}
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-[6px] text-[13px]"
                style={{ ...TD_DISPLAY, background: 'var(--td-orange)', color: '#0d0d0d' }}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 text-[13px] leading-tight text-white md:text-[15px]" style={TD_DISPLAY}>
                {item.label}
              </span>
              <div className="flex shrink-0 gap-1">
                {([-1, 1] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => move(i, dir)}
                    disabled={dir === -1 ? i === 0 : i === order.length - 1}
                    className="flex size-8 items-center justify-center rounded-[8px] text-white disabled:opacity-25"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                    aria-label={dir === -1 ? 'up' : 'down'}
                  >
                    {dir === -1 ? '▲' : '▼'}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <TurnTimerBar turnKey={`pio-${roundIdx}`} ms={PIO_ROUND_MS} running />
      <div className="relative">
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={submit}
          className="w-full rounded-[12px] py-3.5 text-base"
          style={{ ...TD_DISPLAY, background: 'var(--td-orange)', color: '#0d0d0d', boxShadow: '4px 4px 0 rgba(0,0,0,0.5)' }}
        >
          {TD.confirmOrder}
        </motion.button>
        <Flash flash={flash} />
      </div>
      <p className="text-center text-[11px] text-white/50" style={TD_DISPLAY}>
        {roundIdx + 1}/{session.rounds.length} · {score}
      </p>
    </div>
  );
}

/* ── Career Path — clubs reveal on a clock, type the player ─────── */

const CP_REVEAL_MS = 2800;
const CP_EXTRA_MS = 12_000;

function TdCareerPath({ onDone }: { onDone: (score: number) => void }) {
  const session = useMemo(() => buildDemoDailySession('careerPath', 'ka') as CareerPathSession, []);
  const [qIdx, setQIdx] = useState(0);
  const [revealed, setRevealed] = useState(1);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [locked, setLocked] = useState(false);
  const [flash, setFlash] = useState<{ key: number; text: string; good: boolean } | null>(null);
  const q = session.questions[qIdx];
  const totalMs = q.clubs.length * CP_REVEAL_MS + CP_EXTRA_MS;
  const done = useRef(false);

  const advance = (total: number) => {
    if (qIdx + 1 >= session.questions.length) {
      done.current = true;
      setTimeout(() => onDone(total), 1100);
    } else {
      setTimeout(() => {
        setQIdx((i) => i + 1);
        setRevealed(1);
        setLocked(false);
        setInput('');
      }, 1400);
    }
  };

  const miss = () => {
    if (locked || done.current) return;
    setLocked(true);
    setFlash({ key: Date.now(), text: `${TD.answerWas} ${q.displayAnswer}`, good: false });
    advance(score);
  };

  const missRef = useRef(miss);
  useEffect(() => {
    missRef.current = miss;
  });

  useEffect(() => {
    if (locked) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = revealed; i < q.clubs.length; i++) {
      timers.push(setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), (i - revealed + 1) * CP_REVEAL_MS));
    }
    timers.push(setTimeout(() => missRef.current(), totalMs));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart per question
  }, [qIdx, locked]);

  const submit = () => {
    if (locked || done.current) return;
    const value = input.trim();
    if (!value) return;
    setInput('');
    if (matchesName(value, [...q.acceptedAnswers, q.displayAnswer]).ok) {
      const pts = Math.max(20, 100 - Math.round((80 * (revealed - 1)) / Math.max(1, q.clubs.length - 1)));
      setLocked(true);
      setFlash({ key: Date.now(), text: `${TD.correct} +${pts}`, good: true });
      const total = score + pts;
      setScore(total);
      advance(total);
    } else {
      setFlash({ key: Date.now(), text: TD.wrong, good: false });
    }
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <CategoryBand prompt={q.prompt} compact />
      <div className="flex min-h-[190px] flex-col gap-2">
        {q.clubs.map((club, i) => (
          <div
            key={`${q.id}-${i}`}
            className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5"
            style={{
              background: 'var(--td-charcoal)',
              boxShadow: '3px 3px 0 rgba(0,0,0,0.5)',
              opacity: i < revealed ? 1 : 0.35,
            }}
          >
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px]"
              style={{ ...TD_DISPLAY, background: i < revealed ? 'var(--td-orange)' : 'rgba(255,255,255,0.15)', color: i < revealed ? '#0d0d0d' : 'rgba(255,255,255,0.5)' }}
            >
              {i + 1}
            </span>
            <span className="text-[13px] text-white md:text-[15px]" style={TD_DISPLAY}>
              {i < revealed ? club : '???'}
            </span>
          </div>
        ))}
      </div>
      <TurnTimerBar turnKey={`cp-${qIdx}`} ms={totalMs} running={!locked} />
      <div className="relative">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={locked}
            placeholder={TD.answerPlaceholder}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            className="h-12 min-w-0 flex-1 rounded-[10px] border-0 px-4 text-[15px] text-white outline-none placeholder:text-white/35 disabled:opacity-50"
            style={{ background: 'var(--td-charcoal)', boxShadow: '4px 4px 0 rgba(0,0,0,0.5)', fontFamily: "'Noto Sans Georgian', sans-serif", fontWeight: 600 }}
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.95 }}
            disabled={locked}
            className="h-12 shrink-0 rounded-[10px] px-5 text-sm disabled:opacity-40"
            style={{ ...TD_DISPLAY, background: 'var(--td-orange)', color: '#0d0d0d', boxShadow: '4px 4px 0 rgba(0,0,0,0.5)' }}
          >
            {TD.submit}
          </motion.button>
        </form>
        <Flash flash={flash} />
      </div>
      <p className="text-center text-[11px] text-white/50" style={TD_DISPLAY}>
        {qIdx + 1}/{session.questions.length} · {score}
      </p>
    </div>
  );
}

/* ── Guess the Goal — tactics-board replay, answer fast for points ── */

const GTG_MAX = 100;
const GTG_MIN = 40;
const GTG_ROUND_MS = 35_000;
const GTG_LOOP_HOLD = 1.6;

function gtgPotential(revealed: number, mainCount: number, looped: boolean): number {
  if (looped) return GTG_MIN;
  const step = Math.max(0, Math.min(revealed - 1, mainCount - 1));
  return Math.round(GTG_MAX - ((GTG_MAX - GTG_MIN) * step) / Math.max(1, mainCount - 1));
}

function TdGuessTheGoal({ onDone }: { onDone: (score: number) => void }) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [time, setTime] = useState(0);
  const [maxReveal, setMaxReveal] = useState(1);
  const [looped, setLooped] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const timeRef = useRef(0);
  const done = useRef(false);

  const goal = TACTICS_GOALS[roundIdx];
  const timeline = useMemo(() => buildTimeline(goal), [goal]);

  // replay clock (loops with a short hold, like the broadcast replay)
  useEffect(() => {
    if (picked !== null) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let next = timeRef.current + dt;
      if (next > timeline.duration + GTG_LOOP_HOLD) {
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
  }, [timeline, picked, roundIdx]);

  const advance = (total: number) => {
    if (roundIdx + 1 >= TACTICS_GOALS.length) {
      done.current = true;
      setTimeout(() => onDone(total), 1400);
    } else {
      setTimeout(() => {
        setRoundIdx((i) => i + 1);
        setPicked(null);
        setLooped(false);
        setMaxReveal(1);
        timeRef.current = 0;
        setTime(0);
      }, 1800);
    }
  };

  const pick = (i: number) => {
    if (picked !== null || done.current) return;
    setPicked(i);
    const total = i === goal.answerIndex ? score + gtgPotential(maxReveal, timeline.mainCount, looped) : score;
    setScore(total);
    advance(total);
  };

  const pickRef = useRef(pick);
  useEffect(() => {
    pickRef.current = pick;
  });
  useEffect(() => {
    const t = setTimeout(() => {
      // round clock expired — counts as a miss
      if (pickRef.current) pickRef.current(-1);
    }, GTG_ROUND_MS);
    return () => clearTimeout(t);
  }, [roundIdx]);

  return (
    <div className="flex w-full flex-col gap-3">
      <div
        className="relative w-full overflow-hidden rounded-[14px]"
        style={{ aspectRatio: `${BOARD_VIEW_W} / ${BOARD_VIEW_H}`, boxShadow: '4px 5px 0 rgba(0,0,0,0.55)' }}
      >
        <TacticsBoard2D goal={goal} timeline={timeline} t={time} goalFlash={false} />
        <div
          className="absolute left-2 top-2 rounded-full px-3 py-1.5 text-[11px]"
          style={{ ...TD_DISPLAY, background: 'rgba(0,0,0,0.6)', color: 'var(--td-white)' }}
        >
          {Math.min(maxReveal, timeline.mainCount)}/{timeline.mainCount}
        </div>
        <div
          className="absolute right-2 top-2 rounded-full px-3 py-1.5 text-[11px]"
          style={{ ...TD_DISPLAY, background: 'var(--td-orange)', color: '#0d0d0d' }}
        >
          {gtgPotential(maxReveal, timeline.mainCount, looped)}
        </div>
      </div>
      <TurnTimerBar turnKey={`gtg-${roundIdx}`} ms={GTG_ROUND_MS} running={picked === null} />
      <div className="grid grid-cols-1 gap-2">
        {goal.options.map((opt, i) => {
          const state =
            picked === null ? 'idle' : i === goal.answerIndex ? 'correct' : i === picked ? 'wrong' : 'dim';
          return (
            <button
              key={opt}
              type="button"
              disabled={picked !== null}
              onClick={() => pick(i)}
              className="rounded-[10px] px-3.5 py-3 text-left text-[12px] leading-snug transition-opacity md:text-[13px]"
              style={{
                ...TD_DISPLAY,
                background: state === 'correct' ? 'var(--td-orange)' : state === 'wrong' ? 'var(--td-steel-deep)' : 'var(--td-charcoal)',
                color: state === 'correct' ? '#0d0d0d' : 'var(--td-white)',
                boxShadow: '3px 3px 0 rgba(0,0,0,0.5)',
                opacity: state === 'dim' ? 0.45 : 1,
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
      <p className="text-center text-[11px] text-white/50" style={TD_DISPLAY}>
        {roundIdx + 1}/{TACTICS_GOALS.length} · {score}
      </p>
    </div>
  );
}

/* ── orchestrator + result (with the +1 ticket daily reward) ────── */

export function TdDailyGame({ type, onExit }: { type: TdDailyType; onExit: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ score: number; reward: boolean } | null>(null);

  const finish = (score: number) => {
    setResult({ score, reward: claimDailyReward(type) });
  };

  if (result) {
    return (
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
        <motion.div
          initial={{ scale: 0.7, rotate: -4, opacity: 0 }}
          animate={{ scale: 1, rotate: -2, opacity: 1 }}
          transition={{ type: 'spring', damping: 12 }}
          className="flex flex-col items-center gap-2 rounded-[14px] px-10 py-6"
          style={{ background: 'var(--td-orange)', boxShadow: '7px 7px 0 #000' }}
        >
          <span className="text-sm" style={{ ...TD_DISPLAY, color: 'rgba(0,0,0,0.65)' }}>
            {TD.dailyYourScore}
          </span>
          <span className="text-5xl" style={{ ...TD_DISPLAY, color: '#0d0d0d' }}>
            {result.score}
          </span>
        </motion.div>
        {result.reward && (
          <motion.div
            initial={{ scale: 0, rotate: 8 }}
            animate={{ scale: 1, rotate: 2 }}
            transition={{ delay: 0.35, type: 'spring', damping: 10 }}
            className="flex items-center gap-2 rounded-full px-5 py-2.5"
            style={{ background: 'var(--td-paper)', boxShadow: '4px 4px 0 rgba(0,0,0,0.55)' }}
          >
            <TicketGlyph size={16} />
            <span className="text-[14px]" style={{ ...TD_DISPLAY, color: '#0d0d0d' }}>
              {TD.dailyRewardTicket}
            </span>
          </motion.div>
        )}
        <div className="flex gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setResult(null);
              setAttempt((n) => n + 1);
            }}
            className="rounded-[12px] px-7 py-3.5 text-sm"
            style={{ ...TD_DISPLAY, background: 'var(--td-orange)', color: '#0d0d0d', boxShadow: '5px 5px 0 #000' }}
          >
            {TD.playAgain}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onExit}
            className="rounded-[12px] px-7 py-3.5 text-sm"
            style={{ ...TD_DISPLAY, background: 'var(--td-charcoal)', color: 'var(--td-white)', boxShadow: '5px 5px 0 #000' }}
          >
            {TD.backHome}
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-4 pb-6 pt-6">
      <GameHeader title={TITLES[type]} onExit={onExit} />
      <div key={attempt} className="flex flex-1 flex-col justify-center">
        {type === 'putInOrder' ? (
          <TdPutInOrder onDone={finish} />
        ) : type === 'careerPath' ? (
          <TdCareerPath onDone={finish} />
        ) : (
          <TdGuessTheGoal onDone={finish} />
        )}
      </div>
    </div>
  );
}

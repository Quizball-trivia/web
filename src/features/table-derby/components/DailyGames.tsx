'use client';

/** Daily challenges rebuilt in Betsson/TD branding (Quizball's demo data
 *  + engines, TD gameplay UI): Football Logic, Put in Order, Career Path.
 *  All three run against timers; the first
 *  completion of each challenge per Georgian day earns +1 ticket. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { matchesName } from '@/features/mini-games/lib/matching';
import { findClubByName } from '@/lib/clubs';
import { buildDemoDailySession } from '@/features/demos/data/demoDailySessions';
import type { PutInOrderSession, CareerPathSession, FootballLogicSession } from '@/lib/domain/dailyChallenge';
import { TD } from '../lib/copy';
import { BsButton } from '../shell/ui';
import { TD_DISPLAY, TicketGlyph, OrderGlyph, RoadGlyph, LogicGlyph } from './brand';
import { CategoryBand, TurnTimerBar } from './chrome';
import { ClubCrest } from './ClubCrest';
import { claimDailyReward } from '../lib/state';

export type TdDailyType = 'putInOrder' | 'careerPath' | 'footballLogic';

const TITLES: Record<TdDailyType, string> = {
  putInOrder: TD.dailyPio,
  careerPath: TD.dailyCp,
  footballLogic: TD.dailyFl,
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
      <BsButton variant="ghost" size="sm" onClick={onExit} className="h-9 px-3">
        ‹ {TD.back}
      </BsButton>
      <h2 className="flex-1 text-center text-lg text-white md:text-xl" style={TD_DISPLAY}>
        {title}
      </h2>
      <span className="w-[68px]" aria-hidden />
    </div>
  );
}

/* ── Put in Order — drag-and-drop reordering vs a 45s round clock ── */

const PIO_ROUND_MS = 45_000;

function PioRow({ id, index, label }: { id: string; index: number; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="flex touch-none select-none items-center gap-2.5 rounded-[10px] px-3 py-2.5"
      style={{
        background: 'var(--td-charcoal)',
        boxShadow: isDragging ? '6px 8px 0 rgba(0,0,0,0.55)' : '3px 3px 0 rgba(0,0,0,0.5)',
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
        position: 'relative',
        cursor: isDragging ? 'grabbing' : 'grab',
        outline: isDragging ? '2px solid var(--td-orange)' : 'none',
      }}
    >
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-[6px] text-[13px]"
        style={{ ...TD_DISPLAY, background: 'var(--td-orange)', color: '#0d0d0d' }}
      >
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 text-[13px] leading-tight text-white md:text-[15px]" style={TD_DISPLAY}>
        {label}
      </span>
      <span className="flex shrink-0 flex-col gap-[3px] pr-1 opacity-40" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="block h-[2.5px] w-4 rounded-full bg-white" />
        ))}
      </span>
    </div>
  );
}

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setOrder((prev) => arrayMove(prev, prev.indexOf(String(active.id)), prev.indexOf(String(over.id))));
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <CategoryBand prompt={round.prompt} compact />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {order.map((id, i) => (
              <PioRow key={id} id={id} index={i} label={round.items.find((it) => it.id === id)!.label} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <TurnTimerBar turnKey={`pio-${roundIdx}`} ms={PIO_ROUND_MS} running />
      <div className="relative">
        <BsButton onClick={submit}>{TD.confirmOrder}</BsButton>
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
  // The en pool is a parallel translation of the same sessions — its Latin
  // club names resolve against the crest registry, the ka ones don't.
  const enSession = useMemo(() => buildDemoDailySession('careerPath', 'en') as CareerPathSession, []);
  const [qIdx, setQIdx] = useState(0);
  const [revealed, setRevealed] = useState(1);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [locked, setLocked] = useState(false);
  const [flash, setFlash] = useState<{ key: number; text: string; good: boolean } | null>(null);
  const q = session.questions[qIdx];
  const totalMs = q.clubs.length * CP_REVEAL_MS + CP_EXTRA_MS;
  const done = useRef(false);

  const crests = useMemo(() => {
    const enClubs = enSession.questions[qIdx]?.clubs;
    if (!enClubs || enClubs.length !== q.clubs.length) return q.clubs.map(() => null);
    return enClubs.map((name) => findClubByName(name)?.logo ?? null);
  }, [enSession, qIdx, q]);

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
            {i < revealed && crests[i] && <ClubCrest src={crests[i]!} size={30} />}
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
            className="bs-input min-w-0 flex-1"
          />
          <BsButton type="submit" size="sm" disabled={locked} className="h-12 shrink-0 px-5">
            {TD.submit}
          </BsButton>
        </form>
        <Flash flash={flash} />
      </div>
      <p className="text-center text-[11px] text-white/50" style={TD_DISPLAY}>
        {qIdx + 1}/{session.questions.length} · {score}
      </p>
    </div>
  );
}

/* ── Football Logic: two clubs + a riddle → name the player ──────── */

const FL_MAX = 100;
const FL_MIN = 40;

function TdFootballLogic({ onDone }: { onDone: (score: number) => void }) {
  const session = useMemo(() => buildDemoDailySession('footballLogic', 'ka') as FootballLogicSession, []);
  const roundMs = session.secondsPerQuestion * 1000;
  const [qIdx, setQIdx] = useState(0);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [locked, setLocked] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [flash, setFlash] = useState<{ key: number; text: string; good: boolean } | null>(null);
  const q = session.questions[qIdx];
  const done = useRef(false);

  const advance = (total: number) => {
    if (qIdx + 1 >= session.questions.length) {
      done.current = true;
      setTimeout(() => onDone(total), 1100);
    } else {
      setTimeout(() => {
        setQIdx((i) => i + 1);
        setLocked(false);
        setInput('');
        setStartedAt(Date.now());
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
    const t = setTimeout(() => missRef.current(), roundMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart per question
  }, [qIdx, locked]);

  const submit = () => {
    if (locked || done.current) return;
    const value = input.trim();
    if (!value) return;
    setInput('');
    if (matchesName(value, [...q.acceptedAnswers, q.displayAnswer]).ok) {
      const elapsed = Math.min(1, (Date.now() - startedAt) / roundMs);
      const pts = Math.round(FL_MAX - (FL_MAX - FL_MIN) * elapsed);
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
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] text-white/60" style={TD_DISPLAY}>
          {qIdx + 1} / {session.questions.length} · {q.category}
        </span>
        <span className="text-[13px]" style={{ ...TD_DISPLAY, color: 'var(--td-orange)' }}>
          {score}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[q.imageAUrl, q.imageBUrl].map((src, i) => (
          <div
            key={`${q.id}-${i}`}
            className="flex aspect-square items-center justify-center rounded-[12px] p-4"
            style={{ background: 'var(--td-paper)', boxShadow: '4px 4px 0 rgba(0,0,0,0.55)', transform: `rotate(${i ? 1 : -1}deg)` }}
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element -- demo clue image
              <img src={src} alt="" className="max-h-full max-w-full object-contain" draggable={false} />
            ) : (
              <span className="text-4xl" style={{ ...TD_DISPLAY, color: '#0d0d0d' }}>?</span>
            )}
          </div>
        ))}
      </div>
      <CategoryBand prompt={q.prompt ?? ''} compact />
      <TurnTimerBar turnKey={`fl-${qIdx}`} ms={roundMs} running={!locked} />
      <div className="relative">
        <Flash flash={flash} />
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
            autoComplete="off"
            autoCapitalize="off"
            className="bs-input min-w-0 flex-1"
          />
          <BsButton type="submit" size="sm" disabled={locked} className="h-12 shrink-0 px-5">
            {TD.submit}
          </BsButton>
        </form>
      </div>
    </div>
  );
}

const RULES: Record<TdDailyType, { text: string; pill: string }> = {
  footballLogic: { text: TD.dailyRulesFl, pill: TD.dailyPillFl },
  putInOrder: { text: TD.dailyRulesPio, pill: TD.dailyPillPio },
  careerPath: { text: TD.dailyRulesCp, pill: TD.dailyPillCp },
};

export function TdDailyGame({
  type,
  onExit,
  presetResult,
}: {
  type: TdDailyType;
  onExit: () => void;
  /** Dev playground: open straight on the result screen. */
  presetResult?: { score: number; reward: boolean } | null;
}) {
  const [attempt, setAttempt] = useState(0);
  const [started, setStarted] = useState(!!presetResult);
  const [result, setResult] = useState<{ score: number; reward: boolean } | null>(presetResult ?? null);

  const finish = (score: number) => {
    setResult({ score, reward: claimDailyReward(type) });
  };

  // Rules first, game on start — the clocks only run once the player is in.
  if (!started) {
    return (
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-4 pb-6 pt-6">
        <GameHeader title={TITLES[type]} onExit={onExit} />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 flex-col items-center justify-center gap-5 pb-16 text-center"
        >
          {type === 'footballLogic' ? (
            <LogicGlyph size={56} />
          ) : type === 'putInOrder' ? (
            <OrderGlyph size={56} />
          ) : (
            <RoadGlyph size={56} />
          )}
          <p className="max-w-xs text-[13px] leading-relaxed text-white/75 md:text-[14px]" style={TD_DISPLAY}>
            {RULES[type].text}
          </p>
          <div className="bs-body-medium rounded-full px-4 py-2 text-[12px]" style={{ background: 'var(--bs-surface)', color: 'var(--bs-text-2)' }}>
            {RULES[type].pill}
          </div>
          <BsButton onClick={() => setStarted(true)} className="max-w-xs">
            {TD.dailyStart}
          </BsButton>
        </motion.div>
      </div>
    );
  }

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
        <div className="flex w-full max-w-sm flex-col gap-3">
          <BsButton
            onClick={() => {
              setResult(null);
              setAttempt((n) => n + 1);
            }}
          >
            {TD.playAgain}
          </BsButton>
          <BsButton variant="ghost" onClick={onExit}>
            {TD.backHome}
          </BsButton>
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
          <TdFootballLogic onDone={finish} />
        )}
      </div>
    </div>
  );
}

'use client';

/** Round 3 — პაპა კარლოს ყუთი. A 3D box with 5 usable sides the player can
 *  roll; each side carries 2 category cards showing questions left. On your
 *  turn: roll, tap a card, answer its next question against the clock; a
 *  failed answer opens a steal. +1 per correct; uncatchable lead ends it. */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { matchesName } from '@/features/mini-games/lib/matching';
import { TD } from '../lib/copy';
import { TD_BOX_CARDS, type TdBoxQuestion } from '../data/box';
import { TD_DISPLAY } from './brand';
import { ScorePill, TurnTimerBar } from './chrome';
import { MyAvatar, TdAvatar } from './Avatar';

type Seat = 'me' | 'op';
type BPhase = 'roll' | 'qMe' | 'qOp' | 'stealMe' | 'stealOp' | 'over';

const ANSWER_MS = 15_000;
const STEAL_MS = 10_000;

/* The box is a Blender-rendered turntable: 120 frames over a full 360
 * deg (each face carries its own baked card colors). Drag spins it;
 * release snaps to the nearest face, where the text overlays the baked
 * cards in the front pockets. */
const FRAMES = 120;
const DEG_PER_FRAME = 3;
const FACE_DEG = 72;
const framePath = (i: number) => `/assets/table-derby/3d/box/box_${String(i).padStart(3, '0')}.webp`;

/* Card colors are BAKED into the Blender render (the slabs spin with the
 * box); the overlay is text-only. Per-color text contrast: */
const CARD_TEXT = ['#fff', '#fff', '#0d0d0d', '#fff', '#0d0d0d', '#fff', '#0d0d0d', '#0d0d0d', '#0d0d0d', '#0d0d0d'];

/* Pocket rects measured from the rendered frame (percent of 640x760). */
const POCKETS = [
  { left: '32%', width: '35.8%', top: '29.5%', height: '12.3%' },
  { left: '32%', width: '35.8%', top: '52.6%', height: '11.6%' },
];

interface CardState {
  id: string;
  title: string;
  remaining: TdBoxQuestion[];
}

export function BoxRound({
  starter,
  roundsWon,
  opponentName,
  onEnd,
}: {
  starter: Seat;
  roundsWon: { me: number; op: number };
  opponentName: string;
  onEnd: (winner: Seat | 'tie', scores: { me: number; op: number }) => void;
}) {
  const [cards, setCards] = useState<CardState[]>(() =>
    TD_BOX_CARDS.map((c) => ({ id: c.id, title: c.title, remaining: [...c.questions] })),
  );
  // turntable rotation (continuous degrees) + drag state
  const [rot, setRot] = useState(0);
  const [dragging, setDragging] = useState(false);
  const rotRef = useRef(0);
  const dragRef = useRef<{ startX: number; startRot: number; cardId: string | null; moved: boolean } | null>(null);
  const animRef = useRef<number | null>(null);
  const setRotBoth = (v: number) => {
    rotRef.current = v;
    setRot(v);
  };
  const animateTo = (target: number, ms = 380) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const from = rotRef.current;
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setRotBoth(from + (target - from) * ease(t));
      if (t < 1) animRef.current = requestAnimationFrame(step);
      else animRef.current = null;
    };
    animRef.current = requestAnimationFrame(step);
  };
  useEffect(() => () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
  }, []);
  const [turn, setTurn] = useState<Seat>(starter);
  const [bphase, setBphase] = useState<BPhase>('roll');
  const [scores, setScores] = useState({ me: 0, op: 0 });
  const [activeQ, setActiveQ] = useState<{ cardTitle: string; q: TdBoxQuestion } | null>(null);
  const [tick, setTick] = useState(0);
  const [input, setInput] = useState('');
  const [flash, setFlash] = useState<{ key: number; text: string; good: boolean } | null>(null);

  const sref = useRef({ cards, turn, bphase, scores, activeQ });
  sref.current = { cards, turn, bphase, scores, activeQ };
  const ended = useRef(false);

  const doFlash = (text: string, good: boolean) => setFlash({ key: Date.now(), text, good });

  // Dev-only e2e hook: leak the current expected answer for test scripts.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      (window as unknown as { __tdAnswer?: string }).__tdAnswer = activeQ?.q.display;
    }
  });

  const totalRemaining = (cs: CardState[]) => cs.reduce((n, c) => n + c.remaining.length, 0);

  const finishQuestion = (winner: Seat | null) => {
    const s = sref.current;
    const nextScores = winner ? { ...s.scores, [winner]: s.scores[winner] + 1 } : s.scores;
    setScores(nextScores);
    setActiveQ(null);
    const remaining = totalRemaining(s.cards);
    const diff = Math.abs(nextScores.me - nextScores.op);
    if (remaining === 0 || diff > remaining) {
      if (ended.current) return;
      ended.current = true;
      setBphase('over');
      if (remaining > 0) doFlash(TD.roundDecided, true);
      const w: Seat | 'tie' = nextScores.me === nextScores.op ? 'tie' : nextScores.me > nextScores.op ? 'me' : 'op';
      setTimeout(() => onEnd(w, nextScores), 1600);
      return;
    }
    setTurn((t) => (t === 'me' ? 'op' : 'me'));
    setBphase('roll');
    setTick((t) => t + 1);
  };

  const openCard = (cardId: string, by: Seat) => {
    const s = sref.current;
    if (s.bphase !== 'roll') return; // already answering
    const card = s.cards.find((c) => c.id === cardId);
    if (!card || card.remaining.length === 0) return;
    const nextQ = card.remaining[0];
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, remaining: c.remaining.slice(1) } : c)));
    setActiveQ({ cardTitle: card.title, q: nextQ });
    setBphase(by === 'me' ? 'qMe' : 'qOp');
    setTick((t) => t + 1);
  };

  // Scripted opponent + my timeouts.
  useEffect(() => {
    if (ended.current) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    if (bphase === 'roll' && turn === 'op') {
      t = setTimeout(() => {
        // op picks a card, spins the box to its face, then opens it
        const pool = sref.current.cards.filter((c) => c.remaining.length > 0);
        if (pool.length === 0) return;
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        const ci = sref.current.cards.findIndex((c) => c.id === chosen.id);
        const lfTarget = Math.floor(ci / 2);
        const lfNow = ((Math.round(rotRef.current / FACE_DEG) % 5) + 5) % 5;
        const delta = (((lfTarget - lfNow) % 5) + 5) % 5 || 5;
        animateTo(rotRef.current + delta * FACE_DEG, 750);
        setTimeout(() => openCard(chosen.id, 'op'), 1050);
      }, 1400 + Math.random() * 1200);
    } else if (bphase === 'qOp') {
      t = setTimeout(() => {
        if (Math.random() < 0.6) {
          doFlash(`${opponentName}: ${sref.current.activeQ?.q.display ?? ''}`, false);
          finishQuestion('op');
        } else {
          doFlash(TD.stealChance, true);
          setBphase('stealMe');
          setTick((n) => n + 1);
        }
      }, 2600 + Math.random() * 2600);
    } else if (bphase === 'stealOp') {
      t = setTimeout(() => {
        if (Math.random() < 0.5) {
          doFlash(`${opponentName}: ${sref.current.activeQ?.q.display ?? ''}`, false);
          finishQuestion('op');
        } else {
          finishQuestion(null);
        }
      }, 1800 + Math.random() * 1700);
    } else if (bphase === 'qMe' || bphase === 'stealMe') {
      t = setTimeout(
        () => {
          if (sref.current.bphase === 'qMe') {
            doFlash(TD.timeUp, false);
            setBphase('stealOp');
            setTick((n) => n + 1);
          } else {
            doFlash(TD.timeUp, false);
            finishQuestion(null);
          }
        },
        bphase === 'qMe' ? ANSWER_MS : STEAL_MS,
      );
    }
    return () => {
      if (t) clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- machine keyed by phase+tick
  }, [bphase, turn, tick]);

  const submit = () => {
    const s = sref.current;
    if (!s.activeQ || (s.bphase !== 'qMe' && s.bphase !== 'stealMe')) return;
    const value = input.trim();
    if (!value) return;
    setInput('');
    if (matchesName(value, s.activeQ.q.aliases).ok) {
      doFlash(`${TD.correct} +1`, true);
      finishQuestion('me');
    } else if (s.bphase === 'qMe') {
      doFlash(TD.wrong, false);
      setBphase('stealOp');
      setTick((n) => n + 1);
    } else {
      doFlash(TD.wrong, false);
      finishQuestion(null);
    }
  };

  const myInput = bphase === 'qMe' || bphase === 'stealMe';
  const myActive = myInput || (bphase === 'roll' && turn === 'me');
  const opActive = bphase === 'qOp' || bphase === 'stealOp' || (bphase === 'roll' && turn === 'op');
  const canRoll = bphase === 'roll';
  const canPick = bphase === 'roll' && turn === 'me';
  const statusText =
    bphase === 'roll'
      ? turn === 'me'
        ? TD.rollBox
        : `${opponentName} · ${TD.opponentChoosing}`
      : bphase === 'qOp'
        ? `${opponentName} · ${TD.opponentTurn}`
        : bphase === 'stealOp'
          ? `${opponentName} · ${TD.opponentStealing}`
          : bphase === 'stealMe'
            ? TD.stealChance
            : bphase === 'qMe'
              ? TD.yourTurn
              : '';

  const boxW = typeof window !== 'undefined' && window.innerWidth >= 768 ? 390 : 345;
  const boxH = Math.round(boxW * (760 / 640));
  const nearestFaceRot = Math.round(rot / FACE_DEG) * FACE_DEG;
  const snapped = !dragging && Math.abs(rot - nearestFaceRot) < 3;
  const frame = ((Math.round(rot / DEG_PER_FRAME) % FRAMES) + FRAMES) % FRAMES;
  const lf = ((Math.round(rot / FACE_DEG) % 5) + 5) % 5;
  const faceCards = [cards[lf * 2], cards[lf * 2 + 1]];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 pt-20 md:gap-4">
      <div className="fixed inset-x-0 top-0 z-30 flex justify-center pb-4 pt-4" style={{ background: 'linear-gradient(to bottom, rgba(30,30,30,0.92) 55%, transparent)' }}>
        <ScorePill roundsMe={roundsWon.me} roundsOp={roundsWon.op} inRoundMe={scores.me} inRoundOp={scores.op} left={<MyAvatar size={54} active={myActive} />} right={<TdAvatar name={opponentName} size={54} active={opActive} />} />
      </div>
      <p
        className="text-center text-[14px] md:text-base"
        style={{ ...TD_DISPLAY, color: bphase === 'stealMe' ? 'var(--td-orange)' : 'rgba(255,255,255,0.7)' }}
      >
        {statusText}
      </p>

      {/* the box — Blender turntable, spin it with your finger */}
      <div className="flex items-center">
        <div
          className="relative select-none"
          style={{ width: boxW, height: boxH, touchAction: 'none', cursor: canRoll ? (dragging ? 'grabbing' : 'grab') : 'default' }}
          onPointerDown={(e) => {
            if (!canRoll) return;
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
            if (animRef.current) cancelAnimationFrame(animRef.current);
            const cardEl = (e.target as HTMLElement).closest('[data-card-id]') as HTMLElement | null;
            dragRef.current = { startX: e.clientX, startRot: rotRef.current, cardId: cardEl?.dataset.cardId ?? null, moved: false };
          }}
          onPointerMove={(e) => {
            const d = dragRef.current;
            if (!d) return;
            if (!d.moved && Math.abs(e.clientX - d.startX) > 8) {
              d.moved = true;
              setDragging(true);
            }
            if (d.moved) setRotBoth(d.startRot + (e.clientX - d.startX) * 0.35);
          }}
          onPointerUp={() => {
            const d = dragRef.current;
            if (!d) return;
            dragRef.current = null;
            setDragging(false);
            if (d.moved) {
              animateTo(Math.round(rotRef.current / FACE_DEG) * FACE_DEG);
            } else if (d.cardId && canPick) {
              openCard(d.cardId, 'me'); // clean tap on a card
            }
          }}
          onPointerCancel={() => {
            if (!dragRef.current) return;
            dragRef.current = null;
            setDragging(false);
            animateTo(Math.round(rotRef.current / FACE_DEG) * FACE_DEG);
          }}
        >
          {Array.from({ length: FRAMES }).map((_, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- local 3D turntable frame
            <img
              key={i}
              src={framePath(i)}
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              style={{ opacity: i === frame ? 1 : 0 }}
            />
          ))}
          {/* text over the baked-in cards (the colored slabs spin with the box) */}
          {faceCards.map((card, j) => (
            <button
              key={card.id}
              type="button"
              data-card-id={card.remaining.length > 0 ? card.id : undefined}
              disabled={!canPick || card.remaining.length === 0}
              className="absolute flex flex-col items-start justify-between overflow-hidden rounded-[6px] px-2 py-1 text-left transition-opacity duration-200"
              style={{
                ...POCKETS[j],
                opacity: snapped ? 1 : 0,
                pointerEvents: snapped ? 'auto' : 'none',
              }}
            >
              {card.remaining.length === 0 && (
                <span aria-hidden className="absolute inset-0 rounded-[6px]" style={{ background: 'rgba(0,0,0,0.55)' }} />
              )}
              <span
                className="relative text-[11px] leading-tight md:text-[13px]"
                style={{ ...TD_DISPLAY, color: CARD_TEXT[(lf * 2 + j) % CARD_TEXT.length] }}
              >
                {card.title}
              </span>
              <span
                className="relative shrink-0 rounded-full px-1.5 py-0.5 text-[8px] md:text-[9px]"
                style={{
                  ...TD_DISPLAY,
                  background: 'rgba(0,0,0,0.8)',
                  color: card.remaining.length > 0 ? 'var(--td-white)' : 'rgba(255,255,255,0.6)',
                }}
              >
                {card.remaining.length} {TD.questionsLeftSuffix}
              </span>
            </button>
          ))}
          <button
            type="button"
            disabled={!canRoll}
            onClick={() => canRoll && animateTo(Math.round(rotRef.current / FACE_DEG) * FACE_DEG - FACE_DEG)}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute left-0 top-[42%] z-10 flex size-11 items-center justify-center rounded-full text-xl text-white disabled:opacity-30"
            style={{ ...TD_DISPLAY, background: 'var(--td-charcoal)', boxShadow: '3px 3px 0 #000' }}
            aria-label="roll-left"
          >
            ‹
          </button>
          <button
            type="button"
            disabled={!canRoll}
            onClick={() => canRoll && animateTo(Math.round(rotRef.current / FACE_DEG) * FACE_DEG + FACE_DEG)}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute right-0 top-[42%] z-10 flex size-11 items-center justify-center rounded-full text-xl text-white disabled:opacity-30"
            style={{ ...TD_DISPLAY, background: 'var(--td-charcoal)', boxShadow: '3px 3px 0 #000' }}
            aria-label="roll-right"
          >
            ›
          </button>
        </div>
      </div>

      {/* active question */}
      <div className="relative w-full">
        <AnimatePresence>
          {activeQ && (
            <motion.div
              key={activeQ.q.q}
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -18, opacity: 0 }}
              className="mx-auto w-full max-w-xl rounded-[12px] px-4 py-3.5"
              style={{ background: 'var(--td-paper)', boxShadow: '5px 5px 0 rgba(0,0,0,0.6)', transform: 'rotate(-0.6deg)' }}
            >
              <span className="text-[11px]" style={{ ...TD_DISPLAY, color: 'var(--td-orange)' }}>
                {activeQ.cardTitle}
              </span>
              <p className="mt-1 text-[16px] leading-snug md:text-lg" style={{ ...TD_DISPLAY, color: '#0d0d0d' }}>
                {activeQ.q.q}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full max-w-xl">
        <TurnTimerBar
          turnKey={`b-${tick}`}
          ms={bphase === 'qMe' || bphase === 'qOp' ? ANSWER_MS : STEAL_MS}
          running={bphase === 'qMe' || bphase === 'qOp' || bphase === 'stealMe' || bphase === 'stealOp'}
        />
      </div>

      <div className="relative w-full max-w-xl">
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
            disabled={!myInput}
            placeholder={myInput ? TD.answerPlaceholder : statusText}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            className="h-14 min-w-0 flex-1 rounded-[10px] border-0 px-4 text-base text-white outline-none placeholder:text-white/35 disabled:opacity-50"
            style={{ background: 'var(--td-charcoal)', boxShadow: '4px 4px 0 rgba(0,0,0,0.5)', fontFamily: "'Noto Sans Georgian', sans-serif", fontWeight: 600 }}
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.95 }}
            disabled={!myInput}
            className="h-14 shrink-0 rounded-[10px] px-6 text-base disabled:opacity-40"
            style={{ ...TD_DISPLAY, background: 'var(--td-orange)', color: '#0d0d0d', boxShadow: '4px 4px 0 rgba(0,0,0,0.5)' }}
          >
            {TD.submit}
          </motion.button>
        </form>
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
      </div>
    </div>
  );
}

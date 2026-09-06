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
import { TD_DISPLAY, PERF_DOTS } from './brand';
import { ScorePill, TurnTimerBar } from './chrome';
import { MyAvatar, TdAvatar } from './Avatar';

type Seat = 'me' | 'op';
type BPhase = 'roll' | 'qMe' | 'qOp' | 'stealMe' | 'stealOp' | 'over';

const ANSWER_MS = 15_000;
const STEAL_MS = 10_000;

/* Box faces: 4 around (rotateY) + top (rotateX). PLACE positions a face on
 * the cube; VIEW is the cube rotation that brings that face to the front. */
const PLACE = ['rotateY(0deg)', 'rotateY(90deg)', 'rotateY(180deg)', 'rotateY(270deg)', 'rotateX(90deg)'];
const VIEW = ['rotateY(0deg)', 'rotateY(-90deg)', 'rotateY(-180deg)', 'rotateY(-270deg)', 'rotateX(-90deg)'];

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
  const [face, setFace] = useState(0);
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
        setFace((f) => (f + 1 + Math.floor(Math.random() * 4)) % 5); // op "rolls"
        setTimeout(() => {
          const pool = sref.current.cards.filter((c) => c.remaining.length > 0);
          if (pool.length === 0) return;
          openCard(pool[Math.floor(Math.random() * pool.length)].id, 'op');
        }, 900);
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

  const boxSize = typeof window !== 'undefined' && window.innerWidth >= 768 ? 340 : 280;
  const half = boxSize / 2;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 md:gap-4">
      <ScorePill roundsMe={roundsWon.me} roundsOp={roundsWon.op} inRoundMe={scores.me} inRoundOp={scores.op} left={<MyAvatar size={40} active={myActive} />} right={<TdAvatar name={opponentName} size={40} active={opActive} />} />
      <p
        className="text-center text-[14px] md:text-base"
        style={{ ...TD_DISPLAY, color: bphase === 'stealMe' ? 'var(--td-orange)' : 'rgba(255,255,255,0.7)' }}
      >
        {statusText}
      </p>

      {/* the box */}
      <div className="flex items-center gap-3 md:gap-5">
        <button
          type="button"
          disabled={!canRoll}
          onClick={() => setFace((f) => (f + 4) % 5)}
          className="flex size-12 items-center justify-center rounded-full text-2xl text-white disabled:opacity-30 md:size-14"
          style={{ ...TD_DISPLAY, background: 'var(--td-charcoal)', boxShadow: '3px 3px 0 #000' }}
          aria-label="roll-left"
        >
          ‹
        </button>
        <div style={{ perspective: 1000, width: boxSize, height: boxSize }}>
          <motion.div
            animate={{ transform: `translateZ(-${half}px) ${VIEW[face]}` }}
            transition={{ type: 'spring', damping: 20, stiffness: 160 }}
            className="relative h-full w-full"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {PLACE.map((tf, i) => {
              const a = cards[i * 2];
              const b = cards[i * 2 + 1];
              return (
                <div
                  key={i}
                  className="absolute inset-0 flex flex-col justify-center gap-3 rounded-[16px] p-4"
                  style={{
                    transform: `${tf} translateZ(${half}px)`,
                    background: 'var(--td-orange)',
                    boxShadow: 'inset 0 0 0 3px rgba(0,0,0,0.25)',
                    backfaceVisibility: 'hidden',
                  }}
                >
                  <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[16px]" style={PERF_DOTS} />
                  {[a, b].map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      disabled={!canPick || card.remaining.length === 0}
                      onClick={() => openCard(card.id, 'me')}
                      className="relative flex items-center justify-between gap-2 rounded-[10px] px-3.5 py-3.5 text-left transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-60"
                      style={{ background: '#141414', boxShadow: '3.5px 3.5px 0 rgba(0,0,0,0.45)' }}
                    >
                      <span className="text-[15px] text-white md:text-base" style={TD_DISPLAY}>
                        {card.title}
                      </span>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-[11px]"
                        style={{
                          ...TD_DISPLAY,
                          background: card.remaining.length > 0 ? 'var(--td-orange)' : 'rgba(255,255,255,0.15)',
                          color: card.remaining.length > 0 ? '#0d0d0d' : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {card.remaining.length} {TD.questionsLeftSuffix}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}
          </motion.div>
        </div>
        <button
          type="button"
          disabled={!canRoll}
          onClick={() => setFace((f) => (f + 1) % 5)}
          className="flex size-12 items-center justify-center rounded-full text-2xl text-white disabled:opacity-30 md:size-14"
          style={{ ...TD_DISPLAY, background: 'var(--td-charcoal)', boxShadow: '3px 3px 0 #000' }}
          aria-label="roll-right"
        >
          ›
        </button>
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

'use client';

/** Round 2 — ბარათონი. 20 face-down cards, one category. Players alternate
 *  draws; the drawn card is visible to both; drawer gets 10s to guess, a
 *  failed guess opens a steal. Card corner number = its point value.
 *  Ends when the deck is empty or the lead is uncatchable. */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { matchesName } from '@/features/mini-games/lib/matching';
import { TD } from '../lib/copy';
import type { TdCard, TdCardCategory } from '../data/cards';
import { TD_DISPLAY, BoltGlyph, BetssonWordmark } from './brand';
import { CategoryBand, ScorePill, TurnTimerBar } from './chrome';

type Seat = 'me' | 'op';
type CPhase = 'pick' | 'guessMe' | 'guessOp' | 'stealMe' | 'stealOp' | 'over';

const GUESS_MS = 10_000;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface CardSlot {
  card: TdCard;
  gone: boolean;
}

export function CardsRound({
  category,
  starter,
  roundsWon,
  opponentName,
  onEnd,
}: {
  category: TdCardCategory;
  starter: Seat;
  roundsWon: { me: number; op: number };
  opponentName: string;
  onEnd: (winner: Seat | 'tie', scores: { me: number; op: number }) => void;
}) {
  const [slots, setSlots] = useState<CardSlot[]>(() => shuffle(category.cards).map((card) => ({ card, gone: false })));
  const [current, setCurrent] = useState<TdCard | null>(null);
  const [drawer, setDrawer] = useState<Seat>(starter);
  const [scores, setScores] = useState({ me: 0, op: 0 });
  const [cphase, setCphase] = useState<CPhase>('pick');
  const [tick, setTick] = useState(0); // timer/effect key
  const [input, setInput] = useState('');
  const [flash, setFlash] = useState<{ key: number; text: string; good: boolean } | null>(null);

  const sref = useRef({ slots, current, drawer, scores, cphase });
  sref.current = { slots, current, drawer, scores, cphase };
  const ended = useRef(false);

  const doFlash = (text: string, good: boolean) => setFlash({ key: Date.now(), text, good });

  // Dev-only e2e hook: leak the current expected answer for test scripts.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      (window as unknown as { __tdAnswer?: string }).__tdAnswer = current?.display;
    }
  });

  const finishCard = (winner: Seat | null) => {
    const s = sref.current;
    const nextScores = winner && s.current ? { ...s.scores, [winner]: s.scores[winner] + s.current.value } : s.scores;
    setScores(nextScores);
    setCurrent(null);
    const remaining = s.slots.filter((sl) => !sl.gone);
    const remainingValue = remaining.reduce((sum, sl) => sum + sl.card.value, 0);
    const diff = Math.abs(nextScores.me - nextScores.op);
    if (remaining.length === 0 || diff > remainingValue) {
      if (ended.current) return;
      ended.current = true;
      setCphase('over');
      if (remaining.length > 0) doFlash(TD.roundDecided, true);
      const winnerSeat: Seat | 'tie' = nextScores.me === nextScores.op ? 'tie' : nextScores.me > nextScores.op ? 'me' : 'op';
      setTimeout(() => onEnd(winnerSeat, nextScores), 1600);
      return;
    }
    setDrawer((d) => (d === 'me' ? 'op' : 'me'));
    setCphase('pick');
    setTick((t) => t + 1);
  };

  const reveal = (card: TdCard, by: Seat) => {
    setSlots((prev) => prev.map((sl) => (sl.card.id === card.id ? { ...sl, gone: true } : sl)));
    setCurrent(card);
    setCphase(by === 'me' ? 'guessMe' : 'guessOp');
    setTick((t) => t + 1);
  };

  // Scripted opponent + my guess/steal timeouts.
  useEffect(() => {
    if (ended.current) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    if (cphase === 'pick' && drawer === 'op') {
      t = setTimeout(() => {
        const pool = sref.current.slots.filter((sl) => !sl.gone);
        if (pool.length === 0) return;
        reveal(pool[Math.floor(Math.random() * pool.length)].card, 'op');
      }, 1500 + Math.random() * 1300);
    } else if (cphase === 'guessOp') {
      t = setTimeout(() => {
        if (Math.random() < 0.62) {
          doFlash(`${opponentName}: ${sref.current.current?.display ?? ''}`, false);
          finishCard('op');
        } else {
          doFlash(TD.stealChance, true);
          setCphase('stealMe');
          setTick((n) => n + 1);
        }
      }, 2200 + Math.random() * 2300);
    } else if (cphase === 'stealOp') {
      t = setTimeout(() => {
        if (Math.random() < 0.5) {
          doFlash(`${opponentName}: ${sref.current.current?.display ?? ''}`, false);
          finishCard('op');
        } else {
          finishCard(null);
        }
      }, 1800 + Math.random() * 1700);
    } else if (cphase === 'guessMe' || cphase === 'stealMe') {
      t = setTimeout(() => {
        if (sref.current.cphase === 'guessMe') {
          doFlash(TD.timeUp, false);
          setCphase('stealOp');
          setTick((n) => n + 1);
        } else {
          doFlash(TD.timeUp, false);
          finishCard(null);
        }
      }, GUESS_MS);
    }
    return () => {
      if (t) clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- machine keyed by phase+tick
  }, [cphase, drawer, tick]);

  const submit = () => {
    const s = sref.current;
    if (!s.current || (s.cphase !== 'guessMe' && s.cphase !== 'stealMe')) return;
    const value = input.trim();
    if (!value) return;
    setInput('');
    if (matchesName(value, s.current.aliases).ok) {
      doFlash(`${TD.correct} +${s.current.value}`, true);
      finishCard('me');
    } else if (s.cphase === 'guessMe') {
      doFlash(TD.wrong, false);
      setCphase('stealOp');
      setTick((n) => n + 1);
    } else {
      doFlash(TD.wrong, false);
      finishCard(null);
    }
  };

  const myInput = cphase === 'guessMe' || cphase === 'stealMe';
  const statusText =
    cphase === 'pick'
      ? drawer === 'me'
        ? TD.pickCard
        : `${opponentName} · ${TD.opponentPicking}`
      : cphase === 'guessOp'
        ? `${opponentName} · ${TD.opponentTurn}`
        : cphase === 'stealOp'
          ? `${opponentName} · ${TD.opponentStealing}`
          : cphase === 'stealMe'
            ? TD.stealChance
            : cphase === 'guessMe'
              ? TD.yourTurn
              : '';

  return (
    <div className="flex h-full w-full flex-col justify-center gap-3 md:gap-4">
      <div className="flex justify-center">
        <ScorePill roundsMe={roundsWon.me} roundsOp={roundsWon.op} inRoundMe={scores.me} inRoundOp={scores.op} />
      </div>
      <CategoryBand prompt={`${TD.round2Name} · ${category.prompt}`} compact />

      <p className="text-center text-[12px] md:text-sm" style={{ ...TD_DISPLAY, color: cphase === 'stealMe' ? 'var(--td-white)' : 'rgba(0,0,0,0.65)' }}>
        {statusText}
      </p>

      {/* card table */}
      <div className="relative mx-auto w-full max-w-[430px]">
        <div className="grid grid-cols-5 gap-1.5 md:gap-2.5">
          {slots.map((sl) => (
            <button
              key={sl.card.id}
              type="button"
              disabled={sl.gone || cphase !== 'pick' || drawer !== 'me'}
              onClick={() => reveal(sl.card, 'me')}
              className="relative aspect-[3/4] rounded-[8px] transition-transform enabled:hover:-translate-y-1 md:rounded-[10px]"
              style={
                sl.gone
                  ? { border: '1.5px dashed rgba(255,255,255,0.14)', background: 'transparent' }
                  : { background: '#1b1b1b', boxShadow: '2.5px 3px 0 rgba(0,0,0,0.55)' }
              }
            >
              {!sl.gone && (
                <span className="flex h-full flex-col items-center justify-center gap-1">
                  <BoltGlyph size={18} />
                  <span className="scale-75 opacity-60">
                    <BetssonWordmark size={8} />
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>

        {/* drawn card overlay */}
        <AnimatePresence>
          {current && (
            <motion.div
              key={current.id}
              initial={{ rotateY: 90, scale: 0.7, opacity: 0 }}
              animate={{ rotateY: 0, scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0, y: -30 }}
              transition={{ type: 'spring', damping: 16 }}
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
              style={{ perspective: 800 }}
            >
              <div
                className="relative flex h-[210px] w-[158px] flex-col items-center justify-center gap-2 rounded-[14px] px-3 md:h-[250px] md:w-[188px]"
                style={{ background: 'var(--td-paper)', boxShadow: '7px 7px 0 rgba(0,0,0,0.7)', transform: 'rotate(-2deg)' }}
              >
                <span
                  className="absolute left-2.5 top-2 text-2xl md:text-3xl"
                  style={{ ...TD_DISPLAY, color: 'var(--td-orange)' }}
                >
                  {current.value}
                </span>
                <span className="absolute right-2.5 top-2">
                  <BoltGlyph size={20} />
                </span>
                {current.lines.map((line) => (
                  <span key={line} className="text-center text-base md:text-lg" style={{ ...TD_DISPLAY, color: '#0d0d0d' }}>
                    {line}
                  </span>
                ))}
                <span className="absolute bottom-2 right-3 text-lg" style={{ ...TD_DISPLAY, color: 'var(--td-orange)' }}>
                  ✕
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <TurnTimerBar turnKey={`c-${tick}`} ms={GUESS_MS} running={myInput || cphase === 'guessOp' || cphase === 'stealOp'} onTable />

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
            disabled={!myInput}
            placeholder={myInput ? TD.answerPlaceholder : statusText}
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
            disabled={!myInput}
            className="h-12 shrink-0 rounded-[10px] px-5 text-sm disabled:opacity-40"
            style={{ ...TD_DISPLAY, background: '#0d0d0d', color: 'var(--td-white)', boxShadow: '4px 4px 0 rgba(0,0,0,0.5)' }}
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
                background: flash.good ? '#0d0d0d' : 'var(--td-steel-deep)',
                color: 'var(--td-white)',
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

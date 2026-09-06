'use client';

/** Round 4 — ვინ ვარ მე? (buzzer): clues reveal one by one, first buzz
 *  answers; right +10, wrong −10 and lockout for that subject.
 *  Penalties mode: flat questions, no minus, sudden death on a tie. */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { matchesName } from '@/features/mini-games/lib/matching';
import { TD } from '../lib/copy';
import { TD_DISPLAY } from './brand';
import { ScorePill, TurnTimerBar } from './chrome';
import { MyAvatar, TdAvatar } from './Avatar';

type Seat = 'me' | 'op';
type ZPhase = 'clues' | 'answerMe' | 'answerOp' | 'reveal' | 'over';

export interface BuzzerItem {
  id: string;
  display: string;
  aliases: string[];
  clues: string[];
}

const CLUE_MS = 3500;
const ANSWER_MS = 8000;
const POINTS = 10;

export function BuzzerRound({
  items,
  extraPool = [],
  penaltyMode = false,
  roundsWon,
  opponentName,
  onEnd,
}: {
  items: BuzzerItem[];
  /** Sudden-death reserve (penalty mode tie). */
  extraPool?: BuzzerItem[];
  penaltyMode?: boolean;
  roundsWon: { me: number; op: number };
  opponentName: string;
  onEnd: (winner: Seat | 'tie', scores: { me: number; op: number }) => void;
}) {
  const wrongDelta = penaltyMode ? 0 : -POINTS;
  const [queue, setQueue] = useState<BuzzerItem[]>(items);
  const [itemIdx, setItemIdx] = useState(0);
  const [clueIdx, setClueIdx] = useState(1); // clues revealed
  const [zphase, setZphase] = useState<ZPhase>('clues');
  const [locked, setLocked] = useState({ me: false, op: false });
  const [scores, setScores] = useState({ me: 0, op: 0 });
  const [input, setInput] = useState('');
  const [flash, setFlash] = useState<{ key: number; text: string; good: boolean } | null>(null);
  const [suddenDeath, setSuddenDeath] = useState(false);
  const [tick, setTick] = useState(0);

  const sref = useRef({ queue, itemIdx, clueIdx, zphase, locked, scores, suddenDeath });
  sref.current = { queue, itemIdx, clueIdx, zphase, locked, scores, suddenDeath };
  const ended = useRef(false);
  const spare = useRef([...extraPool]);

  const item = queue[itemIdx];
  const doFlash = (text: string, good: boolean) => setFlash({ key: Date.now(), text, good });

  // Dev-only e2e hook: leak the current expected answer for test scripts.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      (window as unknown as { __tdAnswer?: string }).__tdAnswer = item?.display;
    }
  });

  const nextItem = (nextScores: { me: number; op: number }) => {
    const s = sref.current;
    const isLast = s.itemIdx + 1 >= s.queue.length;
    if (isLast) {
      const tied = nextScores.me === nextScores.op;
      if (penaltyMode && tied && spare.current.length > 0) {
        // sudden death: keep drawing questions until someone leads
        setSuddenDeath(true);
        setQueue((q) => [...q, spare.current.shift()!]);
      } else {
        if (ended.current) return;
        ended.current = true;
        setZphase('over');
        const w: Seat | 'tie' = tied ? 'tie' : nextScores.me > nextScores.op ? 'me' : 'op';
        setTimeout(() => onEnd(w, nextScores), 1500);
        return;
      }
    }
    setItemIdx((i) => i + 1);
    setClueIdx(1);
    setLocked({ me: false, op: false });
    setZphase('clues');
    setTick((t) => t + 1);
  };

  const settle = (seat: Seat, correct: boolean) => {
    const s = sref.current;
    const delta = correct ? POINTS : wrongDelta;
    const nextScores = { ...s.scores, [seat]: s.scores[seat] + delta };
    setScores(nextScores);
    if (correct) {
      doFlash(seat === 'me' ? `${TD.correct} +${POINTS}` : `${opponentName}: ${s.queue[s.itemIdx].display}`, seat === 'me');
      setZphase('reveal');
      setTick((t) => t + 1);
      setTimeout(() => nextItem(nextScores), 1900);
    } else {
      doFlash(seat === 'me' ? (penaltyMode ? TD.wrong : `${TD.wrong} −${POINTS}`) : `${opponentName} · ${TD.wrong}`, false);
      const nextLocked = { ...s.locked, [seat]: true };
      setLocked(nextLocked);
      if (nextLocked.me && nextLocked.op) {
        setZphase('reveal');
        setTick((t) => t + 1);
        setTimeout(() => nextItem(nextScores), 2100);
      } else {
        setZphase('clues');
        setTick((t) => t + 1);
      }
    }
  };

  // Clue cadence, AI buzz, answer timeouts.
  useEffect(() => {
    if (ended.current || !item) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (zphase === 'clues') {
      const total = item.clues.length;
      if (clueIdx < total) {
        timers.push(setTimeout(() => setClueIdx((c) => Math.min(total, c + 1)), penaltyMode ? 999999 : CLUE_MS));
      } else {
        // all clues out → grace, then reveal with no scorer
        timers.push(
          setTimeout(() => {
            setZphase('reveal');
            setTick((t) => t + 1);
            doFlash(`${TD.answerWas} ${item.display}`, false);
            setTimeout(() => nextItem(sref.current.scores), 2100);
          }, penaltyMode ? 12000 : 6000),
        );
      }
      // AI buzz chance inside this window
      if (!locked.op) {
        const p = penaltyMode ? 0.55 : 0.1 + 0.14 * clueIdx;
        if (Math.random() < p) {
          timers.push(
            setTimeout(() => {
              if (sref.current.zphase === 'clues' && !sref.current.locked.op) {
                doFlash(`${opponentName} · ${TD.opponentBuzzed}`, false);
                setZphase('answerOp');
                setTick((t) => t + 1);
              }
            }, 900 + Math.random() * (penaltyMode ? 5200 : 2400)),
          );
        }
      }
    } else if (zphase === 'answerOp') {
      timers.push(
        setTimeout(() => {
          const s = sref.current;
          const pCorrect = penaltyMode ? 0.6 : Math.min(0.85, 0.22 + 0.15 * s.clueIdx);
          settle('op', Math.random() < pCorrect);
        }, 1900 + Math.random() * 1300),
      );
    } else if (zphase === 'answerMe') {
      timers.push(setTimeout(() => settle('me', false), ANSWER_MS));
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- machine keyed by phase+clue+tick
  }, [zphase, clueIdx, itemIdx, tick]);

  const buzz = () => {
    if (zphase !== 'clues' || locked.me || ended.current) return;
    setZphase('answerMe');
    setTick((t) => t + 1);
  };

  const submit = () => {
    if (sref.current.zphase !== 'answerMe') return;
    const value = input.trim();
    if (!value) return;
    setInput('');
    settle('me', matchesName(value, sref.current.queue[sref.current.itemIdx].aliases).ok);
  };

  if (!item) return null;
  const revealed = item.clues.slice(0, clueIdx);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 md:gap-4">
      <ScorePill roundsMe={roundsWon.me} roundsOp={roundsWon.op} inRoundMe={scores.me} inRoundOp={scores.op} sep=":" left={<MyAvatar size={40} active={zphase === 'answerMe'} />} right={<TdAvatar name={opponentName} size={40} active={zphase === 'answerOp'} />} />
      <div className="flex items-center gap-2.5">
        <span className="text-[13px] text-white/60" style={TD_DISPLAY}>
          {penaltyMode ? TD.penaltiesName : TD.round4Name}
        </span>
        <span
          className="rounded-full px-3 py-1 text-[13px]"
          style={{ ...TD_DISPLAY, background: 'var(--td-white)', color: '#0d0d0d' }}
        >
          {Math.min(itemIdx + 1, queue.length)}/{queue.length}
        </span>
        {suddenDeath && itemIdx >= items.length && (
          <span className="rounded-full px-3 py-1 text-[13px]" style={{ ...TD_DISPLAY, background: 'var(--td-orange)', color: '#0d0d0d' }}>
            {TD.suddenDeath}
          </span>
        )}
      </div>

      {/* clue stack / question */}
      <div className="flex min-h-[250px] w-full flex-col justify-end gap-2.5 md:min-h-[300px]">
        <AnimatePresence initial={false}>
          {revealed.map((clue, i) => (
            <motion.div
              key={`${item.id}-${i}`}
              initial={{ opacity: 0, y: 14, rotate: -1.5 }}
              animate={{ opacity: 1, y: 0, rotate: i % 2 ? 0.8 : -0.8 }}
              className="rounded-[10px] px-4 py-3"
              style={{
                background: i === revealed.length - 1 ? 'var(--td-paper)' : 'var(--td-charcoal)',
                boxShadow: '4px 4px 0 rgba(0,0,0,0.55)',
              }}
            >
              <span
                className="text-[15px] leading-snug md:text-lg"
                style={{ ...TD_DISPLAY, color: i === revealed.length - 1 ? '#0d0d0d' : 'rgba(255,255,255,0.85)' }}
              >
                {clue}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* buzz + answer row */}
      {zphase === 'answerMe' ? (
        <div className="w-full">
          <TurnTimerBar turnKey={`z-${tick}`} ms={ANSWER_MS} running />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="mt-2 flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={TD.youBuzzed}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              className="h-14 min-w-0 flex-1 rounded-[10px] border-0 px-4 text-base text-white outline-none placeholder:text-white/35"
              style={{ background: 'var(--td-charcoal)', boxShadow: '4px 4px 0 rgba(0,0,0,0.5)', fontFamily: "'Noto Sans Georgian', sans-serif", fontWeight: 600 }}
            />
            <motion.button
              type="submit"
              whileTap={{ scale: 0.95 }}
              className="h-14 shrink-0 rounded-[10px] px-6 text-base"
              style={{ ...TD_DISPLAY, background: 'var(--td-orange)', color: '#0d0d0d', boxShadow: '4px 4px 0 rgba(0,0,0,0.5)' }}
            >
              {TD.submit}
            </motion.button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.88, y: 4 }}
            onClick={buzz}
            disabled={zphase !== 'clues' || locked.me}
            className="relative size-36 disabled:opacity-35 md:size-40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local 3D render */}
            <img
              src="/assets/table-derby/3d/buzzer.png"
              alt=""
              className="pointer-events-none h-full w-full object-contain"
            />
            <span
              className="absolute inset-x-0 top-[40%] text-center text-xl md:text-2xl"
              style={{ ...TD_DISPLAY, color: 'var(--td-white)' }}
            >
              {TD.buzz}
            </span>
          </motion.button>
          <span className="text-[12px] text-white/50" style={TD_DISPLAY}>
            {locked.me ? TD.lockedOut : zphase === 'answerOp' ? `${opponentName} · ${TD.opponentBuzzed}` : TD.buzzRules}
          </span>
        </div>
      )}

      <div className="relative h-8">
        <AnimatePresence>
          {flash && (
            <motion.div
              key={flash.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none whitespace-nowrap rounded-[8px] px-3 py-1 text-[12px]"
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

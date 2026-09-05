'use client';

/** Daily challenge: solo ჩამოთვალე. One category per Georgian day, 3 lives,
 *  10s per answer, score = correct answers. One attempt per day (shell
 *  enforces via localStorage; the real product enforces server-side). */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { matchesName } from '@/features/mini-games/lib/matching';
import { TD } from '../lib/copy';
import type { TdListCategory } from '../data/categories';
import { TD_DISPLAY } from './brand';
import { CategoryBand, PlayerBoard, TurnTimerBar } from './chrome';

const TURN_MS = 10_000;

export function DailySolo({
  category,
  onDone,
}: {
  category: TdListCategory;
  onDone: (score: number) => void;
}) {
  const [lives, setLives] = useState(3);
  const [found, setFound] = useState<string[]>([]);
  const [turnNo, setTurnNo] = useState(1);
  const [input, setInput] = useState('');
  const [flash, setFlash] = useState<{ key: number; text: string; good: boolean } | null>(null);
  const [over, setOver] = useState(false);

  const remaining = category.answers.filter((a) => !found.includes(a.display));

  const finish = (finalScore: number) => {
    setOver(true);
    setTimeout(() => onDone(finalScore), 1400);
  };

  const miss = (text: string) => {
    setFlash({ key: Date.now(), text, good: false });
    setLives((l) => {
      const next = l - 1;
      if (next <= 0) finish(found.length);
      return next;
    });
    setTurnNo((n) => n + 1);
  };

  // 10s per answer.
  useEffect(() => {
    if (over) return;
    const t = setTimeout(() => miss(TD.timeUp), TURN_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by turnNo
  }, [turnNo, over]);

  const submit = () => {
    if (over) return;
    const value = input.trim();
    if (!value) return;
    setInput('');
    const dup = category.answers.some((a) => found.includes(a.display) && matchesName(value, a.aliases).ok);
    if (dup) {
      miss(TD.duplicate);
      return;
    }
    const hit = remaining.find((a) => matchesName(value, a.aliases).ok);
    if (!hit) {
      miss(TD.wrong);
      return;
    }
    setFlash({ key: Date.now(), text: TD.correct, good: true });
    const nextFound = [...found, hit.display];
    setFound(nextFound);
    setTurnNo((n) => n + 1);
    if (nextFound.length >= category.answers.length) finish(nextFound.length);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 md:gap-4">
      <CategoryBand prompt={category.prompt} compact />
      <PlayerBoard name={TD.you} side="left" lives={lives} count={found.length} answers={found} active={!over} />
      <TurnTimerBar turnKey={`d-${turnNo}`} ms={TURN_MS} running={!over} />
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
            disabled={over}
            placeholder={TD.answerPlaceholder}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            className="h-12 min-w-0 flex-1 rounded-[10px] border-0 px-4 text-[15px] text-white outline-none placeholder:text-white/35 disabled:opacity-50"
            style={{
              background: 'var(--td-charcoal)',
              boxShadow: '4px 4px 0 rgba(0,0,0,0.5)',
              fontFamily: "'Noto Sans Georgian', sans-serif",
              fontWeight: 600,
            }}
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.95 }}
            disabled={over}
            className="h-12 shrink-0 rounded-[10px] px-5 text-sm disabled:opacity-40"
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
              className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-[8px] px-3 py-1 text-[12px]"
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

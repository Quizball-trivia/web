'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Zap } from 'lucide-react';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { getTrivia, type TriviaQuestion } from '../data/trivia';
import { money } from '../lib/odds';
import { useMiniLocale, useMiniT } from '../lib/i18n';

const VALUES: Record<TriviaQuestion['difficulty'], number> = { easy: 100, medium: 200, hard: 300 };
const ROWS: TriviaQuestion['difficulty'][] = ['easy', 'medium', 'hard'];
const AI_CORRECT: Record<TriviaQuestion['difficulty'], number> = { easy: 0.78, medium: 0.6, hard: 0.42 };
const CATEGORY_KEYS = ['Clubs', 'Legends', 'Tournaments'];

type Phase = 'idle' | 'pick' | 'answer' | 'ai-pick' | 'ai-answer' | 'over';

interface Tile {
  cat: number;
  row: number;
  question: TriviaQuestion;
  value: number;
}

function shuffled<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildBoard(bank: TriviaQuestion[]): Tile[] {
  const byDiff: Record<string, TriviaQuestion[]> = {
    easy: shuffled(bank.filter((q) => q.difficulty === 'easy')),
    medium: shuffled(bank.filter((q) => q.difficulty === 'medium')),
    hard: shuffled(bank.filter((q) => q.difficulty === 'hard')),
  };
  const tiles: Tile[] = [];
  for (let cat = 0; cat < 3; cat += 1) {
    ROWS.forEach((diff, row) => {
      const pool = byDiff[diff];
      const question = pool.length ? pool.pop()! : shuffled(bank)[0];
      tiles.push({ cat, row, question, value: VALUES[diff] });
    });
  }
  return tiles;
}

export function QuizBoard({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const miniLocale = useMiniLocale();
  const bank = useMemo(() => getTrivia(miniLocale), [miniLocale]);
  const [board, setBoard] = useState<Tile[]>([]);
  const [used, setUsed] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<Phase>('idle');
  const [active, setActive] = useState<number | null>(null);
  const [isSteal, setIsSteal] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [youBank, setYouBank] = useState(0);
  const [aiBank, setAiBank] = useState(0);
  const [aiResult, setAiResult] = useState<'correct' | 'wrong' | null>(null);
  const usedRef = useRef(used);
  useEffect(() => {
    usedRef.current = used;
  }, [used]);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  const tile = active !== null ? board[active] : null;

  const start = () => {
    setBoard(buildBoard(bank));
    setUsed(new Set());
    setActive(null);
    setIsSteal(false);
    setSelected(null);
    setYouBank(0);
    setAiBank(0);
    setAiResult(null);
    setPhase('pick');
  };

  const finishTile = (tileIndex: number, nextTurn: 'you' | 'ai') => {
    const nextUsed = new Set(usedRef.current).add(tileIndex);
    setUsed(nextUsed);
    setActive(null);
    setSelected(null);
    setIsSteal(false);
    setAiResult(null);
    if (nextUsed.size >= 9) {
      setPhase('over');
    } else if (nextTurn === 'you') {
      setPhase('pick');
    } else {
      startAiPick(nextUsed);
    }
  };

  const startAiPick = (currentUsed: Set<number>) => {
    setPhase('ai-pick');
    later(() => {
      const open = board.map((_, i) => i).filter((i) => !currentUsed.has(i));
      const choice = open[Math.floor(Math.random() * open.length)];
      setActive(choice);
      setPhase('ai-answer');
      later(() => {
        const picked = board[choice];
        if (Math.random() < AI_CORRECT[picked.question.difficulty]) {
          setAiResult('correct');
          setAiBank((b) => b + picked.value);
          later(() => finishTile(choice, 'ai'), 1400);
        } else {
          // AI blew it — you can steal the same question.
          setAiResult('wrong');
          later(() => {
            setAiResult(null);
            setIsSteal(true);
            setSelected(null);
            setPhase('answer');
          }, 1400);
        }
      }, 1600);
    }, 1200);
  };

  const pickTile = (i: number) => {
    if (phase !== 'pick' || used.has(i)) return;
    setActive(i);
    setIsSteal(false);
    setSelected(null);
    setPhase('answer');
  };

  const answer = (i: number) => {
    if (phase !== 'answer' || selected !== null || active === null || !tile) return;
    setSelected(i);
    const correct = i === tile.question.answer;
    later(() => {
      if (correct) {
        setYouBank((b) => b + tile.value);
        finishTile(active, 'you');
      } else if (isSteal) {
        // Failed steal — nobody scores, back to your pick.
        finishTile(active, 'you');
      } else {
        // Your miss hands the AI the steal (instant roll) and the next pick.
        if (Math.random() < AI_CORRECT[tile.question.difficulty] * 0.8) {
          setAiBank((b) => b + tile.value);
        }
        finishTile(active, 'ai');
      }
    }, 1500);
  };

  const result = youBank > aiBank ? 'you' : aiBank > youBank ? 'ai' : 'draw';

  return (
    <MiniGameShell
      backHref={backHref}
      title={t('Quiz Board')}
      subtitle={t('Pick tiles, bank the value — steal when the AI slips')}
      accent="#CE82FF"
      headerRight={<StatPill label={t('You · AI')} value={`${money(youBank)} · ${money(aiBank)}`} color="#CE82FF" />}
    >
      {phase === 'idle' ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="text-5xl">🎛️</div>
          <div className="font-poppins text-xl font-black uppercase text-brand-purple">{t('Quiz Board')}</div>
          <p className="max-w-xs font-poppins text-sm font-semibold leading-snug text-white/60">
            {t('Nine tiles, three value tiers. Answer to bank the tile and keep control — miss and the AI can steal. Highest bank wins.')}
          </p>
          <button type="button" onClick={start} className="h-14 w-full max-w-xs rounded-2xl bg-brand-purple font-poppins text-lg font-black uppercase tracking-wide text-black">
            {t('Start game')}
          </button>
        </motion.div>
      ) : (
        <div className="mt-2 flex flex-1 flex-col">
          {/* Board */}
          <div className="grid grid-cols-3 gap-1.5">
            {CATEGORY_KEYS.map((cat) => (
              <div key={cat} className="rounded-lg bg-white/[0.05] py-1.5 text-center font-poppins text-[9px] font-black uppercase tracking-wider text-brand-purple">
                {t(cat)}
              </div>
            ))}
            {ROWS.map((diff, row) =>
              CATEGORY_KEYS.map((_, cat) => {
                const i = cat * 3 + row;
                const isUsed = used.has(i);
                const isActive = active === i;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={phase !== 'pick' || isUsed}
                    onClick={() => pickTile(i)}
                    className={`flex h-12 items-center justify-center rounded-lg border-2 font-poppins text-base font-black tabular-nums transition-colors ${
                      isActive
                        ? 'border-brand-purple bg-brand-purple/25 text-brand-purple'
                        : isUsed
                          ? 'border-white/5 bg-white/[0.01] text-white/15'
                          : phase === 'pick'
                            ? 'border-brand-purple/30 bg-brand-purple/[0.06] text-white hover:border-brand-purple'
                            : 'border-white/10 bg-white/[0.03] text-white/50'
                    }`}
                  >
                    {isUsed ? '' : VALUES[diff]}
                  </button>
                );
              }),
            )}
          </div>

          {/* Action panel */}
          <div className="mt-3 flex-1">
            <AnimatePresence mode="wait">
              {phase === 'pick' && (
                <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl border-2 border-brand-purple/30 bg-brand-purple/[0.07] p-3 text-center">
                  <span className="font-poppins text-sm font-black uppercase tracking-wide text-brand-purple">{t('Your board — pick a tile')}</span>
                </motion.div>
              )}

              {phase === 'ai-pick' && (
                <motion.div key="ai-pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl border-2 border-brand-red-soft/30 bg-brand-red-soft/[0.06] p-3 text-center">
                  <span className="font-poppins text-sm font-black uppercase tracking-wide text-brand-red-soft">{t('AI is picking a tile…')}</span>
                </motion.div>
              )}

              {phase === 'ai-answer' && tile && (
                <motion.div key={`ai-${active}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl border-2 border-brand-red-soft/30 bg-white/[0.03] p-3">
                  <div className="mb-1.5 font-poppins text-[10px] font-black uppercase tracking-wider text-brand-red-soft">
                    {t('AI plays for {v}', { v: tile.value })}
                  </div>
                  <p className="mb-2 font-poppins text-[13px] font-bold leading-snug text-white">{tile.question.q}</p>
                  <div className={`py-2 text-center font-poppins text-sm font-black uppercase ${aiResult === 'correct' ? 'text-brand-red-soft' : aiResult === 'wrong' ? 'text-brand-yellow' : 'text-white/40'}`}>
                    {aiResult === 'correct' ? t('AI banks it') : aiResult === 'wrong' ? t('AI is wrong — steal it!') : t('AI answering…')}
                  </div>
                </motion.div>
              )}

              {phase === 'answer' && tile && (
                <motion.div key={`q-${active}-${isSteal}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`rounded-2xl border-2 p-3 ${isSteal ? 'border-brand-yellow/50 bg-brand-yellow/[0.05]' : 'border-brand-purple/40 bg-white/[0.03]'}`}>
                  <div className={`mb-1.5 flex items-center gap-1.5 font-poppins text-[10px] font-black uppercase tracking-wider ${isSteal ? 'text-brand-yellow' : 'text-brand-purple'}`}>
                    {isSteal && <Zap className="size-3.5" />}
                    {isSteal ? t('STEAL for {v}!', { v: tile.value }) : t('For {v}', { v: tile.value })}
                  </div>
                  <p className="mb-2 font-poppins text-[13px] font-bold leading-snug text-white">{tile.question.q}</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {tile.question.options.map((opt, i) => {
                      const isAnswer = i === tile.question.answer;
                      const isPicked = selected === i;
                      const state = selected === null ? 'idle' : isAnswer ? 'correct' : isPicked ? 'wrong' : 'dim';
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={selected !== null}
                          onClick={() => answer(i)}
                          className={`flex items-center justify-between rounded-lg border-2 px-3 py-2 text-left font-poppins text-xs font-bold transition-colors ${
                            state === 'idle'
                              ? 'border-white/10 bg-white/[0.03] text-white hover:border-brand-purple/60'
                              : state === 'correct'
                                ? 'border-brand-green bg-brand-green/15 text-white'
                                : state === 'wrong'
                                  ? 'border-brand-red bg-brand-red/15 text-white'
                                  : 'border-white/5 bg-white/[0.02] text-white/35'
                          }`}
                        >
                          <span className="min-w-0 truncate">{opt}</span>
                          {state === 'correct' && <Check className="size-3.5 shrink-0 text-brand-green" />}
                          {state === 'wrong' && <X className="size-3.5 shrink-0 text-brand-red" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {phase === 'over' && (
                <motion.div key="over" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-2 rounded-2xl border-2 border-white/10 bg-white/[0.04] p-4 text-center">
                  <div className="text-3xl">{result === 'you' ? '🏆' : result === 'ai' ? '🤖' : '🤝'}</div>
                  <div className={`font-poppins text-xl font-black uppercase ${result === 'you' ? 'text-brand-green-light' : result === 'ai' ? 'text-brand-red' : 'text-white/70'}`}>
                    {result === 'you' ? t('You win!') : result === 'ai' ? t('AI wins') : t('Draw')}
                  </div>
                  <p className="font-poppins text-xs font-semibold text-white/50">
                    {t('Final banks — you {a}, AI {b}.', { a: money(youBank), b: money(aiBank) })}
                  </p>
                  <button type="button" onClick={start} className="mt-1 h-12 w-full rounded-2xl bg-brand-purple font-poppins text-base font-black uppercase text-black">
                    {t('New board')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </MiniGameShell>
  );
}

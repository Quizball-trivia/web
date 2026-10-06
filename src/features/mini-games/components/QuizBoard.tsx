'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { getTrivia, type TriviaQuestion } from '../data/trivia';
import { money } from '../lib/odds';
import { QuizBoardAiCard, QuizBoardBanner, QuizBoardGrid, QuizBoardOverCard, QuizBoardQuestionCard, QUIZ_BOARD_ACCENT } from './quizBoardUi';
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

  return (
    <MiniGameShell
      backHref={backHref}
      title={t('Quiz Board')}
      subtitle={t('Pick tiles, bank the value — steal when the AI slips')}
      accent={QUIZ_BOARD_ACCENT}
      headerRight={<StatPill label={t('You · AI')} value={`${money(youBank)} · ${money(aiBank)}`} color={QUIZ_BOARD_ACCENT} />}
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
          <QuizBoardGrid
            categories={CATEGORY_KEYS.map((cat) => t(cat))}
            tiles={board.map((b, i) => ({ tile: i, value: b.value, owner: used.has(i) ? 'none' : null }))}
            activeTile={active}
            canPick={phase === 'pick'}
            onPick={pickTile}
          />

          {/* Action panel */}
          <div className="mt-3 flex-1">
            <AnimatePresence mode="wait">
              {phase === 'pick' && (
                <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <QuizBoardBanner tone="player">{t('Your board — pick a tile')}</QuizBoardBanner>
                </motion.div>
              )}

              {phase === 'ai-pick' && (
                <motion.div key="ai-pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <QuizBoardBanner tone="ai">{t('AI is picking a tile…')}</QuizBoardBanner>
                </motion.div>
              )}

              {phase === 'ai-answer' && tile && (
                <motion.div key={`ai-${active}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <QuizBoardAiCard value={tile.value} prompt={tile.question.q} result={aiResult} />
                </motion.div>
              )}

              {phase === 'answer' && tile && (
                <motion.div key={`q-${active}-${isSteal}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <QuizBoardQuestionCard
                    value={tile.value}
                    steal={isSteal}
                    prompt={tile.question.q}
                    options={tile.question.options}
                    selected={selected}
                    correctIndex={selected === null ? null : tile.question.answer}
                    onAnswer={answer}
                  />
                </motion.div>
              )}

              {phase === 'over' && (
                <QuizBoardOverCard
                  key="over"
                  you={youBank}
                  ai={aiBank}
                  action={
                    <button type="button" onClick={start} className="mt-1 h-12 w-full rounded-2xl bg-brand-purple font-poppins text-base font-black uppercase text-black">
                      {t('New board')}
                    </button>
                  }
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </MiniGameShell>
  );
}

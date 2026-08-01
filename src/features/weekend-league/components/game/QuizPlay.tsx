'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { motion } from 'motion/react';
import { poppins, POINTS_PER_CORRECT, QUESTION_SECONDS } from '../../constants';
import type { MCQuestion, QuizOutcome } from '../../types';

interface Resolution {
  correct: boolean;
  remaining: number;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

/** One question: own timer, tap-to-answer, reveal, then reports up after a beat. */
function QuizQuestion({
  question,
  index,
  total,
  runningScore,
  onResolved,
}: {
  question: MCQuestion;
  index: number;
  total: number;
  runningScore: number;
  onResolved: (r: Resolution) => void;
}) {
  const [deadline] = useState(() => Date.now() + QUESTION_SECONDS * 1000);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const revealedRef = useRef(false); // idempotency guard (tap and timeout can race)
  const resultRef = useRef<Resolution>({ correct: false, remaining: 0 });
  const onResolvedRef = useRef(onResolved);
  useEffect(() => {
    onResolvedRef.current = onResolved;
  });

  const reveal = useCallback(
    (choice: number | null) => {
      if (revealedRef.current) return;
      revealedRef.current = true;
      const correct = choice === question.correctIndex;
      const remaining = correct ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0;
      resultRef.current = { correct, remaining };
      setSelected(choice);
      setRevealed(true);
    },
    [deadline, question.correctIndex],
  );

  // Tick the per-question clock; auto-reveal (as a miss) at zero.
  useEffect(() => {
    if (revealed) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) reveal(null);
    }, 200);
    return () => clearInterval(id);
  }, [revealed, deadline, reveal]);

  // After the answer is shown, hand the result up.
  useEffect(() => {
    if (!revealed) return;
    const id = setTimeout(() => onResolvedRef.current(resultRef.current), 1400);
    return () => clearTimeout(id);
  }, [revealed]);

  const pct = Math.max(0, Math.min(100, (secondsLeft / QUESTION_SECONDS) * 100));
  const urgent = !revealed && secondsLeft <= 4;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col px-4 pt-16">
      {/* Header: progress + score + timer (pt clears the fixed leave button) */}
      <div className="flex items-center justify-between">
        <span className="font-poppins text-[12px] font-black uppercase tracking-wide text-white/50">
          Question {index + 1}/{total}
        </span>
        <span className="font-poppins text-sm font-black tabular-nums text-brand-yellow" style={poppins}>
          {runningScore} pts
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-linear ${urgent ? 'bg-brand-red-soft' : 'bg-brand-cyan'}`}
          style={{ width: `${revealed ? 0 : pct}%` }}
        />
      </div>

      {/* Prompt */}
      <motion.h2
        key={question.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 font-poppins text-2xl font-black leading-tight text-white"
      >
        {question.prompt}
      </motion.h2>

      {/* Options */}
      <div className="mt-6 flex flex-col gap-3">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correctIndex;
          const isSelected = i === selected;
          let cls = 'border-white/12 bg-surface-card-deep hover:bg-white/[0.06]';
          if (revealed) {
            if (isCorrect) cls = 'border-brand-green bg-brand-green/15';
            else if (isSelected) cls = 'border-brand-red-soft bg-brand-red-soft/15';
            else cls = 'border-white/8 bg-surface-card-deep opacity-50';
          }
          return (
            <motion.button
              key={i}
              type="button"
              data-testid={`quiz-option-${i}`}
              whileTap={revealed ? undefined : { scale: 0.98 }}
              disabled={revealed}
              onClick={() => reveal(i)}
              className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-colors ${cls}`}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10 font-poppins text-sm font-black text-white/70">
                {OPTION_LETTERS[i]}
              </span>
              <span className="flex-1 font-poppins text-base font-bold text-white">{opt}</span>
              {revealed && isCorrect && <Check className="size-5 shrink-0 text-brand-green" strokeWidth={3} />}
              {revealed && isSelected && !isCorrect && <X className="size-5 shrink-0 text-brand-red-soft" strokeWidth={3} />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/** Runs a full quiz: sequences questions, accumulates score, reports the outcome. */
export function QuizPlay({
  questions,
  onComplete,
}: {
  questions: MCQuestion[];
  onComplete: (outcome: QuizOutcome) => void;
}) {
  const [index, setIndex] = useState(0);
  const [acc, setAcc] = useState({ score: 0, correct: 0, remaining: 0 });

  const handleResolved = useCallback(
    (r: Resolution) => {
      const gained = r.correct ? POINTS_PER_CORRECT + r.remaining : 0;
      const next = {
        score: acc.score + gained,
        correct: acc.correct + (r.correct ? 1 : 0),
        remaining: acc.remaining + (r.correct ? r.remaining : 0),
      };
      setAcc(next);
      if (index < questions.length - 1) {
        setIndex(index + 1);
      } else {
        onComplete({ score: next.score, correct: next.correct, total: questions.length, remaining: next.remaining });
      }
    },
    [acc, index, questions.length, onComplete],
  );

  return (
    <QuizQuestion
      key={index}
      question={questions[index]}
      index={index}
      total={questions.length}
      runningScore={acc.score}
      onResolved={handleResolved}
    />
  );
}

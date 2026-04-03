'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle2, Clock, Lightbulb, Star, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from '@/components/ui/input';
import type { CluesQuestionData } from '../../types/matchQuestion.types';

// ─── Fuzzy matching (same as ClueGame) ───────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m: number[][] = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = b[i - 1] === a[j - 1]
        ? m[i - 1][j - 1]
        : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
  }
  return m[b.length][a.length];
}

function fuzzyMatch(input: string, target: string): boolean {
  const a = input.toLowerCase().trim();
  const b = target.toLowerCase().trim();
  if (a === b) return true;
  const maxDist = b.length > 6 ? 2 : 1;
  return levenshtein(a, b) <= maxDist;
}

function findMatch(input: string, accepted: string[]): boolean {
  return accepted.some((a) => fuzzyMatch(input, a));
}

// Points decrease as more clues are revealed
const POINTS_BY_CLUE: Record<number, number> = { 1: 200, 2: 150, 3: 100, 4: 50, 5: 25 };
const getPoints = (clueIndex: number) => POINTS_BY_CLUE[clueIndex + 1] ?? 25;

// ─── Panel ────────────────────────────────────────────────────────────────────

interface RankedCluesPanelProps {
  question: CluesQuestionData;
  /** seconds shown per clue before auto-reveal of next */
  secondsPerClue?: number;
  onComplete: (isCorrect: boolean, pointsEarned: number) => void;
}

export function RankedCluesPanel({ question, secondsPerClue = 15, onComplete }: RankedCluesPanelProps) {
  const [revealedClues, setRevealedClues] = useState(1);
  const [userAnswer, setUserAnswer] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(secondsPerClue);
  const [submitted, setSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false);

  const finish = useCallback((correct: boolean, clueIdx: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setShowResult(true);
    setIsCorrect(correct);
    const pts = correct ? getPoints(clueIdx) : 0;
    setTimeout(() => onComplete(correct, pts), 1500);
  }, [onComplete]);

  // Timer: auto-reveal next clue, or time-out on last clue
  useEffect(() => {
    if (showResult || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (revealedClues < question.clues.length) {
            setRevealedClues((r) => r + 1);
            setTimeRemaining(secondsPerClue);
          } else {
            clearInterval(timerRef.current!);
            setTimeout(() => finish(false, revealedClues - 1), 0);
          }
          return secondsPerClue;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [revealedClues, showResult, submitted, question.clues.length, secondsPerClue, finish]);

  const handleSubmit = () => {
    if (!userAnswer.trim() || submitted) return;
    const correct = findMatch(userAnswer, question.acceptedAnswers);
    if (timerRef.current) clearInterval(timerRef.current);
    if (correct) {
      setSubmitted(true);
      finish(true, revealedClues - 1);
    } else {
      // Wrong — reveal next clue if available, else game over
      if (revealedClues < question.clues.length) {
        setRevealedClues((r) => r + 1);
        setUserAnswer('');
        setTimeRemaining(secondsPerClue);
        setSubmitted(false);
      } else {
        setSubmitted(true);
        finish(false, revealedClues - 1);
      }
    }
  };

  const handleGiveUp = () => {
    if (submitted || showResult) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitted(true);
    finish(false, revealedClues - 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const isLow = timeRemaining <= 5;
  const currentPoints = getPoints(revealedClues - 1);

  return (
    <div className="space-y-3">
      {/* Prompt + timer */}
      <div className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-5 py-4">
        {question.categoryName && (
          <span className="mb-2 inline-flex items-center rounded-lg bg-[#FF9600]/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#FF9600]">
            <Lightbulb className="mr-1 size-3" />
            {question.categoryName}
          </span>
        )}
        <div className="mt-2 flex items-center justify-between">
          <p className="text-base font-black text-white">Who Am I?</p>
          {!showResult && (
            <div className={`flex items-center gap-1.5 ${isLow ? 'text-[#FF4B4B]' : 'text-[#1CB0F6]'}`}>
              <Clock className="size-4" />
              <span className="text-lg font-black tabular-nums">{timeRemaining}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Points available */}
      {!showResult && (
        <div className="flex items-center justify-center gap-1.5 text-sm text-[#56707A]">
          <Star className="size-4 text-[#FFD700]" />
          <span className="font-bold">Answer now: <span className="text-white">{currentPoints} pts</span></span>
        </div>
      )}

      {/* Clue cards */}
      <div className="space-y-2">
        {question.clues.slice(0, revealedClues).map((clue, idx) => (
          <AnimatePresence key={idx}>
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#243B44] px-5 py-4 text-center"
            >
              {clue.type === 'emoji' ? (
                <span className="text-4xl">{clue.content}</span>
              ) : (
                <p className="text-base font-bold text-white">{clue.content}</p>
              )}
            </motion.div>
          </AnimatePresence>
        ))}
      </div>

      {/* Clue progress dots */}
      {!showResult && (
        <div className="flex items-center justify-center gap-2">
          {question.clues.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 w-10 rounded-full transition-colors duration-300 ${
                idx < revealedClues ? 'bg-[#FF9600]' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      )}

      {/* Input / result */}
      {!showResult ? (
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="Type your answer..."
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={submitted}
            autoFocus
            className="h-12 rounded-xl border-2 border-[#243B44] bg-[#243B44] text-center text-lg text-white placeholder:text-[#56707A] focus:border-[#FF9600]"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!userAnswer.trim() || submitted}
              className="rounded-xl border-b-4 border-[#46A302] bg-[#58CC02] py-3 font-black text-white transition-all active:translate-y-[2px] active:border-b-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={handleGiveUp}
              disabled={submitted}
              className="rounded-xl border-b-4 border-[#0D1B21] bg-[#1B2F36] py-3 font-black text-white transition-all active:translate-y-[2px] active:border-b-2 disabled:opacity-50 hover:bg-[#243B44]"
            >
              Give Up
            </button>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border-b-4 p-4 text-center ${
            isCorrect ? 'border-[#46A302] bg-[#58CC02]/10' : 'border-[#CC3C3C] bg-[#FF4B4B]/10'
          }`}
        >
          {isCorrect ? (
            <>
              <CheckCircle2 className="mx-auto mb-2 size-8 text-[#58CC02]" />
              <p className="font-black text-[#58CC02]">Correct! +{currentPoints} pts</p>
            </>
          ) : (
            <>
              <XCircle className="mx-auto mb-2 size-8 text-[#FF4B4B]" />
              <p className="mb-1 font-black text-[#FF4B4B]">The answer was:</p>
              <p className="text-xl font-black text-white">{question.displayAnswer}</p>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}

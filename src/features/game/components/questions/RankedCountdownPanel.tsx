'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Check, Clock, Lightbulb } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'motion/react';
import type { CountdownQuestionData } from '../../types/matchQuestion.types';

// ─── Fuzzy matching (same logic as CountdownGame) ────────────────────────────

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  const matrix: number[][] = [];
  for (let i = 0; i <= s1.length; i++) matrix[i] = [i];
  for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      matrix[i][j] = s1[i - 1] === s2[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return 1 - matrix[s1.length][s2.length] / Math.max(s1.length, s2.length);
}

function normalizeAnswer(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

interface SuggestionMatch { display: string; score: number }

function rankMatches(
  input: string,
  groups: CountdownQuestionData['answerGroups'],
  found: string[],
): SuggestionMatch[] {
  const norm = normalizeAnswer(input);
  if (!norm) return [];
  return groups
    .filter((g) => !found.includes(g.display))
    .map((g) => ({
      display: g.display,
      score: g.acceptedAnswers.reduce((best, alias) => {
        const na = normalizeAnswer(alias);
        if (!na) return best;
        if (norm === na) return Math.max(best, 1);
        if (na.startsWith(norm)) return Math.max(best, 0.96);
        if (na.split(' ').some((t) => t.startsWith(norm))) return Math.max(best, 0.93);
        if (norm.length >= 4) return Math.max(best, calculateSimilarity(norm, na));
        return best;
      }, 0),
    }))
    .filter((e) => e.score >= 0.55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// ─── Component ───────────────────────────────────────────────────────────────

interface RankedCountdownPanelProps {
  question: CountdownQuestionData;
  secondsTotal: number;
  onComplete: (foundAnswers: string[]) => void;
}

export function RankedCountdownPanel({ question, secondsTotal, onComplete }: RankedCountdownPanelProps) {
  const [timeRemaining, setTimeRemaining] = useState(secondsTotal);
  const [inputValue, setInputValue] = useState('');
  const [foundAnswers, setFoundAnswers] = useState<string[]>([]);
  const [recentAnswer, setRecentAnswer] = useState<string | null>(null);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(0);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);

  const suggestions = useMemo(
    () => rankMatches(inputValue, question.answerGroups, foundAnswers),
    [inputValue, question.answerGroups, foundAnswers],
  );

  const finish = useCallback((found: string[]) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    onComplete(found);
  }, [onComplete]);

  // Countdown timer
  useEffect(() => {
    if (done) return;
    const id = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setTimeout(() => finish(foundAnswers), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [done, finish, foundAnswers]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const registerAnswer = useCallback((display: string) => {
    setFoundAnswers((prev) => {
      if (prev.includes(display)) return prev;
      return [...prev, display];
    });
    setRecentAnswer(display);
    setTimeout(() => setRecentAnswer(null), 1400);
    setInputValue('');
    setHighlightedSuggestion(0);
    inputRef.current?.focus();
  }, []);

  const checkAnswer = useCallback((answer: string) => {
    const norm = normalizeAnswer(answer);
    if (!norm) return;
    for (const group of question.answerGroups) {
      if (foundAnswers.includes(group.display)) continue;
      for (const accepted of group.acceptedAnswers) {
        const na = normalizeAnswer(accepted);
        if (norm === na || calculateSimilarity(norm, na) >= 0.9) {
          registerAnswer(group.display);
          return;
        }
      }
    }
    const [best, second] = rankMatches(answer, question.answerGroups, foundAnswers);
    if (
      best &&
      best.score >= 0.9 &&
      (norm.length >= 4 || best.score === 1) &&
      (!second || best.score - second.score >= 0.08)
    ) {
      registerAnswer(best.display);
    }
  }, [question.answerGroups, foundAnswers, registerAnswer]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setHighlightedSuggestion((p) => (p + 1) % suggestions.length);
      return;
    }
    if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setHighlightedSuggestion((p) => (p - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if (e.key === 'Enter' && inputValue.trim()) {
      if (suggestions.length > 0 && normalizeAnswer(inputValue).length < 4) {
        e.preventDefault();
        const s = suggestions[Math.min(highlightedSuggestion, suggestions.length - 1)];
        if (s) registerAnswer(s.display);
        return;
      }
      checkAnswer(inputValue);
      setInputValue('');
      setHighlightedSuggestion(0);
    }
  };

  const isLow = timeRemaining <= 5;

  return (
    <div className="space-y-3">
      {/* Prompt card */}
      <div className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-5 py-4">
        {question.categoryName && (
          <span className="mb-2 inline-flex items-center rounded-lg bg-[#1CB0F6]/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#1CB0F6]">
            ⚽ {question.categoryName}
          </span>
        )}
        <p className="mt-2 text-lg font-black leading-snug text-white">{question.prompt}</p>
      </div>

      {/* Timer */}
      <div className={`flex items-center justify-between rounded-2xl border-b-4 px-5 py-3 ${
        isLow ? 'border-[#CC3C3C] bg-[#FF4B4B]/10 animate-pulse' : 'border-[#0D1B21] bg-[#1B2F36]'
      }`}>
        <div className="flex items-center gap-2">
          <Clock className={`size-4 ${isLow ? 'text-[#FF4B4B]' : 'text-[#1CB0F6]'}`} />
          <span className={`text-sm font-bold ${isLow ? 'text-[#FF4B4B]' : 'text-[#56707A]'}`}>Time</span>
        </div>
        <span className={`text-2xl font-black tabular-nums ${isLow ? 'text-[#FF4B4B]' : 'text-[#1CB0F6]'}`}>
          {timeRemaining}s
        </span>
      </div>

      {/* Input */}
      <div className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-5 py-4">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#56707A]">
          Type your answer
        </label>
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setHighlightedSuggestion(0); }}
          onKeyDown={handleKeyDown}
          placeholder="Press Enter to submit..."
          disabled={done}
          autoComplete="off"
          autoCapitalize="off"
          className="h-12 rounded-xl border-2 border-[#243B44] bg-[#243B44] text-lg text-white placeholder:text-[#56707A] focus:border-[#1CB0F6]"
        />
        <p className="mt-2 flex items-center gap-1 text-xs text-[#56707A]">
          <Lightbulb className="size-3.5 text-[#FF9600]" />
          Close matches count — don&apos;t stress spelling!
        </p>
        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((s, idx) => (
              <button
                key={s.display}
                type="button"
                onClick={() => registerAnswer(s.display)}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition-all ${
                  idx === highlightedSuggestion
                    ? 'border-[#1CB0F6] bg-[#1CB0F6]/15 text-[#1CB0F6]'
                    : 'border-white/10 bg-white/5 text-white/80 hover:border-[#1CB0F6]/40'
                }`}
              >
                {s.display}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Found answers */}
      <div className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wide text-white">Answers Found</h3>
          <span className="rounded-lg bg-[#1CB0F6]/15 px-2.5 py-1 text-xs font-black text-[#1CB0F6]">
            {foundAnswers.length} / {question.answerGroups.length}
          </span>
        </div>
        {foundAnswers.length === 0 ? (
          <p className="py-4 text-center text-sm text-[#56707A]">Start typing to find answers!</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {foundAnswers.map((a) => (
              <motion.div
                key={a}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 rounded-xl border border-[#58CC02]/30 bg-[#58CC02]/15 px-3 py-2"
              >
                <Check className="size-3.5 shrink-0 text-[#58CC02]" />
                <span className="truncate text-xs font-bold text-white">{a}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* "Correct!" toast */}
      <AnimatePresence>
        {recentAnswer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2"
          >
            <div className="flex items-center gap-3 rounded-2xl border-b-4 border-[#46A302] bg-[#1B2F36] px-6 py-3 shadow-xl">
              <div className="flex size-9 items-center justify-center rounded-full bg-[#58CC02]">
                <Check className="size-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#56707A]">Correct!</p>
                <p className="text-base font-black text-white">{recentAnswer}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

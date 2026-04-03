'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { AnswerCard } from '@/components/game/AnswerCard';
import { ANSWER_LABELS } from '@/lib/types/game.types';
import type { MCQuestionData } from '../../types/matchQuestion.types';

interface RankedMCPanelProps {
  question: MCQuestionData;
  onComplete: (isCorrect: boolean) => void;
}

type CardState = 'default' | 'correct' | 'wrong' | 'disabled';

export function RankedMCPanel({ question, onComplete }: RankedMCPanelProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleSelect = (index: number) => {
    if (revealed) return;
    setSelected(index);
    setRevealed(true);
    const correct = index === question.correctIndex;
    // Give the user ~1s to see the result before advancing
    setTimeout(() => onComplete(correct), 1200);
  };

  const getState = (index: number): CardState => {
    if (!revealed) return 'default';
    if (index === question.correctIndex) return 'correct';
    if (index === selected) return 'wrong';
    return 'disabled';
  };

  return (
    <div className="space-y-4">
      {/* Prompt */}
      <div className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-5 py-4">
        {question.categoryName && (
          <span className="mb-2 inline-flex items-center rounded-lg bg-[#1CB0F6]/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#1CB0F6]">
            ⚽ {question.categoryName}
          </span>
        )}
        <p className="mt-2 text-lg font-black leading-snug text-white md:text-xl">
          {question.prompt}
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        {question.options.map((opt, i) => (
          <motion.div
            key={`${question.id}-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24, delay: i * 0.05 }}
          >
            <AnswerCard
              label={ANSWER_LABELS[i] ?? String(i + 1)}
              text={opt}
              index={i}
              isSelected={selected === i}
              state={getState(i)}
              fadeOut={false}
              onClick={() => handleSelect(i)}
              disabled={revealed}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

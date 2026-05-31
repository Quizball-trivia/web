'use client';

/**
 * Match stats panel — collapsible dropdown that defaults to closed so
 * the prominent screen stays focused on rank/RP. Players opt in to
 * see accuracy, correct-answer counts, goals, and XP progression.
 *
 * Owns the per-question correctness dot strip (Figma 1157:3739) plus
 * the comparison rows and the XP footer. Private helper components
 * (StatsPanel, ComparisonRow, QuestionResultStrips, QuestionDotRow,
 * DotGroup) all live in this file — they're not reused elsewhere.
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';

type LocaleT = ReturnType<typeof useLocale>['t'];

export function MatchStatsDropdown({
  accuracy,
  playerCorrect,
  opponentCorrect,
  totalQuestions,
  playerScore,
  opponentScore,
  xpEarned,
  level,
  xpToNextLevel,
  playerQuestionResults,
  opponentQuestionResults,
  t,
}: {
  accuracy: number;
  playerCorrect: number;
  opponentCorrect: number;
  totalQuestions: number;
  playerScore: number;
  opponentScore: number;
  xpEarned: number;
  level: number | null;
  xpToNextLevel: number | null;
  playerQuestionResults?: Array<'correct' | 'wrong' | null>;
  opponentQuestionResults?: Array<'correct' | 'wrong' | null>;
  t: LocaleT;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="font-poppins">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mx-auto flex h-[48px] items-center justify-center gap-2.5 rounded-full border-2 border-white/15 bg-transparent px-7 text-[13px] font-bold uppercase tracking-wider text-white/85 transition-all hover:border-white/30 hover:text-white md:h-[52px] md:px-8 md:text-[14px]"
      >
        <span>{t('results.matchStats')}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="inline-block text-[11px] leading-none"
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="stats-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <StatsPanel
              accuracy={accuracy}
              playerCorrect={playerCorrect}
              opponentCorrect={opponentCorrect}
              totalQuestions={totalQuestions}
              playerScore={playerScore}
              opponentScore={opponentScore}
              xpEarned={xpEarned}
              level={level}
              xpToNextLevel={xpToNextLevel}
              playerQuestionResults={playerQuestionResults}
              opponentQuestionResults={opponentQuestionResults}
              t={t}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Match stats panel — Duolingo-style chunky card with a unified
 * You-vs-Opp comparison table and an optional per-question dot strip
 * (Figma 1157:3739). XP/level metadata sits in a footer row.
 */
function StatsPanel({
  accuracy,
  playerCorrect,
  opponentCorrect,
  totalQuestions,
  playerScore,
  opponentScore,
  xpEarned,
  level,
  xpToNextLevel,
  playerQuestionResults,
  opponentQuestionResults,
  t,
}: {
  accuracy: number;
  playerCorrect: number;
  opponentCorrect: number;
  totalQuestions: number;
  playerScore: number;
  opponentScore: number;
  xpEarned: number;
  level: number | null;
  xpToNextLevel: number | null;
  playerQuestionResults?: Array<'correct' | 'wrong' | null>;
  opponentQuestionResults?: Array<'correct' | 'wrong' | null>;
  t: LocaleT;
}) {
  const oppAccuracy =
    totalQuestions === 0 ? 0 : Math.round((opponentCorrect / totalQuestions) * 100);
  const hasDots = Boolean(playerQuestionResults || opponentQuestionResults);

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border-2 border-white/10 bg-transparent">
      {hasDots && (
        <div className="px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <QuestionResultStrips
            totalQuestions={totalQuestions}
            playerResults={playerQuestionResults}
            opponentResults={opponentQuestionResults}
            t={t}
          />
        </div>
      )}

      {/* You vs Opp header */}
      <div className={cn('grid grid-cols-[1fr_auto_1fr] items-center px-5 pb-3 sm:px-6', hasDots && 'border-t border-white/10 pt-4')}>
        <div className="text-center text-[13px] font-bold uppercase tracking-wider text-white/75 sm:text-[14px]">
          {t('results.you')}
        </div>
        <div className="w-12" aria-hidden="true" />
        <div className="text-center text-[13px] font-bold uppercase tracking-wider text-white/75 sm:text-[14px]">
          {t('results.opp')}
        </div>
      </div>

      <div className="px-5 pb-4 sm:px-6">
        <ComparisonRow
          label={t('results.accuracy')}
          you={`${accuracy}%`}
          opp={`${oppAccuracy}%`}
          youBetter={accuracy > oppAccuracy}
          oppBetter={oppAccuracy > accuracy}
        />
        <ComparisonRow
          label={t('results.correct')}
          you={`${playerCorrect}/${totalQuestions}`}
          opp={`${opponentCorrect}/${totalQuestions}`}
          youBetter={playerCorrect > opponentCorrect}
          oppBetter={opponentCorrect > playerCorrect}
        />
        <ComparisonRow
          label={t('results.goals')}
          you={String(playerScore)}
          opp={String(opponentScore)}
          youBetter={playerScore > opponentScore}
          oppBetter={opponentScore > playerScore}
        />
      </div>

      {/* XP footer */}
      <div className="flex items-center justify-center gap-2 border-t border-white/10 px-5 py-3.5 sm:px-6">
        {xpEarned > 0 ? (
          <>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/55">{t('results.xp')}</span>
            <span className="text-[18px] font-semibold tabular-nums text-brand-green">
              +{xpEarned}
            </span>
            {level != null && xpToNextLevel != null && (
              <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-cyan">
                {t('results.levelAndXpToNext', { level, xp: xpToNextLevel })}
              </span>
            )}
          </>
        ) : (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
            {t('results.noXpEarned')}
          </span>
        )}
      </div>
    </div>
  );
}

function ComparisonRow({
  label,
  you,
  opp,
  youBetter,
  oppBetter,
}: {
  label: string;
  you: string;
  opp: string;
  youBetter: boolean;
  oppBetter: boolean;
}) {
  const winnerClass = 'text-white font-bold';
  const loserClass = 'text-white/40 font-semibold';
  const tieClass = 'text-white/85 font-semibold';
  const youClass = youBetter ? winnerClass : oppBetter ? loserClass : tieClass;
  const oppClass = oppBetter ? winnerClass : youBetter ? loserClass : tieClass;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center border-t border-white/[0.06] py-3 first:border-t-0">
      <span className={cn('text-center text-[20px] tabular-nums sm:text-[22px]', youClass)}>
        {you}
      </span>
      <span className="w-12 text-center text-[10px] font-bold uppercase tracking-wider text-white/40">
        {label}
      </span>
      <span className={cn('text-center text-[20px] tabular-nums sm:text-[22px]', oppClass)}>
        {opp}
      </span>
    </div>
  );
}

/**
 * Per-question correctness strip. Renders one row per player, split into halves
 * by a thin divider. Each question is a dot: solid green = correct, solid red
 * = wrong, hollow yellow ring = unanswered / not reached.
 *
 * Matches Figma node 1157:3739 — `brand-green` / `brand-red` / yellow-ring.
 */
function QuestionResultStrips({
  totalQuestions,
  playerResults,
  opponentResults,
  t,
}: {
  totalQuestions: number;
  playerResults?: Array<'correct' | 'wrong' | null>;
  opponentResults?: Array<'correct' | 'wrong' | null>;
  t: LocaleT;
}) {
  return (
    <div className="flex flex-col gap-3">
      {playerResults && (
        <QuestionDotRow label={t('results.you')} total={totalQuestions} results={playerResults} />
      )}
      {opponentResults && (
        <QuestionDotRow label={t('results.opp')} total={totalQuestions} results={opponentResults} variant="opp" />
      )}
    </div>
  );
}

function QuestionDotRow({
  label,
  total,
  results,
  variant = 'self',
}: {
  label: string;
  total: number;
  results: Array<'correct' | 'wrong' | null>;
  variant?: 'self' | 'opp';
}) {
  // `variant` is currently information-only — the dot styles are
  // identical for self/opp; the prop is reserved for future tone
  // differentiation. Acknowledged here so the unused-var lint stays
  // quiet without removing the API.
  void variant;

  const half = Math.ceil(total / 2);
  const firstHalf = Array.from({ length: half }, (_, i) => results[i] ?? null);
  const secondHalf = Array.from({ length: total - half }, (_, i) => results[half + i] ?? null);

  return (
    <div className="flex items-center gap-3">
      <span className="w-10 shrink-0 text-[12px] font-bold uppercase tracking-wider text-white/75 sm:text-[13px]">
        {label}
      </span>
      <div className="flex flex-1 items-center justify-center gap-2">
        <DotGroup dots={firstHalf} />
        <span className="h-3 w-px bg-white/15" aria-hidden="true" />
        <DotGroup dots={secondHalf} />
      </div>
    </div>
  );
}

function DotGroup({ dots }: { dots: Array<'correct' | 'wrong' | null> }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {dots.map((d, i) => (
        <span
          key={i}
          aria-label={d === 'correct' ? 'correct' : d === 'wrong' ? 'wrong' : 'unanswered'}
          className={cn(
            'size-[14px] rounded-full sm:size-[18px]',
            d === 'correct' && 'bg-brand-green',
            d === 'wrong' && 'bg-brand-red',
            d === null && 'border border-brand-yellow'
          )}
        />
      ))}
    </div>
  );
}

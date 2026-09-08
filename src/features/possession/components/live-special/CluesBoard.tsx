'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { calculateCluesDisplayPoints } from '@/utils/cluesScoring';
import { useLocale } from '@/contexts/LocaleContext';
import { QuestionKindBadge } from './shared';

export interface CluesBoardClue {
  type?: string;
  content: string;
}

/**
 * The "Who am I?" board — clue cards with their per-clue point pills, the
 * reveal dots, the answer input and the resolved-answer summary.
 *
 * Presentational ONLY: it holds no socket, no timer and no scoring. Ranked
 * drives it from live match events (LiveCluesPanel) and the daily challenge
 * drives it from its session payload, so the two can never drift apart
 * visually while keeping their very different plumbing.
 */
export function CluesBoard({
  qIndex,
  clues,
  revealedClues,
  resolved,
  guess,
  onGuessChange,
  onSubmit,
  onGiveUp,
  inputLocked = false,
  showGiveUp = false,
  displayAnswer,
  answeredCorrectly = false,
  earnedPoints,
  resultSummary,
  footer,
}: {
  qIndex: number;
  clues: CluesBoardClue[];
  /** How many clue cards are unlocked; the rest render as "???". */
  revealedClues: number;
  /** Round is over — hides the input and reveals the answer row. */
  resolved: boolean;
  guess: string;
  onGuessChange: (value: string) => void;
  onSubmit: () => void;
  onGiveUp?: () => void;
  inputLocked?: boolean;
  showGiveUp?: boolean;
  displayAnswer?: string | null;
  answeredCorrectly?: boolean;
  earnedPoints?: number | null;
  /** Ranked's you-vs-opponent strip; the daily passes nothing. */
  resultSummary?: React.ReactNode;
  /** Extra controls under the board (e.g. the daily's "next question"). */
  footer?: React.ReactNode;
}) {
  const { t } = useLocale();
  const showAnswerRow = resolved && Boolean(displayAnswer);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-start pt-2">
        {/* key re-fires the drop-in animation on each new question. */}
        <QuestionKindBadge key={qIndex} kind="clues" />
      </div>

      {resultSummary}

      {showAnswerRow && (
        <motion.div
          aria-live="polite"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className={`flex items-center justify-between gap-3 rounded-[8px] border px-3 py-2 ${
            answeredCorrectly
              ? 'border-brand-green/25 bg-brand-green/10'
              : 'border-brand-red-soft/25 bg-brand-red-soft/10'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            {answeredCorrectly ? (
              <CheckCircle2 className="size-4 shrink-0 text-brand-green" />
            ) : (
              <XCircle className="size-4 shrink-0 text-brand-red-soft" />
            )}
            <div className="min-w-0">
              <p
                className={`text-[10px] font-fun font-black uppercase tracking-[0.18em] ${
                  answeredCorrectly ? 'text-brand-green' : 'text-brand-red-soft'
                }`}
              >
                {answeredCorrectly ? t('possession.correctAnswerLabel') : t('possession.theAnswerWas')}
              </p>
              <p className="text-sm font-fun font-black uppercase tracking-wide text-white [overflow-wrap:anywhere]">
                {displayAnswer}
              </p>
            </div>
          </div>
          {answeredCorrectly && earnedPoints != null && (
            <p className="shrink-0 text-[11px] font-fun font-black uppercase text-brand-green">
              +{earnedPoints} {t('possession.pointsLabel')}
            </p>
          )}
        </motion.div>
      )}

      {/* Every clue is rendered upfront: locked ones show `???`, revealed ones
          their text, each with the points still on offer at that step. */}
      <div className="space-y-1.5">
        {clues.map((clue, index) => {
          const cluePoints = calculateCluesDisplayPoints(index + 1);
          const revealed = index < revealedClues;
          return (
            <motion.div
              key={`${index}-${clue.content}`}
              initial={index === 0 ? false : { opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="flex items-center gap-3 rounded-[14px] bg-white/[0.04] px-5 py-4"
            >
              <div className="min-w-0 flex-1 text-center">
                {revealed ? (
                  clue.type === 'emoji' ? (
                    <span className="text-4xl">{clue.content}</span>
                  ) : (
                    <p className="text-base font-fun font-black uppercase tracking-wide text-white">
                      {clue.content}
                    </p>
                  )
                ) : (
                  <p className="text-base font-fun font-black uppercase tracking-wide text-white/35">???</p>
                )}
              </div>
              <span
                className={`font-poppins inline-flex shrink-0 items-center justify-center rounded-[20px] border-[2px] border-brand-green tabular-nums ${
                  revealed
                    ? 'bg-brand-green text-white shadow-[0_0_10px_rgba(56,182,14,0.35)]'
                    : 'bg-surface-page text-brand-green'
                }`}
                style={{
                  fontWeight: 600,
                  fontSize: 18,
                  letterSpacing: '0.02em',
                  width: 'clamp(72px, 18vw, 96px)',
                  height: 'clamp(40px, 10vw, 52px)',
                }}
                aria-label={`${cluePoints} points at this clue${revealed ? '' : ' (locked)'}`}
              >
                {cluePoints} pt
              </span>
            </motion.div>
          );
        })}
      </div>

      {!resolved && (
        <div className="flex items-center justify-center gap-2">
          {clues.map((_, index) => (
            <div
              key={index}
              className={`size-3 rounded-full transition-colors duration-300 ${
                index < revealedClues
                  ? 'bg-brand-yellow shadow-[0_0_10px_rgba(255,229,0,0.55)]'
                  : 'bg-surface-page'
              }`}
            />
          ))}
        </div>
      )}

      {!resolved && (
        <div className="space-y-2 scroll-mb-4">
          <input
            type="text"
            placeholder={t('possession.typeYourAnswerPlaceholder')}
            value={guess}
            onChange={(event) => onGuessChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSubmit();
            }}
            disabled={inputLocked}
            autoFocus
            aria-label={t('possession.typeYourAnswerAriaLabel')}
            className="font-poppins h-14 w-full rounded-[20px] border-none bg-brand-blue px-5 text-center text-base uppercase text-white outline-none placeholder:text-white/55 placeholder:uppercase placeholder:tracking-[0.08em] focus:outline-none disabled:opacity-50"
            style={{
              fontWeight: 600,
              letterSpacing: '0.08em',
              boxShadow: '0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)',
            }}
          />
          <div className={`grid gap-3 ${showGiveUp ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!guess.trim() || inputLocked}
              aria-label={t('possession.submitAnswer')}
              className="font-poppins h-14 rounded-[20px] bg-brand-green text-white outline-none transition-colors hover:bg-brand-green-deep disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                fontWeight: 600,
                fontSize: 16,
                letterSpacing: '0.06em',
                boxShadow: '0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)',
              }}
            >
              {t('possession.submit')}
            </button>
            {showGiveUp && onGiveUp && (
              <button
                type="button"
                onClick={onGiveUp}
                disabled={inputLocked}
                aria-label={t('possession.giveUp')}
                className="font-poppins h-14 rounded-[20px] bg-brand-red-soft text-white outline-none transition-colors hover:bg-brand-red-deep disabled:opacity-40"
                style={{
                  fontWeight: 600,
                  fontSize: 16,
                  letterSpacing: '0.06em',
                  boxShadow: '0 1.76px 6.334px 1.32px rgba(255, 75, 75, 0.25)',
                }}
              >
                {t('possession.giveUp')}
              </button>
            )}
          </div>
        </div>
      )}

      {footer}
    </div>
  );
}

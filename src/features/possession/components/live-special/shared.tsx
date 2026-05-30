'use client';

/**
 * Shared internals for the three Live Special Question sub-panels
 * (Countdown / PutInOrder / Clues). Anything that all three panels touch
 * lives here: the discriminated question type, the wrapper props
 * interface, the per-kind badge animation, the You-vs-Opp result summary
 * card, score-flight anchors, and pure helpers for normalizing partial
 * server payloads.
 *
 * Sub-panel-only constants (e.g. countdown debounce, put-in-order point
 * scaling) stay in their owning panel file.
 */

import { motion } from 'motion/react';
import type {
  MatchAnswerAckPayload,
  MatchCluesGuessAckPayload,
  MatchCountdownGuessAckPayload,
  MatchRoundResultPayload,
  MatchRoundResultPlayer,
  ResolvedCluesQuestion,
  ResolvedCountdownQuestion,
  ResolvedPutInOrderQuestion,
} from '@/lib/realtime/socket.types';
import { getI18nText } from '@/lib/utils/i18n';
import { useLocale } from '@/contexts/LocaleContext';

export type LiveSpecialQuestion =
  | ResolvedCountdownQuestion
  | ResolvedPutInOrderQuestion
  | ResolvedCluesQuestion;

export interface LiveSpecialQuestionPanelProps {
  matchId: string;
  qIndex: number;
  totalQuestions: number;
  question: LiveSpecialQuestion;
  showOptions: boolean;
  timeRemaining: number;
  questionDurationSeconds: number;
  roundResolved: boolean;
  answerAck: MatchAnswerAckPayload | null;
  roundResult: MatchRoundResultPayload | null;
  myRound: MatchRoundResultPlayer | null;
  opponentRound: MatchRoundResultPlayer | null;
  countdownGuessAck: MatchCountdownGuessAckPayload | null;
  cluesGuessAck: MatchCluesGuessAckPayload | null;
}

export function resolveI18nText(value: Record<string, string> | string, locale = 'en'): string {
  if (typeof value === 'string') return value;
  return getI18nText(value, locale);
}

export function clampCount(value: number, total: number): number {
  return Math.max(0, Math.min(total, value));
}

export function putInOrderPointsFromCount(count: number | null | undefined): number {
  return Math.max(0, Math.min(count ?? 0, 5)) * 20;
}

export function resolvePutInOrderPoints(
  pointsEarned: number | null | undefined,
  matchedCount: number | null | undefined,
): number {
  if (typeof pointsEarned === 'number' && pointsEarned > 0) return pointsEarned;
  return putInOrderPointsFromCount(matchedCount);
}

export function SpecialScoreFlightAnchors() {
  return (
    <>
      <div
        aria-hidden="true"
        data-splash-anchor="player"
        className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2"
        style={{ minWidth: 1, minHeight: 1 }}
      />
      <div
        aria-hidden="true"
        data-splash-anchor="opponent"
        className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2"
        style={{ minWidth: 1, minHeight: 1 }}
      />
    </>
  );
}

export function QuestionKindBadge({ kind }: { kind: LiveSpecialQuestion['kind'] }) {
  const { t } = useLocale();
  const labels: Record<LiveSpecialQuestion['kind'], string> = {
    countdown: t('possession.kindCountdown'),
    putInOrder: t('possession.kindPutInOrder'),
    clues: t('possession.kindWhoAmI'),
  };
  // Drop-from-above intro: badge starts at -1000px (well off-screen on
  // every realistic viewport), accelerates downward via easeIn for a
  // gravity feel, overshoots the resting position by ~40px, bounces back
  // up, then settles. The rotation + scale waver during the bounce so it
  // reads as a chunky physical object landing — not just a spring slide.
  return (
    <motion.div
      className="inline-flex items-center justify-center rounded-[18px] bg-brand-yellow px-4 py-1.5"
      initial={{ y: -1000, opacity: 0, rotate: -28, scale: 0.55 }}
      animate={{
        opacity: 1,
        y: [-1000, 40, -18, 8, -3, 0],
        rotate: [-28, -1, -10, -2, -5, -3.64],
        scale: [0.55, 1.1, 0.94, 1.04, 0.99, 1],
      }}
      transition={{
        y: { duration: 1.1, times: [0, 0.55, 0.7, 0.82, 0.92, 1], ease: [0.4, 0, 0.7, 0.2] },
        rotate: { duration: 1.1, times: [0, 0.55, 0.7, 0.82, 0.92, 1], ease: 'easeOut' },
        scale: { duration: 1.1, times: [0, 0.55, 0.7, 0.82, 0.92, 1], ease: 'easeOut' },
        opacity: { duration: 0.2, ease: 'easeOut' },
      }}
      style={{ transformOrigin: 'center' }}
    >
      <span
        className="font-poppins text-surface-page uppercase whitespace-nowrap"
        style={{ fontWeight: 600, fontSize: 14 }}
      >
        {labels[kind]}
      </span>
    </motion.div>
  );
}

export type SpecialSummaryTone = 'cyan' | 'orange' | 'green';
export type SpecialSummaryStatus = 'positive' | 'negative' | 'pending' | 'neutral';

export interface SpecialSummarySide {
  label: string;
  count: number | null;
  total: number;
  points: number | null;
  badge: string;
  status: SpecialSummaryStatus;
  detail: string;
}

export function SpecialResultSummary({
  visible,
  tone,
  player,
  opponent,
}: {
  visible: boolean;
  tone: SpecialSummaryTone;
  player: SpecialSummarySide;
  opponent: SpecialSummarySide;
}) {
  const { t } = useLocale();
  if (!visible) return null;

  // tone/status are kept on the data shape for now (callers still pass
  // them) but no longer drive any visual — the per-side status pills were
  // removed in favor of the flat dark card.
  void tone;
  const sides = [player, opponent];

  return (
    <motion.div
      aria-live="polite"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="grid grid-cols-2 gap-2 rounded-[30px] bg-surface-card-deeper p-3"
    >
      {sides.map((side) => {
        const safeTotal = Math.max(1, side.total);
        const safeCount = side.count == null ? null : clampCount(side.count, safeTotal);
        const pointsText = side.points == null ? null : `${side.points > 0 ? '+' : ''}${side.points} pts`;
        const isOpp = side.label === 'Opp';
        const singleAnswerRound = side.total <= 1;
        const bigStyle = {
          fontWeight: 700,
          fontSize: 'clamp(22px, 6vw, 36px)',
        } as const;
        const tailStyle = {
          fontWeight: 500,
          fontSize: 'clamp(11px, 2.5vw, 16px)',
        } as const;
        return (
          <div key={side.label} className={`min-w-0 px-3 py-2.5 ${isOpp ? 'text-right' : ''}`}>
            <span className="text-[10px] font-fun font-black uppercase text-white/45">{side.label}</span>
            <div className={`mt-1 flex items-end gap-1 tabular-nums text-brand-yellow ${isOpp ? 'justify-end' : ''}`}>
              {singleAnswerRound ? (
                <>
                  <span className="font-poppins leading-none" style={bigStyle}>
                    {side.points ?? 0}
                  </span>
                  <span className="font-poppins pb-1 leading-none text-brand-yellow/70" style={tailStyle}>
                    {t('possession.pts')}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-poppins leading-none" style={bigStyle}>
                    {safeCount == null ? '-' : safeCount}
                  </span>
                  <span className="font-poppins pb-1 leading-none text-brand-yellow/70" style={tailStyle}>
                    /{safeTotal}
                  </span>
                </>
              )}
            </div>
            <div className={`mt-1 flex min-h-4 items-center gap-2 ${isOpp ? 'flex-row-reverse' : 'justify-between'}`}>
              <p className="truncate text-[10px] font-fun font-black uppercase text-white/50">{side.detail}</p>
              {!singleAnswerRound && pointsText && (
                <span
                  className="font-poppins shrink-0 tabular-nums text-brand-yellow"
                  style={{
                    fontWeight: 700,
                    fontSize: 'clamp(15px, 3.5vw, 20px)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {pointsText.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

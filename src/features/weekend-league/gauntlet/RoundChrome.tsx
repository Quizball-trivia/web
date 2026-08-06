'use client';

import { useEffect } from 'react';
import { poppins } from '../constants';
import { XCircle } from 'lucide-react';
import { DailyChallengeHeader } from '@/features/daily/components/DailyChallengeHeader';
import { RoundTransitionOverlay } from '@/components/game/RoundTransitionOverlay';
import { useLocale } from '@/contexts/LocaleContext';
import { ROUND_LABEL_KEYS, ROUNDS } from './gauntlet.data';
import type { RoundDef } from './gauntlet.types';

/**
 * Shared chrome for gauntlet rounds, matching the daily-challenge / ranked
 * question surfaces: the blue header pills, the frosted question card and the
 * yellow-outline answer buttons.
 */
export function GauntletHeader({
  gameIndex,
  round,
  score,
  rank,
  secondsLeft,
  spectator = false,
  step,
  onQuit,
}: {
  gameIndex: number;
  round: RoundDef;
  score: number;
  /** null = not on the visible board (live boards are truncated). */
  rank: number | null;
  secondsLeft: number;
  spectator?: boolean;
  /** "2/5" when the round holds several questions. */
  step?: string;
  onQuit: () => void;
}) {
  const { t } = useLocale();
  void gameIndex; // kept in the API for callers; the meta line that used it is gone
  return (
    <div>
      <DailyChallengeHeader
        onQuit={onQuit}
        currentIndex={round.index}
        total={ROUNDS.length}
        timeLeft={secondsLeft}
        centerLabel={
          step
            ? t('possession.questionCounter', { current: step.split('/')[0], total: step.split('/')[1] })
            : t('possession.questionCounter', { current: 1, total: 1 })
        }
      />
      {/* Players see their score; spectators get no meta line at all — the
          watching context is obvious and the badge read as clutter. */}
      {!spectator && (
        <div className="mx-auto mt-2 flex max-w-3xl items-center justify-end px-4 font-poppins text-[11px] font-bold uppercase tracking-wide text-white/50">
          <span className="tabular-nums text-white/80">
            {rank != null
              ? t('weekendLeague.gScoreRank', { score, rank })
              : t('weekendLeague.gPlusPoints', { n: score })}
          </span>
        </div>
      )}
    </div>
  );
}

/** Round progress dashes — rendered INSIDE the question area so the round
 *  transition overlay covers them, as it does in ranked. */
export function RoundProgressDashes({ round }: { round: RoundDef }) {
  return (
    <div className="mx-auto mb-2 flex max-w-3xl items-center gap-1.5">
      {ROUNDS.map((r) => (
        <span
          key={r.index}
          className={`h-1 flex-1 rounded-full ${
            r.index < round.index ? 'bg-brand-green-light' : r.index === round.index ? 'bg-brand-yellow' : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  );
}

/** Frosted question card, as in the daily games. */
export function QuestionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center rounded-[24px] border border-white/10 bg-white/5 px-5 py-5 text-white backdrop-blur-sm sm:px-6 sm:py-6"
      style={{
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 700,
        fontSize: 'clamp(15px, 1.9vw, 26px)',
        minHeight: 'clamp(84px, 10vw, 132px)',
      }}
    >
      <div className="w-full text-center leading-snug">{children}</div>
    </div>
  );
}

/** `pending` = your pick, awaiting the server verdict (WL scrubs the answer
 *  key from dispatches, so the ack is the earliest honest verdict). */
export type AnswerState = 'idle' | 'pending' | 'correct' | 'wrong' | 'faded';

/** Daily-style answer button: yellow outline → green fill / red outline. */
export function AnswerBtn({
  label,
  prefix,
  state,
  disabled,
  tall = false,
  onClick,
}: {
  label: React.ReactNode;
  prefix?: React.ReactNode;
  state: AnswerState;
  disabled?: boolean;
  tall?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative flex items-center justify-center overflow-hidden rounded-[16px] px-4 transition-shadow duration-150 ${
        tall
          ? 'min-h-[68px] sm:min-h-[86px] md:min-h-[100px]'
          : 'min-h-[62px] sm:min-h-[72px] md:min-h-[82px]'
      }`}
      style={{
        ...{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: '0', lineHeight: 1.2 },
        fontSize: 'clamp(14px, 2vw, 26px)',
        textTransform: 'uppercase',
        color: state === 'wrong' ? '#FB3101' : '#FFFFFF',
        opacity: state === 'faded' ? 0.45 : 1,
        backgroundColor: state === 'correct' ? '#38B60E' : 'transparent',
        border:
          state === 'correct'
            ? 'none'
            : state === 'wrong'
              ? '2px solid #FB3101'
              : '2px solid #FFE500',
        boxShadow:
          state === 'correct'
            ? '0 1.76px 6.334px 1.32px rgba(56,182,14,0.25)'
            : state === 'wrong'
              ? '0 1.76px 6.334px 1.32px rgba(251,49,1,0.25)'
              : '0 0 6.334px 1.32px rgba(255,229,0,0.25)',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {/* Option letter pinned to the corner so it never shifts with the label. */}
      {prefix && <span className="absolute left-2.5 top-2">{prefix}</span>}
      <div className="flex items-center justify-center gap-3 px-6 text-center">
        <span>{label}</span>
        {state === 'wrong' && <XCircle className="size-6 shrink-0" />}
      </div>
    </button>
  );
}

/**
 * Between-round overlay — the same component ranked matches use for their round
 * transitions, so the language is identical.
 */
export function RoundIntroOverlay({ round, onDone }: { round: RoundDef; onDone: () => void }) {
  const { t } = useLocale();
  useEffect(() => {
    // Long enough to actually read (the 1.8s version registered as a flash);
    // the round-start dispatch lead budgets for exactly this duration.
    const id = setTimeout(onDone, 2_200);
    return () => clearTimeout(id);
  }, [onDone]);

  // Scoped exactly like ranked: absolute inset-0 filling the QUESTION area
  // (its positioned parent), not the viewport — the header/timer stay visible
  // above it, everything below is covered.
  return (
    <div className="absolute inset-0 z-40 bg-surface-page-alt">
      <RoundTransitionOverlay
        // Digit in Poppins: the fun font's numerals read as a different
        // typeface next to the Georgian glyphs.
        title={<>{t('weekendLeague.gRoundWord')} <span style={poppins}>{round.index + 1}</span></>}
        categoryName={t(ROUND_LABEL_KEYS[round.type])}
        subtitle={t('weekendLeague.gUpTo', { n: round.maxPoints })}
      />
    </div>
  );
}

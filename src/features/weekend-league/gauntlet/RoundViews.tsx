'use client';

// ONE visual source for gauntlet question screens. Both drivers render these
// exact views: /dev/wl-gauntlet (local prototype driver, RoundScreens.tsx) and
// the live socket flow (WlLiveFlow.tsx). Change a view here and it changes in
// the playground AND in the real Weekend League.

import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { ResultSplash } from '@/features/daily/components/ResultSplash';
import { useLocale } from '@/contexts/LocaleContext';
import { poppins } from '../constants';
import type { RoundDef } from './gauntlet.types';
import { AnswerBtn, GauntletHeader, QuestionCard, type AnswerState } from './RoundChrome';

export interface RoundHeaderModel {
  gameIndex: number;
  round: RoundDef;
  score: number;
  rank: number | null;
  secondsLeft: number;
  spectator?: boolean;
  step?: string;
  onQuit: () => void;
}

/** Full-screen round scaffold in the daily-challenge layout. */
export function RoundScreenShell({
  header,
  splashProps,
  children,
}: {
  header: RoundHeaderModel;
  splashProps?: React.ComponentProps<typeof ResultSplash>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col pb-10">
      <GauntletHeader {...header} />
      <div className="mx-auto flex w-full max-w-3xl flex-col px-4 pt-3">
        {children}
      </div>
      {splashProps && <ResultSplash {...splashProps} />}
    </div>
  );
}

/** The immersive gauntlet backdrop — identical for prototype and live play. */
export function GauntletBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat font-fun">
      {children}
    </div>
  );
}

export interface PairChoice {
  key: string;
  label: React.ReactNode;
  prefix?: React.ReactNode;
  state: AnswerState;
}

/** Two tall side-by-side answers — true/false and higher/lower rounds. */
export function PairAnswers({
  choices,
  disabled,
  onPick,
}: {
  choices: [PairChoice, PairChoice];
  disabled: boolean;
  onPick: (key: string, index: number) => void;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2.5">
      {choices.map((c, i) => (
        <AnswerBtn
          key={c.key}
          tall
          label={c.label}
          prefix={c.prefix}
          state={c.state}
          disabled={disabled}
          onClick={() => onPick(c.key, i)}
        />
      ))}
    </div>
  );
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export interface ListedOption {
  key: string;
  label: React.ReactNode;
  state: AnswerState;
}

/** Vertical option list with letter chips — the MCQ / career-path answers. */
export function AnswerOptionList({
  options,
  disabled,
  onPick,
  columns = false,
}: {
  options: ListedOption[];
  disabled: boolean;
  onPick: (key: string, index: number) => void;
  /** Two columns on wide screens (career-path style); single column otherwise. */
  columns?: boolean;
}) {
  return (
    <div className={columns ? 'mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2' : 'mt-3 flex flex-col gap-2.5'}>
      {options.map((o, i) => (
        <AnswerBtn
          key={o.key}
          label={o.label}
          prefix={
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10 font-poppins text-sm font-black text-white/70">
              {OPTION_LETTERS[i] ?? ''}
            </span>
          }
          state={o.state}
          disabled={disabled}
          onClick={() => onPick(o.key, i)}
        />
      ))}
    </div>
  );
}

/** Career chip — a club logo (prototype) or a club name (live data). */
export interface CareerItem {
  imageSrc?: string;
  label?: string;
}

/** The career chain inside the question card: chips joined by yellow arrows. */
export function CareerPathCard({ heading, items }: { heading: string; items: CareerItem[] }) {
  return (
    <QuestionCard>
      <div>
        <div className="text-center text-base sm:text-lg">{heading}</div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {items.map((item, i) => (
            <motion.span
              key={`${item.imageSrc ?? item.label}-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12 }}
              className="flex items-center gap-2"
            >
              {item.imageSrc ? (
                <Image
                  src={item.imageSrc}
                  alt=""
                  width={96}
                  height={96}
                  className="size-11 object-contain sm:size-14"
                />
              ) : (
                <span className="rounded-xl bg-white/[0.07] px-3 py-2 font-poppins text-[13px] font-bold uppercase text-white sm:text-sm">
                  {item.label}
                </span>
              )}
              {i < items.length - 1 && <ArrowRight className="size-4 shrink-0 text-brand-yellow" />}
            </motion.span>
          ))}
        </div>
      </div>
    </QuestionCard>
  );
}

/** Higher/lower card body: stat label, subject, optional value, prompt. */
export function HigherLowerCard({
  statLabel,
  stepLabel,
  subject,
  value,
  prompt,
}: {
  statLabel: string;
  stepLabel?: string;
  subject?: string;
  value?: string;
  prompt: string;
}) {
  return (
    <QuestionCard>
      <div className="text-center">
        <div className="font-poppins text-[12px] font-bold uppercase tracking-wide text-white/50">
          {statLabel}
          {stepLabel ? ` · ${stepLabel}` : ''}
        </div>
        {subject && <div className="mt-2 text-xl sm:text-2xl">{subject}</div>}
        {value && (
          <div className="mt-1 font-poppins text-3xl font-black tabular-nums text-brand-yellow" style={poppins}>
            {value}
          </div>
        )}
        <div className="mt-3 text-base sm:text-lg">{prompt}</div>
      </div>
    </QuestionCard>
  );
}

/** Who-am-I header: the kind badge + the current clue's points pill. */
export function WhoAmIBadges({ pointsNow }: { pointsNow: number }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col items-center">
      {/* Kind badge stands in for the prompt — as in ranked, the badge already
          says "Who am I?", so no duplicate prompt line. */}
      <span className="rounded-full bg-brand-cyan/15 px-4 py-1.5 font-poppins text-[12px] font-black uppercase tracking-widest text-brand-cyan">
        {t('weekendLeague.gWhoAmI')}
      </span>
      <span className="mt-2 rounded-full bg-brand-yellow/15 px-3 py-1 font-poppins text-[12px] font-black uppercase text-brand-yellow">
        {t('weekendLeague.gPtsNow', { n: pointsNow })}
      </span>
    </div>
  );
}

export interface WhoAmIClue {
  text: string;
  revealed: boolean;
  points: number;
}

/** All clue cards render upfront — locked ones show `???` — with a per-clue
 *  points pill on the right, as in the ranked clues panel. */
export function WhoAmIClueLadder({ clues }: { clues: WhoAmIClue[] }) {
  return (
    <div className="mt-4 space-y-1.5">
      {clues.map((clue, i) => (
        <motion.div
          key={i}
          initial={i === 0 ? false : { opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="flex items-center gap-3 rounded-[14px] bg-white/[0.04] px-5 py-4"
        >
          <div className="min-w-0 flex-1 text-center">
            <p
              className={`font-fun text-base font-black uppercase tracking-wide ${
                clue.revealed ? 'text-white' : 'text-white/35'
              }`}
            >
              {clue.revealed ? clue.text : '???'}
            </p>
          </div>
          <span
            className={`inline-flex h-8 min-w-[3rem] shrink-0 items-center justify-center rounded-[20px] border-2 border-brand-green font-poppins text-[13px] font-black tabular-nums ${
              clue.revealed
                ? 'bg-brand-green text-white shadow-[0_0_10px_rgba(56,182,14,0.35)]'
                : 'bg-surface-page text-brand-green'
            }`}
          >
            {clue.points}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/** Type-the-name panel: the blue input with green submit / red give up while
 *  open, or the verdict box once locked — matching the ranked clues panel. */
export function TypedAnswerPanel({
  locked,
  outcome,
  answerText,
  guess,
  onGuessChange,
  onSubmit,
  onGiveUp,
  readOnly,
}: {
  locked: boolean;
  /** Verdict once locked; null renders nothing while the reveal is pending. */
  outcome: 'correct' | 'wrong' | null;
  /** Correct answer shown on a wrong verdict (empty hides the line). */
  answerText: string;
  guess: string;
  onGuessChange: (v: string) => void;
  onSubmit: () => void;
  onGiveUp?: () => void;
  readOnly?: boolean;
}) {
  const { t } = useLocale();
  if (locked) {
    if (outcome == null) return null;
    return (
      <div
        className={`mt-4 rounded-[20px] px-5 py-4 text-center font-poppins text-base font-black uppercase ${
          outcome === 'correct'
            ? 'bg-brand-green text-white'
            : 'border-2 border-brand-red-soft text-brand-red-soft'
        }`}
      >
        {outcome === 'correct'
          ? t('weekendLeague.gCorrect')
          : answerText
            ? `${t('weekendLeague.gCorrectAnswer')} ${answerText}`
            : t('weekendLeague.gWrong')}
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-2">
      <input
        type="text"
        placeholder={t('possession.typeYourAnswerPlaceholder')}
        value={guess}
        onChange={(e) => onGuessChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
        }}
        disabled={readOnly}
        aria-label={t('possession.typeYourAnswerAriaLabel')}
        className="h-14 w-full rounded-[20px] border-none bg-brand-blue px-5 text-center font-poppins text-base uppercase text-white outline-none placeholder:uppercase placeholder:tracking-[0.08em] placeholder:text-white/55 focus:outline-none disabled:opacity-50"
        style={{
          fontWeight: 600,
          letterSpacing: '0.08em',
          boxShadow: '0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)',
        }}
      />
      <div className={onGiveUp ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'}>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!guess.trim() || readOnly}
          className="h-14 rounded-[20px] bg-brand-green font-poppins text-white outline-none transition-colors hover:bg-brand-green-deep disabled:cursor-not-allowed disabled:opacity-40"
          style={{ fontWeight: 600, fontSize: 16, letterSpacing: '0.06em', boxShadow: '0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)' }}
        >
          {t('possession.submit')}
        </button>
        {onGiveUp && (
          <button
            type="button"
            onClick={onGiveUp}
            disabled={readOnly}
            className="h-14 rounded-[20px] bg-brand-red-soft font-poppins text-white outline-none transition-colors hover:bg-brand-red-deep disabled:opacity-40"
            style={{ fontWeight: 600, fontSize: 16, letterSpacing: '0.06em', boxShadow: '0 1.76px 6.334px 1.32px rgba(255, 75, 75, 0.25)' }}
          >
            {t('possession.giveUp')}
          </button>
        )}
      </div>
    </div>
  );
}

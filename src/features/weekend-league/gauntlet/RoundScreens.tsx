'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { ResultSplash } from '@/features/daily/components/ResultSplash';
import { useResultSplash } from '@/features/daily/components/useResultSplash';
import { useLocale } from '@/contexts/LocaleContext';
import { poppins } from '../constants';
import type {
  CareerPathQ,
  GameDef,
  HigherLowerQ,
  McqQ,
  RoundDef,
  RoundResult,
  TrueFalseQ,
  WhoAmIQ,
} from './gauntlet.types';
import { AnswerBtn, GauntletHeader, QuestionCard, type AnswerState } from './RoundChrome';
import { useAnswerLock, useRoundClock } from './RoundShell';
import { matchesAnswer } from './answerMatching';

interface RoundProps<Q> {
  question: Q;
  game: GameDef;
  gameIndex: number;
  round: RoundDef;
  score: number;
  rank: number;
  fastTimers: boolean;
  /** Spectators see everything but can't answer. */
  readOnly?: boolean;
  /** Header shows a SPECTATOR badge instead of personal score/rank. */
  spectator?: boolean;
  onQuit?: () => void;
  onResolved: (r: RoundResult) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

function optionState(i: number, correctIndex: number, selected: number | null, locked: boolean): AnswerState {
  if (!locked) return 'idle';
  if (i === correctIndex) return 'correct';
  if (i === selected) return 'wrong';
  return 'faded';
}

/**
 * Sequences the N questions inside one round: shared clock, per-question lock,
 * splash, and the accumulated points reported up when the last one resolves.
 */
function useQuestionSequence({
  count,
  maxPoints,
  seconds,
  fastTimers,
  onResolved,
  scorePoints,
}: {
  count: number;
  maxPoints: number;
  seconds: number;
  fastTimers: boolean;
  onResolved: (r: RoundResult) => void;
  /** Override how a correct answer scores, given the time fraction left. */
  scorePoints?: (frac: number) => number;
}) {
  const [index, setIndex] = useState(0);
  const [earned, setEarned] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const { splashProps, fire } = useResultSplash();
  const perQuestion = Math.round(maxPoints / count);
  const finish = useAnswerLock(onResolved);
  // Each question gets its own slice of the round clock, so answer speed is
  // measured per question exactly as in a ranked match.
  const perQuestionSeconds = Math.max(4, Math.round(seconds / count));
  const advanceRef = useRef<(gained: number) => void>(() => {});
  const clock = useRoundClock(perQuestionSeconds, fastTimers, () => advanceRef.current(0));

  const advance = (gained: number) => {
    const nextEarned = earned + gained;
    const nextCorrect = correctCount + (gained > 0 ? 1 : 0);
    if (index < count - 1) {
      setEarned(nextEarned);
      setCorrectCount(nextCorrect);
      setIndex(index + 1);
      setSelected(null);
      setLocked(false);
      clock.restart();
    } else {
      clock.stop();
      setEarned(nextEarned);
      finish.lock({ correct: nextCorrect > 0, points: nextEarned, timeFrac: clock.frac });
    }
  };
  useEffect(() => {
    advanceRef.current = advance;
  });

  const pick = (i: number, correctIndex: number, from: 'left' | 'right') => {
    if (locked) return;
    setSelected(i);
    setLocked(true);
    clock.stop();
    const correct = i === correctIndex;
    fire(correct ? 'correct' : 'wrong', from);
    const gained = correct
      ? (scorePoints ? scorePoints(clock.frac) : Math.round(perQuestion * (0.6 + 0.4 * clock.frac)))
      : 0;
    setTimeout(() => advanceRef.current(gained), 900);
  };

  const stateFor = (i: number, correctIndex: number): AnswerState =>
    locked ? optionState(i, correctIndex, selected, true) : 'idle';

  return {
    index,
    earned,
    locked: locked || finish.locked,
    splashProps,
    secondsLeft: clock.secondsLeft,
    /** Fraction of the current question's time still left. */
    questionFrac: clock.frac,
    stepLabel: `${index + 1}/${count}`,
    pick,
    stateFor,
  };
}

function RunningTotal({ earned }: { earned: number }) {
  return (
    <div className="mt-3 text-right font-poppins text-sm tabular-nums text-white/70" style={poppins}>
      +{earned}
    </div>
  );
}

/** Full-screen round scaffold in the daily-challenge layout. */
function Screen({
  props,
  secondsLeft,
  children,
  splashProps,
  step,
}: {
  props: RoundProps<unknown>;
  secondsLeft: number;
  children: React.ReactNode;
  splashProps: React.ComponentProps<typeof ResultSplash>;
  step?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col pb-10">
      <GauntletHeader
        gameIndex={props.gameIndex}
        round={props.round}
        score={props.score}
        rank={props.rank}
        secondsLeft={secondsLeft}
        spectator={props.spectator}
        step={step}
        onQuit={props.onQuit ?? (() => {})}
      />
      <div className="mx-auto flex w-full max-w-3xl flex-col px-4 pt-3">
        {children}
      </div>
      <ResultSplash {...splashProps} />
    </div>
  );
}

export function TrueFalseRound(props: RoundProps<TrueFalseQ>) {
  const { t } = useLocale();
  const { question, round, fastTimers, readOnly, onResolved } = props;
  const seq = useQuestionSequence({
    count: question.items.length,
    maxPoints: round.maxPoints,
    seconds: round.seconds,
    fastTimers: !!fastTimers,
    onResolved,
  });
  const item = question.items[seq.index];
  const correctIndex = item.answer ? 0 : 1;

  return (
    <Screen props={props} secondsLeft={seq.secondsLeft} splashProps={seq.splashProps} step={seq.stepLabel}>
      <QuestionCard>{item.statement}</QuestionCard>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {[t('weekendLeague.gTrue'), t('weekendLeague.gFalse')].map((label, i) => (
          <AnswerBtn
            key={label}
            tall
            label={label}
            state={seq.stateFor(i, correctIndex)}
            disabled={seq.locked || readOnly}
            onClick={() => seq.pick(i, correctIndex, i === 0 ? 'left' : 'right')}
          />
        ))}
      </div>
      <RunningTotal earned={seq.earned} />
    </Screen>
  );
}

export function HigherLowerRound(props: RoundProps<HigherLowerQ>) {
  const { t } = useLocale();
  const { question, round, fastTimers, readOnly, onResolved } = props;
  const [step, setStep] = useState(0);
  const [earned, setEarned] = useState(0);
  const [correctSteps, setCorrectSteps] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [stepLocked, setStepLocked] = useState(false);
  const { locked, lock } = useAnswerLock(onResolved);
  const { splashProps, fire } = useResultSplash();
  const steps = question.chain.length - 1;
  // 10s per comparison, matching ranked's per-question budget.
  const clock = useRoundClock(Math.round(round.seconds / steps), !!fastTimers, () =>
    lock({ correct: correctSteps > 0, points: earned, timeFrac: 0 }),
  );
  const base = question.chain[step];
  const next = question.chain[step + 1];
  const nextIsHigher = next.value > base.value;

  const pick = (i: number) => {
    if (readOnly || locked || stepLocked) return;
    setSelected(i);
    setStepLocked(true);
    clock.stop();
    const correct = (i === 0) === nextIsHigher;
    fire(correct ? 'correct' : 'wrong', i === 0 ? 'left' : 'right');
    const gained = correct ? question.stepPoints : 0;
    const totalEarned = earned + gained;
    const totalCorrect = correctSteps + (correct ? 1 : 0);
    setTimeout(() => {
      if (step < steps - 1) {
        setEarned(totalEarned);
        setCorrectSteps(totalCorrect);
        setStep(step + 1);
        setSelected(null);
        setStepLocked(false);
        clock.restart();
      } else {
        clock.stop();
        setEarned(totalEarned);
        lock({ correct: totalCorrect > 0, points: totalEarned, timeFrac: clock.frac });
      }
    }, 1000);
  };

  const correctIndex = nextIsHigher ? 0 : 1;
  return (
    <Screen props={props} secondsLeft={clock.secondsLeft} splashProps={splashProps}>
      <QuestionCard>
        <div className="text-center">
          <div className="font-poppins text-[12px] font-bold uppercase tracking-wide text-white/50">
            {question.statLabel} · {step + 1}/{steps}
          </div>
          <div className="mt-2 text-xl sm:text-2xl">{base.name}</div>
          <div className="mt-1 font-poppins text-3xl font-black tabular-nums text-brand-yellow" style={poppins}>
            {base.value.toLocaleString()}
          </div>
          <div className="mt-3 text-base sm:text-lg">
            {t('weekendLeague.gHigherLowerPrompt', { name: next.name })}
          </div>
        </div>
      </QuestionCard>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <AnswerBtn
          tall
          label={t('weekendLeague.gHigher')}
          prefix={<ArrowUp className="size-6 shrink-0 text-brand-green-light" />}
          state={stepLocked || locked ? optionState(0, correctIndex, selected, true) : 'idle'}
          disabled={stepLocked || locked || readOnly}
          onClick={() => pick(0)}
        />
        <AnswerBtn
          tall
          label={t('weekendLeague.gLower')}
          prefix={<ArrowDown className="size-6 shrink-0 text-brand-red-soft" />}
          state={stepLocked || locked ? optionState(1, correctIndex, selected, true) : 'idle'}
          disabled={stepLocked || locked || readOnly}
          onClick={() => pick(1)}
        />
      </div>
      <div className="mt-4 flex items-center justify-between font-poppins text-sm text-white/55" style={poppins}>
        <span>{t('weekendLeague.gPerStep', { n: question.stepPoints })}</span>
        <span className="tabular-nums text-white">+{earned}</span>
      </div>
    </Screen>
  );
}

export function MultipleChoiceRound(props: RoundProps<McqQ>) {
  const { question, round, fastTimers, readOnly, onResolved } = props;
  const seq = useQuestionSequence({
    count: question.items.length,
    maxPoints: round.maxPoints,
    seconds: round.seconds,
    fastTimers: !!fastTimers,
    onResolved,
  });
  const item = question.items[seq.index];

  return (
    <Screen props={props} secondsLeft={seq.secondsLeft} splashProps={seq.splashProps} step={seq.stepLabel}>
      <QuestionCard>{item.prompt}</QuestionCard>
      <div className="mt-3 flex flex-col gap-2.5">
        {item.options.map((opt, i) => (
          <AnswerBtn
            key={i}
            label={opt}
            prefix={
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10 font-poppins text-sm font-black text-white/70">
                {OPTION_LETTERS[i]}
              </span>
            }
            state={seq.stateFor(i, item.correctIndex)}
            disabled={seq.locked || readOnly}
            onClick={() => seq.pick(i, item.correctIndex, i % 2 === 0 ? 'left' : 'right')}
          />
        ))}
      </div>
      <RunningTotal earned={seq.earned} />
    </Screen>
  );
}

export function CareerPathRound(props: RoundProps<CareerPathQ>) {
  const { t } = useLocale();
  const { question, round, fastTimers, readOnly, onResolved } = props;
  const seq = useQuestionSequence({
    count: question.items.length,
    maxPoints: round.maxPoints,
    seconds: round.seconds,
    fastTimers: !!fastTimers,
    onResolved,
  });
  const item = question.items[seq.index];

  return (
    <Screen props={props} secondsLeft={seq.secondsLeft} splashProps={seq.splashProps} step={seq.stepLabel}>
      <QuestionCard>
        <div>
          <div className="text-center text-base sm:text-lg">{t('weekendLeague.gWhoseCareer')}</div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {item.clubs.map((club, i) => (
              <motion.span
                key={`${club}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12 }}
                className="flex items-center gap-2"
              >
                <Image
                  src={`/clubs/${club}.webp`}
                  alt=""
                  width={96}
                  height={96}
                  className="size-11 object-contain sm:size-14"
                />
                {i < item.clubs.length - 1 && <ArrowRight className="size-4 shrink-0 text-brand-yellow" />}
              </motion.span>
            ))}
          </div>
        </div>
      </QuestionCard>
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {item.options.map((opt, i) => (
          <AnswerBtn
            key={i}
            label={opt}
            state={seq.stateFor(i, item.correctIndex)}
            disabled={seq.locked || readOnly}
            onClick={() => seq.pick(i, item.correctIndex, i % 2 === 0 ? 'left' : 'right')}
          />
        ))}
      </div>
      <RunningTotal earned={seq.earned} />
    </Screen>
  );
}

export function WhoAmIRound(props: RoundProps<WhoAmIQ>) {
  const { t } = useLocale();
  const { question, round, fastTimers, readOnly, onResolved } = props;
  const [guess, setGuess] = useState('');
  const [outcome, setOutcome] = useState<'correct' | 'wrong' | null>(null);
  const { locked, lock } = useAnswerLock(onResolved);
  const { splashProps, fire } = useResultSplash();
  const clock = useRoundClock(round.seconds, !!fastTimers, () =>
    lock({ correct: false, points: 0, timeFrac: 0 }),
  );

  // Ranked's clue logic: one clue per 10s slice of the round.
  const clueCount = question.clues.length;
  const secondsPerClue = clueCount > 0 ? Math.max(1, Math.floor(clock.total / clueCount)) : clock.total;
  const cluesShown = locked
    ? clueCount
    : Math.min(clueCount, Math.max(1, Math.floor((clock.total - clock.secondsLeft) / secondsPerClue) + 1));
  const pointsNow = question.cluePoints[cluesShown - 1];
  const answer = question.options[question.correctIndex];

  const submit = (giveUp = false) => {
    if (readOnly || locked) return;
    if (!giveUp && !guess.trim()) return;
    clock.stop();
    const correct = !giveUp && matchesAnswer(guess, answer);
    setOutcome(correct ? 'correct' : 'wrong');
    fire(correct ? 'correct' : 'wrong', 'right');
    lock({ correct, points: correct ? pointsNow : 0, timeFrac: clock.frac });
  };

  return (
    <Screen
      props={props}
      secondsLeft={clock.secondsLeft}
      splashProps={splashProps}
      step={`${cluesShown}/${clueCount}`}
    >
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

      {/* All clue cards render upfront — locked ones show `???` — with a
          per-clue points pill on the right, as in the ranked clues panel. */}
      <div className="mt-4 space-y-1.5">
        {question.clues.map((clue, i) => {
          const revealed = i < cluesShown;
          return (
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
                    revealed ? 'text-white' : 'text-white/35'
                  }`}
                >
                  {revealed ? clue : '???'}
                </p>
              </div>
              <span
                className={`inline-flex h-8 min-w-[3rem] shrink-0 items-center justify-center rounded-[20px] border-2 border-brand-green font-poppins text-[13px] font-black tabular-nums ${
                  revealed
                    ? 'bg-brand-green text-white shadow-[0_0_10px_rgba(56,182,14,0.35)]'
                    : 'bg-surface-page text-brand-green'
                }`}
              >
                {question.cluePoints[i]}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Type-the-name input, matching the ranked clues panel. */}
      {locked ? (
        <div
          className={`mt-4 rounded-[20px] px-5 py-4 text-center font-poppins text-base font-black uppercase ${
            outcome === 'correct'
              ? 'bg-brand-green text-white'
              : 'border-2 border-brand-red-soft text-brand-red-soft'
          }`}
        >
          {outcome === 'correct'
            ? t('weekendLeague.gCorrect')
            : `${t('weekendLeague.gCorrectAnswer')} ${answer}`}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <input
            type="text"
            placeholder={t('possession.typeYourAnswerPlaceholder')}
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
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
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => submit()}
              disabled={!guess.trim() || readOnly}
              className="h-14 rounded-[20px] bg-brand-green font-poppins text-white outline-none transition-colors hover:bg-brand-green-deep disabled:cursor-not-allowed disabled:opacity-40"
              style={{ fontWeight: 600, fontSize: 16, letterSpacing: '0.06em', boxShadow: '0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)' }}
            >
              {t('possession.submit')}
            </button>
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={readOnly}
              className="h-14 rounded-[20px] bg-brand-red-soft font-poppins text-white outline-none transition-colors hover:bg-brand-red-deep disabled:opacity-40"
              style={{ fontWeight: 600, fontSize: 16, letterSpacing: '0.06em', boxShadow: '0 1.76px 6.334px 1.32px rgba(255, 75, 75, 0.25)' }}
            >
              {t('possession.giveUp')}
            </button>
          </div>
        </div>
      )}
    </Screen>
  );
}

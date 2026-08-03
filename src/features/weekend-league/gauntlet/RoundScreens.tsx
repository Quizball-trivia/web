'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
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
import { QuestionCard, type AnswerState } from './RoundChrome';
import {
  AnswerOptionList,
  CareerPathCard,
  HigherLowerCard,
  PairAnswers,
  RoundScreenShell,
  TypedAnswerPanel,
  WhoAmIBadges,
  WhoAmIClueLadder,
  type RoundHeaderModel,
} from './RoundViews';
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

function optionState(i: number, correctIndex: number, selected: number | null, locked: boolean): AnswerState {
  if (!locked) return 'idle';
  if (i === correctIndex) return 'correct';
  if (i === selected) return 'wrong';
  return 'faded';
}

function headerOf(props: RoundProps<unknown>, secondsLeft: number, step?: string): RoundHeaderModel {
  return {
    gameIndex: props.gameIndex,
    round: props.round,
    score: props.score,
    rank: props.rank,
    secondsLeft,
    spectator: props.spectator,
    step,
    onQuit: props.onQuit ?? (() => {}),
  };
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
    <RoundScreenShell header={headerOf(props, seq.secondsLeft, seq.stepLabel)} splashProps={seq.splashProps}>
      <QuestionCard>{item.statement}</QuestionCard>
      <PairAnswers
        choices={[
          { key: 'true', label: t('weekendLeague.gTrue'), state: seq.stateFor(0, correctIndex) },
          { key: 'false', label: t('weekendLeague.gFalse'), state: seq.stateFor(1, correctIndex) },
        ]}
        disabled={seq.locked || !!readOnly}
        onPick={(_key, i) => seq.pick(i, correctIndex, i === 0 ? 'left' : 'right')}
      />
      <RunningTotal earned={seq.earned} />
    </RoundScreenShell>
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
  const revealed = stepLocked || locked;
  return (
    <RoundScreenShell header={headerOf(props, clock.secondsLeft)} splashProps={splashProps}>
      <HigherLowerCard
        statLabel={question.statLabel}
        stepLabel={`${step + 1}/${steps}`}
        subject={base.name}
        value={base.value.toLocaleString()}
        prompt={t('weekendLeague.gHigherLowerPrompt', { name: next.name })}
      />
      <PairAnswers
        choices={[
          {
            key: 'higher',
            label: t('weekendLeague.gHigher'),
            prefix: <ArrowUp className="size-6 shrink-0 text-brand-green-light" />,
            state: revealed ? optionState(0, correctIndex, selected, true) : 'idle',
          },
          {
            key: 'lower',
            label: t('weekendLeague.gLower'),
            prefix: <ArrowDown className="size-6 shrink-0 text-brand-red-soft" />,
            state: revealed ? optionState(1, correctIndex, selected, true) : 'idle',
          },
        ]}
        disabled={revealed || !!readOnly}
        onPick={(_key, i) => pick(i)}
      />
      <div className="mt-4 flex items-center justify-between font-poppins text-sm text-white/55" style={poppins}>
        <span>{t('weekendLeague.gPerStep', { n: question.stepPoints })}</span>
        <span className="tabular-nums text-white">+{earned}</span>
      </div>
    </RoundScreenShell>
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
    <RoundScreenShell header={headerOf(props, seq.secondsLeft, seq.stepLabel)} splashProps={seq.splashProps}>
      <QuestionCard>{item.prompt}</QuestionCard>
      <AnswerOptionList
        options={item.options.map((opt, i) => ({
          key: String(i),
          label: opt,
          state: seq.stateFor(i, item.correctIndex),
        }))}
        disabled={seq.locked || !!readOnly}
        onPick={(_key, i) => seq.pick(i, item.correctIndex, i % 2 === 0 ? 'left' : 'right')}
      />
      <RunningTotal earned={seq.earned} />
    </RoundScreenShell>
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
    <RoundScreenShell header={headerOf(props, seq.secondsLeft, seq.stepLabel)} splashProps={seq.splashProps}>
      <CareerPathCard
        heading={t('weekendLeague.gWhoseCareer')}
        items={item.clubs.map((club) => ({ imageSrc: `/clubs/${club}.webp` }))}
      />
      <AnswerOptionList
        columns
        options={item.options.map((opt, i) => ({
          key: String(i),
          label: opt,
          state: seq.stateFor(i, item.correctIndex),
        }))}
        disabled={seq.locked || !!readOnly}
        onPick={(_key, i) => seq.pick(i, item.correctIndex, i % 2 === 0 ? 'left' : 'right')}
      />
      <RunningTotal earned={seq.earned} />
    </RoundScreenShell>
  );
}

export function WhoAmIRound(props: RoundProps<WhoAmIQ>) {
  const { question, round, fastTimers, readOnly, onResolved } = props;
  const [guess, setGuess] = useState('');
  const [outcome, setOutcome] = useState<'correct' | 'wrong' | null>(null);
  const { locked, lock } = useAnswerLock(onResolved);
  const { splashProps, fire } = useResultSplash();
  const clock = useRoundClock(round.seconds, !!fastTimers, () => {
    // Timeout resolves as wrong so the verdict box (with the answer) shows
    // during the resolution beat, exactly as a wrong guess would.
    setOutcome('wrong');
    lock({ correct: false, points: 0, timeFrac: 0 });
  });

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
    <RoundScreenShell
      header={headerOf(props, clock.secondsLeft, `${cluesShown}/${clueCount}`)}
      splashProps={splashProps}
    >
      <WhoAmIBadges pointsNow={pointsNow} />
      <WhoAmIClueLadder
        clues={question.clues.map((clue, i) => ({
          text: clue,
          revealed: i < cluesShown,
          points: question.cluePoints[i],
        }))}
      />
      <TypedAnswerPanel
        locked={locked}
        outcome={outcome}
        answerText={answer}
        guess={guess}
        onGuessChange={setGuess}
        onSubmit={() => submit()}
        onGiveUp={() => submit(true)}
        readOnly={readOnly}
      />
    </RoundScreenShell>
  );
}

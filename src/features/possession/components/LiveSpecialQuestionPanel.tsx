'use client';

/**
 * LiveSpecialQuestionPanel — orchestrator shell.
 *
 * Routes the active special-question payload to one of three per-kind
 * sub-panels and renders the shared question header (QUESTION x/y +
 * timer pill) above it. The sub-panels live in `./live-special/` and
 * own all of their own state, socket emits, and result-card rendering;
 * this file only:
 *
 *   1. unpacks the wrapper props,
 *   2. computes the display question number + timer label,
 *   3. selects which sub-panel to render based on `question.kind`,
 *   4. wraps the lot in the splash-anchor container so points-flight
 *      animations have stable DOM anchors regardless of which sub-panel
 *      is active.
 *
 * Public API (component + props interface) is unchanged from before the
 * split — `import { LiveSpecialQuestionPanel } from
 * '@/features/possession/components/LiveSpecialQuestionPanel'` still
 * works, and the prop shape matches what callers passed pre-split.
 */
import type { ReactNode } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { LiveCluesPanel } from './live-special/LiveCluesPanel';
import { LiveCountdownPanel } from './live-special/LiveCountdownPanel';
import { LivePutInOrderPanel } from './live-special/LivePutInOrderPanel';
import {
  SpecialScoreFlightAnchors,
  type LiveSpecialQuestionPanelProps,
} from './live-special/shared';

export function LiveSpecialQuestionPanel(props: LiveSpecialQuestionPanelProps) {
  const { t } = useLocale();
  const {
    matchId,
    qIndex,
    totalQuestions,
    question,
    showOptions,
    timeRemaining,
    questionDurationSeconds,
    answerAck,
    roundResolved,
    roundResult,
    myRound,
    opponentRound,
    countdownGuessAck,
    cluesGuessAck,
  } = props;

  const displayQuestionNum = qIndex + 1;
  const displayTimer = Math.max(0, timeRemaining ?? 0);
  const timerLabel = displayTimer >= 10 ? `${displayTimer}` : `0${displayTimer}`;

  let content: ReactNode;

  if (question.kind === 'countdown') {
    content = (
      <LiveCountdownPanel
        matchId={matchId}
        qIndex={qIndex}
        question={question}
        showOptions={showOptions}
        roundResolved={roundResolved}
        answerAck={answerAck}
        countdownGuessAck={countdownGuessAck}
        roundResult={roundResult}
        myRound={myRound}
        opponentRound={opponentRound}
      />
    );
  } else if (question.kind === 'putInOrder') {
    content = (
      <LivePutInOrderPanel
        matchId={matchId}
        qIndex={qIndex}
        question={question}
        showOptions={showOptions}
        timeRemaining={timeRemaining}
        questionDurationSeconds={questionDurationSeconds}
        answerAck={answerAck}
        roundResolved={roundResolved}
        roundResult={roundResult}
        myRound={myRound}
        opponentRound={opponentRound}
      />
    );
  } else {
    content = (
      <LiveCluesPanel
        matchId={matchId}
        qIndex={qIndex}
        question={question}
        showOptions={showOptions}
        timeRemaining={timeRemaining}
        questionDurationSeconds={questionDurationSeconds}
        answerAck={answerAck}
        roundResolved={roundResolved}
        roundResult={roundResult}
        myRound={myRound}
        opponentRound={opponentRound}
        cluesGuessAck={cluesGuessAck}
      />
    );
  }

  return (
    <div className="relative px-4 sm:px-4 lg:px-0" data-special-question-panel="true">
      <SpecialScoreFlightAnchors />
      {/* QUESTION X/Y + timer header — exact same pill dimensions as
          PossessionQuestionPanel (MCQ) so the special panels feel like
          part of the same UI. Stays visible when the user scrolls down
          to type an answer on mobile. Hidden once the round resolves. */}
      {!roundResolved && (
        <div className="mt-1.5 mb-2 flex items-stretch gap-2.5">
          <div
            className="font-poppins flex flex-1 items-center justify-center rounded-[16px] bg-brand-blue px-5 text-white h-[40px] sm:h-[52px] md:h-[62px] lg:h-[72px]"
            style={{ fontWeight: 600, fontSize: 'clamp(14px, 2.2vw, 26px)' }}
          >
            {t('possession.questionCounter', { current: displayQuestionNum, total: totalQuestions })}
          </div>
          <div
            className="font-poppins flex w-[64px] items-center justify-center rounded-[16px] bg-brand-blue text-white h-[40px] sm:h-[52px] sm:w-[92px] md:h-[62px] md:w-[116px] lg:h-[72px] lg:w-[136px] tabular-nums"
            style={{ fontWeight: 600, fontSize: 'clamp(14px, 2.2vw, 26px)' }}
            aria-label={t('possession.timeRemaining')}
          >
            {timerLabel}
          </div>
        </div>
      )}
      {content}
    </div>
  );
}

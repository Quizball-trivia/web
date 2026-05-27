'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowUpDown, CheckCircle2, Send, XCircle } from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'motion/react';
import { Input } from '@/components/ui/input';
import { getSocket } from '@/lib/realtime/socket-client';
import type {
  MatchAnswerAckPayload,
  MatchCluesAnswerPayload,
  MatchCluesGuessAckPayload,
  MatchCountdownGuessAckPayload,
  MatchRoundResultPayload,
  MatchRoundResultPlayer,
  ResolvedCluesQuestion,
  ResolvedCountdownQuestion,
  ResolvedPutInOrderQuestion,
  ResolvedPutInOrderQuestionItem,
} from '@/lib/realtime/socket.types';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { calculateCluesDisplayPoints } from '@/utils/cluesScoring';
import { useLocale } from '@/contexts/LocaleContext';
import {
  QuestionKindBadge,
  SpecialResultSummary,
  SpecialScoreFlightAnchors,
  clampCount,
  putInOrderPointsFromCount,
  resolveI18nText,
  resolvePutInOrderPoints,
  type LiveSpecialQuestion,
  type LiveSpecialQuestionPanelProps,
  type SpecialSummarySide,
  type SpecialSummaryStatus,
  type SpecialSummaryTone,
} from './live-special/shared';
import { LiveCountdownPanel } from "./live-special/LiveCountdownPanel";

import { LivePutInOrderPanel } from "./live-special/LivePutInOrderPanel";

import { LiveCluesPanel } from "./live-special/LiveCluesPanel";

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
            QUESTION {displayQuestionNum}/{totalQuestions}
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

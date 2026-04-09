'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, CheckCircle2, Clock, GripVertical, Lightbulb, Send, Star, XCircle } from 'lucide-react';
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
  MatchCluesGuessAckPayload,
  MatchCountdownGuessAckPayload,
  MatchRoundResultPayload,
  ResolvedCluesQuestion,
  ResolvedCountdownQuestion,
  ResolvedPutInOrderQuestion,
  ResolvedPutInOrderQuestionItem,
} from '@/lib/realtime/socket.types';
import { getI18nText } from '@/lib/utils/i18n';

type LiveSpecialQuestion =
  | ResolvedCountdownQuestion
  | ResolvedPutInOrderQuestion
  | ResolvedCluesQuestion;

interface LiveSpecialQuestionPanelProps {
  matchId: string;
  qIndex: number;
  question: LiveSpecialQuestion;
  showOptions: boolean;
  timeRemaining: number;
  questionDurationSeconds: number;
  roundResolved: boolean;
  answerAck: MatchAnswerAckPayload | null;
  roundResult: MatchRoundResultPayload | null;
  countdownGuessAck: MatchCountdownGuessAckPayload | null;
  cluesGuessAck: MatchCluesGuessAckPayload | null;
}

function resolveI18nText(value: Record<string, string> | string, locale = 'en'): string {
  if (typeof value === 'string') return value;
  return getI18nText(value, locale);
}

function QuestionKindBadge({ kind }: { kind: LiveSpecialQuestion['kind'] }) {
  const config: Record<LiveSpecialQuestion['kind'], { label: string; color: string }> = {
    countdown: { label: 'Countdown', color: 'bg-[#FF9600]/15 text-[#FF9600]' },
    putInOrder: { label: 'Put In Order', color: 'bg-[#CE82FF]/15 text-[#CE82FF]' },
    clues: { label: 'Who Am I?', color: 'bg-[#58CC02]/15 text-[#58CC02]' },
  };
  const { label, color } = config[kind];
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${color}`}>
      {label}
    </span>
  );
}

function CountdownPanel({
  matchId,
  qIndex,
  question,
  roundResolved,
  countdownGuessAck,
  roundResult,
}: {
  matchId: string;
  qIndex: number;
  question: ResolvedCountdownQuestion;
  roundResolved: boolean;
  countdownGuessAck: MatchCountdownGuessAckPayload | null;
  roundResult: MatchRoundResultPayload | null;
}) {
  const [guess, setGuess] = useState('');
  const [foundAnswers, setFoundAnswers] = useState<string[]>([]);
  const resolvedLocale = question.resolvedLocale ?? 'en';

  useEffect(() => {
    setGuess('');
    setFoundAnswers([]);
  }, [qIndex]);

  useEffect(() => {
    if (!countdownGuessAck?.accepted || countdownGuessAck.qIndex !== qIndex || !countdownGuessAck.acceptedDisplay) return;
    const display = resolveI18nText(countdownGuessAck.acceptedDisplay, resolvedLocale);
    setFoundAnswers((current) => (current.includes(display) ? current : [...current, display]));
    setGuess('');
  }, [countdownGuessAck, qIndex, resolvedLocale]);

  const revealedAnswers = useMemo(() => {
    if (!roundResolved || !roundResult || roundResult.reveal.kind !== 'countdown') return [];
    return roundResult.reveal.answerGroups.map((group) => resolveI18nText(group.display, resolvedLocale));
  }, [resolvedLocale, roundResolved, roundResult]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <QuestionKindBadge kind="countdown" />
      </div>

      <div className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-5 py-4">
        {question.categoryName && (
          <span className="mb-2 inline-flex items-center rounded-lg bg-[#1CB0F6]/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#1CB0F6]">
            ⚽ {question.categoryName}
          </span>
        )}
        <p className="mt-2 text-lg font-black font-fun leading-snug text-white">{question.prompt}</p>
      </div>

      {!roundResolved && (
        <div className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-5 py-4">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#56707A]">
            Type your answer
          </label>
          <div className="flex gap-2">
            <Input
              value={guess}
              onChange={(event) => setGuess(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && guess.trim()) {
                  getSocket().emit('match:countdown_guess', { matchId, qIndex, guess: guess.trim() });
                }
              }}
              placeholder="Press Enter to submit..."
              className="h-12 rounded-xl border-2 border-[#243B44] bg-[#243B44] text-lg text-white placeholder:text-[#56707A] focus:border-[#1CB0F6]"
            />
            <button
              type="button"
              onClick={() => {
                if (!guess.trim()) return;
                getSocket().emit('match:countdown_guess', { matchId, qIndex, guess: guess.trim() });
              }}
              className="inline-flex items-center justify-center rounded-xl border-b-4 border-[#C47400] bg-[#FF9600] px-4 text-white transition-all active:translate-y-[2px] active:border-b-2"
            >
              <Send className="size-4" />
            </button>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-[#56707A]">
            <Lightbulb className="size-3.5 text-[#FF9600]" />
            Server checks each guess. Found answers lock in immediately.
          </p>
        </div>
      )}

      <div className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wide text-white">
            {roundResolved ? 'All Answers' : 'Answers Found'}
          </h3>
          <span className="rounded-lg bg-[#1CB0F6]/15 px-2.5 py-1 text-xs font-black text-[#1CB0F6]">
            {(roundResolved ? revealedAnswers.length : foundAnswers.length)} / {question.answerSlotCount}
          </span>
        </div>
        {(roundResolved ? revealedAnswers : foundAnswers).length === 0 ? (
          <p className="py-4 text-center text-sm text-[#56707A]">
            {roundResolved ? 'No answers found this round.' : 'Start typing to find answers!'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {(roundResolved ? revealedAnswers : foundAnswers).map((answer) => (
              <motion.div
                key={answer}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`rounded-xl border px-3 py-2 text-sm font-bold ${
                  foundAnswers.includes(answer)
                    ? 'border-[#58CC02]/30 bg-[#58CC02]/15 text-[#58CC02]'
                    : 'border-white/10 bg-white/5 text-white/70'
                }`}
              >
                {answer}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SortableItem({
  item,
  index,
  isRevealed,
  isCorrect,
  revealSortValue,
}: {
  item: ResolvedPutInOrderQuestionItem;
  index: number;
  isRevealed: boolean;
  isCorrect?: boolean;
  revealSortValue?: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={isDragging ? 'z-50' : 'z-0'}
    >
      <div
        className={`flex items-center gap-3 rounded-2xl border-b-4 p-3.5 transition-all ${
          !isRevealed
            ? 'cursor-grab border-[#0D1B21] bg-[#1B2F36] hover:bg-[#243B44] active:cursor-grabbing'
            : isCorrect
              ? 'border-[#46A302] bg-[#58CC02]/10'
              : 'border-[#CC3C3C] bg-[#FF4B4B]/10'
        } ${isDragging ? 'scale-105 shadow-xl' : ''}`}
      >
        {!isRevealed && (
          <div {...attributes} {...listeners} className="shrink-0 touch-none cursor-grab active:cursor-grabbing">
            <GripVertical className="size-5 text-[#56707A]" />
          </div>
        )}

        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-black ${
            isRevealed && isCorrect
              ? 'bg-[#58CC02]/20 text-[#58CC02]'
              : isRevealed
                ? 'bg-[#FF4B4B]/20 text-[#FF4B4B]'
                : 'bg-[#243B44] text-white'
          }`}
        >
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {item.emoji && <span className="text-xl">{item.emoji}</span>}
            <span className="truncate text-sm font-bold text-white">{item.label}</span>
          </div>
          {item.details && <p className="truncate text-xs text-[#56707A]">{item.details}</p>}
        </div>

        {isRevealed ? (
          <div className="flex shrink-0 items-center gap-2">
            {typeof revealSortValue === 'number' && (
              <span className="rounded-lg bg-[#243B44] px-2 py-0.5 text-xs font-bold text-white">
                {revealSortValue}
              </span>
            )}
            {isCorrect ? (
              <CheckCircle2 className="size-5 text-[#58CC02]" />
            ) : (
              <XCircle className="size-5 text-[#FF4B4B]" />
            )}
          </div>
        ) : (
          <ArrowUpDown className="size-4 shrink-0 text-[#56707A]" />
        )}
      </div>
    </div>
  );
}

function PutInOrderPanel({
  matchId,
  qIndex,
  question,
  timeRemaining,
  questionDurationSeconds,
  answerAck,
  roundResolved,
  roundResult,
}: {
  matchId: string;
  qIndex: number;
  question: ResolvedPutInOrderQuestion;
  timeRemaining: number;
  questionDurationSeconds: number;
  answerAck: MatchAnswerAckPayload | null;
  roundResolved: boolean;
  roundResult: MatchRoundResultPayload | null;
}) {
  const [userOrder, setUserOrder] = useState<ResolvedPutInOrderQuestionItem[]>(() => [...question.items]);
  const resolvedLocale = question.resolvedLocale ?? 'en';
  const submitted = Boolean(answerAck?.questionKind === 'putInOrder');

  useEffect(() => {
    setUserOrder([...question.items]);
  }, [question.items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const correctOrder = useMemo(() => {
    if (!roundResolved || !roundResult || roundResult.reveal.kind !== 'putInOrder') return [];
    return roundResult.reveal.correctOrder.map((item) => ({
      id: item.id,
      label: resolveI18nText(item.label, resolvedLocale),
      details: item.details ? resolveI18nText(item.details, resolvedLocale) : null,
      emoji: item.emoji ?? null,
      sortValue: item.sortValue,
    }));
  }, [resolvedLocale, roundResolved, roundResult]);

  const correctById = useMemo(
    () => new Map(correctOrder.map((item, index) => [item.id, { sortValue: item.sortValue, index }])),
    [correctOrder]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || submitted || roundResolved) return;
    setUserOrder((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleSubmit = useCallback(() => {
    getSocket().emit('match:put_in_order_answer', {
      matchId,
      qIndex,
      orderedItemIds: userOrder.map((item) => item.id),
      timeMs: Math.max(0, Math.round((questionDurationSeconds - timeRemaining) * 1000)),
    });
  }, [matchId, qIndex, questionDurationSeconds, timeRemaining, userOrder]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <QuestionKindBadge kind="putInOrder" />
      </div>

      <div className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-5 py-4">
        {question.categoryName && (
          <span className="mb-2 inline-flex items-center rounded-lg bg-[#1CB0F6]/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#1CB0F6]">
            ⚽ {question.categoryName}
          </span>
        )}
        <p className="mt-2 text-base font-black font-fun leading-snug text-white">{question.prompt}</p>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-5 py-3">
        <div className="mt-0.5 shrink-0 rounded-lg bg-[#1CB0F6]/15 p-1.5">
          <ArrowUpDown className="size-4 text-[#1CB0F6]" />
        </div>
        <p className="text-sm text-white">
          <span className="font-bold">Drag to arrange</span> from{' '}
          <span className="font-bold text-[#1CB0F6]">{question.instruction}</span>.
        </p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={userOrder.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {userOrder.map((item, index) => {
              const correctInfo = correctById.get(item.id);
              return (
                <SortableItem
                  key={item.id}
                  item={item}
                  index={index}
                  isRevealed={roundResolved}
                  isCorrect={roundResolved ? correctInfo?.index === index : undefined}
                  revealSortValue={roundResolved ? correctInfo?.sortValue : undefined}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {roundResolved ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border-b-4 p-4 text-center ${
            answerAck?.isCorrect ? 'border-[#46A302] bg-[#58CC02]/10' : 'border-[#CC3C3C] bg-[#FF4B4B]/10'
          }`}
        >
          {answerAck?.isCorrect ? (
            <>
              <CheckCircle2 className="mx-auto mb-1.5 size-8 text-[#58CC02]" />
              <p className="font-black text-[#58CC02]">Perfect order!</p>
            </>
          ) : (
            <>
              <XCircle className="mx-auto mb-1.5 size-8 text-[#FF4B4B]" />
              <p className="font-black text-[#FF4B4B]">Not quite — correct order revealed above</p>
            </>
          )}
        </motion.div>
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitted}
          className="w-full rounded-2xl border-b-4 border-[#46A302] bg-[#58CC02] py-3.5 font-black uppercase tracking-wide text-white transition-all active:translate-y-[2px] active:border-b-2 hover:bg-[#4DB800] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitted ? 'Submitted' : 'Submit Order'}
        </button>
      )}
    </div>
  );
}

function CluesPanel({
  matchId,
  qIndex,
  question,
  timeRemaining,
  questionDurationSeconds,
  answerAck,
  roundResolved,
  roundResult,
  cluesGuessAck,
}: {
  matchId: string;
  qIndex: number;
  question: ResolvedCluesQuestion;
  timeRemaining: number;
  questionDurationSeconds: number;
  answerAck: MatchAnswerAckPayload | null;
  roundResolved: boolean;
  roundResult: MatchRoundResultPayload | null;
  cluesGuessAck: MatchCluesGuessAckPayload | null;
}) {
  const [guess, setGuess] = useState('');
  const [pendingGuess, setPendingGuess] = useState(false);
  const [manualRevealCount, setManualRevealCount] = useState(1);
  const resolvedLocale = question.resolvedLocale ?? 'en';
  const submitted = Boolean(answerAck?.questionKind === 'clues');
  const clueCount = question.clues.length;
  const secondsPerClue = clueCount > 0 ? Math.max(1, Math.floor(questionDurationSeconds / clueCount)) : questionDurationSeconds;
  const timedRevealCount = roundResolved
    ? clueCount
    : Math.min(clueCount, Math.max(1, Math.floor((questionDurationSeconds - timeRemaining) / secondsPerClue) + 1));
  const revealedClues = roundResolved ? clueCount : Math.max(manualRevealCount, timedRevealCount);
  const displayAnswer = roundResult?.reveal.kind === 'clues'
    ? resolveI18nText(roundResult.reveal.displayAnswer, resolvedLocale)
    : null;
  const currentPoints = [200, 150, 100, 50, 25][Math.max(0, revealedClues - 1)] ?? 25;

  useEffect(() => {
    setGuess('');
    setPendingGuess(false);
    setManualRevealCount(1);
  }, [qIndex]);

  useEffect(() => {
    if (!cluesGuessAck || cluesGuessAck.qIndex !== qIndex) return;
    setManualRevealCount((current) => Math.max(current, cluesGuessAck.revealCount));
    setPendingGuess(false);
    setGuess('');
  }, [cluesGuessAck, qIndex]);

  useEffect(() => {
    if (submitted || roundResolved) {
      setPendingGuess(false);
    }
  }, [roundResolved, submitted]);

  const emitGuess = useCallback((options?: { giveUp?: boolean }) => {
    if (pendingGuess || submitted) return;
    if (!options?.giveUp && !guess.trim()) return;
    setPendingGuess(true);
    getSocket().emit('match:clues_answer', {
      matchId,
      qIndex,
      ...(options?.giveUp ? { giveUp: true } : { guess: guess.trim() }),
      timeMs: Math.max(0, Math.round((questionDurationSeconds - timeRemaining) * 1000)),
    });
  }, [guess, matchId, pendingGuess, qIndex, questionDurationSeconds, submitted, timeRemaining]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <QuestionKindBadge kind="clues" />
      </div>

      <div className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-5 py-4">
        {question.categoryName && (
          <span className="mb-2 inline-flex items-center rounded-lg bg-[#FF9600]/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#FF9600]">
            <Lightbulb className="mr-1 size-3" />
            {question.categoryName}
          </span>
        )}
        <div className="mt-2 flex items-center justify-between">
          <p className="text-base font-black font-fun text-white">Who Am I?</p>
        </div>
      </div>

      {!roundResolved && (
        <div className="flex items-center justify-center gap-1.5 text-sm text-[#56707A]">
          <Star className="size-4 text-[#FFD700]" />
          <span className="font-bold">Answer now: <span className="text-white">{currentPoints} pts</span></span>
        </div>
      )}

      <AnimatePresence>
        <div className="space-y-2">
          {question.clues.slice(0, revealedClues).map((clue, index) => (
            <motion.div
              key={`${index}-${clue.content}`}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#243B44] px-5 py-4 text-center"
            >
              {clue.type === 'emoji' ? (
                <span className="text-4xl">{clue.content}</span>
              ) : (
                <p className="text-base font-bold text-white">{clue.content}</p>
              )}
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {!roundResolved && (
        <div className="flex items-center justify-center gap-2">
          {question.clues.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-10 rounded-full transition-colors duration-300 ${
                index < revealedClues ? 'bg-[#FF9600]' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      )}

      {!roundResolved ? (
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="Type your answer..."
            value={guess}
            onChange={(event) => setGuess(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                emitGuess();
              }
            }}
            disabled={submitted || pendingGuess}
            autoFocus
            className="h-12 rounded-xl border-2 border-[#243B44] bg-[#243B44] text-center text-lg text-white placeholder:text-[#56707A] focus:border-[#FF9600]"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => emitGuess()}
              disabled={!guess.trim() || submitted || pendingGuess}
              className="rounded-xl border-b-4 border-[#46A302] bg-[#58CC02] py-3 font-black text-white transition-all active:translate-y-[2px] active:border-b-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={() => emitGuess({ giveUp: true })}
              disabled={submitted || pendingGuess}
              className="rounded-xl border-b-4 border-[#0D1B21] bg-[#1B2F36] py-3 font-black text-white transition-all active:translate-y-[2px] active:border-b-2 disabled:opacity-50 hover:bg-[#243B44]"
            >
              Give Up
            </button>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border-b-4 p-4 text-center ${
            answerAck?.isCorrect ? 'border-[#46A302] bg-[#58CC02]/10' : 'border-[#CC3C3C] bg-[#FF4B4B]/10'
          }`}
        >
          {answerAck?.isCorrect ? (
            <>
              <CheckCircle2 className="mx-auto mb-2 size-8 text-[#58CC02]" />
              <p className="font-black text-[#58CC02]">Correct! +{answerAck.pointsEarned} pts</p>
            </>
          ) : (
            <>
              <XCircle className="mx-auto mb-2 size-8 text-[#FF4B4B]" />
              <p className="mb-1 font-black text-[#FF4B4B]">The answer was:</p>
              <p className="text-xl font-black text-white">{displayAnswer}</p>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}

export function LiveSpecialQuestionPanel(props: LiveSpecialQuestionPanelProps) {
  const {
    matchId,
    qIndex,
    question,
    showOptions: _showOptions,
    timeRemaining,
    questionDurationSeconds,
    answerAck,
    roundResolved,
    roundResult,
    countdownGuessAck,
    cluesGuessAck,
  } = props;

  if (question.kind === 'countdown') {
    return (
      <CountdownPanel
        matchId={matchId}
        qIndex={qIndex}
        question={question}
        roundResolved={roundResolved}
        countdownGuessAck={countdownGuessAck}
        roundResult={roundResult}
      />
    );
  }

  if (question.kind === 'putInOrder') {
    return (
      <PutInOrderPanel
        matchId={matchId}
        qIndex={qIndex}
        question={question}
        timeRemaining={timeRemaining}
        questionDurationSeconds={questionDurationSeconds}
        answerAck={answerAck}
        roundResolved={roundResolved}
        roundResult={roundResult}
      />
    );
  }

  return (
    <CluesPanel
      matchId={matchId}
      qIndex={qIndex}
      question={question}
      timeRemaining={timeRemaining}
      questionDurationSeconds={questionDurationSeconds}
      answerAck={answerAck}
      roundResolved={roundResolved}
      roundResult={roundResult}
      cluesGuessAck={cluesGuessAck}
    />
  );
}

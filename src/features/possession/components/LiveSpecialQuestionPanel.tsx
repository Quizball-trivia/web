'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, CheckCircle2, GripVertical, Lightbulb, Send, Star, XCircle } from 'lucide-react';
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
  opponentRound: MatchRoundResultPlayer | null;
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
  showOptions,
  roundResolved,
  countdownGuessAck,
  roundResult,
  opponentRound,
}: {
  matchId: string;
  qIndex: number;
  question: ResolvedCountdownQuestion;
  showOptions: boolean;
  roundResolved: boolean;
  countdownGuessAck: MatchCountdownGuessAckPayload | null;
  roundResult: MatchRoundResultPayload | null;
  opponentRound: MatchRoundResultPlayer | null;
}) {
  const [guess, setGuess] = useState('');
  const [foundAnswers, setFoundAnswers] = useState<string[]>([]);
  const resolvedLocale = question.resolvedLocale ?? 'en';
  const lastSubmittedRef = useRef('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setGuess('');
      setFoundAnswers([]);
    });
    lastSubmittedRef.current = '';
  }, [qIndex]);

  useEffect(() => {
    if (!countdownGuessAck?.accepted || countdownGuessAck.qIndex !== qIndex || !countdownGuessAck.acceptedDisplay) return;
    const display = resolveI18nText(countdownGuessAck.acceptedDisplay, resolvedLocale);
    queueMicrotask(() => {
      setFoundAnswers((current) => (current.includes(display) ? current : [...current, display]));
      setGuess('');
    });
    lastSubmittedRef.current = '';
  }, [countdownGuessAck, qIndex, resolvedLocale]);

  const revealedAnswers = useMemo(() => {
    if (!roundResolved || !roundResult || roundResult.reveal.kind !== 'countdown') return [];
    return roundResult.reveal.answerGroups.map((group) => resolveI18nText(group.display, resolvedLocale));
  }, [resolvedLocale, roundResolved, roundResult]);

  const inputLocked = !showOptions || roundResolved;

  const submitGuess = useCallback(() => {
    if (inputLocked || !guess.trim()) return;
    getSocket().emit('match:countdown_guess', { matchId, qIndex, guess: guess.trim() });
    lastSubmittedRef.current = guess.trim().toLowerCase();
  }, [guess, inputLocked, matchId, qIndex]);

  // Auto-submit on keystroke with 200ms debounce (3+ characters).
  // The server handles matching (prefix, fuzzy, exact) — if accepted, the ACK clears the input.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = guess.trim();
    if (inputLocked || trimmed.length < 3 || trimmed.toLowerCase() === lastSubmittedRef.current) return;

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const normalized = trimmed.toLowerCase();
      if (normalized === lastSubmittedRef.current) return;
      getSocket().emit('match:countdown_guess', { matchId, qIndex, guess: trimmed });
      lastSubmittedRef.current = normalized;
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [guess, inputLocked, matchId, qIndex]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <QuestionKindBadge kind="countdown" />
      </div>

      {/* Prompt — plain text, no card chrome */}
      <div className="px-1">
        {question.categoryName && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#1CB0F6]">
            ⚽ {question.categoryName}
          </span>
        )}
        <p className="mt-2 text-lg font-black font-fun leading-snug text-white">{question.prompt}</p>
      </div>

      {/* Input row — flat */}
      {!roundResolved && (
        <div>
          <label className="mb-1.5 block text-[10px] font-fun font-black uppercase tracking-[0.22em] text-white/45">
            Type your answer
          </label>
          <div className="flex gap-2">
            <Input
              value={guess}
              onChange={(event) => setGuess(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  submitGuess();
                }
              }}
              placeholder="Start typing to find answers..."
              disabled={inputLocked}
              className="h-11 rounded-[8px] border border-white/10 bg-white/[0.04] text-base text-white placeholder:text-white/30 focus:border-[#1CB0F6] focus:bg-white/[0.06]"
            />
            <button
              type="button"
              onClick={submitGuess}
              disabled={inputLocked || !guess.trim()}
              className="inline-flex items-center justify-center rounded-[8px] bg-[#FF9600] px-4 text-white transition-transform active:translate-y-[2px] disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white/40">
            <Lightbulb className="size-3 text-[#FF9600]" />
            Auto-matches as you type · Enter for short answers
          </p>
        </div>
      )}

      {/* Answers found list — single soft container */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <h3 className="text-[11px] font-fun font-black uppercase tracking-[0.22em] text-white/55">
            {roundResolved ? 'All Answers' : 'Answers Found'}
          </h3>
          <div className="flex items-center gap-2 text-[10px] font-fun font-black uppercase tracking-[0.18em]">
            {roundResolved && opponentRound && typeof opponentRound.foundCount === 'number' && (
              <span className="text-[#FF4B4B]">
                Opp {opponentRound.foundCount}/{question.answerSlotCount}
              </span>
            )}
            <span className="text-[#1CB0F6]">
              {roundResolved ? 'You ' : ''}{foundAnswers.length}/{question.answerSlotCount}
            </span>
          </div>
        </div>
        {(roundResolved ? revealedAnswers : foundAnswers).length === 0 ? (
          <p className="py-6 text-center text-xs font-fun font-black uppercase tracking-[0.18em] text-white/30">
            {roundResolved ? 'No answers found this round.' : 'Start typing to find answers!'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {(roundResolved ? revealedAnswers : foundAnswers).map((answer) => (
              <motion.div
                key={answer}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`rounded-[8px] px-3 py-2 text-sm font-fun font-black ${
                  foundAnswers.includes(answer)
                    ? 'bg-[#38B60E]/15 text-[#7BDA1A]'
                    : 'bg-white/[0.04] text-white/65'
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
        className={`flex items-center gap-3 rounded-[10px] p-3 transition-all ${
          !isRevealed
            ? 'cursor-grab bg-white/[0.04] hover:bg-white/[0.07] active:cursor-grabbing'
            : isCorrect
              ? 'bg-[#38B60E]/12'
              : 'bg-[#FF4B4B]/12'
        } ${isDragging ? 'scale-[1.02] shadow-xl' : ''}`}
      >
        {!isRevealed && (
          <div {...attributes} {...listeners} className="shrink-0 touch-none cursor-grab active:cursor-grabbing">
            <GripVertical className="size-5 text-white/35" />
          </div>
        )}

        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-[6px] text-sm font-black ${
            isRevealed && isCorrect
              ? 'bg-[#38B60E] text-white'
              : isRevealed
                ? 'bg-[#FF4B4B] text-white'
                : 'bg-white/10 text-white'
          }`}
        >
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {item.emoji && <span className="text-xl">{item.emoji}</span>}
            <span className="truncate text-sm font-fun font-black uppercase tracking-wide text-white">
              {item.label}
            </span>
          </div>
          {item.details && (
            <p className="truncate text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white/40">
              {item.details}
            </p>
          )}
        </div>

        {isRevealed ? (
          <div className="flex shrink-0 items-center gap-2">
            {typeof revealSortValue === 'number' && (
              <span className="rounded-[6px] bg-white/10 px-2 py-0.5 text-[10px] font-fun font-black tabular-nums text-white">
                {revealSortValue}
              </span>
            )}
            {isCorrect ? (
              <CheckCircle2 className="size-5 text-[#38B60E]" />
            ) : (
              <XCircle className="size-5 text-[#FF4B4B]" />
            )}
          </div>
        ) : (
          <ArrowUpDown className="size-4 shrink-0 text-white/35" />
        )}
      </div>
    </div>
  );
}

function PutInOrderPanel({
  matchId,
  qIndex,
  question,
  showOptions,
  timeRemaining,
  questionDurationSeconds,
  answerAck,
  roundResolved,
  roundResult,
  opponentRound,
}: {
  matchId: string;
  qIndex: number;
  question: ResolvedPutInOrderQuestion;
  showOptions: boolean;
  timeRemaining: number;
  questionDurationSeconds: number;
  answerAck: MatchAnswerAckPayload | null;
  roundResolved: boolean;
  roundResult: MatchRoundResultPayload | null;
  opponentRound: MatchRoundResultPlayer | null;
}) {
  const [userOrder, setUserOrder] = useState<ResolvedPutInOrderQuestionItem[]>(() => [...question.items]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resolvedLocale = question.resolvedLocale ?? 'en';
  const submitted = isSubmitting || Boolean(answerAck?.questionKind === 'putInOrder' && answerAck?.qIndex === qIndex);
  const inputLocked = !showOptions || roundResolved || submitted;

  useEffect(() => {
    queueMicrotask(() => {
      setUserOrder([...question.items]);
      setIsSubmitting(false);
    });
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
    if (!over || active.id === over.id || inputLocked) return;
    setUserOrder((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleSubmit = useCallback(() => {
    if (inputLocked) return;
    setIsSubmitting(true);
    getSocket().emit('match:put_in_order_answer', {
      matchId,
      qIndex,
      orderedItemIds: userOrder.map((item) => item.id),
      timeMs: Math.max(0, Math.round((questionDurationSeconds - timeRemaining) * 1000)),
    });
  }, [inputLocked, matchId, qIndex, questionDurationSeconds, timeRemaining, userOrder]);

  // Auto-submit when timer expires so a no-click run still sends the player's current order to the server.
  useEffect(() => {
    if (inputLocked) return;
    if (timeRemaining > 0) return;
    queueMicrotask(handleSubmit);
  }, [timeRemaining, inputLocked, handleSubmit]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <QuestionKindBadge kind="putInOrder" />
      </div>

      {/* Prompt — plain text */}
      <div className="px-1">
        {question.categoryName && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#1CB0F6]">
            ⚽ {question.categoryName}
          </span>
        )}
        <p className="mt-2 text-base font-black font-fun leading-snug text-white">{question.prompt}</p>
      </div>

      {/* Instruction — single inline line, no card */}
      <div className="flex items-center gap-2 px-1 text-[11px] font-fun font-black uppercase tracking-[0.18em] text-white/55">
        <ArrowUpDown className="size-3.5 text-[#1CB0F6]" />
        <span>
          Drag to arrange from <span className="text-[#1CB0F6]">{question.instruction}</span>
        </span>
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
          className={`rounded-[10px] p-4 text-center ${
            answerAck?.isCorrect ? 'bg-[#38B60E]/15' : 'bg-[#FF4B4B]/15'
          }`}
        >
          {answerAck?.isCorrect ? (
            <>
              <CheckCircle2 className="mx-auto mb-1.5 size-7 text-[#38B60E]" />
              <p className="text-sm font-fun font-black uppercase tracking-wide text-[#38B60E]">Perfect order!</p>
            </>
          ) : (
            <>
              <XCircle className="mx-auto mb-1.5 size-7 text-[#FF4B4B]" />
              <p className="text-sm font-fun font-black uppercase tracking-wide text-[#FF4B4B]">Not quite — correct order revealed above</p>
            </>
          )}
          {opponentRound && (
            <p className="mt-2 text-[10px] font-fun font-black uppercase tracking-[0.22em] text-white/55">
              {opponentRound.isCorrect
                ? <>Opponent: <span className="text-[#38B60E]">Correct</span></>
                : <>Opponent: <span className="text-[#FF4B4B]">Wrong</span></>}
            </p>
          )}
        </motion.div>
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={inputLocked}
          className="w-full rounded-[10px] bg-[#38B60E] py-3 text-sm font-fun font-black uppercase tracking-wide text-white transition-transform hover:bg-[#2D950B] active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-50"
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
  showOptions,
  timeRemaining,
  questionDurationSeconds,
  answerAck,
  roundResolved,
  roundResult,
  opponentRound,
  cluesGuessAck,
}: {
  matchId: string;
  qIndex: number;
  question: ResolvedCluesQuestion;
  showOptions: boolean;
  timeRemaining: number;
  questionDurationSeconds: number;
  answerAck: MatchAnswerAckPayload | null;
  roundResolved: boolean;
  roundResult: MatchRoundResultPayload | null;
  opponentRound: MatchRoundResultPlayer | null;
  cluesGuessAck: MatchCluesGuessAckPayload | null;
}) {
  const [guess, setGuess] = useState('');
  const [pendingGuess, setPendingGuess] = useState(false);
  const [manualRevealCount, setManualRevealCount] = useState(1);
  const resolvedLocale = question.resolvedLocale ?? 'en';
  const submitted = Boolean(answerAck?.questionKind === 'clues' && answerAck?.qIndex === qIndex);
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
  const inputLocked = !showOptions || submitted || pendingGuess || roundResolved;

  useEffect(() => {
    queueMicrotask(() => {
      setGuess('');
      setPendingGuess(false);
      setManualRevealCount(1);
    });
  }, [qIndex]);

  useEffect(() => {
    if (!cluesGuessAck || cluesGuessAck.qIndex !== qIndex) return;
    queueMicrotask(() => {
      setManualRevealCount((current) => Math.max(current, cluesGuessAck.revealCount));
      setPendingGuess(false);
      setGuess('');
    });
  }, [cluesGuessAck, qIndex]);

  useEffect(() => {
    if (submitted || roundResolved) {
      queueMicrotask(() => {
        setPendingGuess(false);
      });
    }
  }, [roundResolved, submitted]);

  const emitGuess = useCallback((options?: { giveUp?: boolean }) => {
    if (inputLocked) return;
    if (!options?.giveUp && !guess.trim()) return;
    setPendingGuess(true);
    const payload: MatchCluesAnswerPayload = options?.giveUp
      ? {
          kind: 'giveUp',
          matchId,
          qIndex,
          giveUp: true,
          timeMs: Math.max(0, Math.round((questionDurationSeconds - timeRemaining) * 1000)),
        }
      : {
          kind: 'guess',
          matchId,
          qIndex,
          guess: guess.trim(),
          timeMs: Math.max(0, Math.round((questionDurationSeconds - timeRemaining) * 1000)),
        };
    getSocket().emit('match:clues_answer', payload);
  }, [guess, inputLocked, matchId, qIndex, questionDurationSeconds, timeRemaining]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <QuestionKindBadge kind="clues" />
      </div>

      {/* Prompt — plain text */}
      <div className="px-1">
        {question.categoryName && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#FF9600]">
            <Lightbulb className="size-3" />
            {question.categoryName}
          </span>
        )}
        <p className="mt-2 text-base font-black font-fun text-white">Who Am I?</p>
      </div>

      {!roundResolved && (
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-fun font-black uppercase tracking-[0.18em] text-white/55">
          <Star className="size-3.5 text-[#FFD700]" />
          <span>
            Answer now <span className="text-white">{currentPoints} pts</span>
          </span>
        </div>
      )}

      {/* Clue rows — flat */}
      <AnimatePresence>
        <div className="space-y-1.5">
          {question.clues.slice(0, revealedClues).map((clue, index) => (
            <motion.div
              key={`${index}-${clue.content}`}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="rounded-[10px] bg-white/[0.04] px-5 py-4 text-center"
            >
              {clue.type === 'emoji' ? (
                <span className="text-4xl">{clue.content}</span>
              ) : (
                <p className="text-base font-fun font-black uppercase tracking-wide text-white">{clue.content}</p>
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
            disabled={inputLocked}
            autoFocus
            className="h-11 rounded-[8px] border border-white/10 bg-white/[0.04] text-center text-base text-white placeholder:text-white/30 focus:border-[#FF9600] focus:bg-white/[0.06]"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => emitGuess()}
              disabled={!guess.trim() || inputLocked}
              className="rounded-[8px] bg-[#38B60E] py-3 text-sm font-fun font-black uppercase tracking-wide text-white transition-transform hover:bg-[#2D950B] active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={() => emitGuess({ giveUp: true })}
              disabled={inputLocked}
              className="rounded-[8px] bg-white/[0.06] py-3 text-sm font-fun font-black uppercase tracking-wide text-white/70 transition-colors hover:bg-white/[0.10] hover:text-white active:translate-y-[2px] disabled:opacity-40"
            >
              Give Up
            </button>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-[10px] p-4 text-center ${
            answerAck?.isCorrect ? 'bg-[#38B60E]/15' : 'bg-[#FF4B4B]/15'
          }`}
        >
          {answerAck?.isCorrect ? (
            <>
              <CheckCircle2 className="mx-auto mb-2 size-7 text-[#38B60E]" />
              <p className="text-sm font-fun font-black uppercase tracking-wide text-[#38B60E]">
                Correct! +{answerAck.pointsEarned} pts
              </p>
            </>
          ) : (
            <>
              <XCircle className="mx-auto mb-2 size-7 text-[#FF4B4B]" />
              <p className="mb-1 text-xs font-fun font-black uppercase tracking-[0.18em] text-[#FF4B4B]">
                The answer was
              </p>
              <p className="text-xl font-fun font-black uppercase tracking-wide text-white">{displayAnswer}</p>
            </>
          )}
          {opponentRound && (
            <p className="mt-2 text-[10px] font-fun font-black uppercase tracking-[0.22em] text-white/55">
              {opponentRound.isCorrect && typeof opponentRound.clueIndex === 'number'
                ? <>Opponent: <span className="text-[#38B60E]">Got it on clue {opponentRound.clueIndex + 1}</span></>
                : <>Opponent: <span className="text-[#FF4B4B]">Didn&apos;t get it</span></>}
            </p>
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
    showOptions,
    timeRemaining,
    questionDurationSeconds,
    answerAck,
    roundResolved,
    roundResult,
    opponentRound,
    countdownGuessAck,
    cluesGuessAck,
  } = props;

  if (question.kind === 'countdown') {
    return (
      <CountdownPanel
        matchId={matchId}
        qIndex={qIndex}
        question={question}
        showOptions={showOptions}
        roundResolved={roundResolved}
        countdownGuessAck={countdownGuessAck}
        roundResult={roundResult}
        opponentRound={opponentRound}
      />
    );
  }

  if (question.kind === 'putInOrder') {
    return (
      <PutInOrderPanel
        matchId={matchId}
        qIndex={qIndex}
        question={question}
        showOptions={showOptions}
        timeRemaining={timeRemaining}
        questionDurationSeconds={questionDurationSeconds}
        answerAck={answerAck}
        roundResolved={roundResolved}
        roundResult={roundResult}
        opponentRound={opponentRound}
      />
    );
  }

  return (
    <CluesPanel
      matchId={matchId}
      qIndex={qIndex}
      question={question}
      showOptions={showOptions}
      timeRemaining={timeRemaining}
      questionDurationSeconds={questionDurationSeconds}
      answerAck={answerAck}
      roundResolved={roundResolved}
      roundResult={roundResult}
      opponentRound={opponentRound}
      cluesGuessAck={cluesGuessAck}
    />
  );
}

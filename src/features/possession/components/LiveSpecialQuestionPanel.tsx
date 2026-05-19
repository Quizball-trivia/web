'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { calculateCluesDisplayPoints } from '@/utils/cluesScoring';

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
  myRound: MatchRoundResultPlayer | null;
  opponentRound: MatchRoundResultPlayer | null;
  countdownGuessAck: MatchCountdownGuessAckPayload | null;
  cluesGuessAck: MatchCluesGuessAckPayload | null;
}

function resolveI18nText(value: Record<string, string> | string, locale = 'en'): string {
  if (typeof value === 'string') return value;
  return getI18nText(value, locale);
}

function SpecialScoreFlightAnchors() {
  return (
    <>
      <div
        aria-hidden="true"
        data-splash-anchor="player"
        className="pointer-events-none absolute left-[-12px] top-28 z-10 size-px"
      />
      <div
        aria-hidden="true"
        data-splash-anchor="opponent"
        className="pointer-events-none absolute right-[-12px] top-28 z-10 size-px"
      />
    </>
  );
}

function QuestionKindBadge({ kind }: { kind: LiveSpecialQuestion['kind'] }) {
  const labels: Record<LiveSpecialQuestion['kind'], string> = {
    countdown: 'Countdown',
    putInOrder: 'Put In Order',
    clues: 'Who Am I?',
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
        className="text-surface-page uppercase whitespace-nowrap"
        style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 14 }}
      >
        {labels[kind]}
      </span>
    </motion.div>
  );
}

function clampCount(value: number, total: number): number {
  return Math.max(0, Math.min(total, value));
}

function seededUnit(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

function getSimulatedOpponentCountdownTarget(matchId: string, qIndex: number, total: number): number {
  if (total <= 0) return 0;
  const roll = seededUnit(`${matchId}:${qIndex}:countdown-opponent-target`);
  const ratio = 0.2 + roll * 0.55;
  return clampCount(Math.round(total * ratio), total);
}

type SpecialSummaryTone = 'cyan' | 'orange' | 'green';
type SpecialSummaryStatus = 'positive' | 'negative' | 'pending' | 'neutral';

function putInOrderPointsFromCount(count: number | null | undefined): number {
  return Math.max(0, Math.min(count ?? 0, 5)) * 20;
}

function resolvePutInOrderPoints(
  pointsEarned: number | null | undefined,
  matchedCount: number | null | undefined
): number {
  if (typeof pointsEarned === 'number' && pointsEarned > 0) return pointsEarned;
  return putInOrderPointsFromCount(matchedCount);
}

interface SpecialSummarySide {
  label: 'You' | 'Opp';
  count: number | null;
  total: number;
  points: number | null;
  badge: string;
  status: SpecialSummaryStatus;
  detail: string;
}

function SpecialResultSummary({
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
  if (!visible) return null;

  const toneClass = tone === 'orange'
    ? 'border-brand-orange/55 shadow-[0_0_24px_rgba(255,150,0,0.14)]'
    : tone === 'green'
      ? 'border-brand-green/55 shadow-[0_0_24px_rgba(88,204,2,0.14)]'
      : 'border-brand-green/55 shadow-[0_0_24px_rgba(88,204,2,0.14)]';
  const sides = [player, opponent];

  const statusClasses: Record<SpecialSummaryStatus, string> = {
    positive: 'bg-brand-green/15 text-brand-green',
    negative: 'bg-brand-red-soft/15 text-brand-red-soft',
    pending: 'bg-white/[0.06] text-white/55',
    neutral: 'bg-brand-green/15 text-brand-green',
  };

  return (
    <motion.div
      aria-live="polite"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={`grid grid-cols-2 gap-2 rounded-[8px] border bg-transparent p-2 ${toneClass}`}
    >
      {sides.map((side) => {
        const safeTotal = Math.max(1, side.total);
        const safeCount = side.count == null ? null : clampCount(side.count, safeTotal);
        const pointsText = side.points == null ? null : `${side.points > 0 ? '+' : ''}${side.points} pts`;
        return (
          <div key={side.label} className="min-w-0 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-fun font-black uppercase text-white/45">{side.label}</span>
              <span className={`rounded-[7px] px-2 py-0.5 text-[9px] font-fun font-black uppercase ${statusClasses[side.status]}`}>
                {side.badge}
              </span>
            </div>
            <div className="mt-1 flex items-end gap-1 font-fun font-black text-white">
              <span className="text-3xl leading-none">{safeCount == null ? '-' : safeCount}</span>
              <span className="pb-0.5 text-sm text-white/45">/{safeTotal}</span>
            </div>
            <div className="mt-1 flex min-h-4 items-center justify-between gap-2">
              <p className="truncate text-[10px] font-fun font-black uppercase text-white/50">{side.detail}</p>
              {pointsText && (
                <span className="shrink-0 text-[10px] font-fun font-black uppercase text-white/70">
                  {pointsText}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

const COUNTDOWN_AUTO_SUBMIT_DEBOUNCE_MS = 100;

function CountdownAnswerChip({ answer, tone }: { answer: string; tone: 'green' | 'red' | 'both' }) {
  const toneClass = tone === 'red'
    ? 'border-brand-red-soft/30 bg-brand-red-soft/10 text-brand-red-soft'
    : tone === 'both'
      ? 'border-brand-green/35 bg-brand-green/15 text-white'
      : 'border-brand-green/30 bg-brand-green/10 text-brand-green';
  return (
    <span className={`inline-flex min-w-0 max-w-full items-center rounded-[7px] border px-2 py-1 text-[11px] font-fun font-black ${toneClass}`}>
      <span className="truncate">{answer}</span>
    </span>
  );
}

function CountdownAnswerGroup({
  label,
  answers,
  tone,
}: {
  label: string;
  answers: string[];
  tone: 'green' | 'red' | 'both';
}) {
  if (answers.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-fun font-black uppercase tracking-[0.2em] text-white/45">
        {label} <span className="text-white/30">({answers.length})</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {answers.map((answer) => (
          <CountdownAnswerChip key={answer} answer={answer} tone={tone} />
        ))}
      </div>
    </div>
  );
}

function CountdownPanel({
  matchId,
  qIndex,
  question,
  showOptions,
  roundResolved,
  answerAck,
  countdownGuessAck,
  roundResult,
  myRound,
  opponentRound,
}: {
  matchId: string;
  qIndex: number;
  question: ResolvedCountdownQuestion;
  showOptions: boolean;
  roundResolved: boolean;
  answerAck: MatchAnswerAckPayload | null;
  countdownGuessAck: MatchCountdownGuessAckPayload | null;
  roundResult: MatchRoundResultPayload | null;
  myRound: MatchRoundResultPlayer | null;
  opponentRound: MatchRoundResultPlayer | null;
}) {
  const [guess, setGuess] = useState('');
  const [foundAnswers, setFoundAnswers] = useState<string[]>([]);
  const [opponentLiveFoundCount, setOpponentLiveFoundCount] = useState(0);
  const [showAllCorrectAnswers, setShowAllCorrectAnswers] = useState(false);
  const resolvedLocale = question.resolvedLocale ?? 'en';
  const lastSubmittedRef = useRef('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setGuess('');
      setFoundAnswers([]);
      setOpponentLiveFoundCount(0);
      setShowAllCorrectAnswers(false);
    });
    lastSubmittedRef.current = '';
  }, [qIndex]);

  useEffect(() => {
    if (roundResolved || !showOptions) {
      if (roundResolved) {
        queueMicrotask(() => {
          setOpponentLiveFoundCount(opponentRound?.foundCount ?? 0);
        });
      }
      return;
    }

    const total = question.answerSlotCount;
    const target = getSimulatedOpponentCountdownTarget(matchId, qIndex, total);
    let current = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    queueMicrotask(() => {
      setOpponentLiveFoundCount(0);
    });

    const scheduleNext = () => {
      if (cancelled || current >= target) return;
      const roll = seededUnit(`${matchId}:${qIndex}:countdown-opponent-step:${current}`);
      const delayMs = 700 + Math.round(roll * 1100) + current * 180;
      timer = setTimeout(() => {
        if (cancelled) return;
        current += 1;
        setOpponentLiveFoundCount(current);
        scheduleNext();
      }, delayMs);
    };

    const initialDelay = 800 + Math.round(seededUnit(`${matchId}:${qIndex}:countdown-opponent-start`) * 900);
    timer = setTimeout(scheduleNext, initialDelay);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [matchId, opponentRound?.foundCount, qIndex, question.answerSlotCount, roundResolved, showOptions]);

  useEffect(() => {
    if (!countdownGuessAck?.accepted || countdownGuessAck.qIndex !== qIndex) return;
    const displays = countdownGuessAck.acceptedDisplays?.length
      ? countdownGuessAck.acceptedDisplays.map((display) => resolveI18nText(display, resolvedLocale))
      : countdownGuessAck.acceptedDisplay
        ? [resolveI18nText(countdownGuessAck.acceptedDisplay, resolvedLocale)]
        : [];
    if (displays.length === 0) return;
    queueMicrotask(() => {
      setFoundAnswers((current) => {
        const next = [...current];
        for (const display of displays) {
          if (!next.includes(display)) next.push(display);
        }
        return next;
      });
      setGuess('');
    });
    lastSubmittedRef.current = '';
  }, [countdownGuessAck, qIndex, resolvedLocale]);

  const revealedAnswerGroups = useMemo(() => {
    if (!roundResolved || !roundResult || roundResult.reveal.kind !== 'countdown') return [];
    return roundResult.reveal.answerGroups.map((group) => ({
      id: group.id,
      display: resolveI18nText(group.display, resolvedLocale),
    }));
  }, [resolvedLocale, roundResolved, roundResult]);
  const revealedAnswers = useMemo(() => revealedAnswerGroups.map((group) => group.display), [revealedAnswerGroups]);

  const inputLocked = !showOptions || roundResolved;
  const playerFoundCount = roundResolved
    ? (myRound?.foundCount ?? answerAck?.foundCount ?? foundAnswers.length)
    : (countdownGuessAck?.foundCount ?? foundAnswers.length);
  const opponentFoundCount = roundResolved ? (opponentRound?.foundCount ?? 0) : opponentLiveFoundCount;
  const hasPlayerCountFeedback = showOptions || playerFoundCount > 0 || roundResolved;
  const countdownPlayerPoints = roundResolved
    ? (myRound?.pointsEarned ?? answerAck?.pointsEarned ?? null)
    : null;
  const countdownOpponentPoints = roundResolved ? (opponentRound?.pointsEarned ?? 0) : null;
  const playerFoundIdSet = useMemo(() => new Set(myRound?.foundAnswerIds ?? []), [myRound?.foundAnswerIds]);
  const opponentFoundIdSet = useMemo(() => new Set(opponentRound?.foundAnswerIds ?? []), [opponentRound?.foundAnswerIds]);
  const showCountdownOwnership = roundResolved && (playerFoundIdSet.size > 0 || opponentFoundIdSet.size > 0);
  const countdownAnswerBreakdown = useMemo(() => {
    const playerAnswers: string[] = [];
    const opponentAnswers: string[] = [];
    const unclaimedAnswers: string[] = [];

    for (const answer of revealedAnswerGroups) {
      const playerFound = playerFoundIdSet.has(answer.id);
      const opponentFound = opponentFoundIdSet.has(answer.id);
      if (playerFound) playerAnswers.push(answer.display);
      if (opponentFound) opponentAnswers.push(answer.display);
      if (!playerFound && !opponentFound) unclaimedAnswers.push(answer.display);
    }

    return { playerAnswers, opponentAnswers, unclaimedAnswers };
  }, [opponentFoundIdSet, playerFoundIdSet, revealedAnswerGroups]);

  const submitGuess = useCallback(() => {
    if (inputLocked || !guess.trim()) return;
    getSocket().emit('match:countdown_guess', { matchId, qIndex, guess: guess.trim() });
    lastSubmittedRef.current = guess.trim().toLowerCase();
  }, [guess, inputLocked, matchId, qIndex]);

  // Auto-submit on keystroke with a short debounce (3+ characters).
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
    }, COUNTDOWN_AUTO_SUBMIT_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [guess, inputLocked, matchId, qIndex]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-start pt-2">
        {/* `key={qIndex}` forces the badge to remount on each new question
            so its drop-in animation re-fires. The rest of the panel keeps
            its state (typed guesses, sortable order) across the remount. */}
        <QuestionKindBadge key={qIndex} kind="countdown" />
      </div>

      {/* Prompt — plain text, no card chrome */}
      <div className="px-1 pt-1">
        {question.categoryName && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-brand-green">
            ⚽ {question.categoryName}
          </span>
        )}
        <p className="mt-2 text-lg font-black font-fun leading-snug text-white">{question.prompt}</p>
      </div>

      <SpecialResultSummary
        visible={hasPlayerCountFeedback}
        tone="green"
        player={{
          label: 'You',
          count: playerFoundCount,
          total: question.answerSlotCount,
          points: countdownPlayerPoints,
          badge: roundResolved ? (myRound?.isCorrect ? 'Won' : 'Did not win') : 'Found',
          status: roundResolved ? (myRound?.isCorrect ? 'positive' : 'negative') : 'positive',
          detail: roundResolved ? 'accepted answers' : 'accepted so far',
        }}
        opponent={{
          label: 'Opp',
          count: opponentFoundCount,
          total: question.answerSlotCount,
          points: countdownOpponentPoints,
          badge: roundResolved ? (opponentRound?.isCorrect ? 'Won' : 'Did not win') : (opponentFoundCount > 0 ? 'Finding' : 'Waiting'),
          status: roundResolved ? (opponentRound?.isCorrect ? 'positive' : 'negative') : (opponentFoundCount > 0 ? 'positive' : 'pending'),
          detail: roundResolved ? 'accepted answers' : 'accepted so far',
        }}
      />

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
              className="h-11 rounded-[8px] border border-white/10 bg-white/[0.04] text-base text-white placeholder:text-white/30 focus:border-brand-green focus:bg-white/[0.06]"
            />
            <button
              type="button"
              onClick={submitGuess}
              disabled={inputLocked || !guess.trim()}
              className="inline-flex items-center justify-center rounded-[8px] bg-brand-orange px-4 text-white transition-transform active:translate-y-[2px] disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white/40">
            <Lightbulb className="size-3 text-brand-orange" />
            Auto-matches as you type · Enter for short answers
          </p>
        </div>
      )}

      {/* Answers found list — single soft container */}
      <div className="px-1.5 sm:px-0">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <h3 className="text-[11px] font-fun font-black uppercase tracking-[0.22em] text-white/55">
            {roundResolved ? 'Answer Results' : 'Answers Found'}
          </h3>
        </div>
        {(roundResolved ? revealedAnswers : foundAnswers).length === 0 ? (
          <p className="py-6 text-center text-xs font-fun font-black uppercase tracking-[0.18em] text-white/30">
            {roundResolved ? 'No answers found this round.' : 'Start typing to find answers!'}
          </p>
        ) : (
          roundResolved ? (
            <div className="space-y-3">
              {showCountdownOwnership ? (
                <>
                  <CountdownAnswerGroup label="You" answers={countdownAnswerBreakdown.playerAnswers} tone="green" />
                  <CountdownAnswerGroup label="Opponent" answers={countdownAnswerBreakdown.opponentAnswers} tone="red" />
                  {countdownAnswerBreakdown.unclaimedAnswers.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white/35">
                      <span>{countdownAnswerBreakdown.unclaimedAnswers.length} more correct answers not found</span>
                      <button
                        type="button"
                        onClick={() => setShowAllCorrectAnswers((current) => !current)}
                        className="rounded-[7px] border border-brand-green/30 px-2 py-1 text-[10px] font-fun font-black uppercase tracking-[0.14em] text-brand-green transition-colors hover:bg-brand-green/10"
                      >
                        {showAllCorrectAnswers ? 'Hide all' : 'See all'}
                      </button>
                    </div>
                  )}
                  {showAllCorrectAnswers && countdownAnswerBreakdown.unclaimedAnswers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-wrap gap-1.5"
                    >
                      {revealedAnswerGroups.map((answer) => (
                        <CountdownAnswerChip key={answer.id} answer={answer.display} tone="green" />
                      ))}
                    </motion.div>
                  )}
                </>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {revealedAnswerGroups.slice(0, 8).map((answer) => (
                    <CountdownAnswerChip key={answer.id} answer={answer.display} tone="green" />
                  ))}
                  {revealedAnswerGroups.length > 8 && (
                    <span className="rounded-[7px] border border-white/10 px-2 py-1 text-[11px] font-fun font-black text-white/45">
                      +{revealedAnswerGroups.length - 8} more
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {foundAnswers.map((answer) => (
                <motion.div
                  key={answer}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-[8px] border border-brand-green/20 bg-transparent px-3 py-2 text-sm font-fun font-black text-brand-green"
                >
                  {answer}
                </motion.div>
              ))}
            </div>
          )
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
        className={`flex items-center gap-2 rounded-[10px] px-2.5 py-3 transition-all sm:gap-3 sm:p-3 ${
          !isRevealed
            ? 'cursor-grab bg-white/[0.04] hover:bg-white/[0.07] active:cursor-grabbing'
            : isCorrect
              ? 'bg-brand-green/12'
              : 'bg-brand-red-soft/12'
        } ${isDragging ? 'scale-[1.02] shadow-xl' : ''}`}
      >
        {!isRevealed && (
          <div {...attributes} {...listeners} className="shrink-0 touch-none cursor-grab active:cursor-grabbing">
            <GripVertical className="size-4 text-white/35 sm:size-5" />
          </div>
        )}

        <div
          className={`flex size-7 shrink-0 items-center justify-center rounded-[6px] text-xs font-black sm:size-8 sm:text-sm ${
            isRevealed && isCorrect
              ? 'bg-brand-green text-white'
              : isRevealed
                ? 'bg-brand-red-soft text-white'
                : 'bg-white/10 text-white'
          }`}
        >
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {item.emoji && <span className="text-base sm:text-xl">{item.emoji}</span>}
            <span className="truncate text-xs font-fun font-black uppercase tracking-wide text-white sm:text-sm">
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
              <CheckCircle2 className="size-5 text-brand-green" />
            ) : (
              <XCircle className="size-5 text-brand-red-soft" />
            )}
          </div>
        ) : (
          <ArrowUpDown className="size-3.5 shrink-0 text-white/35 sm:size-4" />
        )}
      </div>
    </div>
  );
}

interface PutInOrderDisplayItem {
  id: string;
  label: string;
  details: string | null;
  emoji: string | null;
  sortValue: number;
}

function PutInOrderCompactColumn({
  title,
  itemIds,
  correctById,
  itemById,
  emptyText,
  tone,
  forceAllWrong = false,
  matchedCountOverride,
  totalCountOverride,
}: {
  title: string;
  itemIds: string[];
  correctById: Map<string, { sortValue: number; index: number }>;
  itemById: Map<string, PutInOrderDisplayItem>;
  emptyText: string;
  tone: 'green' | 'red';
  forceAllWrong?: boolean;
  matchedCountOverride?: number;
  totalCountOverride?: number;
}) {
  const matchedCount = matchedCountOverride ?? itemIds.reduce((count, itemId, index) => (
    correctById.get(itemId)?.index === index ? count + 1 : count
  ), 0);
  const totalCount = totalCountOverride ?? itemIds.length;
  const accentClass = tone === 'green' ? 'text-brand-green' : 'text-brand-red-soft';

  return (
    <div className="grid min-w-0 grid-rows-[1.1rem_auto] gap-1.5">
      <div className="grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-2">
        <h3 className="truncate text-[9px] font-fun font-black uppercase tracking-[0.18em] text-white/50 sm:text-[10px]">
          {title}
        </h3>
        {totalCount > 0 && (
          <span className={`justify-self-end text-[10px] font-fun font-black uppercase ${accentClass}`}>
            {matchedCount}/{totalCount}
          </span>
        )}
      </div>
      {itemIds.length === 0 ? (
        <p className="rounded-[8px] border border-white/10 px-2 py-3 text-[10px] font-fun font-black uppercase tracking-[0.16em] text-white/35">
          {emptyText}
        </p>
      ) : (
        <div className="grid auto-rows-[4.5rem] gap-1 sm:auto-rows-[4.875rem]">
          {itemIds.map((itemId, index) => {
            const item = itemById.get(itemId);
            const correctInfo = correctById.get(itemId);
            const isCorrectPosition = !forceAllWrong && correctInfo?.index === index;
            return (
              <div
                key={`${title}-${itemId}-${index}`}
                className={`grid h-full grid-cols-[1.45rem_minmax(0,1fr)] items-center gap-1.5 rounded-[8px] border px-1.5 sm:grid-cols-[2rem_minmax(0,1fr)_6rem] sm:gap-2 sm:px-2 ${
                  isCorrectPosition
                    ? 'border-brand-green/25 bg-brand-green/10'
                    : 'border-brand-red-soft/20 bg-brand-red-soft/8'
                }`}
              >
                <span className={`flex size-6 items-center justify-center rounded-[6px] text-[10px] font-fun font-black sm:size-7 sm:text-xs ${
                  isCorrectPosition ? 'bg-brand-green text-white' : 'bg-brand-red-soft/80 text-white'
                }`}>
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {item?.emoji && <span className="shrink-0 text-sm sm:text-base">{item.emoji}</span>}
                    <span className="truncate text-[10px] font-fun font-black uppercase text-white sm:text-xs">
                      {item?.label ?? itemId}
                    </span>
                  </span>
                  {item?.details && (
                    <span className="hidden truncate text-[9px] font-fun font-black uppercase tracking-[0.16em] text-white/40 sm:block">
                      {item.details}
                    </span>
                  )}
                </span>
                <span className={`justify-self-end text-right text-[10px] font-fun font-black uppercase ${
                  isCorrectPosition ? 'text-brand-green' : 'text-white/35'
                }`}>
                  <span className="hidden sm:inline">
                    {isCorrectPosition ? 'Right' : `Should be ${typeof correctInfo?.index === 'number' ? correctInfo.index + 1 : '-'}`}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PutInOrderResultComparison({
  playerOrderIds,
  opponentOrderIds,
  playerForceAllWrong = false,
  opponentForceAllWrong = false,
  playerMatchedCount,
  opponentMatchedCount,
  totalCount,
  correctById,
  itemById,
}: {
  playerOrderIds: string[];
  opponentOrderIds: string[];
  playerForceAllWrong?: boolean;
  opponentForceAllWrong?: boolean;
  playerMatchedCount?: number;
  opponentMatchedCount?: number | null;
  totalCount?: number;
  correctById: Map<string, { sortValue: number; index: number }>;
  itemById: Map<string, PutInOrderDisplayItem>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2 px-1"
    >
      <div className="text-[11px] font-fun font-black uppercase tracking-[0.22em] text-white/55">
        Order Results
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <PutInOrderCompactColumn
          title="You"
          itemIds={playerOrderIds}
          correctById={correctById}
          itemById={itemById}
          emptyText="No order submitted"
          tone="green"
          forceAllWrong={playerForceAllWrong}
          matchedCountOverride={playerMatchedCount}
          totalCountOverride={totalCount}
        />
        <PutInOrderCompactColumn
          title="Opponent"
          itemIds={opponentOrderIds}
          correctById={correctById}
          itemById={itemById}
          emptyText="Opponent order unavailable"
          tone="red"
          forceAllWrong={opponentForceAllWrong}
          matchedCountOverride={opponentMatchedCount ?? undefined}
          totalCountOverride={totalCount}
        />
      </div>
    </motion.div>
  );
}

function buildFallbackPutInOrderSubmission(correctOrderIds: string[], matchedCount: number | null | undefined): string[] {
  if (correctOrderIds.length === 0) return [];
  const safeMatchedCount = clampCount(matchedCount ?? 0, correctOrderIds.length);
  if (safeMatchedCount >= correctOrderIds.length) return [...correctOrderIds];
  const fixedPrefix = correctOrderIds.slice(0, safeMatchedCount);
  const tail = correctOrderIds.slice(safeMatchedCount);
  if (tail.length <= 1) return [...fixedPrefix, ...tail];

  // Rotate the unmatched tail so fallback rows have exactly `matchedCount`
  // correct positions. A simple reverse leaves the middle item fixed for odd
  // tail lengths, which can display 2/4 while the score says 1/4.
  return [
    ...fixedPrefix,
    ...tail.slice(1),
    tail[0],
  ];
}

function resolvePutInOrderSubmission(
  submittedOrderIds: string[] | null | undefined,
  correctOrderIds: string[],
  matchedCount: number | null | undefined
): string[] {
  if (submittedOrderIds?.length) return submittedOrderIds;
  return matchedCount && matchedCount > 0
    ? buildFallbackPutInOrderSubmission(correctOrderIds, matchedCount)
    : [];
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
  myRound,
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
  myRound: MatchRoundResultPlayer | null;
  opponentRound: MatchRoundResultPlayer | null;
}) {
  const [userOrder, setUserOrder] = useState<ResolvedPutInOrderQuestionItem[]>(() => [...question.items]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionStartedRef = useRef(false);
  const sawPlayableTimerRef = useRef(false);
  const resolvedLocale = question.resolvedLocale ?? 'en';
  const submitted = isSubmitting || Boolean(answerAck?.questionKind === 'putInOrder' && answerAck?.qIndex === qIndex);
  const inputLocked = !showOptions || roundResolved || submitted;

  useEffect(() => {
    submissionStartedRef.current = false;
    sawPlayableTimerRef.current = false;
    queueMicrotask(() => {
      setUserOrder([...question.items]);
      setIsSubmitting(false);
    });
  }, [qIndex, question.id, question.items]);

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
  const questionItemById = useMemo(
    () => new Map(question.items.map((item, index) => [item.id, {
      id: item.id,
      label: resolveI18nText(item.label, resolvedLocale),
      details: item.details ? resolveI18nText(item.details, resolvedLocale) : null,
      emoji: item.emoji ?? null,
      sortValue: index + 1,
    }])),
    [question.items, resolvedLocale]
  );
  const itemById = useMemo(
    () => new Map<string, PutInOrderDisplayItem>([
      ...Array.from(questionItemById.entries()),
      ...correctOrder.map((item) => [item.id, item] as const),
    ]),
    [correctOrder, questionItemById]
  );
  useEffect(() => {
    if (answerAck?.questionKind !== 'putInOrder' || answerAck.qIndex !== qIndex) return;
    if (!answerAck.submittedOrderIds?.length) {
      queueMicrotask(() => setIsSubmitting(false));
      return;
    }

    const byId = new Map(question.items.map((item) => [item.id, item]));
    const restoredOrder = answerAck.submittedOrderIds
      .map((itemId) => byId.get(itemId))
      .filter((item): item is ResolvedPutInOrderQuestionItem => Boolean(item));
    if (restoredOrder.length !== question.items.length) {
      queueMicrotask(() => setIsSubmitting(false));
      return;
    }

    queueMicrotask(() => {
      setUserOrder(restoredOrder);
      setIsSubmitting(false);
      submissionStartedRef.current = false;
    });
  }, [answerAck, qIndex, question.items]);
  const totalItems = question.items.length;
  const submittedForThisQuestion = answerAck?.questionKind === 'putInOrder' && answerAck.qIndex === qIndex;
  const playerCorrectCount = roundResolved
    ? (myRound?.foundCount ?? userOrder.reduce((count, item, index) => (
        correctById.get(item.id)?.index === index ? count + 1 : count
      ), 0))
    : submittedForThisQuestion
      ? (answerAck?.foundCount ?? (answerAck?.isCorrect ? totalItems : 0))
      : 0;
  const opponentCorrectCount = roundResolved
    ? (opponentRound?.foundCount ?? (opponentRound?.isCorrect ? totalItems : 0))
    : null;
  const correctOrderIds = correctOrder.length > 0
    ? correctOrder.map((item) => item.id)
    : question.items.map((item) => item.id);
  const playerSubmittedOrderIds = roundResolved
    ? resolvePutInOrderSubmission(myRound?.submittedOrderIds, userOrder.map((item) => item.id), playerCorrectCount)
    : userOrder.map((item) => item.id);
  const opponentSubmittedOrderIds = roundResolved
    ? resolvePutInOrderSubmission(opponentRound?.submittedOrderIds, correctOrderIds, opponentCorrectCount)
    : [];
  const playerDidNotSubmit = roundResolved && Boolean(myRound) && playerSubmittedOrderIds.length === 0 && playerCorrectCount === 0;
  const opponentDidNotSubmit = roundResolved && Boolean(opponentRound) && opponentSubmittedOrderIds.length === 0 && opponentCorrectCount === 0;
  const playerResultOrderIds = playerDidNotSubmit ? correctOrderIds : playerSubmittedOrderIds;
  const opponentResultOrderIds = opponentDidNotSubmit ? correctOrderIds : opponentSubmittedOrderIds;
  const putOrderPlayerPoints = roundResolved
    ? resolvePutInOrderPoints(myRound?.pointsEarned, playerCorrectCount)
    : (submittedForThisQuestion ? resolvePutInOrderPoints(answerAck?.pointsEarned, playerCorrectCount) : null);
  const putOrderOpponentPoints = roundResolved
    ? resolvePutInOrderPoints(opponentRound?.pointsEarned, opponentCorrectCount)
    : null;
  const putOrderPlayerCorrect = roundResolved ? Boolean(myRound?.isCorrect) : Boolean(answerAck?.isCorrect);
  const putOrderPlayerBadge = putOrderPlayerCorrect
    ? 'Perfect'
    : playerCorrectCount > 0
      ? 'Partial'
      : 'Wrong';
  const putOrderPlayerStatus: SpecialSummaryStatus = putOrderPlayerCorrect
    ? 'positive'
    : playerCorrectCount > 0
      ? 'neutral'
      : 'negative';
  const putOrderOpponentBadge = !roundResolved
    ? 'Waiting'
    : opponentRound?.isCorrect
      ? 'Perfect'
      : opponentCorrectCount && opponentCorrectCount > 0
        ? 'Partial'
        : 'Wrong';
  const putOrderOpponentStatus: SpecialSummaryStatus = !roundResolved
    ? 'pending'
    : opponentRound?.isCorrect
      ? 'positive'
      : opponentCorrectCount && opponentCorrectCount > 0
        ? 'neutral'
        : 'negative';

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || inputLocked) return;
    setUserOrder((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleSubmit = useCallback((options?: { force?: boolean }) => {
    if (!options?.force && inputLocked) return;
    if (roundResolved || submitted || submissionStartedRef.current) return;
    submissionStartedRef.current = true;
    setIsSubmitting(true);
    getSocket().emit('match:put_in_order_answer', {
      matchId,
      qIndex,
      orderedItemIds: userOrder.map((item) => item.id),
      timeMs: Math.max(0, Math.round((questionDurationSeconds - timeRemaining) * 1000)),
    });
  }, [inputLocked, matchId, qIndex, questionDurationSeconds, roundResolved, submitted, timeRemaining, userOrder]);

  // Auto-submit when timer expires so a no-click run still sends the player's current order to the server.
  useEffect(() => {
    if (!showOptions || roundResolved || submitted) return;
    if (timeRemaining > 0) {
      sawPlayableTimerRef.current = true;
      return;
    }
    if (!sawPlayableTimerRef.current) return;
    queueMicrotask(() => handleSubmit({ force: true }));
  }, [showOptions, timeRemaining, roundResolved, submitted, handleSubmit]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-start">
        <QuestionKindBadge key={qIndex} kind="putInOrder" />
      </div>

      {/* Prompt — plain text */}
      <div className="px-1">
        {question.categoryName && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-brand-cyan">
            ⚽ {question.categoryName}
          </span>
        )}
        <p className="mt-2 text-base font-black font-fun leading-snug text-white">{question.prompt}</p>
      </div>

      {/* Instruction — single inline line, no card */}
      <div className="flex items-center gap-2 px-1 text-[11px] font-fun font-black uppercase tracking-[0.18em] text-white/55">
        <ArrowUpDown className="size-3.5 text-brand-cyan" />
        <span>
          Drag to arrange from <span className="text-brand-cyan">{question.instruction}</span>
        </span>
      </div>

      <SpecialResultSummary
        visible={submittedForThisQuestion || roundResolved}
        tone="green"
        player={{
          label: 'You',
          count: playerCorrectCount,
          total: totalItems,
          points: putOrderPlayerPoints,
          badge: putOrderPlayerBadge,
          status: putOrderPlayerStatus,
          detail: 'positions matched',
        }}
        opponent={{
          label: 'Opp',
          count: opponentCorrectCount,
          total: totalItems,
          points: putOrderOpponentPoints,
          badge: putOrderOpponentBadge,
          status: putOrderOpponentStatus,
          detail: roundResolved ? 'positions matched' : 'order pending',
        }}
      />

      {roundResolved ? (
        <PutInOrderResultComparison
          playerOrderIds={playerResultOrderIds}
          opponentOrderIds={opponentResultOrderIds}
          playerForceAllWrong={playerDidNotSubmit}
          opponentForceAllWrong={opponentDidNotSubmit}
          playerMatchedCount={playerDidNotSubmit ? 0 : undefined}
          opponentMatchedCount={opponentDidNotSubmit ? 0 : undefined}
          totalCount={correctOrderIds.length}
          correctById={correctById}
          itemById={itemById}
        />
      ) : (
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
                    isRevealed={false}
                    isCorrect={undefined}
                    revealSortValue={correctInfo?.sortValue}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {!roundResolved && (
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={inputLocked}
          className="w-full rounded-[10px] bg-brand-green py-3 text-sm font-fun font-black uppercase tracking-wide text-white transition-transform hover:bg-brand-green-deep active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-50"
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
  myRound,
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
  myRound: MatchRoundResultPlayer | null;
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
  const currentPoints = calculateCluesDisplayPoints(revealedClues);
  const inputLocked = !showOptions || submitted || pendingGuess || roundResolved;
  const playerAnswerCount = roundResolved
    ? (myRound?.isCorrect ? 1 : 0)
    : submitted && answerAck?.isCorrect
      ? 1
      : 0;
  const opponentAnswerCount = roundResolved ? (opponentRound?.isCorrect ? 1 : 0) : null;
  const cluesPlayerCorrect = roundResolved ? Boolean(myRound?.isCorrect) : Boolean(answerAck?.isCorrect);
  const cluesPlayerPoints = roundResolved
    ? (myRound?.pointsEarned ?? answerAck?.pointsEarned ?? null)
    : (submitted ? answerAck?.pointsEarned ?? null : null);
  const cluesOpponentPoints = roundResolved ? (opponentRound?.pointsEarned ?? 0) : null;
  const cluesPlayerDetail = roundResolved && typeof myRound?.clueIndex === 'number'
    ? `clue ${myRound.clueIndex + 1}`
    : submitted
      ? 'answer submitted'
      : 'not answered';
  const cluesOpponentDetail = roundResolved && opponentRound?.isCorrect && typeof opponentRound.clueIndex === 'number'
    ? `clue ${opponentRound.clueIndex + 1}`
    : roundResolved
      ? 'no correct answer'
      : 'result pending';

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
      <div className="flex items-center justify-start">
        <QuestionKindBadge key={qIndex} kind="clues" />
      </div>

      {/* Prompt — plain text */}
      <div className="px-1">
        {question.categoryName && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-brand-orange">
            <Lightbulb className="size-3" />
            {question.categoryName}
          </span>
        )}
        <p className="mt-2 text-base font-black font-fun text-white">Who Am I?</p>
      </div>

      <SpecialResultSummary
        visible={submitted || roundResolved}
        tone="orange"
        player={{
          label: 'You',
          count: playerAnswerCount,
          total: 1,
          points: cluesPlayerPoints,
          badge: cluesPlayerCorrect ? 'Correct' : 'Wrong',
          status: cluesPlayerCorrect ? 'positive' : 'negative',
          detail: cluesPlayerDetail,
        }}
        opponent={{
          label: 'Opp',
          count: opponentAnswerCount,
          total: 1,
          points: cluesOpponentPoints,
          badge: roundResolved ? (opponentRound?.isCorrect ? 'Correct' : 'Wrong') : 'Waiting',
          status: roundResolved ? (opponentRound?.isCorrect ? 'positive' : 'negative') : 'pending',
          detail: cluesOpponentDetail,
        }}
      />

      {roundResolved && displayAnswer && (
        <motion.div
          aria-live="polite"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className={`flex items-center justify-between gap-3 rounded-[8px] border px-3 py-2 ${
            cluesPlayerCorrect
              ? 'border-brand-green/25 bg-brand-green/10'
              : 'border-brand-red-soft/25 bg-brand-red-soft/10'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            {cluesPlayerCorrect ? (
              <CheckCircle2 className="size-4 shrink-0 text-brand-green" />
            ) : (
              <XCircle className="size-4 shrink-0 text-brand-red-soft" />
            )}
            <div className="min-w-0">
              <p className={`text-[10px] font-fun font-black uppercase tracking-[0.18em] ${
                cluesPlayerCorrect ? 'text-brand-green' : 'text-brand-red-soft'
              }`}>
                {cluesPlayerCorrect ? 'Correct answer' : 'The answer was'}
              </p>
              <p className="truncate text-sm font-fun font-black uppercase tracking-wide text-white">
                {displayAnswer}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            {cluesPlayerCorrect && cluesPlayerPoints != null && (
              <p className="text-[11px] font-fun font-black uppercase text-brand-green">
                +{cluesPlayerPoints} pts
              </p>
            )}
            {opponentRound && (
              <p className="text-[9px] font-fun font-black uppercase tracking-[0.16em] text-white/50">
                {opponentRound.isCorrect && typeof opponentRound.clueIndex === 'number'
                  ? <>Opp clue {opponentRound.clueIndex + 1}</>
                  : <>Opp missed</>}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {!roundResolved && (
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-fun font-black uppercase tracking-[0.18em] text-white/55">
          <Star className="size-3.5 text-brand-gold" />
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
                index < revealedClues ? 'bg-brand-orange' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      )}

      {!roundResolved && (
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
            className="h-11 rounded-[8px] border border-white/10 bg-white/[0.04] text-center text-base text-white placeholder:text-white/30 focus:border-brand-orange focus:bg-white/[0.06]"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => emitGuess()}
              disabled={!guess.trim() || inputLocked}
              className="rounded-[8px] bg-brand-green py-3 text-sm font-fun font-black uppercase tracking-wide text-white transition-transform hover:bg-brand-green-deep active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-40"
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
    myRound,
    opponentRound,
    countdownGuessAck,
    cluesGuessAck,
  } = props;

  let content: ReactNode;

  if (question.kind === 'countdown') {
    content = (
      <CountdownPanel
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
        myRound={myRound}
        opponentRound={opponentRound}
      />
    );
  } else {
    content = (
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
        myRound={myRound}
        opponentRound={opponentRound}
        cluesGuessAck={cluesGuessAck}
      />
    );
  }

  return (
    <div className="relative px-3 sm:px-4 lg:px-0">
      <SpecialScoreFlightAnchors />
      {content}
    </div>
  );
}

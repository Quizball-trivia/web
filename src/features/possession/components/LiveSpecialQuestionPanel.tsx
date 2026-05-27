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
  const { t } = useLocale();
  const [guess, setGuess] = useState('');
  const [foundAnswers, setFoundAnswers] = useState<string[]>([]);
  const [showAllCorrectAnswers, setShowAllCorrectAnswers] = useState(false);
  const resolvedLocale = question.resolvedLocale ?? 'en';
  const lastSubmittedRef = useRef('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real-time opponent found count comes from the server via
  // `match:opponent_countdown_progress` and is stored in the realtime
  // match store. After the round resolves, snap to the authoritative
  // final count from the round_result payload.
  const opponentLiveFoundCount = useRealtimeMatchStore(
    (state) => state.match?.opponentCountdownFoundCount ?? 0,
  );

  useEffect(() => {
    queueMicrotask(() => {
      setGuess('');
      setFoundAnswers([]);
      setShowAllCorrectAnswers(false);
    });
    lastSubmittedRef.current = '';
  }, [qIndex]);

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
        <p className="text-lg font-black font-fun leading-snug text-white">{question.prompt}</p>
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

      {/* Input — flat blue Figma pill. Using a plain <input> rather than
          the shared Input component because the latter applies a
          `dark:bg-input/30` default that overrides bg-brand-blue in
          dark-mode desktop while letting it through on iOS, so the pill
          renders differently across platforms. */}
      {!roundResolved && (
        <div>
          <div className="relative">
            <input
              type="text"
              value={guess}
              onChange={(event) => setGuess(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  submitGuess();
                }
              }}
              placeholder={t('possession.typeYourAnswerPlaceholder')}
              disabled={inputLocked}
              aria-label={t('possession.typeYourAnswerAriaLabel')}
              className="font-poppins h-14 w-full rounded-[14px] border-none bg-brand-blue px-5 pr-14 text-center text-base uppercase text-white outline-none placeholder:text-white/55 placeholder:uppercase placeholder:tracking-[0.08em] focus:outline-none disabled:opacity-50"
              style={{
                fontWeight: 600,
                letterSpacing: '0.08em',
                boxShadow: '0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)',
              }}
            />
            <button
              type="button"
              onClick={submitGuess}
              disabled={inputLocked || !guess.trim()}
              aria-label={t('possession.submitAnswer')}
              className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex size-9 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Send className="size-4" />
            </button>
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white/40">
            
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
            {roundResolved ? 'No answers found this round.' : ''}
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

  // While the round is being answered, the whole card is the drag handle —
  // press anywhere on it to reorder. Drag icons removed per user feedback
  // (people weren't realizing they had to grab the tiny grip icon).
  const dragProps = isRevealed ? {} : { ...attributes, ...listeners };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={isDragging ? 'z-50' : 'z-0'}
    >
      <div
        {...dragProps}
        className={`flex items-center gap-2 rounded-[14px] px-3 py-3 transition-all sm:gap-3 sm:p-3 ${
          !isRevealed
            ? 'cursor-grab touch-none bg-white/[0.04] hover:bg-white/[0.07] active:cursor-grabbing'
            : isCorrect
              ? 'bg-brand-green/12'
              : 'bg-brand-red-soft/12'
        } ${isDragging ? 'scale-[1.02] shadow-xl' : ''}`}
      >
        <div
          className={`font-poppins flex h-14 w-20 shrink-0 items-center justify-center rounded-[30px] text-white sm:h-16 sm:w-24 ${
            isRevealed
              ? isCorrect
                ? 'bg-brand-green shadow-[0_0_10px_rgba(56,182,14,0.35)]'
                : 'bg-brand-red-soft shadow-[0_0_10px_rgba(255,75,75,0.35)]'
              : 'bg-brand-green shadow-[0_0_10px_rgba(56,182,14,0.35)]'
          }`}
          style={{
            fontWeight: 700,
            fontSize: 24,
          }}
        >
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {item.emoji && <span className="text-xl sm:text-2xl">{item.emoji}</span>}
            <span className="truncate text-base font-fun font-black uppercase tracking-wide text-white sm:text-lg">
              {item.label}
            </span>
          </div>
          {item.details && (
            <p className="truncate text-xs font-fun font-black uppercase tracking-[0.16em] text-white/60 sm:text-sm">
              {item.details}
            </p>
          )}
        </div>

        {isRevealed && (
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
  const { t } = useLocale();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2 px-1"
    >
      <div className="text-[11px] font-fun font-black uppercase tracking-[0.22em] text-white/55">
        {t('possession.orderResults')}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <PutInOrderCompactColumn
          title={t('results.you')}
          itemIds={playerOrderIds}
          correctById={correctById}
          itemById={itemById}
          emptyText={t('possession.noOrderSubmitted')}
          tone="green"
          forceAllWrong={playerForceAllWrong}
          matchedCountOverride={playerMatchedCount}
          totalCountOverride={totalCount}
        />
        <PutInOrderCompactColumn
          title={t('matchmaking.opponentFallback')}
          itemIds={opponentOrderIds}
          correctById={correctById}
          itemById={itemById}
          emptyText={t('possession.opponentOrderUnavailable')}
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
    ? resolvePutInOrderSubmission(myRound?.submittedOrderIds, correctOrderIds, playerCorrectCount)
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
        <p className="text-base font-black font-fun leading-snug text-white">{question.prompt}</p>
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
  const { t } = useLocale();
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
      <div className="flex items-center justify-start pt-2">
        {/* `key={qIndex}` re-fires the drop-in animation on each new
            question while the rest of the panel keeps its state. */}
        <QuestionKindBadge key={qIndex} kind="clues" />
      </div>

      {/* Prompt — plain text, no card chrome. Matches the countdown /
          put-in-order layout: the prompt line sits above the You/Opp
          summary and the clues so the player has the question's framing
          before any clues drop. */}
      <div className="px-1">
        <p className="text-base font-black font-fun leading-snug text-white">{question.prompt}</p>
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
                  ? t('possession.oppClue', { index: opponentRound.clueIndex + 1 })
                  : t('possession.oppMissed')}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* All clue cards rendered upfront — locked clues show `???`, revealed
          clues show their text. Each row has a per-clue points pill on the
          right (revealed = solid green / white text; locked = dark fill +
          green border + green text). */}
      <div>
        <div className="space-y-1.5">
          {question.clues.map((clue, index) => {
            const cluePoints = calculateCluesDisplayPoints(index + 1);
            const revealed = index < revealedClues;
            return (
              <motion.div
                key={`${index}-${clue.content}`}
                initial={index === 0 ? false : { opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                className="flex items-center gap-3 rounded-[14px] bg-white/[0.04] px-5 py-4"
              >
                <div className="min-w-0 flex-1 text-center">
                  {revealed ? (
                    clue.type === 'emoji' ? (
                      <span className="text-4xl">{clue.content}</span>
                    ) : (
                      <p className="text-base font-fun font-black uppercase tracking-wide text-white">
                        {clue.content}
                      </p>
                    )
                  ) : (
                    <p className="text-base font-fun font-black uppercase tracking-wide text-white/35">
                      ???
                    </p>
                  )}
                </div>
                <span
                  className={`font-poppins inline-flex shrink-0 items-center justify-center rounded-[20px] border-[2px] border-brand-green tabular-nums ${
                    revealed
                      ? 'bg-brand-green text-white shadow-[0_0_10px_rgba(56,182,14,0.35)]'
                      : 'bg-surface-page text-brand-green'
                  }`}
                  style={{
                    fontWeight: 600,
                    fontSize: 18,
                    letterSpacing: '0.02em',
                    // Figma node 137 × 81 → ~68 × 40 at 1x design density.
                    width: 'clamp(72px, 18vw, 96px)',
                    height: 'clamp(40px, 10vw, 52px)',
                  }}
                  aria-label={`${cluePoints} points at this clue${revealed ? '' : ' (locked)'}`}
                >
                  {cluePoints} pt
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Centered yellow clue indicator row. Filled yellow = revealed,
          dark = still locked. */}
      {!roundResolved && (
        <div className="flex items-center justify-center gap-2">
          {question.clues.map((_, index) => {
            const revealed = index < revealedClues;
            return (
              <div
                key={index}
                className={`size-3 rounded-full transition-colors duration-300 ${
                  revealed
                    ? 'bg-brand-yellow shadow-[0_0_10px_rgba(255,229,0,0.55)]'
                    : 'bg-surface-page'
                }`}
              />
            );
          })}
        </div>
      )}

      {!roundResolved && (
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              placeholder={t('possession.typeYourAnswerPlaceholder')}
              value={guess}
              onChange={(event) => setGuess(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  emitGuess();
                }
              }}
              disabled={inputLocked}
              autoFocus
              aria-label={t('possession.typeYourAnswerAriaLabel')}
              className="font-poppins h-14 w-full rounded-[20px] border-none bg-brand-blue px-5 text-center text-base uppercase text-white outline-none placeholder:text-white/55 placeholder:uppercase placeholder:tracking-[0.08em] focus:outline-none disabled:opacity-50"
              style={{
                fontWeight: 600,
                letterSpacing: '0.08em',
                boxShadow: '0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)',
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => emitGuess()}
              disabled={!guess.trim() || inputLocked}
              aria-label={t('possession.submitAnswer')}
              className="font-poppins h-14 rounded-[20px] bg-brand-green text-white outline-none transition-colors hover:bg-brand-green-deep disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                fontWeight: 600,
                fontSize: 16,
                letterSpacing: '0.06em',
                boxShadow: '0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)',
              }}
            >
              {t('possession.submit')}
            </button>
            <button
              type="button"
              onClick={() => emitGuess({ giveUp: true })}
              disabled={inputLocked}
              aria-label={t('possession.giveUp')}
              className="font-poppins h-14 rounded-[20px] bg-brand-red-soft text-white outline-none transition-colors hover:bg-brand-red-deep disabled:opacity-40"
              style={{
                fontWeight: 600,
                fontSize: 16,
                letterSpacing: '0.06em',
                boxShadow: '0 1.76px 6.334px 1.32px rgba(255, 75, 75, 0.25)',
              }}
            >
              {t('possession.giveUp')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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

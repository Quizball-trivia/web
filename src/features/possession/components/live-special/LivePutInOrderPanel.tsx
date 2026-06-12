'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, CheckCircle2, XCircle } from 'lucide-react';
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
import { motion } from 'motion/react';
import { getSocket } from '@/lib/realtime/socket-client';
import type {
  MatchAnswerAckPayload,
  MatchRoundResultPayload,
  MatchRoundResultPlayer,
  ResolvedPutInOrderQuestion,
  ResolvedPutInOrderQuestionItem,
} from '@/lib/realtime/socket.types';
import { useLocale } from '@/contexts/LocaleContext';
import {
  QuestionKindBadge,
  SpecialResultSummary,
  clampCount,
  resolveI18nText,
  resolvePutInOrderPoints,
  type SpecialSummaryStatus,
} from './shared';

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
          <div className="flex items-start gap-2">
            {item.emoji && <span className="shrink-0 text-xl sm:text-2xl">{item.emoji}</span>}
            <span className="text-sm font-fun font-black uppercase leading-tight tracking-wide text-white [overflow-wrap:anywhere] sm:text-lg">
              {item.label}
            </span>
          </div>
          {item.details && (
            <p className="text-xs font-fun font-black uppercase leading-tight tracking-[0.16em] text-white/60 [overflow-wrap:anywhere] sm:text-sm">
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
  const { t } = useLocale();
  const matchedCount = matchedCountOverride ?? itemIds.reduce((count, itemId, index) => (
    correctById.get(itemId)?.index === index ? count + 1 : count
  ), 0);
  const totalCount = totalCountOverride ?? itemIds.length;
  const accentClass = tone === 'green' ? 'text-brand-green' : 'text-brand-red-soft';

  // Pre-compute which item indices render as "correct position" so the JSX map
  // below stays pure (no counter mutation during render). Only the first
  // `matchedCountOverride` position-matches are highlighted; the rest show as
  // wrong even if they happen to sit in a matching slot.
  const correctPositionIndices = new Set<number>();
  if (!forceAllWrong) {
    let counted = 0;
    itemIds.forEach((itemId, index) => {
      if (correctById.get(itemId)?.index !== index) return;
      const withinAuthoritativeCount =
        typeof matchedCountOverride !== 'number' || counted < matchedCountOverride;
      if (withinAuthoritativeCount) correctPositionIndices.add(index);
      counted += 1;
    });
  }

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
            const isCorrectPosition = correctPositionIndices.has(index);
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
                    {isCorrectPosition
                      ? t('possession.right')
                      : t('possession.shouldBe', { pos: typeof correctInfo?.index === 'number' ? correctInfo.index + 1 : '-' })}
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
  matchedCount: number | null | undefined,
): string[] {
  if (submittedOrderIds?.length) return submittedOrderIds;
  return matchedCount && matchedCount > 0
    ? buildFallbackPutInOrderSubmission(correctOrderIds, matchedCount)
    : [];
}

export function LivePutInOrderPanel({
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
  const { t } = useLocale();
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
    ? t('possession.perfect')
    : playerCorrectCount > 0
      ? t('possession.partial')
      : t('possession.wrong');
  const putOrderPlayerStatus: SpecialSummaryStatus = putOrderPlayerCorrect
    ? 'positive'
    : playerCorrectCount > 0
      ? 'neutral'
      : 'negative';
  const putOrderOpponentBadge = !roundResolved
    ? t('possession.waiting')
    : opponentRound?.isCorrect
      ? t('possession.perfect')
      : opponentCorrectCount && opponentCorrectCount > 0
        ? t('possession.partial')
        : t('possession.wrong');
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

      {/* Instruction — single inline line, no card. Keep whole words intact
          (Georgian must not break mid-word) and don't letter-space the
          instruction text so it wraps cleanly. */}
      <div className="flex items-start gap-2 px-1 text-[11px] font-fun font-black uppercase tracking-[0.18em] text-white/55">
        <ArrowUpDown className="size-3.5 shrink-0 translate-y-px text-brand-cyan" />
        <span className="[overflow-wrap:break-word] [word-break:keep-all]">
          {t('possession.dragArrangeFrom')}{' '}
          <span className="text-brand-cyan tracking-normal normal-case">{question.instruction}</span>
        </span>
      </div>

      <SpecialResultSummary
        visible={submittedForThisQuestion || roundResolved}
        tone="green"
        player={{
          label: t('possession.you'),
          count: playerCorrectCount,
          total: totalItems,
          points: putOrderPlayerPoints,
          badge: putOrderPlayerBadge,
          status: putOrderPlayerStatus,
          detail: t('possession.positionsMatched'),
        }}
        opponent={{
          label: t('possession.opp'),
          count: opponentCorrectCount,
          total: totalItems,
          points: putOrderOpponentPoints,
          badge: putOrderOpponentBadge,
          status: putOrderOpponentStatus,
          detail: roundResolved ? t('possession.positionsMatched') : t('possession.orderPending'),
        }}
      />

      {roundResolved ? (
        <PutInOrderResultComparison
          playerOrderIds={playerResultOrderIds}
          opponentOrderIds={opponentResultOrderIds}
          playerForceAllWrong={playerDidNotSubmit}
          opponentForceAllWrong={opponentDidNotSubmit}
          playerMatchedCount={playerDidNotSubmit ? 0 : playerCorrectCount}
          opponentMatchedCount={opponentDidNotSubmit ? 0 : opponentCorrectCount}
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
          {submitted ? t('possession.submittedOrder') : t('possession.submitOrder')}
        </button>
      )}
    </div>
  );
}

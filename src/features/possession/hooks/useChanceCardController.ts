'use client';

import { useCallback, useEffect, useMemo } from 'react';
import type { ResolvedMatchQuestionPayload } from '@/lib/realtime/socket.types';
import { getSocket } from '@/lib/realtime/socket-client';
import type { StoreInventoryItemDTO } from '@/lib/queries/store.queries';
import type { MatchStatus, OptimisticChanceCardState } from '@/stores/realtimeMatch.store';
import { createClientActionId } from '../realtimePossession.helpers';

type ApplyOptimisticChanceCard = (payload: {
  qIndex: number;
  clientActionId: string;
  eliminatedIndices: number[];
  remainingQuantityBefore: number | null;
}) => void;

type MarkOptimisticChanceCardPendingSync = (payload: {
  qIndex: number;
  clientActionId: string;
}) => void;

interface UseChanceCardControllerParams {
  match: MatchStatus | null;
  localQuestion: ResolvedMatchQuestionPayload | null;
  inventoryItems: StoreInventoryItemDTO[] | undefined;
  isPenaltyQuestion: boolean;
  isShotVisualPhase: boolean;
  isHalftime: boolean;
  questionPhase: 'reveal' | 'playing';
  roundResolved: boolean;
  selectedAnswer: number | null;
  correctIndex: number | undefined;
  applyOptimisticChanceCard: ApplyOptimisticChanceCard;
  markOptimisticChanceCardPendingSync: MarkOptimisticChanceCardPendingSync;
}

interface ChanceCardControllerResult {
  activeOptimisticChanceCard: OptimisticChanceCardState | null;
  chanceCardCount: number;
  handleUseChanceCard: () => void;
}

export function useChanceCardController({
  match,
  localQuestion,
  inventoryItems,
  isPenaltyQuestion,
  isShotVisualPhase,
  isHalftime,
  questionPhase,
  roundResolved,
  selectedAnswer,
  correctIndex,
  applyOptimisticChanceCard,
  markOptimisticChanceCardPendingSync,
}: UseChanceCardControllerParams): ChanceCardControllerResult {
  const localQuestionIndex = localQuestion?.qIndex ?? null;
  const optimisticChanceCard = match?.optimisticChanceCard ?? null;

  const chanceCardBaseQuantity = useMemo(() => {
    const chanceCardItem = (inventoryItems ?? []).find((item) => item.slug === 'chance_card_5050');
    return chanceCardItem?.quantity ?? 0;
  }, [inventoryItems]);

  const activeOptimisticChanceCard = useMemo(() => {
    if (!optimisticChanceCard || localQuestionIndex === null) return null;
    return optimisticChanceCard.qIndex === localQuestionIndex ? optimisticChanceCard : null;
  }, [localQuestionIndex, optimisticChanceCard]);

  const chanceCardCount = useMemo(() => {
    if (!activeOptimisticChanceCard) return chanceCardBaseQuantity;
    if (activeOptimisticChanceCard.remainingQuantityAfter !== null) {
      return activeOptimisticChanceCard.remainingQuantityAfter;
    }
    if (activeOptimisticChanceCard.pending || activeOptimisticChanceCard.pendingSync) {
      return Math.max(0, chanceCardBaseQuantity - 1);
    }
    return chanceCardBaseQuantity;
  }, [activeOptimisticChanceCard, chanceCardBaseQuantity]);

  useEffect(() => {
    if (!activeOptimisticChanceCard?.pending) return;
    const timer = setTimeout(() => {
      markOptimisticChanceCardPendingSync({
        qIndex: activeOptimisticChanceCard.qIndex,
        clientActionId: activeOptimisticChanceCard.clientActionId,
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [activeOptimisticChanceCard, markOptimisticChanceCardPendingSync]);

  const handleUseChanceCard = useCallback(() => {
    if (!match || !localQuestion) return;
    if (match.mode !== 'ranked') return;
    if (localQuestion.question.kind !== 'multipleChoice') return;
    if (isPenaltyQuestion || isShotVisualPhase || isHalftime) return;
    if (questionPhase !== 'playing') return;
    if (roundResolved || selectedAnswer !== null) return;
    if (activeOptimisticChanceCard) return;
    if (chanceCardCount <= 0) return;
    const optionsCount = localQuestion.question.options.length;
    if (typeof correctIndex !== 'number' || correctIndex < 0 || correctIndex >= optionsCount) return;
    const wrongIndices = Array.from({ length: optionsCount }, (_, index) => index).filter(
      (index) => index !== correctIndex
    );
    if (wrongIndices.length < 2) return;

    const eliminatedIndices = wrongIndices.slice(0, 2);
    const clientActionId = createClientActionId();

    applyOptimisticChanceCard({
      qIndex: localQuestion.qIndex,
      clientActionId,
      eliminatedIndices,
      remainingQuantityBefore: chanceCardCount,
    });

    getSocket().emit('match:chance_card_use', {
      matchId: match.matchId,
      qIndex: localQuestion.qIndex,
      clientActionId,
    });
  }, [
    activeOptimisticChanceCard,
    applyOptimisticChanceCard,
    chanceCardCount,
    correctIndex,
    isHalftime,
    isPenaltyQuestion,
    isShotVisualPhase,
    localQuestion,
    match,
    questionPhase,
    roundResolved,
    selectedAnswer,
  ]);

  return {
    activeOptimisticChanceCard,
    chanceCardCount,
    handleUseChanceCard,
  };
}

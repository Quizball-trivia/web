'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ArrowUpDown, CheckCircle2, GripVertical, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PutInOrderItem, PutInOrderQuestionData } from '../../types/matchQuestion.types';

// ─── Sortable item ────────────────────────────────────────────────────────────

function SortableItem({
  item,
  index,
  isRevealed,
  isCorrect,
}: {
  item: PutInOrderItem;
  index: number;
  isRevealed: boolean;
  isCorrect?: boolean;
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
        {/* Drag handle */}
        {!isRevealed && (
          <div {...attributes} {...listeners} className="shrink-0 touch-none cursor-grab active:cursor-grabbing">
            <GripVertical className="size-5 text-[#56707A]" />
          </div>
        )}

        {/* Position badge */}
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

        {/* Label */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {item.emoji && <span className="text-xl">{item.emoji}</span>}
            <span className="truncate text-sm font-bold text-white">{item.label}</span>
          </div>
          {item.details && (
            <p className="truncate text-xs text-[#56707A]">{item.details}</p>
          )}
        </div>

        {/* Sort value + result icon (revealed) */}
        {isRevealed ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-lg bg-[#243B44] px-2 py-0.5 text-xs font-bold text-white">
              {item.sortValue}
            </span>
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

// ─── Panel ────────────────────────────────────────────────────────────────────

interface RankedPutInOrderPanelProps {
  question: PutInOrderQuestionData;
  onComplete: (isCorrect: boolean) => void;
}

export function RankedPutInOrderPanel({ question, onComplete }: RankedPutInOrderPanelProps) {
  const [userOrder, setUserOrder] = useState<PutInOrderItem[]>(() => [...question.items]);
  const [isRevealed, setIsRevealed] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // sort_value represents rank/position (1 = first in correct order).
  const correctOrder = useMemo(
    () => [...question.items].sort((a, b) => a.sortValue - b.sortValue),
    [question.items],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setUserOrder((items) => {
      const oldIdx = items.findIndex((i) => i.id === active.id);
      const newIdx = items.findIndex((i) => i.id === over.id);
      return arrayMove(items, oldIdx, newIdx);
    });
  };

  const isItemCorrect = useCallback(
    (itemId: string, index: number) => correctOrder[index]?.id === itemId,
    [correctOrder],
  );

  const revealResultRef = useRef<boolean | null>(null);

  const handleSubmit = () => {
    revealResultRef.current = userOrder.every((item, idx) => isItemCorrect(item.id, idx));
    setIsRevealed(true);
  };

  // Delayed onComplete call after reveal — cleaned up on unmount.
  useEffect(() => {
    if (!isRevealed || revealResultRef.current === null) return;
    const result = revealResultRef.current;
    const timer = setTimeout(() => onComplete(result), 1400);
    return () => clearTimeout(timer);
  }, [isRevealed, onComplete]);

  const allCorrect = isRevealed && userOrder.every((item, idx) => isItemCorrect(item.id, idx));

  return (
    <div className="space-y-3">
      {/* Prompt */}
      <div className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-5 py-4">
        {question.categoryName && (
          <span className="mb-2 inline-flex items-center rounded-lg bg-[#1CB0F6]/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#1CB0F6]">
            ⚽ {question.categoryName}
          </span>
        )}
        <p className="mt-2 text-base font-black leading-snug text-white">{question.prompt}</p>
      </div>

      {/* Instruction */}
      <div className="flex items-start gap-2.5 rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-5 py-3">
        <div className="mt-0.5 shrink-0 rounded-lg bg-[#1CB0F6]/15 p-1.5">
          <ArrowUpDown className="size-4 text-[#1CB0F6]" />
        </div>
        <p className="text-sm text-white">
          <span className="font-bold">Drag to arrange</span> from{' '}
          <span className="font-bold text-[#1CB0F6]">{question.instruction}</span>.
        </p>
      </div>

      {/* Sortable list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={userOrder.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {userOrder.map((item, idx) => (
              <SortableItem
                key={item.id}
                item={item}
                index={idx}
                isRevealed={isRevealed}
                isCorrect={isRevealed ? isItemCorrect(item.id, idx) : undefined}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Result / Submit */}
      {isRevealed ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border-b-4 p-4 text-center ${
            allCorrect ? 'border-[#46A302] bg-[#58CC02]/10' : 'border-[#CC3C3C] bg-[#FF4B4B]/10'
          }`}
        >
          {allCorrect ? (
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
          className="w-full rounded-2xl border-b-4 border-[#46A302] bg-[#58CC02] py-3.5 font-black uppercase tracking-wide text-white transition-all active:translate-y-[2px] active:border-b-2 hover:bg-[#4DB800]"
        >
          Submit Order
        </button>
      )}
    </div>
  );
}

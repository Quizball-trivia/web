'use client';

// Weekend League put-in-order board: the daily game's dnd-kit sortable list
// on the synchronized WL clock, plus arrow buttons — on phones a drag can
// die to a stray scroll (see the money-drop slider saga), so every item is
// also orderable with two taps.

import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, Check, GripVertical } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';

export interface OrderItem {
  id: string;
  label: string;
  emoji?: string | null;
}

function Row({
  item, index, total, disabled, verdict, onMove,
}: {
  item: OrderItem;
  index: number;
  total: number;
  disabled: boolean;
  /** After reveal: was this item in the right slot? null = no reveal yet. */
  verdict: boolean | null;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded-[16px] border-2 px-3 py-3',
        verdict == null && 'border-brand-yellow bg-black/20',
        verdict === true && 'border-brand-green bg-brand-green/15',
        verdict === false && 'border-brand-red-soft bg-brand-red-soft/10',
        isDragging && 'z-10 opacity-90 shadow-xl',
      )}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10 font-poppins text-sm font-black text-white">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 truncate font-poppins text-[14px] font-bold text-white sm:text-base">
        {item.emoji ? `${item.emoji} ` : ''}{item.label}
      </span>
      {!disabled && (
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="up"
            onClick={() => onMove(item.id, -1)}
            disabled={index === 0}
            className="rounded-lg bg-white/10 p-1.5 text-white disabled:opacity-30"
          ><ArrowUp className="size-4" /></button>
          <button
            type="button"
            aria-label="down"
            onClick={() => onMove(item.id, 1)}
            disabled={index === total - 1}
            className="rounded-lg bg-white/10 p-1.5 text-white disabled:opacity-30"
          ><ArrowDown className="size-4" /></button>
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded-lg p-1.5 text-white/50 active:cursor-grabbing"
          ><GripVertical className="size-4" /></span>
        </span>
      )}
    </div>
  );
}

export function PutInOrderBoard({
  items,
  instruction,
  locked,
  windowClosing = false,
  spectator = false,
  correctOrder,
  onSubmit,
}: {
  items: OrderItem[];
  instruction?: string | null;
  locked: boolean;
  /** ~1s left: auto-submit an arrangement the player actually touched. */
  windowClosing?: boolean;
  spectator?: boolean;
  /** Reveal: the true sequence of ids; flips rows into verdict colors. */
  correctOrder: string[] | null;
  onSubmit: (order: string[]) => void;
}) {
  const { t } = useLocale();
  const [order, setOrder] = useState<OrderItem[]>(() => [...items]);
  const [submitted, setSubmitted] = useState(false);
  const touchedRef = useRef(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );

  const interactive = !locked && !spectator && correctOrder == null && !submitted;

  const move = (id: string, dir: -1 | 1) => {
    if (!interactive) return;
    touchedRef.current = true;
    setOrder((cur) => {
      const i = cur.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= cur.length) return cur;
      return arrayMove(cur, i, j);
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (!interactive || e.over == null || e.active.id === e.over.id) return;
    touchedRef.current = true;
    setOrder((cur) => {
      const i = cur.findIndex((x) => x.id === e.active.id);
      const j = cur.findIndex((x) => x.id === e.over!.id);
      return arrayMove(cur, i, j);
    });
  };

  const submit = () => {
    if (!interactive) return;
    setSubmitted(true);
    onSubmit(order.map((x) => x.id));
  };

  // Window closing: an arrangement the player worked on must not die unsent.
  const orderRef = useRef(order);
  useEffect(() => { orderRef.current = order; }, [order]);
  const submitRef = useRef(false);
  useEffect(() => {
    if (!windowClosing || submitted || spectator || correctOrder != null || submitRef.current) return;
    if (!touchedRef.current) return;
    submitRef.current = true;
    onSubmit(orderRef.current.map((x) => x.id));
  }, [windowClosing, submitted, spectator, correctOrder, onSubmit]);

  const display = correctOrder != null ? order : order;
  const verdictOf = (id: string, index: number): boolean | null => {
    if (correctOrder == null) return null;
    return correctOrder[index] === id;
  };

  return (
    <div className="mt-3 space-y-2.5">
      {instruction && (
        <div className="text-center font-poppins text-[12px] font-bold uppercase tracking-wide text-brand-cyan">
          {instruction}
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={display.map((x) => x.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {display.map((item, i) => (
              <Row
                key={item.id}
                item={item}
                index={i}
                total={display.length}
                disabled={!interactive}
                verdict={verdictOf(item.id, i)}
                onMove={move}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {interactive && (
        <button
          type="button"
          onClick={submit}
          className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-brand-green py-3.5 font-poppins text-sm font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green-deep"
        >
          <Check className="size-5" /> {t('dailyGames.submitOrder')}
        </button>
      )}
      {submitted && correctOrder == null && (
        <div className="text-center font-poppins text-[13px] font-bold uppercase text-white/50">
          {t('dailyGames.revealingAnswer')}
        </div>
      )}
    </div>
  );
}

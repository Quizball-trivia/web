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
import { Check, CheckCircle2, XCircle } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';

export interface OrderItem {
  id: string;
  label: string;
  emoji?: string | null;
}

function Row({
  item, index, disabled, verdict,
}: {
  item: OrderItem;
  index: number;
  disabled: boolean;
  /** After reveal: was this item in the right slot? null = no reveal yet. */
  verdict: boolean | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled });
  // Ranked parity: the WHOLE card is the drag handle — grips and arrows made
  // people hunt for the grab point (same feedback that shaped ranked's panel).
  const dragProps = disabled ? {} : { ...attributes, ...listeners };
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={isDragging ? 'z-50' : 'z-0'}
    >
      <div
        {...dragProps}
        className={cn(
          'flex items-center gap-2 rounded-[14px] px-3 py-3 transition-all sm:gap-3 sm:p-3',
          verdict == null && !disabled && 'cursor-grab touch-none bg-white/[0.04] hover:bg-white/[0.07] active:cursor-grabbing',
          verdict == null && disabled && 'bg-white/[0.04]',
          verdict === true && 'bg-brand-green/12',
          verdict === false && 'bg-brand-red-soft/12',
          isDragging && 'scale-[1.02] shadow-xl',
        )}
      >
        <div
          className={cn(
            'font-poppins flex h-14 w-20 shrink-0 items-center justify-center rounded-[30px] text-white sm:h-16 sm:w-24',
            verdict === false
              ? 'bg-brand-red-soft shadow-[0_0_10px_rgba(255,75,75,0.35)]'
              : 'bg-brand-green shadow-[0_0_10px_rgba(56,182,14,0.35)]',
          )}
          style={{ fontWeight: 700, fontSize: 24 }}
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
        </div>
        {verdict != null && (
          <div className="flex shrink-0 items-center gap-2">
            {verdict ? (
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
                disabled={!interactive}
                verdict={verdictOf(item.id, i)}
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

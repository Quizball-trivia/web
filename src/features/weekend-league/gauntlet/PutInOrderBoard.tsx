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
import { motion } from 'motion/react';
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

function RevealColumn({
  title, itemIds, correctIndexById, itemById, showHints, allCorrect = false, emptyText,
}: {
  title: string;
  itemIds: string[];
  correctIndexById: Map<string, number>;
  itemById: Map<string, OrderItem>;
  /** "Right / Should be #N" per row (the player's column). */
  showHints: boolean;
  /** Render every slot green (the correct-order column). */
  allCorrect?: boolean;
  emptyText?: string;
}) {
  const { t } = useLocale();
  const matched = allCorrect
    ? itemIds.length
    : itemIds.reduce((count, id, i) => (correctIndexById.get(id) === i ? count + 1 : count), 0);
  return (
    <div className="grid min-w-0 grid-rows-[1.1rem_auto] gap-1.5">
      <div className="grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-2">
        <h3 className="truncate text-[9px] font-fun font-black uppercase tracking-[0.18em] text-white/50 sm:text-[10px]">
          {title}
        </h3>
        {itemIds.length > 0 && (
          <span className={`justify-self-end text-[10px] font-fun font-black uppercase ${allCorrect ? 'text-brand-green' : matched === itemIds.length ? 'text-brand-green' : 'text-brand-red-soft'}`}>
            {matched}/{correctIndexById.size}
          </span>
        )}
      </div>
      {itemIds.length === 0 ? (
        <p className="rounded-[8px] border border-white/10 px-2 py-3 text-[10px] font-fun font-black uppercase tracking-[0.16em] text-white/35">
          {emptyText}
        </p>
      ) : (
        <div className="grid auto-rows-[4.5rem] gap-1 sm:auto-rows-[4.875rem]">
          {itemIds.map((id, i) => {
            const item = itemById.get(id);
            const isCorrectPosition = allCorrect || correctIndexById.get(id) === i;
            const shouldBe = correctIndexById.get(id);
            return (
              <div
                key={`${title}-${id}-${i}`}
                className={`grid h-full items-center gap-1.5 rounded-[8px] border px-1.5 sm:gap-2 sm:px-2 ${
                  showHints ? 'grid-cols-[1.45rem_minmax(0,1fr)] sm:grid-cols-[2rem_minmax(0,1fr)_6rem]' : 'grid-cols-[1.45rem_minmax(0,1fr)] sm:grid-cols-[2rem_minmax(0,1fr)]'
                } ${
                  isCorrectPosition
                    ? 'border-brand-green/25 bg-brand-green/10'
                    : 'border-brand-red-soft/20 bg-brand-red-soft/8'
                }`}
              >
                <span className={`flex size-6 items-center justify-center rounded-[6px] text-[10px] font-fun font-black sm:size-7 sm:text-xs ${
                  isCorrectPosition ? 'bg-brand-green text-white' : 'bg-brand-red-soft/80 text-white'
                }`}>
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {item?.emoji && <span className="shrink-0 text-sm sm:text-base">{item.emoji}</span>}
                    <span className="truncate text-[10px] font-fun font-black uppercase text-white sm:text-xs">
                      {item?.label ?? id}
                    </span>
                  </span>
                </span>
                {showHints && (
                  <span className={`hidden justify-self-end text-right text-[10px] font-fun font-black uppercase sm:block ${
                    isCorrectPosition ? 'text-brand-green' : 'text-white/35'
                  }`}>
                    {isCorrectPosition
                      ? t('possession.right')
                      : t('possession.shouldBe', { pos: typeof shouldBe === 'number' ? shouldBe + 1 : '-' })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RevealComparison({
  yourOrder, correctOrder, itemById,
}: {
  /** null = never submitted an arrangement this window. */
  yourOrder: OrderItem[] | null;
  correctOrder: string[];
  itemById: Map<string, OrderItem>;
}) {
  const { t } = useLocale();
  const correctIndexById = new Map(correctOrder.map((id, i) => [id, i]));
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 space-y-2 px-1"
    >
      <div className="text-[11px] font-fun font-black uppercase tracking-[0.22em] text-white/55">
        {t('possession.orderResults')}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <RevealColumn
          title={t('results.you')}
          itemIds={yourOrder != null ? yourOrder.map((x) => x.id) : []}
          correctIndexById={correctIndexById}
          itemById={itemById}
          showHints
          emptyText={t('possession.noOrderSubmitted')}
        />
        <RevealColumn
          title={t('weekendLeague.gCorrectOrder')}
          itemIds={correctOrder}
          correctIndexById={correctIndexById}
          itemById={itemById}
          showHints={false}
          allCorrect
        />
      </div>
    </motion.div>
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
    queueMicrotask(() => setSubmitted(true));
    onSubmit(orderRef.current.map((x) => x.id));
  }, [windowClosing, submitted, spectator, correctOrder, onSubmit]);

  // Reveal: the ranked result comparison (LivePutInOrderPanel's language) —
  // your submitted order judged slot-by-slot next to the full correct
  // sequence, so the right order is actually readable, not a color flash.
  if (correctOrder != null) {
    return (
      <RevealComparison
        yourOrder={submitted ? order : null}
        correctOrder={correctOrder}
        itemById={new Map(items.map((x) => [x.id, x]))}
      />
    );
  }

  return (
    <div className="mt-3 space-y-2.5">
      {instruction && (
        <div className="text-center font-poppins text-[12px] font-bold uppercase tracking-wide text-brand-cyan">
          {instruction}
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order.map((x) => x.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {order.map((item, i) => (
              <Row
                key={item.id}
                item={item}
                index={i}
                disabled={!interactive}
                verdict={null}
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

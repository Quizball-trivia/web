"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Phones: two cards per row (three crammed the art and titles); tablets up: three.
export const CARD_WIDTH =
  "w-[calc((100%_-_0.625rem)/2)] shrink-0 snap-start md:w-[calc((100%_-_2rem)/3)]";

/** Horizontal card row with desktop arrow controls — a mouse has no swipe, so
 *  without these the cards past the fold were unreachable on the web. Arrows
 *  appear only when there is something to scroll to, and only on pointer
 *  devices (touch keeps the clean swipe surface). */
export function CardScroller({ children }: { children: React.ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const syncArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncArrows();
    const observer = new ResizeObserver(syncArrows);
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncArrows]);
  // Filtering changes scrollWidth without resizing the scroller; re-check after every render.
  useEffect(syncArrows);

  const scrollByPage = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // One "page" is just under a viewport width so a card always peeks through.
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const arrowBase =
    "absolute top-1/2 z-20 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-brand-yellow text-black shadow-lg transition-colors hover:bg-brand-yellow/90 md:grid";

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByPage(-1)}
          className={`${arrowBase} left-0 -translate-x-1/2`}
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      <div
        ref={scrollerRef}
        onScroll={syncArrows}
        className="-mx-4 flex snap-x scroll-px-4 gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-1 md:gap-4"
      >
        {children}
      </div>
      {canScrollRight && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByPage(1)}
          className={`${arrowBase} right-0 translate-x-1/2`}
        >
          <ChevronRight className="size-5" />
        </button>
      )}
    </div>
  );
}

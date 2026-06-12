'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Shared MCQ answer-layout helpers (the chosen "Variant C").
 *
 * Rule: render a 2×2 grid when the answers are short, but switch to a full-width
 * vertical stack when ANY answer is long — so a one-word answer and an 89-char
 * sentence both read well, on every screen size. Cards always keep even padding
 * on all sides (text never touches the border):
 *   - 2×2 (short)  → font shrinks-to-fit the card WIDTH (no horizontal clipping).
 *   - stack (long) → FIXED font; the card auto-grows to the wrapped text so the
 *                    padding is never eaten by the font expanding to fill height.
 *
 * Consumers keep their own button chrome (states, notches, chips, animations)
 * and just (a) ask `useLongAnswerLayout(options)` whether to stack, and
 * (b) render the option text through <AdaptiveAnswerText>.
 */

// Any option longer than this (in characters) flips the whole set to a stack.
const LONG_ANSWER_THRESHOLD = 28;

export function isLongAnswerSet(options: readonly string[]): boolean {
  return options.some((o) => (o?.length ?? 0) > LONG_ANSWER_THRESHOLD);
}

export interface AdaptiveAnswerTextProps {
  children: string;
  /** True when the parent set rendered as a vertical stack (long answers). */
  stacked: boolean;
  /** Largest font (px) for the 2×2 grid path. */
  gridMaxFontSize?: number;
  /** Smallest font (px) the 2×2 grid path may shrink to. */
  gridMinFontSize?: number;
  /** Fixed font (px) for the stacked path (no shrinking). */
  stackedFontSize?: number;
  className?: string;
  style?: React.CSSProperties;
}

const TEXT_CLASS = 'text-center leading-[1.15] [word-break:keep-all] [overflow-wrap:normal]';

/**
 * Renders one answer's text with the Variant-C fitting behavior.
 *  - stacked → fixed font, lets the card grow (padding preserved).
 *  - grid    → shrink-to-fit-width via measurement (no clipping).
 */
export function AdaptiveAnswerText({
  children,
  stacked,
  gridMaxFontSize = 28,
  gridMinFontSize = 12,
  stackedFontSize = 18,
  className,
  style,
}: AdaptiveAnswerTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(stacked ? stackedFontSize : gridMaxFontSize);

  useIsoLayoutEffect(() => {
    if (stacked) {
      setFontSize(stackedFontSize);
      return;
    }
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    // Available space = the parent's CONTENT box (inside its padding). `el` is a
    // width:100% block, so its own clientWidth already excludes the parent's
    // horizontal padding — using parent.clientWidth here would over-report the
    // width by the px-* padding and let the text overflow + clip. For height the
    // span has no fixed box, so subtract the parent's vertical padding from its
    // clientHeight to get the real room.
    const avail = () => {
      const cs = getComputedStyle(parent);
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      return {
        width: el.clientWidth,
        height: Math.max(0, parent.clientHeight - padY),
      };
    };

    const fits = (size: number): boolean => {
      el.style.fontSize = `${size}px`;
      const { width, height } = avail();
      return el.scrollHeight <= height + 0.5 && el.scrollWidth <= width + 0.5;
    };

    const measure = () => {
      if (fits(gridMaxFontSize)) {
        setFontSize(gridMaxFontSize);
        return;
      }
      if (!fits(gridMinFontSize)) {
        const { width, height } = avail();
        const wr = el.scrollWidth > 0 ? width / el.scrollWidth : 1;
        const hr = el.scrollHeight > 0 ? height / el.scrollHeight : 1;
        const scale = Math.min(wr, hr, 1);
        setFontSize(Math.max(8, Math.floor(gridMinFontSize * scale)));
        return;
      }
      let lo = gridMinFontSize;
      let hi = gridMaxFontSize;
      let best = gridMinFontSize;
      for (let i = 0; i < 12 && hi - lo > 0.5; i += 1) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      setFontSize(best);
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(parent);
    return () => ro.disconnect();
  }, [children, stacked, gridMaxFontSize, gridMinFontSize, stackedFontSize]);

  return (
    <span
      ref={ref}
      className={`${TEXT_CLASS} ${className ?? ''}`}
      style={{ ...style, fontSize: `${fontSize}px`, display: 'block', width: '100%' }}
    >
      {children}
    </span>
  );
}

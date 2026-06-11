'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface FitTextProps {
  /** The text to render, scaled down until it fits the container. */
  children: string;
  /** Largest font size in px (the comfortable/default size for short text). */
  maxFontSize: number;
  /** Smallest font size in px the text is allowed to shrink to. */
  minFontSize: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders text that auto-shrinks its font size until it fully fits the parent
 * box — no truncation, no ellipsis, no overflow. The card keeps a fixed height
 * (uniform 2×2 grid); only the font scales. Long answers get smaller; short
 * answers stay at maxFontSize.
 *
 * Picks the largest font size (binary search between min/max) at which the text
 * neither overflows horizontally nor vertically, re-measuring on text change
 * and container resize.
 */
export function FitText({ children, maxFontSize, minFontSize, className, style }: FitTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    const fits = (size: number): boolean => {
      el.style.fontSize = `${size}px`;
      // The span is width-constrained to the parent; check it doesn't spill the
      // parent's content box in either axis.
      return (
        el.scrollHeight <= parent.clientHeight + 0.5 &&
        el.scrollWidth <= parent.clientWidth + 0.5
      );
    };

    const measure = () => {
      // Fast path: max size already fits.
      if (fits(maxFontSize)) {
        setFontSize(maxFontSize);
        return;
      }
      // If even the minimum doesn't fit (extremely long text / tiny box), scale
      // BELOW the minimum by the overflow ratio so the text still fits — never
      // clips. fits() leaves the font set to minFontSize, so measure overflow here.
      if (!fits(minFontSize)) {
        const widthRatio = el.scrollWidth > 0 ? parent.clientWidth / el.scrollWidth : 1;
        const heightRatio = el.scrollHeight > 0 ? parent.clientHeight / el.scrollHeight : 1;
        const scale = Math.min(widthRatio, heightRatio, 1);
        // Floor at a hard 6px so it never collapses to unreadable/zero.
        setFontSize(Math.max(6, Math.floor(minFontSize * scale)));
        return;
      }
      // Binary search for the largest fitting size.
      let lo = minFontSize;
      let hi = maxFontSize;
      let best = minFontSize;
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

    // Re-measure on container resize. Guard for environments without
    // ResizeObserver (jsdom/SSR) — the initial measure still runs.
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(parent);
    return () => ro.disconnect();
  }, [children, maxFontSize, minFontSize]);

  return (
    <span
      ref={ref}
      className={className}
      style={{ ...style, fontSize: `${fontSize}px`, display: 'block', width: '100%' }}
    >
      {children}
    </span>
  );
}

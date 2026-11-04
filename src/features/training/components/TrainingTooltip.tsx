"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import type { MessageKey } from "@/lib/i18n/messages";

export interface HighlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Measure the element a tooltip spotlights. Multiple matches can exist
 * (desktop + mobile layouts render twice) — the largest visible one wins.
 * Retries over a few frames because targets may still be mounting/animating.
 */
function useHighlightRect(selector: string | undefined, retryKey: string): HighlightRect | null {
  const [rect, setRect] = useState<HighlightRect | null>(null);

  useEffect(() => {
    if (!selector) return;
    let rafId = 0;
    let tries = 0;

    const measure = () => {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector))
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 4 && r.height > 4);
      const best = candidates.sort((a, b) => b.width * b.height - a.width * a.height)[0] ?? null;
      setRect(best ? { left: best.left, top: best.top, width: best.width, height: best.height } : null);
      if (!best && tries < 30) {
        tries += 1;
        rafId = requestAnimationFrame(measure);
      }
    };

    rafId = requestAnimationFrame(measure);
    // The page can move under the tooltip (mobile auto-scrolls each new
    // question into view) — track scrolls anywhere plus a slow safety poll so
    // the spotlight never strands at a pre-scroll position.
    const intervalId = setInterval(measure, 300);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(intervalId);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [selector, retryKey]);

  return selector ? rect : null;
}

interface TrainingTooltipProps {
  titleKey: MessageKey;
  messageKey: MessageKey;
  position: "top" | "center" | "bottom";
  /** CSS selector of the element this tooltip explains — spotlighted above the dim backdrop. */
  highlightSelector?: string;
  onDismiss: () => void;
  onSkip: () => void;
}

type CaretSide = "top" | "bottom" | "left" | "right";

interface AnchoredPlacement {
  card: CSSProperties;
  /** Which EDGE of the card the caret sits on (pointing back at the target). */
  caretSide: CaretSide;
  caretOffsetPx: number;
}

/** The visible box a tooltip card must stay inside: the viewport minus the
 *  safe-area insets (notch / home indicator) and an edge margin. */
export interface TooltipBounds {
  vw: number;
  top: number;
  bottom: number;
}

const CARD_GAP = 18;
const EDGE_MARGIN = 12;
/** First-frame guess until the real card height is measured. */
const CARD_EST_H = 240;
/** Distance of the static "top"/"bottom" slots from the safe edge (was top-24 / bottom-24). */
const STATIC_EDGE_OFFSET = 96;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Place the card next to the spotlighted rect: below it, else above, else
 * beside — using the card's MEASURED height, so a long (translated) message
 * can no longer hang off the bottom of a small phone. Returns null when no
 * adjacent slot fits whole; the caller then uses the static slot (the
 * spotlight hole still marks the target).
 */
export function placeCard(rect: HighlightRect, bounds: TooltipBounds, cardH: number): AnchoredPlacement | null {
  const { vw } = bounds;
  const cardW = Math.min(384, vw - EDGE_MARGIN * 2);
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const below = rect.top + rect.height + CARD_GAP;
  const above = rect.top - CARD_GAP - cardH;
  const left = clamp(cx - cardW / 2, EDGE_MARGIN, vw - cardW - EDGE_MARGIN);
  const caretX = clamp(cx - left, 28, cardW - 28);
  const fitsBelow = below + cardH <= bounds.bottom;
  const fitsAbove = above >= bounds.top;
  const spaceBelow = bounds.bottom - below;
  const spaceAbove = rect.top - CARD_GAP - bounds.top;

  // Prefer below; take above when only it fits, or when both fit and above has more room.
  if (fitsBelow && (!fitsAbove || spaceBelow >= spaceAbove)) {
    return { card: { top: below, left, width: cardW }, caretSide: "top", caretOffsetPx: caretX };
  }
  if (fitsAbove) {
    return { card: { top: above, left, width: cardW }, caretSide: "bottom", caretOffsetPx: caretX };
  }

  // Tall target (e.g. the desktop portrait pitch) — sit beside it instead,
  // but only where a readable card genuinely fits.
  const MIN_SIDE_W = 240;
  const spaceRight = vw - (rect.left + rect.width) - CARD_GAP - EDGE_MARGIN;
  const spaceLeft = rect.left - CARD_GAP - EDGE_MARGIN;
  if (cardH > bounds.bottom - bounds.top) return null;
  const top = clamp(cy - cardH / 2, bounds.top, bounds.bottom - cardH);
  const caretY = clamp(cy - top, 28, cardH - 28);

  if (spaceRight >= MIN_SIDE_W) {
    return {
      card: { top, left: rect.left + rect.width + CARD_GAP, width: Math.min(384, spaceRight) },
      caretSide: "left",
      caretOffsetPx: caretY,
    };
  }
  if (spaceLeft >= MIN_SIDE_W) {
    const width = Math.min(384, spaceLeft);
    return {
      card: { top, left: Math.max(EDGE_MARGIN, rect.left - CARD_GAP - width), width },
      caretSide: "right",
      caretOffsetPx: caretY,
    };
  }
  return null;
}

/** Top of the card in its static slot, clamped so the whole card stays on screen. */
export function staticCardTop(position: "top" | "center" | "bottom", bounds: TooltipBounds, cardH: number): number {
  const preferred =
    position === "top"
      ? bounds.top + STATIC_EDGE_OFFSET
      : position === "bottom"
        ? bounds.bottom - STATIC_EDGE_OFFSET - cardH
        : (bounds.top + bounds.bottom) / 2 - cardH / 2;
  return clamp(preferred, bounds.top, bounds.bottom - cardH);
}

/**
 * Viewport box minus safe-area insets. The insets are read from a probe
 * element positioned with env(safe-area-inset-*), since JS can't read env().
 */
function useTooltipBounds() {
  const probeRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<TooltipBounds | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const probe = probeRef.current?.getBoundingClientRect();
      const vh = window.innerHeight;
      const safeTop = probe && probe.height > 0 ? probe.top : 0;
      const safeBottom = probe && probe.height > 0 ? probe.bottom : vh;
      setBounds({ vw: window.innerWidth, top: safeTop + EDGE_MARGIN, bottom: safeBottom - EDGE_MARGIN });
    };
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);

  return { probeRef, bounds };
}

/** Rendered height of the card, re-measured whenever its content reflows. */
function useElementHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const h = el.offsetHeight;
      if (h > 0) setHeight(h);
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, height };
}

export function TrainingTooltip({
  titleKey,
  messageKey,
  position,
  highlightSelector,
  onDismiss,
  onSkip,
}: TrainingTooltipProps) {
  const { t } = useLocale();
  const highlightRect = useHighlightRect(highlightSelector, titleKey);
  const { probeRef, bounds } = useTooltipBounds();
  const { ref: cardRef, height: measuredH } = useElementHeight<HTMLDivElement>();
  const cardH = measuredH ?? CARD_EST_H;
  const PAD = 6;

  const anchored = highlightRect && bounds ? placeCard(highlightRect, bounds, cardH) : null;
  const staticTop = !anchored && bounds ? staticCardTop(position, bounds, cardH) : null;

  const caretStyle: CSSProperties | null = anchored
    ? anchored.caretSide === "top"
      ? { top: -8, left: anchored.caretOffsetPx - 8 }
      : anchored.caretSide === "bottom"
        ? { bottom: -8, left: anchored.caretOffsetPx - 8 }
        : anchored.caretSide === "left"
          ? { left: -8, top: anchored.caretOffsetPx - 8 }
          : { right: -8, top: anchored.caretOffsetPx - 8 }
    : null;

  return (
    <div className="fixed inset-0 z-[100] font-poppins select-none">
      {/* Safe-area probe: spans the viewport between the top and bottom insets. */}
      <div
        ref={probeRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 w-px"
        style={{ top: "env(safe-area-inset-top, 0px)", bottom: "env(safe-area-inset-bottom, 0px)" }}
      />

      {/* Backdrop — when a target is spotlighted, the dimming comes from the
          spotlight's giant box-shadow so the target itself stays bright. */}
      {highlightRect ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-none absolute rounded-2xl border-2 border-brand-yellow/80"
          style={{
            left: highlightRect.left - PAD,
            top: highlightRect.top - PAD,
            width: highlightRect.width + PAD * 2,
            height: highlightRect.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6), 0 0 28px rgba(255,229,0,0.35)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/50" />
      )}

      {/* Skip link */}
      <button
        onClick={onSkip}
        className="absolute top-[calc(env(safe-area-inset-top,0px)+3rem)] right-4 z-10 text-xs font-semibold text-white/40 uppercase tracking-wider hover:text-white/70 transition-colors"
      >
        {t("training.skipTraining")}
      </button>

      {/* Tooltip card — anchored beside the spotlighted element (with a caret
          pointing at it), or in the static slot when nothing is highlighted.
          Both are clamped to the safe viewport using the measured card height;
          the card itself is capped at the safe viewport height and scrolls
          its message, so the GOT IT button is always reachable. */}
      <div
        className={cn(
          "absolute",
          !anchored && "left-0 right-0 flex justify-center px-4",
          // First frame, before the viewport is measured: the legacy slots.
          !anchored && staticTop === null && position === "top" && "top-24",
          !anchored && staticTop === null && position === "center" && "top-1/2 -translate-y-1/2",
          !anchored && staticTop === null && position === "bottom" && "bottom-24",
        )}
        style={anchored?.card ?? (staticTop !== null ? { top: staticTop } : undefined)}
      >
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.85, y: position === "top" ? -20 : 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="relative flex w-full max-w-sm max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] flex-col bg-brand-blue rounded-2xl p-5 shadow-2xl"
        >
          {caretStyle && (
            <div className="absolute h-4 w-4 rotate-45 bg-brand-blue" style={caretStyle} />
          )}
          <h3 className="shrink-0 font-poppins text-lg text-white uppercase tracking-wide mb-2">
            {t(titleKey)}
          </h3>
          <p className="min-h-0 overflow-y-auto overscroll-contain text-sm font-medium text-white/85 leading-relaxed mb-5">
            {t(messageKey)}
          </p>
          <button
            onClick={onDismiss}
            className="shrink-0 font-poppins w-full py-3 rounded-xl bg-brand-green text-sm text-white uppercase tracking-wider transition-colors hover:bg-brand-green-deep active:scale-[0.99]"
          >
            {t("training.gotIt")}
          </button>
        </motion.div>
      </div>
    </div>
  );
}

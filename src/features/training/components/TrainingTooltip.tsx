"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import type { MessageKey } from "@/lib/i18n/messages";

interface HighlightRect {
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

const CARD_GAP = 18;
const EDGE_MARGIN = 12;
const CARD_EST_H = 240;

/**
 * Place the card next to the spotlighted rect: below it, else above, else
 * beside. Returns null when no adjacent slot fits — the caller then falls back
 * to the static position (the spotlight hole still marks the target).
 */
function placeCard(rect: HighlightRect, vw: number, vh: number): AnchoredPlacement | null {
  const cardW = Math.min(384, vw - EDGE_MARGIN * 2);
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const spaceBelow = vh - (rect.top + rect.height);
  const spaceAbove = rect.top;

  if (spaceBelow >= CARD_EST_H + CARD_GAP || spaceBelow >= spaceAbove) {
    if (spaceBelow >= CARD_EST_H * 0.6) {
      const left = Math.min(Math.max(cx - cardW / 2, EDGE_MARGIN), vw - cardW - EDGE_MARGIN);
      return {
        card: { top: rect.top + rect.height + CARD_GAP, left, width: cardW },
        caretSide: "top",
        caretOffsetPx: Math.min(Math.max(cx - left, 28), cardW - 28),
      };
    }
  } else if (spaceAbove >= CARD_EST_H * 0.6) {
    const left = Math.min(Math.max(cx - cardW / 2, EDGE_MARGIN), vw - cardW - EDGE_MARGIN);
    return {
      card: { bottom: vh - rect.top + CARD_GAP, left, width: cardW },
      caretSide: "bottom",
      caretOffsetPx: Math.min(Math.max(cx - left, 28), cardW - 28),
    };
  }

  // Tall target (e.g. the desktop portrait pitch) — sit beside it instead,
  // but only where a readable card genuinely fits.
  const MIN_SIDE_W = 240;
  const spaceRight = vw - (rect.left + rect.width) - CARD_GAP - EDGE_MARGIN;
  const spaceLeft = rect.left - CARD_GAP - EDGE_MARGIN;
  const top = Math.min(Math.max(cy - CARD_EST_H / 2, EDGE_MARGIN), Math.max(vh - CARD_EST_H - EDGE_MARGIN, EDGE_MARGIN));

  if (spaceRight >= MIN_SIDE_W) {
    return {
      card: { top, left: rect.left + rect.width + CARD_GAP, width: Math.min(384, spaceRight) },
      caretSide: "left",
      caretOffsetPx: Math.min(Math.max(cy - top, 28), CARD_EST_H - 28),
    };
  }
  if (spaceLeft >= MIN_SIDE_W) {
    const width = Math.min(384, spaceLeft);
    return {
      card: { top, left: Math.max(EDGE_MARGIN, rect.left - CARD_GAP - width), width },
      caretSide: "right",
      caretOffsetPx: Math.min(Math.max(cy - top, 28), CARD_EST_H - 28),
    };
  }
  return null;
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
  const PAD = 6;

  const anchored = highlightRect && typeof window !== "undefined"
    ? placeCard(highlightRect, window.innerWidth, window.innerHeight)
    : null;

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
        className="absolute top-12 right-4 z-10 text-xs font-semibold text-white/40 uppercase tracking-wider hover:text-white/70 transition-colors"
      >
        {t("training.skipTraining")}
      </button>

      {/* Tooltip card — anchored beside the spotlighted element (with a caret
          pointing at it), or in the static slot when nothing is highlighted. */}
      <div
        className={cn(
          "absolute",
          !anchored && "left-0 right-0 flex justify-center px-4",
          !anchored && position === "top" && "top-24",
          !anchored && position === "center" && "top-1/2 -translate-y-1/2",
          !anchored && position === "bottom" && "bottom-24",
        )}
        style={anchored?.card}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: position === "top" ? -20 : 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="relative w-full max-w-sm bg-brand-blue rounded-2xl p-5 shadow-2xl"
        >
          {caretStyle && (
            <div className="absolute h-4 w-4 rotate-45 bg-brand-blue" style={caretStyle} />
          )}
          <h3 className="font-poppins text-lg text-white uppercase tracking-wide mb-2">
            {t(titleKey)}
          </h3>
          <p className="text-sm font-medium text-white/85 leading-relaxed mb-5">
            {t(messageKey)}
          </p>
          <button
            onClick={onDismiss}
            className="font-poppins w-full py-3 rounded-xl bg-brand-green text-sm text-white uppercase tracking-wider transition-colors hover:bg-brand-green-deep active:scale-[0.99]"
          >
            {t("training.gotIt")}
          </button>
        </motion.div>
      </div>
    </div>
  );
}

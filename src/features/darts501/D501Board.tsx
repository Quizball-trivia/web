"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion } from "motion/react";
import { Check, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { poppins } from "@/features/wordgames/ui";
import { THROWN, checkoutWindow } from "./d501.rules";
import { d501Copy } from "./d501.copy";
import type { Dart } from "./d501.view";

/** Counts down to `value` when it drops (a dart landing), jumps when it rises (a new leg). */
export function useCountTo(value: number): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (value >= start) { const id = window.setTimeout(() => setShown(value), 0); return () => window.clearTimeout(id); }
    const controls = animate(start, value, { duration: 0.7, ease: "easeOut", onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [value]);
  return shown;
}

const SEGMENTS = 20;
/** Where a dart sits on the board: hits land on the board, a checkout in the bull, a miss off it. Same dart, same spot. */
function spot(dart: Dart): { x: number; y: number } {
  const h = Math.abs(Math.imul(dart.id + 7, 2654435761) >>> 0);
  const angle = ((h % 360) * Math.PI) / 180;
  const r = dart.verdict === "checkout" ? 0.05 : dart.verdict === "score" ? 0.22 + ((h >> 9) % 60) / 100 : dart.verdict === "bust" || dart.verdict === "over180" || dart.verdict === "bogey" ? 0.9 : 1.08;
  return { x: 50 + Math.cos(angle) * r * 44, y: 50 + Math.sin(angle) * r * 44 };
}

/** A dartboard in the brand colours, with the leg's darts stuck in it. */
export function Dartboard({ darts, className }: { darts: readonly Dart[]; className?: string }) {
  const wedge = (i: number, r0: number, r1: number) => {
    const a0 = ((i - 0.5) / SEGMENTS) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((i + 0.5) / SEGMENTS) * 2 * Math.PI - Math.PI / 2;
    const p = (r: number, a: number) => `${50 + Math.cos(a) * r} ${50 + Math.sin(a) * r}`;
    return `M ${p(r0, a0)} L ${p(r1, a0)} A ${r1} ${r1} 0 0 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 0 0 ${p(r0, a0)} Z`;
  };
  const thrown = darts.filter((d) => THROWN.has(d.verdict) && d.verdict !== "time");
  return (
    <svg viewBox="-4 -4 108 108" className={cn("overflow-visible", className)} aria-hidden>
      <circle cx="50" cy="50" r="49" className="fill-black/40" />
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <g key={i}>
          <path d={wedge(i, 7, 44)} className={i % 2 ? "fill-surface-card" : "fill-white/[0.08]"} />
          <path d={wedge(i, 27, 31)} className={i % 2 ? "fill-brand-blue" : "fill-brand-green"} />
          <path d={wedge(i, 40, 44)} className={i % 2 ? "fill-brand-blue" : "fill-brand-green"} />
        </g>
      ))}
      <circle cx="50" cy="50" r="7" className="fill-brand-green" />
      <circle cx="50" cy="50" r="3" className="fill-brand-yellow" />
      <AnimatePresence>
        {thrown.map((d) => {
          const { x, y } = spot(d);
          const bad = d.verdict === "bust" || d.verdict === "over180" || d.verdict === "bogey";
          return (
            <motion.g key={d.id} initial={{ opacity: 0, scale: 2.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 420, damping: 22 }} style={{ originX: `${x}px`, originY: `${y}px` }}>
              <line x1={x} y1={y} x2={x + 6} y2={y - 7} strokeWidth="1.6" strokeLinecap="round" className={bad ? "stroke-brand-red-light" : d.verdict === "miss" ? "stroke-white/40" : "stroke-white"} />
              <circle cx={x} cy={y} r="1.9" className={bad ? "fill-brand-red-light" : d.verdict === "miss" ? "fill-white/40" : "fill-brand-yellow"} />
            </motion.g>
          );
        })}
      </AnimatePresence>
    </svg>
  );
}

/** The big number, the darts left, and what checks out from here. */
export function ScorePanel({ locale, remaining, dartsUsed, maxDarts, darts, outs, tone = "you", label, compact = false }: {
  locale: string; remaining: number; dartsUsed: number; maxDarts: number; darts: readonly Dart[]; outs?: number | null; tone?: "you" | "rival"; label?: string; compact?: boolean;
}) {
  const c = d501Copy(locale);
  const shown = useCountTo(remaining);
  const window_ = remaining > 0 ? checkoutWindow(remaining) : null;
  const out = remaining <= 0;
  return (
    <div data-d501-panel className={cn("relative overflow-hidden rounded-3xl px-4 py-4 text-white", out ? "bg-brand-green shadow-lg shadow-black/25" : tone === "you" ? "ring-1 ring-white/10" : "bg-brand-blue shadow-lg shadow-black/25")}>
      <div className="flex items-center gap-4">
        <Dartboard darts={darts} className={cn("shrink-0", compact ? "size-20" : "size-28")} />
        <div className="min-w-0 flex-1 text-right">
          <p className={cn("text-[11px] font-black uppercase tracking-[0.18em]", out ? "text-black/70" : "text-white/55")} style={poppins}>{label ?? c.left}</p>
          <p data-d501-remaining className={cn("font-black leading-none tabular-nums", compact ? "text-5xl" : "text-7xl", out && "text-black")} style={poppins}>{shown}</p>
          <p className={cn("mt-1 text-xs font-bold", out ? "text-black/70" : "text-white/60")}>{c.dartsLeft(Math.max(0, maxDarts - dartsUsed))}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-1" aria-hidden>
        {Array.from({ length: maxDarts }, (_, i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < dartsUsed ? (out ? "bg-black/50" : "bg-brand-yellow") : out ? "bg-black/15" : "bg-white/15")} />
        ))}
      </div>
      {!out && (
        <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-bold text-white/80">
          <Target className="size-3.5 shrink-0 text-brand-green-light" aria-hidden />
          {window_ ? <span>{c.window(window_.low, window_.high)}</span> : <span>{c.maxHint}</span>}
          {window_ && outs != null && <span className="ml-auto shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/75">{c.outs(outs)}</span>}
        </p>
      )}
    </div>
  );
}

const TAG_TONE = { bust: "bg-brand-red-soft/20 text-brand-red-light", over180: "bg-brand-red-soft/20 text-brand-red-light", bogey: "bg-brand-red-soft/20 text-brand-red-light", miss: "bg-white/10 text-white/60", time: "bg-white/10 text-white/60", checkout: "bg-brand-green text-black" } as const;

/** The leg's darts, newest first. `who` names the thrower in a room. */
export function DartLog({ locale, darts, who, limit = 6, className }: { locale: string; darts: readonly Dart[]; who?: (seat: number) => string; limit?: number; className?: string }) {
  const c = d501Copy(locale);
  const thrown = darts.filter((d) => THROWN.has(d.verdict)).slice(-limit).reverse();
  if (thrown.length === 0) return null;
  const tag = (d: Dart) => (d.verdict === "bust" ? c.tagBust : d.verdict === "over180" ? c.tagOver : d.verdict === "bogey" ? c.tagBogey : d.verdict === "miss" ? c.tagMiss : d.verdict === "time" ? c.tagTime : d.verdict === "checkout" ? c.tagOut : null);
  return (
    <ol data-d501-log className={cn("space-y-1.5", className)}>
      <AnimatePresence initial={false}>
        {thrown.map((d) => {
          const t = tag(d);
          const counted = d.verdict === "score" || d.verdict === "checkout";
          return (
            <motion.li key={d.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className={cn("truncate font-bold", !counted && "text-white/60", d.verdict === "miss" && "line-through decoration-white/40")}>{d.name ?? d.text}</p>
                {who && <p className="truncate text-[11px] font-semibold text-white/45">{who(d.by)}</p>}
              </div>
              {d.stat !== null && <span className={cn("shrink-0 text-xs font-black tabular-nums", counted ? "text-white" : "text-white/45 line-through")} style={poppins}>−{d.stat}</span>}
              {t && <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide", TAG_TONE[d.verdict as keyof typeof TAG_TONE])}>{t}</span>}
              <span className="w-10 shrink-0 text-right text-base font-black tabular-nums" style={poppins}>{d.after}</span>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}

/** The latest answer in one line. `prefix` names the thrower in a room. */
export function DartFeedback({ locale, last, prefix, mine = true }: { locale: string; last: Dart | null; prefix?: string; mine?: boolean }) {
  const c = d501Copy(locale);
  const line = last && (() => {
    const name = last.name ?? last.text;
    switch (last.verdict) {
      case "score": return { tone: "ok", text: c.score(name, last.stat ?? 0) };
      case "checkout": return { tone: "ok", text: last.after === 0 ? `${c.checkout(name, last.stat ?? 0)} · ${c.perfect}` : c.checkout(name, last.stat ?? 0) };
      case "bust": return { tone: "bad", text: c.bust(name, last.stat ?? 0) };
      case "over180": return { tone: "bad", text: c.over180(name, last.stat ?? 0) };
      case "bogey": return { tone: "bad", text: c.bogey(name, last.stat ?? 0) };
      case "miss": return { tone: "bad", text: c.miss(name) };
      case "time": return { tone: "bad", text: c.time };
      default:
        if (!mine) return null;
        return { tone: "warn", text: last.verdict === "repeat" ? c.repeat(name) : last.verdict === "uncovered" ? c.uncovered(name) : last.verdict === "unknown" ? c.unknown(last.text) : c.ambiguous(last.text) };
    }
  })();
  return (
    <div className="min-h-6" aria-live="polite">
      <AnimatePresence mode="wait">
        {line && last && (
          <motion.p key={last.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0, x: line.tone === "bad" ? [0, -6, 6, -3, 0] : 0 }} exit={{ opacity: 0 }}
            className={cn("flex items-center gap-1.5 text-sm font-bold", line.tone === "ok" ? "text-white" : line.tone === "bad" ? "text-brand-red-light" : "text-brand-yellow")}>
            {line.tone === "ok" && <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-green"><Check className="size-3.5 text-black" strokeWidth={3} /></span>}
            <span className="min-w-0">{prefix ? `${prefix}: ${line.text}` : line.text}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Share row: one mark per dart (🎯 checkout, 🟩 scored, 💥 bust/180+, ⬜ no score). */
export const dartEmoji = (darts: readonly Dart[]) =>
  darts.filter((d) => THROWN.has(d.verdict)).map((d) => (d.verdict === "checkout" ? "🎯" : d.verdict === "score" ? "🟩" : d.verdict === "bust" || d.verdict === "over180" || d.verdict === "bogey" ? "💥" : "⬜")).join("");


"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DuelAvatar } from "@/features/duel/DuelAvatar";
import type { AvatarCustomization } from "@/types/game";

/** Shared pieces of the word games (name chain, played for both), in the look of the other solo + duel games. */
export const poppins = { fontFamily: "'Poppins', sans-serif" } as const;

/** `lang` matters: upper-casing follows it, and Turkish turns i into İ. */
export function Frame({ lang, wide = false, children }: { lang: string; wide?: boolean; children: ReactNode }) {
  return (
    <div lang={lang} className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center text-white">
      <div className={cn("mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-6 pt-3", wide && "lg:max-w-5xl lg:px-8")}>{children}</div>
    </div>
  );
}

export function Brand({ words, className }: { words: readonly [string, string] | readonly string[]; className?: string }) {
  return (
    <p className={cn("font-black uppercase tracking-tight", className)} style={poppins}>
      {words[0]} <span className="text-brand-green-light">{words[1]}</span>
    </p>
  );
}

export function TopBar({ brand, seconds, exitLabel, onExit, right }: { brand: readonly string[]; seconds?: number | null; exitLabel: string; onExit: () => void; right?: ReactNode }) {
  return (
    <header className="flex items-center gap-3">
      <button type="button" onClick={onExit} aria-label={exitLabel} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-4" /></button>
      <Brand words={brand} className="min-w-0 flex-1 truncate text-[13px]" />
      {right}
      {seconds != null && <ClockPill seconds={seconds} />}
    </header>
  );
}

export function ClockPill({ seconds }: { seconds: number }) {
  const urgent = seconds <= 5;
  return (
    <motion.span key={urgent ? seconds : "calm"} initial={urgent ? { scale: 1.2 } : false} animate={{ scale: 1 }}
      className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-black tabular-nums transition-colors", urgent ? "bg-brand-red-soft/20 text-brand-red-light" : "bg-white/[0.06] text-white/60")} style={poppins}>
      {seconds} s
    </motion.span>
  );
}

/** A seat: you are brand green, the rival brand blue; the active seat carries the ring. */
export function SeatCard({ name, avatar, tone, active, score, unit, marks }: {
  name: string; avatar: AvatarCustomization; tone: "you" | "rival"; active: boolean; score: number; unit?: string; marks?: ReactNode;
}) {
  const ring = tone === "you" ? "bg-brand-green/15 ring-2 ring-brand-green" : "bg-brand-blue/25 ring-2 ring-brand-blue";
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl px-3 py-2 transition-colors", active ? ring : "bg-white/[0.05]")}>
      <DuelAvatar customization={avatar} size="xs" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-white/80">{name}</p>
        <p className="text-2xl font-black leading-none tabular-nums" style={poppins}>{score}{unit && <span className="ml-1 text-xs font-bold text-white/55">{unit}</span>}</p>
      </div>
      {marks}
    </div>
  );
}

export function Dots({ filled, total, tone }: { filled: number; total: number; tone: "you" | "rival" }) {
  return (
    <span className="flex gap-1" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn("size-2.5 rounded-full", i < filled ? (tone === "you" ? "bg-brand-green-light" : "bg-white") : "bg-white/20")} />
      ))}
    </span>
  );
}

export function TimeBar({ share, urgent, className }: { share: number; urgent: boolean; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-black/25", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-100 ease-linear", urgent ? "bg-brand-yellow" : "bg-white")} style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%` }} />
    </div>
  );
}

/** The app's typed-answer look: blue pill input, green pill button, stacked. */
export function AnswerBox({ placeholder, say, disabled, note, onSubmit }: { placeholder: string; say: string; disabled?: boolean; note?: string | null; onSubmit: (text: string) => void }) {
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  // Not while a question sheet (leave?) is open over the game: the focus belongs to the sheet.
  useEffect(() => { if (!disabled && !document.querySelector("[data-sheet-asks]")) input.current?.focus({ preventScroll: true }); }, [disabled]);
  const submit = () => {
    if (!draft.trim() || disabled) return;
    onSubmit(draft);
    setDraft("");
    input.current?.focus({ preventScroll: true });
  };
  return (
    <form className="sticky bottom-0 mt-3 space-y-2 bg-surface-page-alt/95 pb-1 pt-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <input ref={input} value={draft} disabled={disabled} onChange={(e) => setDraft(e.target.value.slice(0, 60))} autoComplete="off" autoCapitalize="words" autoCorrect="off" spellCheck={false} enterKeyHint="send"
        placeholder={disabled && note ? note : placeholder} aria-label={placeholder}
        className="font-poppins h-14 w-full rounded-[20px] border-none bg-brand-blue px-5 text-center text-base uppercase text-white outline-none placeholder:text-white/55 placeholder:uppercase placeholder:tracking-[0.08em] focus:outline-none disabled:opacity-50"
        style={{ fontWeight: 600, letterSpacing: "0.08em", boxShadow: "0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)" }} />
      <button type="submit" disabled={disabled || !draft.trim()}
        className="font-poppins h-14 w-full rounded-[20px] bg-brand-green uppercase text-white outline-none transition-colors hover:bg-brand-green-deep disabled:cursor-not-allowed disabled:opacity-40"
        style={{ fontWeight: 600, fontSize: 16, letterSpacing: "0.06em", boxShadow: "0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)" }}>
        {say}
      </button>
    </form>
  );
}

export function GreenButton({ children, onClick, disabled, className }: { children: ReactNode; onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={poppins}
      className={cn("h-14 w-full rounded-full bg-brand-green text-base font-black uppercase tracking-wide text-white hover:bg-brand-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-50", className)}>
      {children}
    </button>
  );
}

export function QuietButton({ children, onClick, className }: { children: ReactNode; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} style={poppins}
      className={cn("h-11 w-full rounded-full bg-white/10 text-sm font-bold uppercase tracking-wide text-white/85 hover:bg-white/15", className)}>
      {children}
    </button>
  );
}

/** The blue sheet that closes a round, as in the other duels. */
export function Sheet({ label, asks = false, children }: { label: string; asks?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  // A sheet with a question (leave?) takes the keyboard focus and hands it back; a round result does not, so the
  // phone keyboard stays up between rounds.
  useEffect(() => {
    if (!asks) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const sheet = ref.current;
    sheet?.querySelector<HTMLElement>("button")?.focus();
    // Tab stays inside the sheet.
    const keepInside = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !sheet) return;
      const stops = [...sheet.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]")];
      if (stops.length === 0) return;
      const at = stops.indexOf(document.activeElement as HTMLElement);
      event.preventDefault();
      stops[(at + (event.shiftKey ? -1 : 1) + stops.length) % stops.length].focus();
    };
    document.addEventListener("keydown", keepInside);
    return () => { document.removeEventListener("keydown", keepInside); before?.focus(); };
  }, [asks]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center">
      <motion.div ref={ref} role="dialog" aria-modal="true" aria-label={label} data-sheet-asks={asks ? "" : undefined} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md rounded-t-3xl bg-brand-blue px-5 pb-6 pt-5 text-white shadow-2xl shadow-black/40 sm:rounded-3xl">
        {children}
      </motion.div>
    </div>
  );
}

export function Chips({ names, className }: { names: string[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {names.map((name, i) => <li key={`${i}-${name}`} className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white">{name}</li>)}
    </ul>
  );
}

export function CountIn({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/55">{label}</p>
      <motion.span key={value} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-2 text-7xl font-black tabular-nums" style={poppins}>{value}</motion.span>
    </div>
  );
}

/** "I was right": sends a refused answer to the review list, once per answer. */
export function ReportLink({ label, thanks, onReport }: { label: string; thanks: string; onReport: () => Promise<boolean> }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const sending = useRef(false);
  if (status === "sent") return <span className="shrink-0 text-xs font-semibold text-white/60">{thanks}</span>;
  const report = () => {
    // The ref closes the gap before the disabled state is painted: a double tap sends one report.
    if (sending.current) return;
    sending.current = true;
    setStatus("sending");
    void onReport().then((ok) => ok, () => false).then((ok) => { sending.current = false; setStatus(ok ? "sent" : "idle"); });
  };
  return (
    <button type="button" data-word-report disabled={status === "sending"} onClick={report}
      className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white/85 hover:bg-white/20 disabled:opacity-60">{label}</button>
  );
}

/**
 * An answer the server never confirmed (a dropped connection) is sent again as itself until its outcome is known;
 * while it is open the input stays closed, so a newly typed answer is never swapped for the old one.
 */
export function useResendRetained(room: { retained: unknown; connected: boolean; resendRetained: () => void }): boolean {
  const { connected, resendRetained } = room;
  const open = room.retained !== null;
  // Monotonic time: a device clock set back must not stop the retries.
  const lastSend = useRef(0);
  useEffect(() => { if (open) lastSend.current = performance.now(); }, [open]);
  useEffect(() => {
    if (!open || !connected) return;
    // Never at once: a refusal (rate limited, room busy) puts the answer straight back here, and an immediate resend
    // would turn that into a loop. The beat is kept across those transitions by the time of the last send.
    const tick = () => {
      if (performance.now() - lastSend.current < RESEND_EVERY_MS) return;
      lastSend.current = performance.now();
      resendRetained();
    };
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [open, connected, resendRetained]);
  return open;
}

const RESEND_EVERY_MS = 2_500;
const NO_TEXTS: readonly string[] = [];
/** The answers the game refused, by round. Kept on this screen only: once a round is over, each can be reported. */
export function useRefused() {
  const [byRound, setByRound] = useState<Record<string, readonly string[]>>({});
  const add = useCallback((round: number, text: string) => {
    const typed = text.trim();
    if (typed) setByRound((prev) => ((prev[round] ?? NO_TEXTS).includes(typed) ? prev : { ...prev, [round]: [...(prev[round] ?? NO_TEXTS), typed].slice(-MAX_REFUSED) }));
  }, []);
  const of = useCallback((round: number) => byRound[round] ?? NO_TEXTS, [byRound]);
  /** Another day or another player: what was refused before is not theirs. */
  const reset = useCallback(() => setByRound((prev) => (Object.keys(prev).length === 0 ? prev : {})), []);
  return { add, of, reset };
}
const MAX_REFUSED = 2;

/** The round's refused answers, each with its "I was right" link. */
export function RefusedReports({ texts, line, label, thanks, onReport, className }: {
  texts: readonly string[]; line: (text: string) => string; label: string; thanks: string; onReport: (text: string) => Promise<boolean>; className?: string;
}) {
  if (texts.length === 0) return null;
  return (
    <ul className={cn("space-y-1.5", className)}>
      {texts.map((text) => (
        <li key={text} className="flex items-center justify-between gap-2 text-xs text-white/80">
          <span className="min-w-0 truncate">{line(text)}</span>
          <ReportLink label={label} thanks={thanks} onReport={() => onReport(text)} />
        </li>
      ))}
    </ul>
  );
}

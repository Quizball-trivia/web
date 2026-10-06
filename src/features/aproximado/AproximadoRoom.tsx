"use client";

import { useEffect, useRef, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { Check, Clock3, Crosshair, LogOut, Moon, WifiOff, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { DuelAvatar } from "@/features/duel/DuelAvatar";
import { aproximadoCopy, formatValue, type AproximadoCopy } from "./aproximado.copy";
import { parseGuess, type RoundResult, type Standing } from "./aproximado.rules";
import type { AproximadoRoomView, PublicQuestion, RoomSeatView } from "./aproximado.views";
import { scoreSourceAttr, toPartyStandings, useRoomScoreFlights } from "./AproximadoParty";
import { PartyScoreFlights, PartyStandingsPill, PartyStandingsSidebar } from "@/features/party-kit";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;

/** Full-height frame every room screen sits in; wider on desktop for the chalkboard. */
export function AproximadoFrame({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-surface-page-alt text-white">
        <div className={cn("mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-6 pt-4", wide ? "lg:max-w-5xl lg:px-8" : "lg:max-w-3xl")}>{children}</div>
      </div>
    </MotionConfig>
  );
}

function Brand({ copy, className }: { copy: AproximadoCopy; className?: string }) {
  return <p className={cn("font-black uppercase tracking-tight", className)} style={poppins}>{copy.brandA} <span className="text-brand-yellow">{copy.brandB}</span></p>;
}

const statusOf = (s: RoomSeatView, copy: AproximadoCopy) =>
  s.status === "withdrawn" ? copy.withdrawn : s.status === "away" ? copy.away : s.answered ? copy.answered : s.idle ? copy.idle : copy.thinking;

/** Badge on a seat's avatar: answered ✓, thinking clock, disconnected, left, idle. */
function SeatBadge({ s, revealed }: { s: RoomSeatView; revealed: boolean }) {
  const base = "absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full ring-2 ring-surface-page-alt";
  if (s.status === "withdrawn") return <span className={cn(base, "bg-white/30")}><LogOut className="size-3" /></span>;
  if (s.status === "away") return <span className={cn(base, "bg-brand-orange")}><WifiOff className="size-3" /></span>;
  if (s.answered) return <span className={cn(base, "bg-brand-green")}><Check className="size-3" strokeWidth={3} /></span>;
  if (revealed) return <span className={cn(base, "bg-white/20 text-[11px] font-black")}>–</span>;
  if (s.idle) return <span className={cn(base, "bg-white/25")}><Moon className="size-3" /></span>;
  return <span className={cn(base, "bg-white/15")}><Clock3 className="size-3 text-white/70" /></span>;
}

/** Seat boxes per row: 2 → duel panels, 3 → one row, 4 → 2×2, 5–6 → rows of three; one row on desktop. */
const GRID: Record<number, string> = {
  2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2 lg:grid-cols-4", 5: "grid-cols-3 lg:grid-cols-5", 6: "grid-cols-3 lg:grid-cols-6",
};

/**
 * Everyone in the room, with only "answered or not" before the reveal. Two seats get a duel-style panel each; three to
 * six get compact chips (three per row on phones, one row on desktop). After a reveal each seat shows the points it took.
 */
export function RosterStrip({ seats, mySeat, copy, gained }: { seats: RoomSeatView[]; mySeat: number; copy: AproximadoCopy; gained?: Map<number, number> }) {
  const duel = seats.length === 2;
  const ordered = [...seats].sort((a, b) => (a.seat === mySeat ? -1 : b.seat === mySeat ? 1 : a.seat - b.seat));
  return (
    <ul className={cn("grid gap-2", GRID[seats.length] ?? "grid-cols-3")}>
      {ordered.map((s) => {
        const me = s.seat === mySeat;
        const out = s.status === "withdrawn";
        const plus = gained?.get(s.seat);
        return (
          <li key={s.seat} aria-label={`${me ? copy.you : s.name}: ${s.score}, ${statusOf(s, copy)}`}
            className={cn("relative flex min-w-0 flex-col gap-1 rounded-2xl border-2 py-2", duel ? "items-start px-3" : "items-center px-1.5 text-center",
              me ? "border-brand-green bg-brand-green/15" : "border-white/10 bg-white/[0.05]", out && "opacity-45 grayscale", s.status === "away" && "opacity-70")}>
            {/* Avatar and total on top, the name below at the box's full width, so it never needs cutting. */}
            <span className={cn("flex items-center", duel ? "gap-2.5" : "flex-col gap-1")}>
              <span className="relative shrink-0"><DuelAvatar size={duel ? "sm" : "xs"} customization={s.avatar} /><SeatBadge s={s} revealed={gained !== undefined} /></span>
              {duel && <span className="text-3xl font-black tabular-nums leading-none" style={poppins}>{s.score}</span>}
            </span>
            <span className={cn("block w-full font-black uppercase text-white/80 break-words [overflow-wrap:anywhere] leading-tight", duel ? "text-[11px] tracking-wide" : "text-[10px]")} style={poppins}>{me ? copy.you : s.name}</span>
            {!duel && <span className="block text-xl font-black tabular-nums leading-none" style={poppins}>{s.score}</span>}
            {duel && <span className="block w-full text-[11px] leading-tight text-white/60 break-words">{statusOf(s, copy)}</span>}
            {plus !== undefined && plus > 0 && (
              <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="absolute -top-2 right-1 rounded-full bg-brand-yellow px-1.5 py-0.5 text-[11px] font-black text-black" style={poppins}>{copy.pts(plus)}</motion.span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** The question: a kind chip, the prompt and its unit. */
export function QuestionCard({ question, copy }: { question: PublicQuestion; copy: AproximadoCopy }) {
  return (
    <div className="rounded-3xl bg-white px-5 py-5 text-surface-page shadow-lg">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-brand-blue" style={poppins}>
        <Crosshair className="size-3.5" /> {copy.kinds[question.kind]}
      </span>
      <p id="aproximado-question" className="mt-3 text-xl font-black leading-snug lg:text-2xl" style={poppins}>{question.prompt}</p>
      {question.unit && <p id="aproximado-unit" className="mt-2 text-xs font-bold uppercase tracking-wide text-surface-page/50">{question.unit}</p>}
    </div>
  );
}

/**
 * The number box: typed (no slider: a slider's range would give the scale away). The unit sits in the label so the box
 * keeps its full width; under it, the number exactly as it will be sent, so a typing slip is visible before locking in.
 */
export function GuessInput({ question, copy, locale, busy, onSubmit, autoFocus = true, retry = null }: {
  question: PublicQuestion; copy: AproximadoCopy; locale: string; busy: boolean; onSubmit: (value: number) => void; autoFocus?: boolean;
  /** A guess already sent whose answer never came: the box holds exactly that number and offers to send it again. */
  retry?: number | null;
}) {
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus({ preventScroll: true }); }, [autoFocus]);
  const parsed = retry !== null ? retry : text.trim() ? parseGuess(text, question.precision) : null;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (parsed === null) { setInvalid(true); return; }
    onSubmit(parsed);
  };
  const hint = invalid ? copy.invalid : parsed !== null ? copy.willSend(formatValue(parsed, question.unit, question.precision, locale)) : copy.inputHint;
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor="aproximado-guess" className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/70" style={poppins}>
        {copy.inputLabel}{question.unit ? ` · ${question.unit}` : ""}
      </label>
      <div className="flex flex-col gap-2 min-[400px]:flex-row">
        <div className={cn("flex h-16 min-w-0 flex-1 items-center rounded-2xl border-[3px] bg-brand-blue transition-colors", invalid ? "border-brand-red-soft" : "border-brand-blue focus-within:border-white/60")}>
          <input id="aproximado-guess" ref={ref} value={retry !== null ? formatValue(retry, "", question.precision, locale).trim() : text} onChange={(e) => { setText(e.target.value); setInvalid(false); }} inputMode="decimal" enterKeyHint="go"
            autoComplete="off" placeholder="?" disabled={busy} readOnly={retry !== null} aria-invalid={invalid} aria-describedby="aproximado-question aproximado-unit aproximado-hint"
            className="h-full w-full bg-transparent px-4 text-center text-3xl font-black tabular-nums text-white placeholder:text-white/35 focus:outline-none disabled:opacity-60" style={poppins} />
        </div>
        <button type="submit" disabled={busy || (retry === null && !text.trim())} aria-busy={busy} className="h-14 shrink-0 rounded-2xl bg-brand-green px-5 text-sm font-black uppercase tracking-wide text-white hover:bg-brand-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-45 min-[400px]:h-16" style={poppins}>
          {busy ? <><span aria-hidden>…</span><span className="sr-only">{copy.sending}</span></> : retry !== null ? copy.retry : copy.confirm}
        </button>
      </div>
      <p id="aproximado-hint" role={invalid ? "alert" : undefined} aria-live="polite" className={cn("text-center text-[11.5px]", invalid ? "font-bold text-brand-red-soft" : parsed !== null ? "font-bold text-white/80" : "text-white/55")}>{hint}</p>
    </form>
  );
}

/**
 * Where everyone landed. The scale fits the real value and the ordinary guesses: a guess far outside (more than 3× the
 * typical miss) is pinned at the edge with an arrow instead of squashing the rest. Guesses that land in the same place are
 * grouped (avatars side by side), alternating above and below the line; a dot on the line marks each exact spot.
 */
function NumberLine({ result, seats, mySeat }: { result: RoundResult; seats: RoomSeatView[]; mySeat: number }) {
  const placed = result.entries.filter((e) => e.guess !== null).sort((a, b) => a.guess! - b.guess!);
  const diffs = placed.map((e) => Math.abs(e.guess! - result.value)).sort((a, b) => a - b);
  const typical = diffs.length ? diffs[Math.floor((diffs.length - 1) / 2)] : 0;
  const reach = Math.max(typical * 3, ...diffs.filter((d) => d <= typical * 3), Math.abs(result.value) * 0.05, 1);
  const lo = result.value - reach; const hi = result.value + reach;
  const at = (v: number) => 4 + ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * 92;
  const groups = new Map<number, typeof placed>();
  for (const e of placed) { const slot = Math.round(at(e.guess!) / 10); groups.set(slot, [...(groups.get(slot) ?? []), e]); }
  return (
    <div aria-hidden className="relative mt-4 h-24">
      <div className="absolute inset-x-0 top-11 h-1 rounded-full bg-white/25" />
      <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.3 }} className="absolute top-4 h-15 w-1 -translate-x-1/2 rounded-full bg-brand-yellow" style={{ left: `${at(result.value)}%` }} />
      {placed.map((e) => {
        const outside = e.guess! < lo ? "←" : e.guess! > hi ? "→" : null;
        return (
          <span key={`dot-${e.seat}`} className={cn("absolute top-[41px] -translate-x-1/2 text-[10px] font-black leading-none", outside ? "text-white/70" : cn("size-2.5 rounded-full", e.seat === mySeat ? "bg-brand-green" : "bg-white"))} style={{ left: `${at(e.guess!)}%` }}>
            {outside}
          </span>
        );
      })}
      {[...groups.entries()].sort((a, b) => a[0] - b[0]).map(([slot, members], i) => (
        <motion.span key={slot} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }}
          className={cn("absolute flex -translate-x-1/2 -space-x-3", i % 2 ? "top-[52px]" : "top-0")} style={{ left: `${Math.min(92, Math.max(8, at(members[0].guess!)))}%` }}>
          {members.slice(0, 3).map((e) => <DuelAvatar key={e.seat} size="xs" customization={seats.find((s) => s.seat === e.seat)!.avatar} />)}
          {members.length > 3 && <span className="ml-1 self-center text-[10px] font-black text-white/80">+{members.length - 3}</span>}
        </motion.span>
      ))}
    </div>
  );
}

/** The reveal, like the stream's chalkboard: the real value, a number line, then everyone from closest to furthest. */
export function Chalkboard({ result, question, seats, mySeat, copy, locale }: {
  result: RoundResult; question: PublicQuestion; seats: RoomSeatView[]; mySeat: number; copy: AproximadoCopy; locale: string;
}) {
  const fmt = (v: number) => formatValue(v, question.unit, question.precision, locale);
  const rows = [...result.entries].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  const winnerNames = result.winners.map((w) => (w === mySeat ? copy.you : seats.find((s) => s.seat === w)?.name ?? ""));
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} role="status"
      className="rounded-3xl border-[6px] border-brand-gold-deep bg-fut-pitch px-4 py-4 shadow-[inset_0_0_40px_rgba(0,0,0,0.35)]">
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-white/60" style={poppins}>{copy.itWas}</p>
        <motion.p initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="text-4xl font-black tabular-nums text-brand-yellow lg:text-5xl" style={poppins}>{fmt(result.value)}</motion.p>
        <p className="mt-1 text-sm font-bold text-white/80">
          {result.winners.length === 0 ? copy.nobody : result.winners.length > 1 ? copy.roundTie : result.winners[0] === mySeat ? copy.youWonRound : copy.roundWinner(winnerNames[0])}
        </p>
      </div>
      <NumberLine result={result} seats={seats} mySeat={mySeat} />
      {/* 4–6 players on desktop: two columns (1 2 / 3 4 / 5 6) so the whole board fits a laptop screen. */}
      <ol className={cn("mt-2 grid gap-1.5", rows.length > 3 && "lg:grid-cols-2")}>
        {rows.map((e) => {
          const seat = seats.find((s) => s.seat === e.seat)!;
          const me = e.seat === mySeat;
          return (
            <li key={e.seat} className={cn("flex items-center gap-2 rounded-xl px-2 py-1.5", me ? "bg-brand-green/25" : "bg-black/15")}>
              <span className="w-5 text-center text-sm font-black text-white/60" style={poppins}>{e.rank ?? "–"}</span>
              <DuelAvatar size="xs" customization={seat.avatar} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black break-words [overflow-wrap:anywhere] leading-tight" style={poppins}>{me ? copy.you : seat.name}</span>
                <span className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-[11px] text-white/60">
                  {e.guess !== null && <span className="text-[15px] font-black tabular-nums text-white" style={poppins}>{fmt(e.guess)}</span>}
                  <span>{e.guess === null ? copy.noGuess : e.exact ? copy.exact : copy.off(fmt(e.diff!))}</span>
                </span>
              </span>
              <span {...scoreSourceAttr(e.seat)} className={cn("w-9 shrink-0 rounded-full py-0.5 text-center text-xs font-black", e.points > 0 ? "bg-brand-yellow text-black" : "bg-white/10 text-white/50")} style={poppins}>{copy.pts(e.points)}</span>
            </li>
          );
        })}
      </ol>
    </motion.section>
  );
}

/** One dot per question: green when you scored, yellow when you took the round, grey otherwise; the current one ringed. */
function RoundDots({ view }: { view: AproximadoRoomView }) {
  return (
    <ol aria-hidden className="flex items-center justify-center gap-1.5">
      {Array.from({ length: view.totalRounds }, (_, i) => {
        const r = view.results[i];
        const mine = r?.entries.find((e) => e.seat === view.mySeat);
        const tone = !r ? "bg-white/15" : r.winners.includes(view.mySeat) ? "bg-brand-yellow" : (mine?.points ?? 0) > 0 ? "bg-brand-green" : "bg-white/35";
        return <li key={i} className={cn("size-2.5 rounded-full", tone, i === view.round && !r && "ring-2 ring-white ring-offset-2 ring-offset-surface-page-alt")} />;
      })}
    </ol>
  );
}

/** A round: players, question, then the number box (guess) or the chalkboard (reveal). */
export function AproximadoBoard({ view, locale, secondsLeft, busy, onGuess, connected = true, error = null, onLeave, leaveConfirmOpen = false, retry = null, layout = "party" }: {
  view: AproximadoRoomView; locale: string; secondsLeft: number | null; busy: boolean; onGuess: (value: number) => void;
  /** This round's guess that was sent but never answered: offered again as-is (see GuessInput). */
  retry?: number | null;
  /** "party": the Party Quiz page (standings sidebar on desktop, standings bar on phones). "classic": the seat strip. */
  layout?: "party" | "classic";
  /** This screen's own connection (false = the offline banner; the box waits until it is back). */
  connected?: boolean;
  /** A refused command's code (not_open, already_answered, withdrawn, invalid). */
  error?: string | null;
  /** Leave the match (after the confirmation): final. */
  onLeave?: () => void;
  /** Playground: open with the leave confirmation showing. */
  leaveConfirmOpen?: boolean;
}) {
  const copy = aproximadoCopy(locale);
  const [confirmLeave, setConfirmLeave] = useState(leaveConfirmOpen);
  const leaveButton = useRef<HTMLButtonElement>(null);
  const fmt = (v: number) => formatValue(v, view.question.unit, view.question.precision, locale);
  const me = view.seats.find((s) => s.seat === view.mySeat);
  // Same eligibility as the early close: seats that are in (connected), not idle, not yet answered.
  const eligible = view.seats.filter((s) => s.status === "in" && !s.idle).length;
  const pending = view.seats.filter((s) => s.status === "in" && !s.answered && !s.idle).length;
  const active = view.seats.filter((s) => s.status !== "withdrawn");
  const gained = view.phase !== "guess" && view.reveal ? new Map(view.reveal.entries.map((e) => [e.seat, e.points])) : undefined;
  const party = layout === "party";
  const { flights, holding } = useRoomScoreFlights(view, party);
  const standings = party ? toPartyStandings(view, holding, copy) : [];
  const board = (
    <div className={cn("flex flex-1 flex-col gap-3", party && "pb-24 lg:pb-0")}>
      <header className="flex items-center gap-2">
        {onLeave && (
          <button ref={leaveButton} type="button" onClick={() => setConfirmLeave(true)} aria-label={copy.leave} aria-haspopup="dialog" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"><X className="size-4" /></button>
        )}
        {/* Under 380 px the round and the clock need the row: the game's name only shows where it fits whole. */}
        <Brand copy={copy} className="hidden min-w-0 flex-1 text-[15px] leading-tight min-[380px]:block min-[400px]:text-base" />
        <span className="flex-1 min-[380px]:hidden" aria-hidden />
        <span className="rounded-full bg-surface-page px-3 py-1 text-xs font-black uppercase tabular-nums" style={poppins}>{copy.round(view.round + 1, view.totalRounds)}</span>
        {view.phase === "guess" && secondsLeft !== null && (
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-black tabular-nums", secondsLeft <= 5 ? "bg-brand-red-soft/25 text-brand-red-light" : "bg-white/10 text-white/70")} style={poppins}>{copy.seconds(secondsLeft)}</span>
        )}
      </header>
      <p className="sr-only" aria-live="polite">{view.phase === "guess" ? `${copy.round(view.round + 1, view.totalRounds)}. ${view.question.prompt}` : ""}</p>
      <p className="sr-only" aria-live="assertive">{view.phase === "guess" && secondsLeft !== null && secondsLeft <= 5 && secondsLeft > 0 ? copy.hurry : ""}</p>
      {view.phase === "guess" && <p className="sr-only" aria-live="polite">{copy.answeredOf(active.filter((s) => s.answered).length, active.length)}</p>}
      {!connected && <p role="status" className="rounded-xl bg-brand-orange/15 px-3 py-2 text-center text-xs font-semibold text-brand-orange-light">{copy.offline}</p>}
      {!party && <RosterStrip seats={view.seats} mySeat={view.mySeat} copy={copy} gained={gained} />}
      <QuestionCard question={view.question} copy={copy} />
      <RoundDots view={view} />
      {/* Phones keep the guess box near the thumb; reveals and desktop follow the question (no gap, nothing pushed off-screen). */}
      <div className={view.phase === "guess" ? "mt-auto lg:mt-1" : "mt-1"}>
        {view.phase === "guess" && me && !me.answered && me.status !== "withdrawn" ? (
          <GuessInput key={view.round} question={view.question} copy={copy} locale={locale} busy={busy || !connected} autoFocus={!confirmLeave} onSubmit={onGuess} retry={retry} />
        ) : view.phase === "guess" ? (
          <div role="status" className="rounded-2xl bg-white/[0.07] px-4 py-3 text-center">
            {view.myGuess !== null && <p className="text-lg font-black tabular-nums" style={poppins}>{copy.yourGuess(fmt(view.myGuess))}</p>}
            <p className="text-sm font-bold text-white/70">{eligible === 0 ? copy.waitingClock : pending === 0 ? copy.revealing : copy.waiting(pending)}</p>
          </div>
        ) : view.reveal ? (
          <Chalkboard result={view.reveal} question={view.question} seats={view.seats} mySeat={view.mySeat} copy={copy} locale={locale} />
        ) : null}
      </div>
      {error && (
        <p role="alert" className="fixed inset-x-4 bottom-6 z-40 mx-auto max-w-sm rounded-xl bg-brand-red-soft/90 px-3 py-2 text-center text-sm font-semibold text-white">{copy.errors[error] ?? copy.errors.default}</p>
      )}
      {onLeave && (
        <DialogPrimitive.Root open={confirmLeave} onOpenChange={setConfirmLeave}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
            <DialogPrimitive.Content className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-3xl bg-brand-blue p-5 text-center text-white sm:inset-y-0 sm:my-auto sm:h-fit"
              onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).querySelector<HTMLButtonElement>("[data-keep]")?.focus(); }}
              // Back to the X that opened it (it lives outside the dialog root, so Radix cannot find it on its own).
              onCloseAutoFocus={(e) => { e.preventDefault(); leaveButton.current?.focus(); }}>
              <DialogPrimitive.Title className="text-base font-bold">{copy.leaveConfirm}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">{copy.leave}</DialogPrimitive.Description>
              <button type="button" onClick={() => { setConfirmLeave(false); onLeave(); }} className="mt-4 h-12 w-full rounded-full bg-brand-red-soft text-sm font-black uppercase text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" style={poppins}>{copy.leaveYes}</button>
              <DialogPrimitive.Close asChild>
                <button type="button" data-keep className="mt-2 h-11 w-full rounded-full bg-white/15 text-sm font-bold uppercase text-white hover:bg-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" style={poppins}>{copy.leaveNo}</button>
              </DialogPrimitive.Close>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </div>
  );
  if (!party) return board;
  return (
    <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      {board}
      <PartyStandingsSidebar standings={standings} roundResolved={view.phase === "reveal"} showOptions={view.phase === "guess"} />
      <PartyStandingsPill standings={standings} flyingTo={flights.map((f) => f.userId)} />
      <PartyScoreFlights scoreFlights={flights} />
    </div>
  );
}

/** Before the first question: who is playing, the rules for this many players, the countdown. */
export function AproximadoIntro({ seats, mySeat, scoring, locale, secondsLeft }: { seats: RoomSeatView[]; mySeat: number; scoring: AproximadoRoomView["scoring"]; locale: string; secondsLeft: number | null }) {
  const copy = aproximadoCopy(locale);
  const top = scoring === "podium" ? Math.min(3, seats.length - 1) : 1;
  return (
    <div className="flex flex-1 flex-col justify-center gap-6">
      <div className="text-center">
        <Brand copy={copy} className="text-4xl leading-none" />
        <p className="mt-2 text-sm font-black uppercase tracking-[0.2em] text-white/60" style={poppins}>{copy.introTitle(seats.length)}</p>
      </div>
      <ul className={cn("mx-auto grid w-full max-w-sm gap-3", seats.length === 2 || seats.length === 4 ? "grid-cols-2" : "grid-cols-3")}>
        {seats.map((s, i) => (
          <motion.li key={s.seat} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08 * i }} className="flex min-w-0 flex-col items-center gap-1.5">
            <DuelAvatar size="md" customization={s.avatar} />
            <span className={cn("w-full text-center text-xs font-black break-words [overflow-wrap:anywhere] leading-tight", s.seat === mySeat && "text-brand-green-light")} style={poppins}>{s.seat === mySeat ? copy.you : s.name}</span>
          </motion.li>
        ))}
      </ul>
      <ul className="space-y-2 rounded-2xl bg-white/[0.06] px-4 py-4">
        {copy.introRules(top).map((line) => (
          <li key={line} className="flex gap-2.5 text-[14px] leading-snug text-white/85"><span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-yellow" />{line}</li>
        ))}
      </ul>
      {secondsLeft !== null && <p className="text-center text-lg font-black text-brand-yellow" style={poppins} aria-live="polite">{copy.startsIn(secondsLeft)}</p>}
    </div>
  );
}

/** The end: a podium for the top three (two in a 1v1), then everyone with points, round wins and average error. */
export function AproximadoPodium({ view, locale, onRoom, onExit }: { view: AproximadoRoomView; locale: string; onRoom: () => void; onExit: () => void }) {
  const copy = aproximadoCopy(locale);
  const table: Standing[] = view.standings ?? [];
  const seatOf = (n: number) => view.seats.find((s) => s.seat === n)!;
  const mine = table.find((s) => s.seat === view.mySeat);
  const firsts = table.filter((s) => s.place === 1);
  const headline = mine?.place === 1 ? (firsts.length > 1 ? copy.tieFirst : copy.youWon) : copy.youPlace(mine?.place ?? table.length);
  // One block per place (up to three places): seats sharing a place stand on the same block, so a 6-way tie for first is
  // one block with everyone on it, not three blocks that leave three winners out.
  // Players who left stay in the table (marked) but never stand on the podium.
  const stayed = table.filter((s) => seatOf(s.seat).status !== "withdrawn");
  const places = [...new Set(stayed.map((s) => s.place))].slice(0, 3);
  const groups = places.map((place, step) => ({ place, step, seats: stayed.filter((s) => s.place === place) }));
  const order = groups.length === 3 ? [groups[1], groups[0], groups[2]] : groups.length === 2 ? [groups[1], groups[0]] : groups;
  const height = ["h-28", "h-20", "h-14"];
  const tone = ["bg-brand-yellow text-black", "bg-white/80 text-black", "bg-brand-orange text-white"];
  const rounds = Math.max(1, view.results.length);
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-white/60" style={poppins}>{copy.finalTitle}</p>
        <p className="mt-1 text-3xl font-black text-brand-yellow" style={poppins}>{headline}</p>
      </div>
      <div className="flex items-end justify-center gap-3">
        {order.map((g, i) => (
          <motion.div key={g.place} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 * i }} className="flex min-w-0 max-w-[8rem] flex-1 flex-col items-center gap-1.5">
            <span className="flex -space-x-3">
              {g.seats.slice(0, 3).map((s) => <DuelAvatar key={s.seat} size={g.step === 0 ? "md" : "sm"} customization={seatOf(s.seat).avatar} />)}
              {g.seats.length > 3 && <span className="ml-1 self-center text-xs font-black text-white/80">+{g.seats.length - 3}</span>}
            </span>
            <span className="w-full text-center text-xs font-black break-words [overflow-wrap:anywhere] leading-tight" style={poppins}>
              {g.seats.map((s, k) => (
                <span key={s.seat} className={cn(s.seat === view.mySeat && "text-brand-green-light")}>{k > 0 && " · "}{s.seat === view.mySeat ? copy.you : seatOf(s.seat).name}</span>
              ))}
            </span>
            <div className={cn("flex w-full flex-col items-center justify-start rounded-t-2xl pt-2", height[g.step], tone[g.step])}>
              <span className="text-2xl font-black leading-none" style={poppins}>{g.place}</span>
              <span className="text-[11px] font-black tabular-nums">{g.seats[0].points} {copy.colPoints}</span>
            </div>
          </motion.div>
        ))}
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-[10px] uppercase tracking-wide text-white/50"><th className="w-7 py-1 text-left">#</th><th className="text-left"><span className="sr-only">{copy.colPlayer}</span></th><th className="w-12 pl-2 text-right">{copy.colPoints}</th><th className="w-16 pl-2 text-right leading-tight">{copy.colWins}</th><th className="w-16 pl-2 text-right leading-tight">{copy.colError}</th></tr></thead>
        <tbody>
          {table.map((s) => {
            const seat = seatOf(s.seat);
            return (
              <tr key={s.seat} className={cn("border-t border-white/10", s.seat === view.mySeat && "bg-brand-green/15", seat.status === "withdrawn" && "opacity-50")}>
                <td className="py-2 font-black" style={poppins}>{s.place}</td>
                <td className="py-2"><span className="flex items-center gap-2"><DuelAvatar size="xs" customization={seat.avatar} /><span className="min-w-0 font-bold break-words [overflow-wrap:anywhere] leading-tight">{s.seat === view.mySeat ? copy.you : seat.name}</span>{seat.status === "withdrawn" && <span className="text-[10px] uppercase text-white/50">{copy.withdrawn}</span>}</span></td>
                <td className="py-2 text-right font-black tabular-nums" style={poppins}>{s.points}</td>
                <td className="py-2 text-right tabular-nums">{s.roundWins}</td>
                <td className="py-2 text-right tabular-nums text-white/70">{Math.round((s.totalError / rounds) * 100)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-auto flex flex-col gap-2">
        <button type="button" onClick={onRoom} className="h-12 rounded-full bg-brand-green text-sm font-black uppercase tracking-wide text-white hover:bg-brand-green-deep" style={poppins}>{copy.backToRoom}</button>
        <button type="button" onClick={onExit} className="h-11 rounded-full bg-white/10 text-sm font-bold uppercase tracking-wide text-white/85 hover:bg-white/15" style={poppins}>{copy.exit}</button>
      </div>
    </div>
  );
}

/** A full-screen notice: the match was cancelled, you left it, or it started without you. */
export function AproximadoNotice({ kind, locale, onRoom }: { kind: "cancelled" | "left" | "excluded" | "finished"; locale: string; onRoom: () => void }) {
  const copy = aproximadoCopy(locale);
  const [title, text] = kind === "cancelled" ? [copy.cancelledTitle, copy.cancelledText] : kind === "left" ? [copy.youLeftTitle, copy.youLeftText]
    : kind === "finished" ? [copy.finishedTitle, copy.finishedText] : [copy.excludedTitle, copy.excludedText];
  return (
    <div role="status" className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <p className="text-2xl font-black" style={poppins}>{title}</p>
      <p className="max-w-xs text-sm text-white/70">{text}</p>
      <button type="button" onClick={onRoom} className="mt-4 h-12 w-full max-w-xs rounded-full bg-brand-green text-sm font-black uppercase tracking-wide text-white hover:bg-brand-green-deep" style={poppins}>{copy.backToRoom}</button>
    </div>
  );
}

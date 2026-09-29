"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Crown, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DuelCopy } from "./duel.copy";
import type { Seat, UltimoDuelView } from "./duel.views";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;
/** This game's pair, as approved for it: you in brand green, the rival in brand blue. */
const SIDE = {
  me: { solid: "bg-brand-green", chip: "border-brand-green/60 bg-brand-green/20" },
  rival: { solid: "bg-brand-blue", chip: "border-brand-blue/70 bg-brand-blue/25" },
} as const;

/**
 * Último en pie: the shared category, whose turn it is (with the misses and the draining clock), every name said,
 * and the category's end (who is left standing, and the names nobody said). The runtime owns the intro, pauses,
 * forfeits and the result card; the header shows the clock.
 */
export function UltimoDuelBoard({ view, mySeat, names, copy, finished, secondsLeft, busy, onAnswer }: {
  view: UltimoDuelView; mySeat: Seat; names: [string, string]; copy: DuelCopy; finished: boolean; secondsLeft: number | null;
  /** A command of ours is still unanswered: the next waits for its judgement (a refused one frees the input too). */
  busy: boolean;
  onAnswer: (text: string) => void;
}) {
  const c = copy.ul;
  const side = (seat: Seat) => (seat === mySeat ? "me" : "rival");
  const nameOf = (seat: Seat) => (seat === mySeat ? copy.you : names[seat]);
  const myTurn = !finished && view.phase === "turn" && view.turn === mySeat;
  const share = view.phase === "turn" && secondsLeft !== null ? Math.max(0, Math.min(1, (secondsLeft * 1000) / view.turnMs)) : 0;
  const last = view.results.length > view.category ? view.results[view.category] : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <div className="rounded-2xl border border-white/10 bg-transparent px-4 py-3">
        <div className="flex items-center justify-between gap-2 text-[11px] font-black uppercase tracking-wide text-white/55">
          <span>{c.category(view.category + 1, view.totalCategories)}</span>
          <span className="flex items-center gap-1"><Timer className="size-3" />{c.perTurn(Math.round(view.turnMs / 1000))}</span>
        </div>
        <h2 className="mt-1 text-lg font-black leading-snug" style={poppins}>{view.title}</h2>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full bg-brand-yellow" animate={{ width: `${(view.said.length / view.total) * 100}%` }} />
          </div>
          <span className="shrink-0 text-xs font-bold tabular-nums text-white/70">{c.left(view.total - view.said.length, view.total)}</span>
        </div>
      </div>

      {view.phase === "reveal" && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-sm text-white/65">{view.hint}</p>
          <p className={cn("mt-6 rounded-full px-5 py-1.5 text-lg font-black text-white", SIDE[side(view.starter)].solid)} style={poppins}>{c.starts(nameOf(view.starter))}</p>
          {secondsLeft !== null && <p className="mt-6 text-7xl font-black tabular-nums" style={poppins}>{Math.max(1, secondsLeft)}</p>}
        </div>
      )}

      {view.phase === "turn" && (
        <div className={cn("mt-3 rounded-2xl px-4 py-3 text-white shadow-lg shadow-black/20", SIDE[side(view.turn)].solid)}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-black uppercase tracking-wide" style={poppins}>{myTurn ? copy.yourTurn : copy.theirTurn(names[view.turn])}</p>
            <span className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-white/75">{c.errors}</span>
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i} className={cn("size-2.5 rounded-full", i < view.misses ? "bg-brand-red-soft ring-2 ring-white/80" : "bg-white/35")} />
              ))}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/25">
            <div className={cn("h-full rounded-full transition-[width] duration-200 ease-linear", secondsLeft !== null && secondsLeft <= 5 ? "bg-brand-yellow" : "bg-white")} style={{ width: `${share * 100}%` }} />
          </div>
        </div>
      )}

      {(view.phase === "turn" || view.phase === "catEnd" || view.phase === "over") && (
        <>
          <div className="mt-3 min-h-6">
            <AnimatePresence mode="wait">
              {view.last && view.phase === "turn" && (
                <motion.p key={`${view.category}-${view.k}`} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0, x: view.last.kind === "ok" ? 0 : [0, -6, 6, -3, 0] }}
                  className={cn("flex items-center gap-1.5 text-sm font-bold", view.last.kind === "ok" ? "text-white" : view.last.kind === "ambiguous" ? "text-brand-yellow" : "text-brand-red-light")}>
                  {view.last.kind === "ok" && <><span className={cn("flex size-5 items-center justify-center rounded-full", SIDE[side(view.last.seat)].solid)}><Check className="size-3.5" strokeWidth={3} /></span>{view.last.name}</>}
                  {view.last.kind === "wrong" && c.wrong(nameOf(view.last.seat), view.last.text)}
                  {view.last.kind === "repeat" && c.repeat(nameOf(view.last.seat), view.last.text)}
                  {view.last.kind === "ambiguous" && view.last.seat === mySeat && c.ambiguous(view.last.text)}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {view.said.map((s, i) => (
              <motion.li key={`${view.category}-${i}`} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold text-white", SIDE[side(s.seat)].chip, i === view.said.length - 1 && "ring-2 ring-white/50")}>
                {s.name}
              </motion.li>
            ))}
          </ul>
        </>
      )}

      {(view.phase === "catEnd" || view.phase === "over") && last && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl bg-brand-blue px-4 py-3 text-white">
          <p className="text-xs font-bold uppercase tracking-wide text-white/75">
            {last.reason === "complete" ? c.complete : last.reason === "time" ? c.outTime(nameOf(last.winner === 0 ? 1 : 0), (last.winner === 0 ? 1 : 0) === mySeat) : c.outMisses(nameOf(last.winner === 0 ? 1 : 0), (last.winner === 0 ? 1 : 0) === mySeat)}
          </p>
          <p className="mt-1 flex items-center gap-2 text-xl font-black" style={poppins}>
            <span className={cn("flex size-8 items-center justify-center rounded-full bg-white", last.winner === mySeat ? "text-brand-green" : "text-brand-blue")}><Crown className="size-4" strokeWidth={2.5} /></span>
            {last.winner === null ? c.both : last.winner === mySeat ? c.youStand : c.rivalStands(names[last.winner])}
          </p>
          {view.missing && view.missing.length > 0 && (
            <>
              <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-white/75">{c.left2(view.missing.length)}</p>
              <ul className="mt-1.5 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {view.missing.map((name) => <li key={name} className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">{name}</li>)}
              </ul>
            </>
          )}
        </motion.div>
      )}

      <div className="flex-1" />
      {view.phase === "turn" && !finished && (
        <AnswerBox enabled={myTurn && !busy} placeholder={myTurn ? c.placeholder : copy.theirTurn(names[view.turn])} say={c.say} onSubmit={onAnswer} />
      )}
    </div>
  );
}

/** The app's typed-answer look: blue pill input, green pill button, stacked. */
function AnswerBox({ enabled, placeholder, say, onSubmit }: { enabled: boolean; placeholder: string; say: string; onSubmit: (text: string) => void }) {
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (enabled) input.current?.focus({ preventScroll: true }); }, [enabled]);
  // The server only takes an answer with a letter or digit; anything else would just be refused.
  const valid = /[\p{L}\p{N}]/u.test(draft);
  const submit = () => {
    if (!enabled || !valid) return;
    onSubmit(draft.trim());
    setDraft("");
  };
  return (
    <form className="sticky bottom-0 mt-3 space-y-2 bg-surface-page-alt/95 pb-1 pt-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <input ref={input} value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 60))} readOnly={!enabled} autoComplete="off" autoCapitalize="words" autoCorrect="off" spellCheck={false} enterKeyHint="send"
        placeholder={placeholder} aria-label={placeholder}
        className={cn("font-poppins h-14 w-full rounded-[20px] border-none bg-brand-blue px-5 text-center text-base uppercase text-white outline-none placeholder:text-white/55 placeholder:uppercase placeholder:tracking-[0.08em] focus:outline-none", !enabled && "opacity-50")}
        style={{ fontWeight: 600, letterSpacing: "0.08em", boxShadow: "0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)" }} />
      <button type="submit" disabled={!enabled || !valid}
        className="font-poppins h-14 w-full rounded-[20px] bg-brand-green uppercase text-white outline-none transition-colors hover:bg-brand-green-deep disabled:cursor-not-allowed disabled:opacity-40"
        style={{ fontWeight: 600, fontSize: 16, letterSpacing: "0.06em", boxShadow: "0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)" }}>
        {say}
      </button>
    </form>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Footprints, Globe2, Lightbulb, Lock, Shirt } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/locale";
import { pistasCopy } from "@/features/pistas/pistas.copy";
import type { DuelCopy } from "./duel.copy";
import type { PistasDuelClue, PistasDuelView, Seat } from "./duel.views";
import { SEAT_DOT } from "./duel.seats";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;
const GUESS_MAX = 60;

export function PistasDuelBoard({ view, mySeat, names, copy, locale, finished, onGuess, onPass }: {
  view: PistasDuelView; mySeat: Seat; names: [string, string]; copy: DuelCopy; locale: Locale; finished: boolean;
  onGuess: (text: string) => void; onPass: () => void;
}) {
  const rival: Seat = mySeat === 0 ? 1 : 0;
  const me = view.seats[mySeat];
  const them = view.seats[rival];
  const open = !finished && view.phase === "clue";
  const [draft, setDraft] = useState("");
  const newest = useRef<HTMLLIElement | null>(null);

  // A new clue scrolls into view above the sticky panel (the board is keyed by round, so the box starts empty).
  useEffect(() => { newest.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [view.clue, view.round]);

  const submit = () => {
    const text = draft.trim();
    if (!text || !open || me.locked) return;
    onGuess(text);
    setDraft("");
  };

  const notes: Array<{ key: string; text: string; tone: "me" | "rival" | "info" }> = [];
  if (open) {
    if (them.wrong) notes.push({ key: "tw", tone: "rival", text: copy.pf.tried(names[rival], them.wrong) });
    if (them.locked && !me.locked) notes.push({ key: "tl", tone: "info", text: copy.pf.lockedRival(names[rival], Math.max(0, view.ceiling - view.clue)) });
    if (me.locked && !them.locked) notes.push({ key: "ml", tone: "info", text: copy.pf.lockedYou });
    if (!them.locked && them.passed) notes.push({ key: "tp", tone: "rival", text: copy.pf.rivalPassed(names[rival]) });
    if (!me.locked && me.passed) notes.push({ key: "mp", tone: "me", text: copy.pf.youPassed });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-2">
        <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-yellow text-black">
          <span className="text-2xl font-black leading-none tabular-nums" style={poppins}>{view.settled ? view.settled.points : view.pointsInPlay}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wide text-white/60" style={poppins}>{copy.player(view.round + 1, view.totalRounds)}</p>
          <p className="text-sm font-bold text-white/85">{copy.pf.pointsInPlay}</p>
        </div>
      </div>

      <ol className="mt-3 flex flex-col gap-1.5">
        {view.clues.map((clue, i) => (
          <li key={`${view.round}-${i}`} ref={i === view.clues.length - 1 ? newest : undefined}
            className={cn("flex items-start gap-2.5 rounded-xl border px-2.5 py-2", i === view.clues.length - 1 && open ? "border-brand-yellow/50 bg-brand-yellow/[0.07]" : "border-white/10 bg-white/[0.05]")}>
            <span className="mt-0.5 w-5 shrink-0 text-center text-xs font-black tabular-nums text-white/45" style={poppins}>{i + 1}</span>
            <ClueChip clue={clue} locale={locale} />
            <span className="text-[15px] leading-snug text-white/90">{clue.text}</span>
          </li>
        ))}
        {open && Array.from({ length: Math.max(0, 10 - view.clues.length) }, (_, i) => {
          const n = view.clues.length + i + 1;
          const beyond = n > view.ceiling;
          return (
            <li key={`lock-${n}`} className={cn("flex h-9 items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] px-2.5 text-white/25", beyond && "line-through opacity-50")}>
              <span className="w-5 text-center text-xs font-black tabular-nums" style={poppins}>{n}</span>
              <Lock className="size-3.5" />
            </li>
          );
        })}
      </ol>

      {view.settled && (
        <div className="mt-3 rounded-2xl bg-brand-blue px-4 py-3 text-center">
          <p className="text-sm font-black uppercase" style={poppins}>
            {view.settled.winner === null
              ? copy.pf.nobody
              : view.settled.winner === mySeat ? copy.pf.youSolved(view.settled.points) : copy.pf.solvedBy(names[view.settled.winner], view.settled.points)}
          </p>
          <p className="mt-1 text-xs text-white/70">{copy.pf.answerWas}</p>
          <p className="text-xl font-black uppercase" style={poppins}>{view.settled.answer}</p>
        </div>
      )}

      <div className="flex-1" />

      {open && (
        <div className="sticky bottom-0 -mx-4 mt-3 border-t border-white/10 bg-surface-page-alt/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur">
          {notes.length > 0 && (
            <ul className="mb-2 flex flex-col gap-1">
              {notes.map((note) => (
                <li key={note.key} className={cn("flex items-center gap-1.5 text-xs font-semibold", note.tone === "rival" || note.tone === "me" ? "text-white" : "text-white/70")}>
                  {(note.tone === "rival" || note.tone === "me") && <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", SEAT_DOT[note.tone])} />}{note.text}
                </li>
              ))}
            </ul>
          )}
          {me.locked ? null : (
            <>
              <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); submit(); }}>
                <input value={draft} onChange={(event) => setDraft(event.target.value.slice(0, GUESS_MAX))} maxLength={GUESS_MAX}
                  placeholder={copy.pf.placeholder} autoComplete="off" autoCapitalize="words" enterKeyHint="send"
                  className="h-12 min-w-0 flex-1 rounded-full border border-white/15 bg-white/[0.07] px-4 text-base text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none" />
                <button type="submit" disabled={!draft.trim()} className="h-12 shrink-0 rounded-full bg-brand-green px-5 text-sm font-black uppercase text-white hover:bg-brand-green-deep disabled:opacity-50" style={poppins}>{copy.pf.guess}</button>
              </form>
              <button type="button" onClick={onPass} disabled={me.passed}
                className="mt-2 h-10 w-full rounded-full bg-white/10 text-xs font-black uppercase tracking-wide text-white/85 hover:bg-white/15 disabled:opacity-40" style={poppins}>
                {view.clue >= view.ceiling ? copy.pf.skip : copy.pf.nextClue}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ClueChip({ clue, locale }: { clue: PistasDuelClue; locale: Locale }) {
  const c = pistasCopy(locale);
  const base = "flex h-7 min-w-7 shrink-0 items-center justify-center gap-1 rounded-lg px-1.5 text-[10px] font-black uppercase";
  if (clue.kind === "confed") return <span className={cn(base, "bg-brand-blue text-white")}><Globe2 className="size-3.5" />{clue.icon}</span>;
  if (clue.kind === "position") return <span className={cn(base, "bg-brand-green text-white")}><Shirt className="size-3.5" />{c.positions[clue.icon ?? ""] ?? clue.icon}</span>;
  if (clue.kind === "foot") return <span className={cn(base, "bg-brand-purple text-white")}><Footprints className={cn("size-3.5", clue.icon === "left" && "-scale-x-100")} />{c.feet[clue.icon ?? ""]}</span>;
  if (clue.kind === "decade") return <span className={cn(base, "bg-brand-orange text-white")}><CalendarDays className="size-3.5" />{clue.icon ? `${String(clue.icon).slice(2)}s` : ""}</span>;
  return <span className={cn(base, "w-7 bg-white/10 px-0 text-brand-yellow")}><Lightbulb className="size-3.5" /></span>;
}

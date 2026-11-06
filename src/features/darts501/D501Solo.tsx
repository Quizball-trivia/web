"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { wordDailyCopy } from "@/features/wordgames/copy";
import { DailyEnd } from "@/features/wordgames/daily/WordDailyShell";
import { TopBar, poppins } from "@/features/wordgames/ui";
import { SuggestBox, type SuggestLookup } from "@/features/tenable/SuggestBox";
import { DartFeedback, DartLog, Dartboard, ScorePanel, dartEmoji } from "./D501Board";
import { d501Copy } from "./d501.copy";
import { D501_CALENDAR, d501DailyGame } from "./d501.game";
import { D501 } from "./d501.rules";
import { dartsThrown, type D501Category, type D501SoloState } from "./d501.view";

export { D501_CALENDAR, d501DailyGame };

/** The leg's category, as the darts player's "game on" card. */
export function CategoryCard({ locale, category, className }: { locale: string; category: D501Category; className?: string }) {
  const c = d501Copy(locale);
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5", className)}>
      <p className="text-sm font-black leading-snug" style={poppins}>{category.title}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-white/50">{c.maxHint}{category.asOf && !category.note && ` · ${c.asOf(category.asOf)}`}</p>
      {category.note && <p className="mt-0.5 text-[11px] text-white/45">{category.note}</p>}
    </div>
  );
}

export function D501PlayView({ locale, number, state, pending, notice, lookup, onSay, onGiveUp, onResult, onExit }: {
  locale: string; number: number; state: D501SoloState; pending: boolean; notice: string | null; lookup?: SuggestLookup;
  onSay: (text: string, pick: string | null) => void | Promise<boolean>; onGiveUp: () => void; onResult: () => void; onExit: () => void;
}) {
  const c = d501Copy(locale);
  const d = wordDailyCopy(locale);
  const used = dartsThrown(state.darts);
  const done = state.status === "done";
  return (
    <div className="flex flex-1 flex-col">
      <TopBar wrap brand={c.brand} exitLabel={d.exit} onExit={onExit} right={<span className="shrink-0 text-xs font-black uppercase tracking-wide text-white/55" style={poppins}>#{number}</span>} />
      <CategoryCard className="mt-3" locale={locale} category={state.category} />
      <div className="mt-3"><ScorePanel locale={locale} remaining={state.remaining} dartsUsed={used} maxDarts={state.maxDarts} darts={state.darts} outs={state.outs} /></div>
      {!done && <div className="mt-3"><DartFeedback locale={locale} last={state.last} /></div>}
      <DartLog className="mt-2" locale={locale} darts={state.darts} limit={4} />
      {notice && <p role="alert" className="mt-3 rounded-2xl bg-brand-red-soft/15 px-4 py-3 text-sm font-semibold text-brand-red-light">{notice}</p>}
      <div className="flex-1" />
      {!done && (
        <>
          <SuggestBox className="z-20" kind={state.category.kind} release={state.category.release} locale={locale} lookup={lookup} placeholder={c.placeholder} say={c.say}
            disabled={pending} note={pending ? c.sending : null} onSubmit={onSay} />
          <button type="button" onClick={onGiveUp} disabled={pending}
            className="mx-auto mt-1 min-h-9 px-3 text-xs font-bold uppercase tracking-wide text-white/55 underline-offset-4 hover:text-white hover:underline disabled:opacity-50">{c.giveUp}</button>
        </>
      )}
      {done && (
        <div data-d501-end role="status" className="sticky bottom-0 mt-3 rounded-3xl bg-brand-blue px-5 pb-4 pt-3 text-white shadow-2xl shadow-black/40">
          <p className="text-xl font-black leading-tight" style={poppins}>{endLine(locale, state)}</p>
          <ResultButton onClick={onResult}>{d.seeResult}</ResultButton>
        </div>
      )}
    </div>
  );
}

/** The run just ended and the answer box is gone: focus moves here, so keyboard and screen-reader players are not left on the page body. */
function ResultButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <button ref={ref} type="button" onClick={onClick} style={poppins}
      className="mt-3 h-14 w-full rounded-full bg-brand-green text-base font-black uppercase tracking-wide text-white hover:bg-brand-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
      {children}
    </button>
  );
}

function endLine(locale: string, state: D501SoloState) {
  const c = d501Copy(locale);
  if (state.endReason === "checkout") return c.endCheckout(dartsThrown(state.darts));
  return `${state.endReason === "gaveUp" ? c.endGaveUp : c.endDarts} · ${c.endLeft(state.remaining)}`;
}

export function D501EndView({ locale, number, state, guestOnPastBoard, leaderboard, friends, onArchive, onExit }: {
  locale: string; number: number; state: D501SoloState; guestOnPastBoard: boolean; leaderboard: ReactNode; friends?: ReactNode; onArchive: () => void; onExit?: () => void;
}) {
  const c = d501Copy(locale);
  const used = dartsThrown(state.darts);
  const out = state.endReason === "checkout";
  const result = out ? c.darts(used) : c.endLeft(state.remaining);
  return (
    <DailyEnd game={d501DailyGame(locale)} locale={locale} day={state.day} shareText={c.shareText(number, result, dartEmoji(state.darts))}
      guestOnPastBoard={guestOnPastBoard} ranked={state.ranked} rank={state.rank} leaderboard={leaderboard} friends={friends} onArchive={onArchive} onExit={onExit}>
      <div className={cn("rounded-3xl px-5 pb-5 pt-4 text-center", out ? "bg-brand-green text-black" : "bg-brand-blue")}>
        <p className={cn("text-xs font-black uppercase tracking-[0.2em]", out ? "text-black/70" : "text-white/75")}>{c.title} #{number}</p>
        <div className="mx-auto mt-3 flex items-center justify-center gap-4">
          <Dartboard darts={state.darts} className="size-20" />
          <div className="text-left">
            <p className="text-5xl font-black tabular-nums leading-none" style={poppins}>{out ? used : state.remaining}</p>
            <p className={cn("mt-1 text-sm font-bold", out ? "text-black/75" : "text-white/80")}>{out ? c.dartsWord(used) : c.left}</p>
          </div>
        </div>
        <p className={cn("mt-3 text-sm font-bold", out ? "text-black/80" : "text-white/85")}>{endLine(locale, state)}</p>
        <p className="mt-2 text-lg tracking-widest" aria-hidden>{dartEmoji(state.darts)}</p>
        <p className={cn("mt-2 text-xs", out ? "text-black/65" : "text-white/70")}>{state.category.title}</p>
      </div>
      {!out && state.finishes && state.finishes.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-black uppercase tracking-wide text-white/55">{c.finishesTitle} {state.remaining}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {state.finishes.map((f) => <li key={f.name} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{f.name} <span className="tabular-nums text-white/60">{f.stat}</span></li>)}
          </ul>
        </div>
      )}
      {!out && (!state.finishes || state.finishes.length === 0) && state.finishesCount != null && (
        <div className="mt-4 rounded-2xl bg-white/[0.05] px-4 py-3">
          <p className="text-sm font-bold">{c.finishesCount(state.finishesCount, state.remaining)}</p>
          {state.finishesCount > 0 && <p className="mt-0.5 text-xs text-white/60">{c.finishesLater}</p>}
        </div>
      )}
      <DartLog className="mt-4" locale={locale} darts={state.darts} limit={D501.soloDarts} />
    </DailyEnd>
  );
}

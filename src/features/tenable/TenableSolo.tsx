"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { wordDailyCopy } from "@/features/wordgames/copy";
import { DailyEnd } from "@/features/wordgames/daily/WordDailyShell";
import { Chips, GreenButton, RefusedReports, TopBar, poppins } from "@/features/wordgames/ui";
import { wordSharedCopy } from "@/features/wordgames/copy";
import { SuggestBox, type SuggestLookup } from "./SuggestBox";
import { tenableCopy } from "./tenable.copy";
import { TENABLE_CALENDAR, tenableDailyGame } from "./tenable.game";

export { TENABLE_CALENDAR, tenableDailyGame };
import { Lives, TenableTower, towerEmoji } from "./TenableTower";
import { foundCount, type TenableSoloState } from "./tenable.view";

function Feedback({ state, locale }: { state: TenableSoloState; locale: string }) {
  const c = tenableCopy(locale);
  const f = state.last;
  const line = f && (f.kind === "right" && f.rank !== null
    ? { tone: "ok", text: c.ok(state.slots[f.rank - 1]?.name ?? f.text, f.rank) }
    : f.kind === "wrong" ? { tone: "bad", text: c.wrong(f.text) }
      : f.kind === "repeat" ? { tone: "warn", text: c.repeat(f.text) }
        : f.kind === "repeatWrong" ? { tone: "warn", text: c.repeatWrong(f.text) }
          : f.kind === "unknown" ? { tone: "warn", text: c.unknown(f.text) }
            : f.kind === "ambiguous" ? { tone: "warn", text: c.ambiguous(f.text) } : null);
  return (
    <div className="mt-3 min-h-6" aria-live="polite">
      <AnimatePresence mode="wait">
        {line && f && (
          <motion.p key={f.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0, x: line.tone === "bad" ? [0, -6, 6, -3, 0] : 0 }} exit={{ opacity: 0 }}
            className={cn("flex items-center gap-1.5 text-sm font-bold", line.tone === "ok" ? "text-white" : line.tone === "bad" ? "text-brand-red-light" : "text-brand-yellow")}>
            {line.tone === "ok" && <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-green"><Check className="size-3.5 text-black" strokeWidth={3} /></span>}
            {line.text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TenablePlayView({ locale, number, state, pending, notice, lookup, onSay, onGiveUp, onResult, onExit }: {
  locale: string; number: number; state: TenableSoloState; pending: boolean; notice: string | null; lookup?: SuggestLookup;
  onSay: (text: string, pick: string | null) => void | Promise<boolean>; onGiveUp: () => void; onResult: () => void; onExit: () => void;
}) {
  const c = tenableCopy(locale);
  const d = wordDailyCopy(locale);
  const found = state.score ?? foundCount(state.slots);
  const done = state.status === "done";
  const fresh = state.last?.kind === "right" ? state.last.rank : null;
  return (
    <div className="flex flex-1 flex-col">
      <TopBar brand={c.brand} exitLabel={d.exit} onExit={onExit} right={<Lives lives={state.lives} max={state.maxLives} label={c.livesLeft(state.lives)} />} />
      <div className="mt-3 flex items-center justify-between text-xs font-black uppercase tracking-wide text-white/55" style={poppins}>
        <span>#{number}</span>
        <span data-tenable-found className="rounded-full bg-white/10 px-2.5 py-1 text-white">{c.found(found)}</span>
      </div>
      <div className="mt-2">
        <TenableTower list={state.list} slots={state.slots} fresh={fresh} hiddenLabel={c.hidden} asOfLabel={c.asOf} compact />
      </div>
      {!done && <Feedback state={state} locale={locale} />}
      {state.misses.length > 0 && (
        <div className="mt-1">
          <p className="text-[11px] font-black uppercase tracking-wide text-white/45">{c.missesTitle}</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {state.misses.map((m, i) => <li key={`${i}-${m}`} className="rounded-full bg-white/[0.07] px-2.5 py-1 text-xs font-medium text-white/60 line-through decoration-white/40">{m}</li>)}
          </ul>
        </div>
      )}
      {notice && <p role="alert" className="mt-3 rounded-2xl bg-brand-red-soft/15 px-4 py-3 text-sm font-semibold text-brand-red-light">{notice}</p>}
      <div className="flex-1" />
      {!done && (
        <>
          <SuggestBox className="z-20" kind={state.list.kind} release={state.list.release} lookup={lookup} placeholder={c.placeholder} say={c.say} disabled={pending} note={pending ? c.sending : null} onSubmit={onSay} />
          <button type="button" onClick={onGiveUp} disabled={pending}
            className="mx-auto mt-1 min-h-9 px-3 text-xs font-bold uppercase tracking-wide text-white/55 underline-offset-4 hover:text-white hover:underline disabled:opacity-50">{c.giveUp}</button>
        </>
      )}
      {done && (
        <div data-tenable-end className="sticky bottom-0 mt-3 rounded-3xl bg-brand-blue px-5 pb-4 pt-3 text-white shadow-2xl shadow-black/40">
          <div className="flex items-end justify-between gap-3">
            <p className="text-xl font-black leading-tight" style={poppins}>{state.endReason === "complete" ? c.endComplete : state.endReason === "gaveUp" ? c.endGaveUp : c.endLives}</p>
            <p className="shrink-0 text-4xl font-black tabular-nums" style={poppins}>{c.score(found)}</p>
          </div>
          {state.disclosed === false && found < 10 && <p className="mt-1 text-xs text-white/80">{c.opensTomorrow}</p>}
          <GreenButton className="mt-3" onClick={onResult}>{d.seeResult}</GreenButton>
        </div>
      )}
    </div>
  );
}

export function TenableEndView({ locale, number, state, guestOnPastBoard, leaderboard, friends, onArchive, onExit, onReport }: {
  locale: string; number: number; state: TenableSoloState; guestOnPastBoard: boolean; leaderboard: ReactNode; friends?: ReactNode;
  onArchive: () => void; onExit?: () => void;
  /** "I was right" for an answer the list refused; offered once the day is over (the server refuses earlier). */
  onReport?: (text: string) => Promise<boolean>;
}) {
  const c = tenableCopy(locale);
  const found = state.score ?? foundCount(state.slots);
  const missed = state.slots.filter((s) => s.missed && s.name).map((s) => `#${s.rank} ${s.name}`);
  // The list was corrected after this run finished: the server sends none of either version's content.
  const corrected = state.slots.length === 0;
  return (
    <DailyEnd game={tenableDailyGame(locale)} locale={locale} day={state.day} shareText={c.shareText(number, found, towerEmoji(state.slots)).trimEnd()}
      guestOnPastBoard={guestOnPastBoard} ranked={state.ranked} rank={state.rank} leaderboard={leaderboard} friends={friends} onArchive={onArchive} onExit={onExit}>
      <div className="rounded-3xl bg-brand-blue px-5 pb-5 pt-4 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">{c.title} #{number}</p>
        <p className="mt-2 text-6xl font-black tabular-nums" style={poppins}>{c.score(found)}</p>
        <p className="mt-1 text-sm font-bold text-white/85">{state.endReason === "complete" ? c.endComplete : state.endReason === "gaveUp" ? c.endGaveUp : c.endLives}</p>
        {corrected ? (
          <p className="mt-3 text-xs text-white/75">{c.corrected}</p>
        ) : (
          <>
            <div className="mx-auto mt-4 flex w-fit flex-col gap-1" aria-hidden>
              {state.slots.map((s) => (
                <span key={s.rank} className={cn("h-2.5 w-28 rounded-full", s.name !== null && !s.missed ? "bg-brand-green" : "bg-white/20")} />
              ))}
            </div>
            <p className="mt-3 text-xs text-white/75">{state.list.title}</p>
          </>
        )}
      </div>
      {!corrected && state.disclosed === false && found < 10 && <p className="mt-3 text-center text-xs text-white/60">{c.opensTomorrow}</p>}
      {onReport && !corrected && state.disclosed && state.misses.length > 0 && (
        <RefusedReports className="mt-4" texts={state.misses} line={(t) => c.wrong(t)} label={wordSharedCopy(locale).iWasRight} thanks={wordSharedCopy(locale).reported} onReport={onReport} />
      )}
      {missed.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-black uppercase tracking-wide text-white/55">{c.missedTitle}</p>
          <Chips className="mt-2" names={missed} />
        </div>
      )}
    </DailyEnd>
  );
}

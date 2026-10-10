"use client";

import { nameChainDailyGame } from "@/features/wordgames/daily/wordDaily.games";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { nameChainCopy, nameChainDailyCopy, wordDailyCopy, wordSharedCopy } from "@/features/wordgames/copy";
import { createWordDailyApi, type WordRunStateBase } from "@/features/wordgames/daily/wordDaily.api";
import { isLiveDay, NAME_CHAIN_CALENDAR, puzzleNumber } from "@/features/wordgames/daily/wordDaily.logic";
import { useServerNow, useWordDaily } from "@/features/wordgames/daily/useWordDaily";
import { DailyEnd, WordDailyLeaderboard, WordDailyScreen } from "@/features/wordgames/daily/WordDailyShell";
import { AnswerBox, Chips, GreenButton, RefusedReports, TimeBar, TopBar, poppins, useRefused } from "@/features/wordgames/ui";
import type { EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { cn } from "@/lib/utils";

type Verdict = "ok" | "unknown" | "letter" | "repeat";
/** Server-held run state (backend name-chain-daily.rules PublicRunState). */
export interface NameChainDailyState extends WordRunStateBase {
  chain: number; totalChains: number; chainCap: number; links: Array<{ name: string; game: string; given: boolean }>; letter: string; turnMs: number; attempt: number;
  last: { n: number; kind: Verdict; text: string; name: string | null; starts: string[] } | null;
  settled: { reason: "time" | "pass" | "cap"; named: number; could: string[] } | null;
  results: number[]; longest: number;
}
type Result = Verdict | "late" | "too_fast";

export const nameChainDailyApi = createWordDailyApi<NameChainDailyState, Result, { day: string; starts: string[] }>("/api/v1/name-chain");
const loadBoard = (day: string, locale: string) => nameChainDailyApi.leaderboard(day, locale);

export { nameChainDailyGame } from "@/features/wordgames/daily/wordDaily.games";

/** A name with the letter the chain hangs on picked out. */
function Lettered({ name, className }: { name: string; className?: string }) {
  const letters = [...name];
  const at = letters.length - 1 - [...letters].reverse().findIndex((ch) => /\p{L}/u.test(ch));
  return <span className={className} style={poppins}>{letters.map((ch, i) => <span key={i} className={i === at ? "text-brand-yellow" : undefined}>{ch}</span>)}</span>;
}

export function NameChainDaily({ locale, onExit, onEvent, initialDay, onDay }: {
  locale: string; onExit?: () => void; onEvent?: (event: "start" | "complete" | "replay", detail?: EngineEventDetail) => void; initialDay?: string | null; onDay?: (day: string, newest: boolean) => void;
}) {
  const game = nameChainDailyGame(locale);
  const c = wordSharedCopy(locale);
  const d = wordDailyCopy(locale);
  const g = nameChainCopy(locale);
  const gd = nameChainDailyCopy(locale);
  const [flash, setFlash] = useState<{ id: number; text: string } | null>(null);
  const refused = useRefused();
  const daily = useWordDaily<NameChainDailyState, Result>({
    api: nameChainDailyApi, calendar: NAME_CHAIN_CALENDAR, locale, initialDay, onDay, onEvent,
    onResult: (result, next, typed) => {
      setFlash(result === "too_fast" ? { id: Date.now(), text: gd.tooFast } : result === "late" ? { id: Date.now(), text: gd.late } : null);
      if (result === "unknown") refused.add(next.chain, typed);
    },
  });
  const { state, day } = daily;
  const runScope = `${daily.owner}:${day}`;
  const resetRefused = refused.reset;
  useEffect(() => { resetRefused(); }, [runScope, resetRefused]);
  const now = useServerNow(Boolean(state?.open), daily.clock);
  const fresh = (s: NameChainDailyState) => !s.done && !s.open && s.settled === null;
  const start = async () => {
    const run = await daily.play();
    // A chain is started only by a click: a reload never burns its clock.
    if (run && fresh(run.state)) await daily.next();
  };
  const status = state?.done ? "done" : state && (state.chain > 0 || state.open || state.settled) ? "started" : "new";

  let play = null;
  // The run is finished by its last answer: that answer's own result stays on screen until the player moves on.
  if (state && day && (!state.done || state.settled)) {
    // The ticking clock can be a beat older than a deadline that has just arrived: never show more than the full time.
    const msLeft = state.open && state.deadline ? Math.min(state.turnMs, Math.max(0, Date.parse(state.deadline) - now)) : 0;
    const busy = daily.pending !== null;
    const current = state.links.at(-1) ?? null;
    const named = state.links.filter((link) => !link.given).length;
    const total = state.score + (state.open ? named : 0);
    const f = state.last;
    const feedback = flash ? { tone: "bad" as const, text: flash.text, key: `f${flash.id}` } : f && (f.kind === "ok"
      ? { tone: "ok" as const, text: f.name ?? f.text, key: `ok${named}` }
      : { tone: "bad" as const, key: `n${f.n}`, text: f.kind === "unknown" ? g.unknown(f.text) : f.kind === "repeat" ? g.repeat(f.name ?? f.text) : g.letter(f.name ?? f.text, f.starts.join(" / ") || "?", state.letter) });
    const settled = state.settled;
    const lastChain = state.chain + 1 >= state.totalChains;
    const note = busy ? g.sending : daily.notice === "connection" ? d.notices.connection : null;
    play = (
      <div className="flex flex-1 flex-col">
        <TopBar brand={game.brand} seconds={state.open ? Math.ceil(msLeft / 1000) : null} exitLabel={c.exit} onExit={() => (onExit ? onExit() : daily.setView("intro"))}
          right={<span className="shrink-0 text-[11px] font-black uppercase tracking-wide text-white/55">{gd.chainOf(state.chain + 1, state.totalChains)}</span>} />
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/[0.05] px-4 py-2">
          <span className="text-xs font-bold uppercase tracking-wide text-white/60">{gd.soFar(total)}</span>
          <span className="text-2xl font-black tabular-nums" style={poppins} data-daily-score>{total}</span>
        </div>
        {current && (
          <div className="mt-3 rounded-2xl border border-white/10 px-4 py-4 text-center">
            <p className="text-[11px] font-black uppercase tracking-wide text-white/55">{current.given ? g.supplied : c.you}</p>
            <AnimatePresence mode="wait">
              <motion.div key={`${state.links.length}-${current.name}`} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
                <Lettered name={current.game} className="mt-1 block break-words text-4xl font-black uppercase leading-tight" />
                {current.name !== current.game && <p className="mt-1 text-sm text-white/60">{current.name}</p>}
              </motion.div>
            </AnimatePresence>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide text-white/60">
              {g.nextLetter}<ArrowRight className="size-3.5" aria-hidden />
              <span data-chain-letter className="flex size-9 items-center justify-center rounded-xl bg-brand-yellow text-xl font-black text-black" style={poppins}>{state.letter}</span>
            </div>
          </div>
        )}
        {state.open && (
          <>
            <div className="mt-3 rounded-2xl bg-brand-green px-4 py-3 text-white shadow-lg shadow-black/20">
              <p className="text-sm font-black uppercase leading-snug tracking-wide" style={poppins}>{g.yourTurn(state.letter)}</p>
              <TimeBar className="mt-2" share={msLeft / state.turnMs} urgent={msLeft <= 5_000} />
            </div>
            <div className="mt-3 min-h-6" aria-live="polite">
              <AnimatePresence mode="wait">
                {feedback && (
                  <motion.p key={feedback.key} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0, x: feedback.tone === "ok" ? 0 : [0, -6, 6, -3, 0] }} exit={{ opacity: 0 }}
                    className={cn("flex items-center gap-1.5 text-sm font-bold", feedback.tone === "ok" ? "text-white" : "text-brand-red-light")}>
                    {feedback.tone === "ok" && <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-green"><Check className="size-3.5" strokeWidth={3} /></span>}
                    {feedback.text}
                  </motion.p>
                )}
              </AnimatePresence>
              {state.links.length > 1 && current?.given && <p className="mt-1 text-xs font-semibold text-brand-yellow">{g.fresh}</p>}
            </div>
            <ul className="mt-2 flex flex-wrap items-center gap-1.5" aria-label={g.chainTitle}>
              {state.links.slice(-10, -1).map((link, i) => (
                <li key={`${i}-${link.name}`} className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold text-white", link.given ? "border-white/25 bg-white/10" : "border-brand-green/60 bg-brand-green/20")}>{link.game}</li>
              ))}
            </ul>
            <div className="flex-1" />
            <AnswerBox placeholder={c.placeholder} say={c.say} disabled={note !== null} note={note} onSubmit={(text) => void daily.answer(text)} />
            <button type="button" disabled={busy} onClick={() => void daily.pass()} className="mx-auto mt-1 min-h-9 px-3 text-xs font-bold uppercase tracking-wide text-white/55 underline-offset-4 hover:text-white hover:underline disabled:opacity-50">{g.giveUp}</button>
          </>
        )}
        {settled && (
          <div className="mt-4 rounded-2xl bg-brand-blue px-4 py-4 text-white shadow-lg shadow-black/20" role="status">
            <p className="text-xs font-bold uppercase tracking-wide text-white/75">{settled.reason === "time" ? g.time : settled.reason === "pass" ? g.passed : gd.capped}</p>
            <p className="mt-1 text-2xl font-black" style={poppins}>{settled.reason === "cap" ? gd.capped : gd.chainOver}</p>
            <p className="mt-1 text-lg font-black tabular-nums" style={poppins}>{gd.footballers(settled.named)}</p>
            {settled.could.length > 0 && (
              <>
                <p className="mt-4 text-xs font-black uppercase tracking-wide text-white/75">{g.could(state.letter)}</p>
                <Chips className="mt-2" names={settled.could} />
              </>
            )}
            <RefusedReports className="mt-3" texts={refused.of(state.chain)} line={g.unknown} label={c.iWasRight} thanks={c.reported}
              onReport={(text) => nameChainDailyApi.report(day, text, locale)} />
            <GreenButton className="mt-4" disabled={busy} onClick={() => (state.done ? daily.setView("end") : void daily.next())}>{lastChain ? gd.finish : gd.nextChain}</GreenButton>
          </div>
        )}
        {fresh(state) && (
          <>
            <div className="flex-1" />
            <GreenButton className="mt-6" disabled={busy} onClick={() => void daily.next()}>{d.resume}</GreenButton>
          </>
        )}
        {daily.notice && daily.notice !== "connection" && <p role="alert" className="mt-3 text-center text-sm font-semibold text-brand-red-light">{d.notices[daily.notice]}</p>}
      </div>
    );
  }

  const end = state?.done && day ? (
    <DailyEnd game={game} locale={locale} day={day} shareText={gd.shareText(puzzleNumber(NAME_CHAIN_CALENDAR, day), state.score, state.results.join(" + "))} guestOnPastBoard={daily.guestOnPastBoard}
      ranked={state.ranked} rank={state.rank} onArchive={() => daily.setView("archive")} onExit={onExit}
      leaderboard={<WordDailyLeaderboard game={game} locale={locale} load={loadBoard} day={isLiveDay(NAME_CHAIN_CALENDAR, day, daily.today) ? day : undefined} refreshKey={daily.boardRefresh} placement="end" className="mt-6" />}>
      <div className="rounded-3xl bg-brand-blue px-5 pb-5 pt-4 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">{gd.endTitle} · #{puzzleNumber(NAME_CHAIN_CALENDAR, day)}</p>
        <p className="mt-2 text-6xl font-black leading-none tabular-nums" style={poppins} data-daily-final>{state.score}</p>
        <p className="mt-1 text-sm font-bold text-white/80">{gd.footballers(state.score)}</p>
        <p className="mt-2 text-xs font-bold text-white/70">{gd.longest(state.longest)}</p>
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-wide text-white/60">{gd.chains}</p>
      <ul className="mt-2 grid grid-cols-3 gap-2 text-center">
        {state.results.map((n, i) => (
          <li key={i} className="rounded-2xl border border-white/10 px-2 py-3">
            <p className="text-2xl font-black tabular-nums" style={poppins}>{n}</p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/55">{gd.chainOf(i + 1, state.totalChains)}</p>
          </li>
        ))}
      </ul>
    </DailyEnd>
  ) : null;

  return <WordDailyScreen game={game} locale={locale} daily={daily} status={status} onStart={() => void start()} onExit={onExit} play={play} end={end} />;
}

export { NameChainDailyBoard } from "@/features/wordgames/daily/WordDailyPageBoards";

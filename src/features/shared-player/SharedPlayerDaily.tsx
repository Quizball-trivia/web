"use client";

import { sharedPlayerDailyGame } from "@/features/wordgames/daily/wordDaily.games";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "lucide-react";
import { ClubTile } from "@/features/wordgames/ClubTile";
import { sharedPlayerCopy, sharedPlayerDailyCopy, wordDailyCopy, wordSharedCopy, asWordLocale } from "@/features/wordgames/copy";
import { createWordDailyApi, type WordRunStateBase } from "@/features/wordgames/daily/wordDaily.api";
import { isLiveDay, puzzleNumber, SHARED_PLAYER_CALENDAR } from "@/features/wordgames/daily/wordDaily.logic";
import { useServerNow, useWordDaily } from "@/features/wordgames/daily/useWordDaily";
import { DailyEnd, WordDailyLeaderboard, WordDailyScreen } from "@/features/wordgames/daily/WordDailyShell";
import { AnswerBox, Chips, GreenButton, RefusedReports, TimeBar, TopBar, poppins, useRefused } from "@/features/wordgames/ui";
import type { EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { cn } from "@/lib/utils";

type Localized = Record<"es" | "en" | "ka" | "tr", string>;
interface ClubName { key: string; name: Localized; crest: string }
interface PairResult { clubs: [ClubName, ClubName] | null; found: string | null; total: number | null; examples: string[] | null }
/** Server-held run state (backend shared-player-daily.rules PublicRunState): never an accepted name of an open day. */
export interface SharedPlayerDailyState extends WordRunStateBase {
  pair: number; totalPairs: number; raceMs: number; clubs: [ClubName, ClubName] | null; lockedUntil: string | null; attempt: number;
  last: { n: number; kind: "ok" | "wrong"; text: string } | null;
  settled: (PairResult & { reason: "found" | "time" }) | null;
  results: PairResult[];
}
type Result = "ok" | "wrong" | "locked" | "late";

export const sharedPlayerDailyApi = createWordDailyApi<SharedPlayerDailyState, Result, { day: string; pairs: PairResult[] }>("/api/v1/shared-player");
const loadBoard = (day: string, locale: string) => sharedPlayerDailyApi.leaderboard(day, locale);

export { sharedPlayerDailyGame } from "@/features/wordgames/daily/wordDaily.games";

export function SharedPlayerDaily({ locale, onExit, onEvent, initialDay, onDay }: {
  locale: string; onExit?: () => void; onEvent?: (event: "start" | "complete" | "replay", detail?: EngineEventDetail) => void; initialDay?: string | null; onDay?: (day: string, newest: boolean) => void;
}) {
  const game = sharedPlayerDailyGame(locale);
  const c = wordSharedCopy(locale);
  const d = wordDailyCopy(locale);
  const g = sharedPlayerCopy(locale);
  const gd = sharedPlayerDailyCopy(locale);
  const lang = asWordLocale(locale);
  const [flash, setFlash] = useState<{ id: number; text: string } | null>(null);
  const refused = useRefused();
  const daily = useWordDaily<SharedPlayerDailyState, Result>({
    api: sharedPlayerDailyApi, calendar: SHARED_PLAYER_CALENDAR, locale, initialDay, onDay, onEvent,
    onResult: (result, next, typed) => {
      setFlash(result === "late" ? { id: Date.now(), text: gd.late } : null);
      if (result === "wrong") refused.add(next.pair, typed);
    },
  });
  const { state, day } = daily;
  const runScope = `${daily.owner}:${day}`;
  const resetRefused = refused.reset;
  useEffect(() => { resetRefused(); }, [runScope, resetRefused]);
  const now = useServerNow(Boolean(state?.open), daily.clock);
  const fresh = (s: SharedPlayerDailyState) => !s.done && !s.open && s.settled === null;
  const start = async () => {
    const run = await daily.play();
    // A pair is opened only by a click: a reload never burns its clock.
    if (run && fresh(run.state)) await daily.next();
  };
  const status = state?.done ? "done" : state && (state.pair > 0 || state.open || state.settled) ? "started" : "new";
  const club = (c2: ClubName) => ({ key: c2.key, name: c2.name[lang], crest: c2.crest });

  let play = null;
  // The run is finished by its last answer: that answer's own result stays on screen until the player moves on.
  if (state && day && (!state.done || state.settled)) {
    // The ticking clock can be a beat older than a deadline that has just arrived: never show more than the full time.
    const msLeft = state.open && state.deadline ? Math.min(state.raceMs, Math.max(0, Date.parse(state.deadline) - now)) : 0;
    const lockLeft = state.open && state.lockedUntil ? Math.max(0, Date.parse(state.lockedUntil) - now) : 0;
    const busy = daily.pending !== null;
    const note = lockLeft > 0 ? g.locked(Math.ceil(lockLeft / 1000)) : busy ? g.sending : daily.notice === "connection" ? d.notices.connection : null;
    const settled = state.settled;
    const lastPair = state.pair + 1 >= state.totalPairs;
    play = (
      <div className="flex flex-1 flex-col">
        <TopBar brand={game.brand} seconds={state.open ? Math.ceil(msLeft / 1000) : null} exitLabel={c.exit} onExit={() => (onExit ? onExit() : daily.setView("intro"))}
          right={<span className="shrink-0 text-[11px] font-black uppercase tracking-wide text-white/55">{gd.pair(state.pair + 1, state.totalPairs)}</span>} />
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/[0.05] px-4 py-2">
          <span className="text-xs font-bold uppercase tracking-wide text-white/60">{d.points}</span>
          <span className="text-2xl font-black tabular-nums" style={poppins} data-daily-score>{state.score}</span>
        </div>
        <div className="mt-4 flex items-center gap-2" style={{ perspective: 600 }}>
          <ClubTile club={state.clubs ? club(state.clubs[0]) : null} />
          <X className="size-5 shrink-0 text-white/40" aria-hidden />
          <ClubTile club={state.clubs ? club(state.clubs[1]) : null} />
        </div>
        {state.open && (
          <>
            <div className="mt-4 rounded-2xl bg-brand-green px-4 py-3 text-white shadow-lg shadow-black/20">
              <p className="text-sm font-black uppercase leading-snug tracking-wide" style={poppins}>{g.prompt}</p>
              <TimeBar className="mt-2" share={msLeft / state.raceMs} urgent={msLeft <= 5_000} />
            </div>
            <div className="mt-3 min-h-6" aria-live="polite">
              <AnimatePresence mode="wait">
                {state.last && state.last.kind === "wrong" && (
                  <motion.p key={state.last.n} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0, x: [0, -6, 6, -3, 0] }} exit={{ opacity: 0 }} className="text-sm font-bold text-brand-red-light">{g.wrong(state.last.text)}</motion.p>
                )}
              </AnimatePresence>
            </div>
            <div className="flex-1" />
            <AnswerBox placeholder={c.placeholder} say={c.say} disabled={note !== null} note={note} onSubmit={(text) => void daily.answer(text)} />
          </>
        )}
        {settled && (
          <div className="mt-4 rounded-2xl bg-brand-blue px-4 py-4 text-white shadow-lg shadow-black/20" role="status">
            <p className="flex items-center gap-2 text-2xl font-black" style={poppins}>
              <span className={cn("flex size-7 items-center justify-center rounded-full", settled.reason === "found" ? "bg-brand-green" : "bg-white/20")}>{settled.reason === "found" ? <Check className="size-4" strokeWidth={3} /> : <X className="size-4" />}</span>
              {settled.reason === "found" ? gd.found : gd.missed}
            </p>
            {settled.found && <p className="mt-2 text-sm font-semibold">{gd.yourAnswer(settled.found)}</p>}
            {settled.examples ? (
              <>
                <p className="mt-4 text-xs font-black uppercase tracking-wide text-white/75">{g.answers(settled.total ?? settled.examples.length)}</p>
                <Chips className="mt-2" names={settled.examples} />
              </>
            ) : settled.total !== null && <p className="mt-3 text-sm text-white/80">{gd.answersTomorrow(settled.total)}</p>}
            {flash && <p className="mt-2 text-xs text-white/70">{flash.text}</p>}
            <RefusedReports className="mt-3" texts={refused.of(state.pair)} line={g.wrong} label={c.iWasRight} thanks={c.reported}
              onReport={(text) => sharedPlayerDailyApi.report(day, text, locale, state.pair)} />
            <GreenButton className="mt-4" disabled={busy} onClick={() => (state.done ? daily.setView("end") : void daily.next())}>{lastPair ? gd.finish : gd.nextPair}</GreenButton>
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
    <DailyEnd game={game} locale={locale} day={day} shareText={gd.shareText(puzzleNumber(SHARED_PLAYER_CALENDAR, day), state.score, state.totalPairs)} guestOnPastBoard={daily.guestOnPastBoard}
      ranked={state.ranked} rank={state.rank} onArchive={() => daily.setView("archive")} onExit={onExit}
      leaderboard={<WordDailyLeaderboard game={game} locale={locale} load={loadBoard} day={isLiveDay(SHARED_PLAYER_CALENDAR, day, daily.today) ? day : undefined} refreshKey={daily.boardRefresh} placement="end" className="mt-6" />}>
      <div className="rounded-3xl bg-brand-blue px-5 pb-5 pt-4 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">{gd.endTitle} · #{puzzleNumber(SHARED_PLAYER_CALENDAR, day)}</p>
        <p className="mt-2 text-6xl font-black leading-none tabular-nums" style={poppins} data-daily-final>{state.score}<span className="text-2xl text-white/60"> / {state.totalPairs}</span></p>
        <p className="mt-1 text-sm font-bold text-white/80">{gd.result(state.score, state.totalPairs)}</p>
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-wide text-white/60">{gd.summary}</p>
      <ul className="mt-2 space-y-1.5">
        {state.results.map((r, i) => (
          <li key={i} className="rounded-xl border border-white/10 px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full", r.found ? "bg-brand-green" : "bg-white/15")}>{r.found ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3 text-white/60" />}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{r.clubs ? `${r.clubs[0].name[lang]} × ${r.clubs[1].name[lang]}` : `#${i + 1}`}</span>
              <span className="shrink-0 truncate text-xs text-white/65">{r.found ?? gd.notFound}</span>
            </div>
            {r.examples && r.examples.length > 0 && <p className="mt-1 pl-7 text-xs text-white/55">{r.examples.join(" · ")}</p>}
          </li>
        ))}
      </ul>
    </DailyEnd>
  ) : null;

  return <WordDailyScreen game={game} locale={locale} daily={daily} status={status} onStart={() => void start()} onExit={onExit} play={play} end={end} />;
}

export { SharedPlayerDailyBoard } from "@/features/wordgames/daily/WordDailyPageBoards";

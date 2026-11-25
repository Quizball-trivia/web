"use client";
import "@/styles/application-utilities.css";

import { useMemo, useState } from "react";
import { wordDailyCopy } from "@/features/wordgames/copy";
import { isLiveDay, puzzleNumber } from "@/features/wordgames/daily/wordDaily.logic";
import { useWordDaily } from "@/features/wordgames/daily/useWordDaily";
import { WordDailyLeaderboard, WordDailyScreen } from "@/features/wordgames/daily/WordDailyShell";
import type { WordBoardRow } from "@/features/wordgames/daily/wordDaily.api";
import type { EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { darts501DailyApi, type D501ServerRun } from "./d501.api";
import { toSoloState } from "./d501.adapt";
import { d501Copy } from "./d501.copy";
import { D501_CALENDAR, d501DailyGame } from "./d501.game";
import { D501EndView, D501PlayView } from "./D501Solo";
import { D501Days } from "./D501Days";
import { d501DaysCopy } from "./d501.days.copy";

const loadBoard = (day: string, locale: string) => darts501DailyApi.leaderboard(day, locale);

/** Football Darts 501's solo daily on the server: the approved screens over the word-game daily kit. */
export function D501Daily({ locale, onExit, onEvent, initialDay, onDay }: {
  locale: string; onExit?: () => void; onEvent?: (event: "start" | "complete" | "replay", detail?: EngineEventDetail) => void; initialDay?: string | null; onDay?: (day: string, newest: boolean) => void;
}) {
  const game = d501DailyGame(locale);
  const c = d501Copy(locale);
  const d = wordDailyCopy(locale);
  // A throw the server did not take (another tab had moved the run on): say so; the box keeps the text to throw again.
  const [unsaved, setUnsaved] = useState<string | null>(null);
  const daily = useWordDaily<D501ServerRun, never>({
    api: darts501DailyApi, calendar: D501_CALENDAR, locale, initialDay, onDay, onEvent,
    onAnswerNotSaved: (missed) => { if (!missed.lost || missed.fresh.run.version === missed.sentOn.run.version) setUnsaved(`${missed.fresh.run.id}:${missed.fresh.run.version}`); },
  });
  const { state, day } = daily;
  const solo = useMemo(() => (state ? toSoloState(state) : null), [state]);
  // The end sheet stays on the play screen until the player asks for the result (the last dart's moment).
  const [resultFor, setResultFor] = useState<string | null>(null);
  // Compared with the current run's key: a result seen on another day or account does not carry over.
  const runKey = `${daily.owner}:${day}`;
  const status = state?.done ? "done" : state && (state.darts.length > 0 || state.last) ? "started" : "new";
  // The calendar is open-ended: when today's board is not seeded (yet), say so instead of quietly opening an older day.
  const todayMissing = daily.versions != null && daily.today >= D501_CALENDAR.contentStart && !(daily.today in daily.versions);
  const number = day ? puzzleNumber(D501_CALENDAR, day) : 0;
  const formatPoints = (row: WordBoardRow) => c.boardPoints(row.checkedOut ?? false, row.darts ?? 0, row.remaining ?? 0);

  const runNow = daily.run ? `${daily.run.run.id}:${daily.run.run.version}` : null;
  const play = solo && day ? (
    <D501PlayView locale={locale} number={number} state={solo} pending={daily.pending !== null}
      notice={daily.notice ? d.notices[daily.notice] : unsaved !== null && unsaved === runNow ? c.staleThrow : null}
      onSay={(text, pick) => { setUnsaved(null); return daily.answer(text, pick ? { pick } : undefined).then((run) => run !== null); }}
      onGiveUp={() => { void daily.pass(); }}
      onResult={() => { setResultFor(runKey); daily.setView("end"); }}
      onExit={onExit ?? (() => daily.setView("intro"))} />
  ) : null;

  const dc = d501DaysCopy(locale);
  const gapNote = todayMissing && day !== daily.today ? (
    <div className="rounded-2xl border border-dashed border-white/25 bg-white/[0.04] px-4 py-3">
      <p className="text-sm font-bold text-white/90">{dc.noBoardToday}</p>
      <p className="mt-0.5 text-xs text-white/60">{dc.pastOpen}</p>
    </div>
  ) : null;
  // A day the calendar shows but this screen's index does not have yet (seeded since it loaded): the index is fetched
  // again and the chosen day kept, so it opens once the index has it. If it still cannot be opened (its footballers
  // failed to load), the screen says so instead of passing another day off as the one chosen.
  const [wanted, setWanted] = useState<string | null>(null);
  const openFromCalendar = (target: string) => {
    if (daily.days.includes(target)) setWanted(null);
    else { setWanted(target); daily.reload(); }
    daily.openDay(target);
  };
  const unavailable = wanted !== null && daily.versions != null && !daily.days.includes(wanted) && day !== wanted;
  const banner = unavailable ? (
    <p role="status" className="rounded-2xl bg-brand-red-soft/15 px-4 py-3 text-sm font-semibold text-brand-red-light">{dc.unavailable}</p>
  ) : gapNote;

  const end = solo && day && state?.done ? (
    <div className="flex flex-1 flex-col">
      {banner && <div className="mb-3">{banner}</div>}
      <D501EndView locale={locale} number={number} state={solo} guestOnPastBoard={daily.guestOnPastBoard && !todayMissing}
        leaderboard={<WordDailyLeaderboard game={game} locale={locale} load={loadBoard} day={isLiveDay(D501_CALENDAR, day, daily.today) ? day : undefined}
          refreshKey={daily.boardRefresh} placement="end" className="mt-6" pointsLabel={c.boardLabel} pointsHint={c.boardHint} formatPoints={formatPoints} />}
        onArchive={() => daily.setView("archive")} onExit={onExit} />
    </div>
  ) : null;
  const archive = (
    <D501Days game={game} locale={locale} today={daily.today} owner={daily.owner}
      onBack={() => daily.setView(day && status === "done" ? "end" : "intro")} onOpenDay={openFromCalendar} />
  );
  // No board today: a guest is not invited to sign in "to play today", and the shell shows the note wherever it lands.
  const shown = todayMissing ? { ...daily, guestOnPastBoard: false, guestLockedOut: false } : daily;

  return (
    <WordDailyScreen game={game} locale={locale} daily={shown} status={status} archive={archive} banner={banner}
      onStart={() => { void daily.play().then((run) => { if (run) daily.setView(run.state.done && resultFor === runKey ? "end" : "play"); }); }}
      onExit={onExit}
      play={play} end={daily.view === "end" ? end : null} />
  );
}

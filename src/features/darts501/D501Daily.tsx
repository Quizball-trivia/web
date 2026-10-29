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

const loadBoard = (day: string, locale: string) => darts501DailyApi.leaderboard(day, locale);

/** Football Darts 501's solo daily on the server: the approved screens over the word-game daily kit. */
export function D501Daily({ locale, onExit, onEvent, initialDay, onDay }: {
  locale: string; onExit?: () => void; onEvent?: (event: "start" | "complete" | "replay", detail?: EngineEventDetail) => void; initialDay?: string | null; onDay?: (day: string, newest: boolean) => void;
}) {
  const game = d501DailyGame(locale);
  const c = d501Copy(locale);
  const d = wordDailyCopy(locale);
  const daily = useWordDaily<D501ServerRun, never>({ api: darts501DailyApi, calendar: D501_CALENDAR, locale, initialDay, onDay, onEvent });
  const { state, day } = daily;
  const solo = useMemo(() => (state ? toSoloState(state) : null), [state]);
  // The end sheet stays on the play screen until the player asks for the result (the last dart's moment).
  const [resultFor, setResultFor] = useState<string | null>(null);
  // Compared with the current run's key: a result seen on another day or account does not carry over.
  const runKey = `${daily.owner}:${day}`;
  const status = state?.done ? "done" : state && (state.darts.length > 0 || state.last) ? "started" : "new";
  const number = day ? puzzleNumber(D501_CALENDAR, day) : 0;
  const formatPoints = (row: WordBoardRow) => c.boardPoints(row.checkedOut ?? false, row.darts ?? 0, row.remaining ?? 0);

  const play = solo && day ? (
    <D501PlayView locale={locale} number={number} state={solo} pending={daily.pending !== null} notice={daily.notice ? d.notices[daily.notice] : null}
      onSay={(text, pick) => daily.answer(text, pick ? { pick } : undefined).then((run) => run !== null)}
      onGiveUp={() => { void daily.pass(); }}
      onResult={() => { setResultFor(runKey); daily.setView("end"); }}
      onExit={onExit ?? (() => daily.setView("intro"))} />
  ) : null;

  const end = solo && day && state?.done ? (
    <D501EndView locale={locale} number={number} state={solo} guestOnPastBoard={daily.guestOnPastBoard}
      leaderboard={<WordDailyLeaderboard game={game} locale={locale} load={loadBoard} day={isLiveDay(D501_CALENDAR, day, daily.today) ? day : undefined}
        refreshKey={daily.boardRefresh} placement="end" className="mt-6" pointsLabel={c.boardLabel} pointsHint={c.boardHint} formatPoints={formatPoints} />}
      onArchive={() => daily.setView("archive")} onExit={onExit} />
  ) : null;

  return (
    <WordDailyScreen game={game} locale={locale} daily={daily} status={status}
      onStart={() => { void daily.play().then((run) => { if (run) daily.setView(run.state.done && resultFor === runKey ? "end" : "play"); }); }}
      onExit={onExit}
      play={play} end={daily.view === "end" ? end : null} />
  );
}

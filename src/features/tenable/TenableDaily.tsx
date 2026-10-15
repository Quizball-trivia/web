"use client";
import "@/styles/application-utilities.css";

import { useMemo, useState } from "react";
import { wordDailyCopy } from "@/features/wordgames/copy";
import { isLiveDay, puzzleNumber } from "@/features/wordgames/daily/wordDaily.logic";
import { useWordDaily } from "@/features/wordgames/daily/useWordDaily";
import { WordDailyLeaderboard, WordDailyScreen } from "@/features/wordgames/daily/WordDailyShell";
import type { EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { tenableDailyApi, type TenableServerRun } from "./tenable.api";
import { toSoloState } from "./tenable.adapt";
import { TENABLE_CALENDAR, TenableEndView, TenablePlayView, tenableDailyGame } from "./TenableSolo";

const loadBoard = (day: string, locale: string) => tenableDailyApi.leaderboard(day, locale);

/** Football Tenable's solo daily on the server: the approved screens over the word-game daily kit. */
export function TenableDaily({ locale, onExit, onEvent, initialDay, onDay }: {
  locale: string; onExit?: () => void; onEvent?: (event: "start" | "complete" | "replay", detail?: EngineEventDetail) => void; initialDay?: string | null; onDay?: (day: string, newest: boolean) => void;
}) {
  const game = tenableDailyGame(locale);
  const d = wordDailyCopy(locale);
  const daily = useWordDaily<TenableServerRun, never>({ api: tenableDailyApi, calendar: TENABLE_CALENDAR, locale, initialDay, onDay, onEvent });
  const { state, day } = daily;
  const solo = useMemo(() => (state ? toSoloState(state, locale) : null), [state, locale]);
  // The end sheet stays on the play screen until the player asks for the result (the last answer's moment).
  const [resultFor, setResultFor] = useState<string | null>(null);
  // Compared with the current run's key: a result seen on another day or account does not carry over.
  const runKey = `${daily.owner}:${day}`;
  const status = state?.done ? "done" : state && (state.score > 0 || state.lives < state.maxLives || state.last) ? "started" : "new";
  const number = day ? puzzleNumber(TENABLE_CALENDAR, day) : 0;

  const play = solo && day ? (
    <TenablePlayView locale={locale} number={number} state={solo} pending={daily.pending !== null} notice={daily.notice ? d.notices[daily.notice] : null}
      onSay={(text, pick) => { void daily.answer(text, pick ? { pick } : undefined); }}
      onGiveUp={() => { void daily.pass(); }}
      onResult={() => { setResultFor(runKey); daily.setView("end"); }}
      onExit={onExit ?? (() => daily.setView("intro"))} />
  ) : null;

  const end = solo && day && state?.done ? (
    <TenableEndView locale={locale} number={number} state={solo} guestOnPastBoard={daily.guestOnPastBoard}
      leaderboard={<WordDailyLeaderboard game={game} locale={locale} load={loadBoard} day={isLiveDay(TENABLE_CALENDAR, day, daily.today) ? day : undefined} refreshKey={daily.boardRefresh} placement="end" className="mt-6" />}
      onArchive={() => daily.setView("archive")} onExit={onExit}
      onReport={(text) => tenableDailyApi.report(day, text, locale)} />
  ) : null;

  return (
    <WordDailyScreen game={game} locale={locale} daily={daily} status={status}
      onStart={() => { void daily.play().then((run) => { if (run) daily.setView(run.state.done && resultFor === runKey ? "end" : "play"); }); }}
      onExit={onExit}
      play={play} end={daily.view === "end" ? end : null} />
  );
}

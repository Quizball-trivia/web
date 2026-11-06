"use client";
import "@/styles/application-utilities.css";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell } from "lucide-react";
import { wordDailyCopy } from "@/features/wordgames/copy";
import { isClosedDay, isLiveDay, puzzleNumber } from "@/features/wordgames/daily/wordDaily.logic";
import { poppins } from "@/features/wordgames/ui";
import { useWordDaily } from "@/features/wordgames/daily/useWordDaily";
import { WordDailyLeaderboard, WordDailyScreen } from "@/features/wordgames/daily/WordDailyShell";
import type { EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { GameFeedbackSlot } from "@/features/feedback/GameFeedback";
import { fetchTenablePractice, sendTenableFeedback, tenableDailyApi, type TenableServerRun } from "./tenable.api";
import { tenableCopy } from "./tenable.copy";
import { toSoloState } from "./tenable.adapt";
import { TENABLE_CALENDAR, TenableEndView, TenablePlayView, tenableDailyGame } from "./TenableSolo";

const loadBoard = (day: string, locale: string) => tenableDailyApi.leaderboard(day, locale);

/** The way into a practice tower: an easier closed list, unranked for everyone (guests included). */
function PracticeTower({ locale, busy, onOpen, className }: { locale: string; busy: boolean; onOpen: () => void; className?: string }) {
  const c = tenableCopy(locale);
  return (
    <div className={className} data-tenable-practice>
      <button type="button" onClick={onOpen} disabled={busy}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.06] text-sm font-black uppercase tracking-wide text-white hover:bg-white/10 disabled:opacity-50" style={poppins}>
        <Dumbbell className="size-4" aria-hidden />{c.practiceCta}
      </button>
      <p className="mt-1.5 text-center text-xs text-white/60">{c.practiceHint}</p>
    </div>
  );
}

/** Football Tenable's solo daily on the server: the approved screens over the word-game daily kit. */
export function TenableDaily({ locale, onExit, onEvent, initialDay, onDay }: {
  locale: string; onExit?: () => void; onEvent?: (event: "start" | "complete" | "replay", detail?: EngineEventDetail) => void; initialDay?: string | null; onDay?: (day: string, newest: boolean) => void;
}) {
  const game = tenableDailyGame(locale);
  const d = wordDailyCopy(locale);
  const daily = useWordDaily<TenableServerRun, never>({ api: tenableDailyApi, calendar: TENABLE_CALENDAR, locale, initialDay, onDay, onEvent, resendStaleAnswers: true });
  const { state, day } = daily;
  const solo = useMemo(() => (state ? toSoloState(state, locale) : null), [state, locale]);
  // The end sheet stays on the play screen until the player asks for the result (the last answer's moment).
  const [resultFor, setResultFor] = useState<string | null>(null);
  // Compared with the current run's key: a result seen on another day or account does not carry over.
  const runKey = `${daily.owner}:${day}`;
  const status = state?.done ? "done" : state && (state.score > 0 || state.lives < state.maxLives || state.last) ? "started" : "new";
  const number = day ? puzzleNumber(TENABLE_CALENDAR, day) : 0;

  // Practice towers: closed, approachable days from the archive (the server picks and orders them; ids only).
  const practiceQuery = useQuery({ queryKey: ["tenable", "practice"], queryFn: () => fetchTenablePractice(locale), staleTime: 5 * 60_000 });
  const practiceDays = useMemo(() => (practiceQuery.data?.days ?? []).filter((d) => daily.days.includes(d) && isClosedDay(d, daily.today)), [practiceQuery.data, daily.days, daily.today]);
  const [findingPractice, setFindingPractice] = useState(false);
  const openPractice = async () => {
    const candidates = practiceDays.filter((d) => d !== day);
    if (candidates.length === 0) return;
    setFindingPractice(true);
    // The first tower this player has not finished (a finished one would only show its result again); all done: the easiest.
    let target = candidates[0];
    try {
      for (const candidate of candidates) {
        const run = await tenableDailyApi.current(candidate, locale).catch(() => null);
        if (run && "state" in run && run.state.done) continue;
        target = candidate;
        break;
      }
    } finally {
      setFindingPractice(false);
    }
    daily.openDay(target);
  };
  const practice = practiceDays.some((d) => d !== day)
    ? (className: string) => <PracticeTower locale={locale} busy={findingPractice || daily.pending !== null} onOpen={() => void openPractice()} className={className} />
    : null;

  const play = solo && day ? (
    <TenablePlayView locale={locale} number={number} state={solo} pending={daily.pending !== null} notice={daily.notice ? d.notices[daily.notice] : null}
      onSay={(text, pick) => daily.answer(text, pick ? { pick } : undefined).then((run) => run !== null)}
      onGiveUp={() => { void daily.pass(); }}
      onResult={() => { setResultFor(runKey); daily.setView("end"); }}
      onExit={onExit ?? (() => daily.setView("intro"))} />
  ) : null;

  const end = solo && day && state?.done ? (
    <TenableEndView locale={locale} number={number} state={solo} guestOnPastBoard={daily.guestOnPastBoard}
      leaderboard={<>
        <GameFeedbackSlot className="mt-6" game="tenable" title={tenableCopy(locale).title} locale={locale} send={(answer) => sendTenableFeedback("solo", answer, locale)} />
        <WordDailyLeaderboard game={game} locale={locale} load={loadBoard} day={isLiveDay(TENABLE_CALENDAR, day, daily.today) ? day : undefined} refreshKey={daily.boardRefresh} placement="end" className="mt-6" />
      </>}
      practice={practice?.("mt-6")}
      onArchive={() => daily.setView("archive")} onExit={onExit}
      /* The server files a report only once the day is closed (today's list is still being ranked). */
      onReport={isClosedDay(day, daily.today) ? (text) => tenableDailyApi.report(day, text, locale) : undefined} />
  ) : null;

  return (
    <WordDailyScreen game={game} locale={locale} daily={daily} status={status}
      onStart={() => { void daily.play().then((run) => { if (run) daily.setView(run.state.done && resultFor === runKey ? "end" : "play"); }); }}
      onExit={onExit}
      secondary={status !== "started" ? practice?.("") : undefined}
      play={play} end={daily.view === "end" ? end : null} />
  );
}

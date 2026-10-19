"use client";
import "@/styles/application-utilities.css";

import { useCallback } from "react";
import { wordDailyCopy } from "@/features/wordgames/copy";
import { useWordDaily } from "@/features/wordgames/daily/useWordDaily";
import { isLiveDay, puzzleNumber } from "@/features/wordgames/daily/wordDaily.logic";
import { GreenButton } from "@/features/wordgames/ui";
import { WordDailyLeaderboard, WordDailyScreen } from "@/features/wordgames/daily/WordDailyShell";
import type { EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { datoFalsoCopy } from "./datoFalso.copy";
import { datoFalsoDailyApi, toSoloState, type DatoFalsoDailyState, type DatoFalsoResult } from "./datoFalso.daily";
import { DATO_FALSO_CALENDAR, datoFalsoDailyGame } from "./datoFalso.game";
import { DatoFalsoEndView, DatoFalsoPlayView } from "./DatoFalsoSolo";

export { datoFalsoDailyGame };

const loadBoard = (day: string, locale: string) => datoFalsoDailyApi.leaderboard(day, locale);
/** A reload on a revealed card goes back to that reveal. */
const revealedCard = (s: DatoFalsoDailyState) => Boolean(s.settled?.card);

/** Dato falso futbolero's daily on the shared daily screens (intro, archive, end, ranking). */
export function DatoFalsoDaily({ locale, onExit, onEvent, initialDay, onDay }: {
  locale: string; onExit?: () => void; onEvent?: (event: "start" | "complete" | "replay", detail?: EngineEventDetail) => void; initialDay?: string | null; onDay?: (day: string, newest: boolean) => void;
}) {
  const game = datoFalsoDailyGame(locale);
  const c = datoFalsoCopy(locale);
  const d = wordDailyCopy(locale);
  const daily = useWordDaily<DatoFalsoDailyState, DatoFalsoResult>({ api: datoFalsoDailyApi, calendar: DATO_FALSO_CALENDAR, locale, initialDay, onDay, onEvent, resumesOnScreen: revealedCard });
  const { state, day, clock } = daily;
  const busy = daily.pending !== null;
  const nowMs = useCallback(() => clock.serverMs + (performance.now() - clock.perfMs), [clock]);
  const fresh = (s: DatoFalsoDailyState) => !s.done && !s.open && s.settled === null;
  const start = async () => {
    const run = await daily.play();
    // A card is opened only by a click: a reload never burns its clock.
    if (run && fresh(run.state)) await daily.next();
  };
  const status: "new" | "started" | "done" = state?.done ? "done" : state && (state.card > 0 || state.open || state.settled) ? "started" : "new";
  const solo = state ? toSoloState(state, locale) : null;
  const number = day ? puzzleNumber(DATO_FALSO_CALENDAR, day) : 0;
  const exit = () => (onExit ? onExit() : daily.setView("intro"));

  let play = null;
  // The last card's verdict stays on screen until the player moves on to the result.
  if (state && day && (!state.done || state.settled?.card)) {
    play = solo ? (
      <>
        <DatoFalsoPlayView locale={locale} number={number} state={solo} pending={busy} nowMs={nowMs}
          onJoker={(kind) => void daily.answer(kind, { move: "joker" })}
          onPick={(option) => void daily.answer(option, { move: "pick" })}
          onNext={() => (state.done ? daily.setView("end") : void daily.next())}
          onExit={exit} />
        {daily.notice && <p role="alert" className="mt-3 text-center text-sm font-semibold text-brand-red-light">{d.notices[daily.notice]}</p>}
      </>
    ) : (
      <div className="flex flex-1 flex-col justify-end">
        <GreenButton className="mt-6" disabled={busy} onClick={() => void daily.next()}>{d.resume}</GreenButton>
      </div>
    );
  }

  const end = solo && state?.done && day ? (
    <DatoFalsoEndView locale={locale} number={number} state={solo} guestOnPastBoard={daily.guestOnPastBoard} onArchive={() => daily.setView("archive")} onExit={onExit}
      leaderboard={<WordDailyLeaderboard game={game} locale={locale} load={loadBoard} pointsLabel={c.pointsStat} day={isLiveDay(DATO_FALSO_CALENDAR, day, daily.today) ? day : undefined} refreshKey={daily.boardRefresh} placement="end" className="mt-6" />} />
  ) : null;

  return <WordDailyScreen game={game} locale={locale} daily={daily} status={status} onStart={() => void start()} onExit={onExit} play={play} end={end} />;
}

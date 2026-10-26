"use client";
import "@/styles/application-utilities.css";

import { useEffect, useMemo, useState } from "react";
import { wordDailyCopy } from "@/features/wordgames/copy";
import { useWordDaily } from "@/features/wordgames/daily/useWordDaily";
import { isLiveDay, puzzleNumber } from "@/features/wordgames/daily/wordDaily.logic";
import { GreenButton } from "@/features/wordgames/ui";
import { WordDailyLeaderboard, WordDailyScreen } from "@/features/wordgames/daily/WordDailyShell";
import type { EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { conexionesCopy } from "./conexiones.copy";
import { boardOf, conexionesDailyApi, toSoloState, withArrangement, type ConexionesDailyState, type ConexionesResult } from "./conexiones.daily";
import { CONEXIONES_CALENDAR, conexionesDailyGame } from "./conexiones.game";
import { tryKey, type CxSoloOutcome } from "./conexiones.logic";
import { ConexionesEndView, ConexionesPlayView } from "./ConexionesSolo";

export { conexionesDailyGame };

const loadBoard = (day: string, locale: string) => conexionesDailyApi.leaderboard(day, locale);
/** An opened board goes straight back to the board on a reload. */
const onBoard = (s: ConexionesDailyState) => s.opened && !s.done;
/** How long the last band stays on screen before the result. */
const END_PAUSE_MS = 1_600;

/** The player's own tile order is a per-browser convenience: kept per run, and the board works without it. */
const ARRANGED_KEY = (runId: string) => `qb:conexiones:arranged:${runId}`;
function loadArranged(runId: string | null): string[] | null {
  if (!runId) return null;
  try {
    const raw = window.localStorage.getItem(ARRANGED_KEY(runId));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.every((x) => typeof x === "string") ? parsed : null;
  } catch {
    return null;
  }
}
function saveArranged(runId: string | null, order: string[]): void {
  if (!runId) return;
  try { window.localStorage.setItem(ARRANGED_KEY(runId), JSON.stringify(order)); } catch { /* storage off: the order lasts until a reload */ }
}

function shuffled<T>(xs: readonly T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Conexiones futboleras' daily on the shared daily screens (intro, archive, end, ranking). */
export function ConexionesDaily({ locale, onExit, onEvent, initialDay, onDay }: {
  locale: string; onExit?: () => void; onEvent?: (event: "start" | "complete" | "replay", detail?: EngineEventDetail) => void; initialDay?: string | null; onDay?: (day: string, newest: boolean) => void;
}) {
  const game = conexionesDailyGame(locale);
  const c = conexionesCopy(locale);
  const d = wordDailyCopy(locale);
  const daily = useWordDaily<ConexionesDailyState, ConexionesResult>({ api: conexionesDailyApi, calendar: CONEXIONES_CALENDAR, locale, initialDay, onDay, onEvent, resumesOnScreen: onBoard });
  const { state, day } = daily;
  const busy = daily.pending !== null;
  const [selected, setSelected] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<CxSoloOutcome | null>(null);
  const [shake, setShake] = useState(0);
  // The player's own arrangement of the tiles still on the board (Shuffle); the server's order until then.
  const [arranged, setArranged] = useState<string[] | null>(null);
  // Another run on screen (another day, another account): nothing picked on the last one carries over.
  const runId = daily.run?.run.id ?? null;
  const [seenRun, setSeenRun] = useState(runId);
  if (seenRun !== runId) {
    setSeenRun(runId);
    setSelected([]);
    setOutcome(null);
    setArranged(typeof window === "undefined" ? null : loadArranged(runId));
  }

  const solo = useMemo(() => (state?.opened ? toSoloState(state, locale) : null), [state, locale]);
  const board = useMemo(() => (state ? boardOf(state) : null), [state]);
  // What is picked, among the tiles still on the board (a guess whose reply was lost comes back solved by a re-sync).
  const picked = useMemo(() => (solo ? selected.filter((id) => solo.order.includes(id)) : []), [selected, solo]);
  const order = useMemo(() => {
    if (!solo) return [];
    return withArrangement(solo.order, arranged);
  }, [solo, arranged]);

  // The last band (or the reveal of a lost board) stays a moment before the result.
  const finished = Boolean(state?.done);
  const { view, setView } = daily;
  useEffect(() => {
    if (!finished || view !== "play") return;
    const t = window.setTimeout(() => setView("end"), END_PAUSE_MS);
    return () => window.clearTimeout(t);
  }, [finished, view, setView]);

  const start = async () => {
    const run = await daily.play();
    // The board shows (and the time starts) only from this click: a reload of the intro never starts it.
    if (run && !run.state.opened && !run.state.done) await daily.next();
  };

  const submit = async () => {
    if (!state || picked.length !== 4) return;
    const key = tryKey(picked);
    // A four already tried costs nothing and is not sent.
    if (state.tries.some((t) => tryKey(t.ids) === key)) {
      setOutcome("repeat");
      setShake((k) => k + 1);
      return;
    }
    const before = state.tries.length;
    const result = await daily.answer(picked.join(","));
    const tries = result?.state.tries;
    if (!tries || tries.length <= before) return;
    const verdict = tries[tries.length - 1].verdict;
    setOutcome(verdict);
    if (verdict === "right") setSelected([]);
    else setShake((k) => k + 1);
  };

  const status: "new" | "started" | "done" = state?.done ? "done" : state?.opened ? "started" : "new";
  const number = day ? puzzleNumber(CONEXIONES_CALENDAR, day) : 0;
  const exit = () => (onExit ? onExit() : daily.setView("intro"));

  let play = null;
  if (state && day && board) {
    play = solo ? (
      <>
        <ConexionesPlayView locale={locale} number={number} board={board} state={{ ...solo, order }} selected={picked} outcome={outcome} shakeKey={shake} pending={busy || state.done}
          onToggle={(id) => { setOutcome(null); setSelected(picked.includes(id) ? picked.filter((x) => x !== id) : picked.length < 4 ? [...picked, id] : picked); }}
          onSubmit={() => void submit()}
          onShuffle={() => { const next = shuffled(order); setArranged(next); saveArranged(runId, next); }}
          onClear={() => setSelected([])}
          onExit={exit} />
        {daily.notice && <p role="alert" className="mt-3 text-center text-sm font-semibold text-brand-red-light">{d.notices[daily.notice]}</p>}
      </>
    ) : (
      <div className="flex flex-1 flex-col justify-end">
        <GreenButton className="mt-6" disabled={busy} onClick={() => void daily.next()}>{d.resume}</GreenButton>
      </div>
    );
  }

  const end = solo && state?.done && day && board ? (
    <ConexionesEndView locale={locale} number={number} board={board} state={solo} guestOnPastBoard={daily.guestOnPastBoard} onArchive={() => daily.setView("archive")} onExit={onExit}
      leaderboard={<WordDailyLeaderboard game={game} locale={locale} load={loadBoard} pointsLabel={c.pointsStat} pointsHint={c.pointsHint} day={isLiveDay(CONEXIONES_CALENDAR, day, daily.today) ? day : undefined} refreshKey={daily.boardRefresh} placement="end" className="mt-6" />} />
  ) : null;

  return <WordDailyScreen game={game} locale={locale} daily={daily} status={status} onStart={() => void start()} onExit={onExit} play={play} end={end} />;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { trackGameComplete, trackGameReplay, trackGameStart } from "@/lib/analytics/public-games.analytics";
import { createRealtimeCommandId } from "@/lib/realtime/command-id";
import { useAuthStore } from "@/stores/auth.store";
import { wordDailyCopy } from "@/features/wordgames/copy";
import { Centered } from "@/features/wordgames/daily/WordDailyShell";
import { Frame, GreenButton, QuietButton, poppins } from "@/features/wordgames/ui";
import { CodenamesBoard } from "./CodenamesBoard";
import { useCardAlt } from "./codenames.alt";
import { codenamesCopy } from "./codenames.copy";
import { loadPicturePractice, pickPracticeDay } from "./codenames.practice";
import { mineTotal, soloFlip, soloFound, soloStop, type CodenamesSoloState } from "./codenames.view";
import { ClueRecap, CodenamesPlayView, soloCards } from "./CodenamesSolo";

/**
 * Picture practice, the Words board's "New board" for pictures: an earlier daily board (a closed day, whole key and
 * reasons from the server's review) replayed on the device. Unranked and never saved; the result explains every clue.
 */
export function CodenamesPicturePractice({ locale, days, today, playedDay, onExit, surface = "public_game" }: {
  locale: string;
  /** The daily's openable days and today's day: practice draws from the closed ones. */
  days: readonly string[]; today: string;
  /** The daily board just played: not dealt again while another closed board is left. */
  playedDay: string | null;
  onExit: () => void;
  surface?: "app" | "public_game";
}) {
  const c = codenamesCopy(locale);
  const d = wordDailyCopy(locale);
  const altOf = useCardAlt(locale);
  const [state, setState] = useState<CodenamesSoloState | null>(null);
  const [screen, setScreen] = useState<"play" | "end">("play");
  const [failed, setFailed] = useState<"unavailable" | "error" | null>(null);
  const request = useRef(0);
  /** Boards dealt in this sitting (and the daily just played): a new board is a different one while any is left. */
  const seen = useRef(new Set<string>(playedDay ? [playedDay] : []));
  const session = useRef<{ id: string; startedAt: number } | null>(null);
  // Dealt once on mount; "New board" deals again (a change of `days` while practising does not replace the board).
  const dealtOnce = useRef(false);
  // Unmounting drops any answer still on its way. Under Strict Mode the mount effects replay after this cleanup, so it
  // also re-arms the first deal; otherwise the replayed effect would skip it and practice would wait forever.
  useEffect(() => () => { request.current += 1; dealtOnce.current = false; }, []);

  const fetchBoard = useCallback(() => {
    const n = ++request.current;
    const day = pickPracticeDay(days, today, seen.current);
    // No closed board yet reads as "unavailable", through the same (async) path as a board the server cannot give.
    (day ? loadPicturePractice(day, locale) : Promise.resolve(null)).then((dealt) => {
      if (n !== request.current) return;
      if (!dealt || !day) { setFailed("unavailable"); return; }
      seen.current.add(day);
      setState(dealt);
      const previous = session.current;
      session.current = { id: createRealtimeCommandId(), startedAt: Date.now() };
      if (previous) trackGameReplay({ modeId: "codenames", previousSessionId: previous.id });
      const access = useAuthStore.getState().status === "authenticated" ? "member" : "guest";
      trackGameStart({ modeId: "codenames", access, sessionId: session.current.id, sessionKind: "training", surface });
    }).catch((error: { status?: number }) => {
      if (n === request.current) setFailed(error?.status === 404 ? "unavailable" : "error");
    });
  }, [days, today, locale, surface]);
  useEffect(() => {
    if (dealtOnce.current) return;
    dealtOnce.current = true;
    fetchBoard();
  }, [fetchBoard]);
  const deal = () => {
    setState(null);
    setFailed(null);
    setScreen("play");
    fetchBoard();
  };

  const done = state?.status === "done";
  const completed = useRef<CodenamesSoloState | null>(null);
  useEffect(() => {
    if (!done || !state || completed.current === state) return;
    completed.current = state;
    const s = session.current;
    if (s) trackGameComplete({ modeId: "codenames", sessionId: s.id, sessionKind: "training", durationMs: Date.now() - s.startedAt, score: soloFound(state) });
  }, [done, state]);

  if (failed) {
    return (
      <Frame lang={locale}>
        <Centered>
          <p role="alert" className="text-center text-sm text-white/80">{failed === "unavailable" ? c.picturePractice.unavailable : d.loadError}</p>
          {failed === "error" && <button type="button" onClick={deal} className="mt-4 h-11 rounded-full bg-brand-yellow px-6 text-sm font-black uppercase text-black" style={poppins}>{d.retry}</button>}
          <button type="button" onClick={onExit} className="mx-auto mt-3 min-h-9 text-sm font-bold text-white/60 underline-offset-4 hover:text-white hover:underline">{d.back}</button>
        </Centered>
      </Frame>
    );
  }
  if (!state) return <Frame lang={locale}><Centered><p className="animate-pulse text-sm text-white/70">{d.loading}</p></Centered></Frame>;

  if (screen === "play") {
    return (
      <Frame lang={locale} wide>
        <CodenamesPlayView locale={locale} number={null} state={state} pending={false}
          notice={<p data-codenames-practice-note className="mt-2 text-center text-xs font-semibold text-white/60">{c.picturePractice.title} · {c.picturePractice.note}</p>}
          onFlip={(id) => setState((s) => (s ? soloFlip(s, id) : s))} onStop={() => setState((s) => (s ? soloStop(s) : s))}
          onResult={() => setScreen("end")} onExit={onExit} />
      </Frame>
    );
  }

  const found = soloFound(state);
  const total = mineTotal(state);
  return (
    <Frame lang={locale}>
      <header className="mb-4 flex h-10 items-center">
        <button type="button" onClick={onExit} aria-label={d.back} className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="size-5" /></button>
      </header>
      <div data-codenames-picture-practice-result className="rounded-3xl bg-brand-blue px-5 pb-5 pt-4 text-center text-white">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">{c.brand.join(" ")} · {c.picturePractice.title}</p>
        <p className="mt-2 text-6xl font-black tabular-nums" style={poppins}>{found}/{total}</p>
        <p className="mt-1 text-sm font-bold text-white/85">{state.endReason === "complete" ? c.endComplete : state.endReason === "owngoal" ? c.endOwnGoal : c.endClues}</p>
      </div>
      <GreenButton className="mt-4" onClick={deal}>{c.words.newBoard}</GreenButton>
      <p className="mt-6 text-xs font-black uppercase tracking-wide text-white/55">{c.history}</p>
      <div className="mt-2"><ClueRecap state={state} kinds={c.kinds} /></div>
      <CodenamesBoard className="mt-4" cards={soloCards(state, true)} mode="end" kinds={c.kinds} cardLabel={c.cardLabel} altOf={altOf} />
      <QuietButton className="mt-4" onClick={onExit}>{d.back}</QuietButton>
    </Frame>
  );
}

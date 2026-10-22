"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { wordDailyCopy } from "@/features/wordgames/copy";
import { Centered } from "@/features/wordgames/daily/WordDailyShell";
import { Frame, GreenButton, QuietButton, poppins } from "@/features/wordgames/ui";
import { CodenamesBoard } from "./CodenamesBoard";
import { codenamesCopy } from "./codenames.copy";
import { loadPractice, practiceState, type PracticeBoard } from "./codenames.practice";
import { soloFlip, soloFound, soloStop, mineTotal, type CardKind, type CodenamesSoloState } from "./codenames.view";
import { ClueRecap, CodenamesPlayView, soloCards } from "./CodenamesSolo";

const DOT: Record<CardKind, string> = { mine: "bg-brand-green", theirs: "bg-brand-blue", neutral: "bg-brand-slate-light", owngoal: "bg-brand-red" };

/**
 * Solo word boards: a new board each time, unranked (no day, no leaderboard). The server deals the board and its
 * clues; the run is played on the device. The result explains every word's two meanings.
 */
export function CodenamesWordsPractice({ locale, onExit, onEvent }: {
  locale: string; onExit: () => void;
  /** Analytics: "start" when a board is dealt, "complete" when its run ends, "replay" before another board. */
  onEvent?: (event: "start" | "complete" | "replay") => void;
}) {
  const c = codenamesCopy(locale);
  const d = wordDailyCopy(locale);
  const [board, setBoard] = useState<PracticeBoard | null>(null);
  const [state, setState] = useState<CodenamesSoloState | null>(null);
  const [screen, setScreen] = useState<"play" | "end">("play");
  const [failed, setFailed] = useState<"unavailable" | "error" | null>(null);
  // Only the newest request lands: a slow answer to an older "New board" is dropped.
  const request = useRef(0);
  // Read at call time: a new callback (the player signs in) must not deal a new board mid-game.
  const eventRef = useRef(onEvent);
  useEffect(() => { eventRef.current = onEvent; }, [onEvent]);
  const fetchBoard = useCallback(() => {
    const n = ++request.current;
    loadPractice(locale).then((dealt) => {
      if (n !== request.current) return;
      // A board without clues cannot be played (the server should never send one).
      if (dealt.cards.length !== 25 || dealt.clues.length === 0) { setFailed("unavailable"); return; }
      setBoard(dealt);
      setState(practiceState(dealt));
      eventRef.current?.("start");
    }).catch((error: { status?: number }) => {
      if (n === request.current) setFailed(error?.status === 503 ? "unavailable" : "error");
    });
  }, [locale]);
  useEffect(() => { fetchBoard(); }, [fetchBoard]);
  const deal = () => {
    eventRef.current?.("replay");
    setBoard(null);
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
    eventRef.current?.("complete");
  }, [done, state]);

  if (failed) {
    return (
      <Frame lang={locale}>
        <Centered>
          <p role="alert" className="text-center text-sm text-white/80">{failed === "unavailable" ? c.words.unavailable : d.loadError}</p>
          <button type="button" onClick={deal} className="mt-4 h-11 rounded-full bg-brand-yellow px-6 text-sm font-black uppercase text-black" style={poppins}>{d.retry}</button>
          <button type="button" onClick={onExit} className="mx-auto mt-3 min-h-9 text-sm font-bold text-white/60 underline-offset-4 hover:text-white hover:underline">{d.exit}</button>
        </Centered>
      </Frame>
    );
  }
  if (!state || !board) return <Frame lang={locale}><Centered><p className="animate-pulse text-sm text-white/70">{d.loading}</p></Centered></Frame>;

  if (screen === "play") {
    return (
      <Frame lang={locale}>
        <CodenamesPlayView locale={locale} number={null} state={state} pending={false}
          onFlip={(id) => setState((s) => (s ? soloFlip(s, id) : s))} onStop={() => setState((s) => (s ? soloStop(s) : s))}
          onResult={() => setScreen("end")} onExit={onExit} />
      </Frame>
    );
  }

  const found = soloFound(state);
  const total = mineTotal(state);
  const kindOf = new Map(state.cards.map((card) => [card.id, card.kind]));
  return (
    <Frame lang={locale}>
      <header className="mb-4 flex h-10 items-center">
        <button type="button" onClick={onExit} aria-label={d.exit} className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="size-5" /></button>
      </header>
      <div data-codenames-practice-result className="rounded-3xl bg-brand-blue px-5 pb-5 pt-4 text-center text-white">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">{c.brand.join(" ")} · {c.board.words}</p>
        <p className="mt-2 text-6xl font-black tabular-nums" style={poppins}>{found}/{total}</p>
        <p className="mt-1 text-sm font-bold text-white/85">{state.endReason === "complete" ? c.words.endComplete : state.endReason === "owngoal" ? c.endOwnGoal : c.endClues}</p>
      </div>
      <GreenButton className="mt-4" onClick={deal}>{c.words.newBoard}</GreenButton>
      <p className="mt-6 text-xs font-black uppercase tracking-wide text-white/55">{c.history}</p>
      <div className="mt-2"><ClueRecap state={state} kinds={c.kinds} /></div>
      <CodenamesBoard className="mt-4" cards={soloCards(state, true)} mode="end" kinds={c.kinds} cardLabel={c.cardLabel} />
      <ul data-codenames-meanings className="mt-4 space-y-1.5">
        {board.cards.map((card) => (
          <li key={card.id} className="flex items-start gap-2 text-xs leading-snug text-white/75">
            <span className={cn("mt-1 size-2 shrink-0 rounded-full", DOT[kindOf.get(card.id) ?? card.kind])} aria-hidden />
            <span><span className="font-black uppercase text-white" style={poppins}>{card.word}</span> · {card.football} · {card.other}</span>
          </li>
        ))}
      </ul>
      <QuietButton className="mt-4" onClick={onExit}>{d.exit}</QuietButton>
    </Frame>
  );
}

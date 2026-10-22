"use client";
import "@/styles/application-utilities.css";

import { useRef, useState, useSyncExternalStore } from "react";
import { wordDailyCopy } from "@/features/wordgames/copy";
import { useWordDaily } from "@/features/wordgames/daily/useWordDaily";
import { isLiveDay, puzzleNumber } from "@/features/wordgames/daily/wordDaily.logic";
import { DailyIntro, PlayRoomWithFriends, WordDailyLeaderboard, WordDailyScreen } from "@/features/wordgames/daily/WordDailyShell";
import { Frame } from "@/features/wordgames/ui";
import { BoardPicker } from "./BoardPicker";
import { readBoard, setRoomPreset, writeBoard } from "./codenames.board";
import { CodenamesWordsPractice } from "./CodenamesWordsPractice";
import type { BoardKind } from "./codenames.view";
import type { EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { codenamesCopy } from "./codenames.copy";
import { CODENAMES_CALENDAR, codenamesDailyApi, codenamesDailyGame, loadCodenamesBoard, toSoloState, type CodenamesDailyState, type CodenamesMove } from "./codenames.daily";
import { afterMissed, pickOn, reconcilePick, type DailyPick, type StaleNote } from "./codenames.pick";
import { CodenamesEndView, CodenamesPlayView } from "./CodenamesSolo";

export { codenamesDailyGame };

/** The stored board changes only through this screen: nothing to subscribe to. */
const noSubscription = () => () => {};

/** Football Codenames' daily board on the shared daily screens (intro, archive, end, ranking). */
export function CodenamesDaily({ locale, onExit, onEvent, initialDay, onDay, surface = "public_game" }: {
  /** Where the screen runs, for analytics (Words practice tracks its own sessions). */
  surface?: "app" | "public_game";
  locale: string; onExit?: () => void; onEvent?: (event: "start" | "complete" | "replay", detail?: EngineEventDetail) => void; initialDay?: string | null; onDay?: (day: string, newest: boolean) => void;
}) {
  const game = codenamesDailyGame(locale);
  const c = codenamesCopy(locale);
  const d = wordDailyCopy(locale);
  // The pick lives here, not in the board: a confirmed card another tab made stale is held against the re-synced copy.
  const [held, setHeld] = useState<{ owner: string; day: string; pick: DailyPick } | null>(null);
  const [staleNote, setStaleNote] = useState<{ owner: string; day: string; note: StaleNote } | null>(null);
  /** Bumped by every pick, flip and stop: a move's late recovery only speaks if the player has done nothing since. */
  const inputRef = useRef(0);
  const daily = useWordDaily<CodenamesDailyState, CodenamesMove>({
    api: codenamesDailyApi, calendar: CODENAMES_CALENDAR, locale, initialDay, onDay, onEvent, resendLostAnswers: true,
    onAnswerNotSaved: (missed) => {
      const out = afterMissed(missed);
      if (!out || missed.extra?.input !== inputRef.current) return;
      const at = { owner: daily.owner, day: missed.fresh.state.day };
      setHeld(out.pick && { ...at, pick: out.pick });
      setStaleNote(out.note && { ...at, note: out.note });
    },
  });
  const { state, day, run, owner } = daily;
  // Pictures (the ranked daily) or Words (practice boards): remembered per viewer, read after mount (no storage on the server).
  const stored = useSyncExternalStore(noSubscription, readBoard, () => "pictures" as const);
  const [picked, setPicked] = useState<BoardKind | null>(null);
  const board = picked ?? stored;
  const [practicing, setPracticing] = useState(false);
  const pickBoard = (next: BoardKind) => { setPicked(next); writeBoard(next); };
  const picker = <BoardPicker locale={locale} value={board} onChange={pickBoard} />;
  const busy = daily.pending !== null;
  const solo = state ? toSoloState(state, locale) : null;
  const number = day ? puzzleNumber(CODENAMES_CALENDAR, day) : 0;
  const exit = () => (onExit ? onExit() : daily.setView("intro"));
  const status: "new" | "started" | "done" = state?.done ? "done" : state && state.flips.length > 0 ? "started" : "new";

  const onScreen = <T extends { owner: string; day: string }>(x: T | null) => (x && x.owner === owner && x.day === day ? x : null);
  // Read against the copy on screen once no call is in flight (pure: the same pick and copy always read the same).
  const heldPick = onScreen(held)?.pick ?? null;
  const settled = heldPick && run && !busy ? reconcilePick(heldPick, run) : null;
  const pick = settled ? settled.pick : heldPick;
  const note = settled?.note ?? onScreen(staleNote)?.note ?? null;

  const select = (cardId: string | null) => {
    inputRef.current += 1;
    setStaleNote(null);
    setHeld(cardId && run && day ? { owner, day, pick: pickOn(run, cardId) } : null);
  };
  const flip = (cardId: string) => {
    if (!state || !run || !day) return;
    const at = state.cards.findIndex((card) => card.id === cardId);
    if (at < 0 || state.cards[at].kind !== null) return;
    inputRef.current += 1;
    // A call still in flight would drop this one: held as confirmed, and asked for again once that call settles.
    if (busy || daily.busy()) { setHeld({ owner, day, pick: { ...(pick ?? pickOn(run, cardId)), cardId, confirmed: true } }); return; }
    setHeld(null);
    setStaleNote(null);
    void daily.answer(String(at), { input: inputRef.current });
  };
  // A run kept from before a correction of its day comes back without its board: only the score.
  const hasBoard = Boolean(solo && solo.cards.length === 20);
  const play = solo && hasBoard && day ? (
    <>
      <CodenamesPlayView locale={locale} number={number} state={solo} pending={busy} onFlip={flip} selected={pick?.cardId ?? null} onSelect={select}
        notice={(daily.notice || note) && (
          <p role="status" data-codenames-notice className="mt-2 rounded-xl bg-white/[0.08] px-3 py-2 text-center text-xs font-semibold text-white/85">
            {daily.notice ? d.notices[daily.notice] : c.staleNotes[note!]}
          </p>
        )}
        onStop={() => { if (busy || daily.busy()) return; inputRef.current += 1; void daily.answer("", { move: "stop", input: inputRef.current }); }} onResult={() => daily.setView("end")} onExit={exit} />
    </>
  ) : null;
  const end = solo && state?.done && day ? (
    <CodenamesEndView locale={locale} number={number} state={solo} guestOnPastBoard={daily.guestOnPastBoard} onArchive={() => daily.setView("archive")} onExit={onExit}
      leaderboard={<WordDailyLeaderboard game={game} locale={locale} load={loadCodenamesBoard} pointsLabel={c.foundLabel} day={isLiveDay(CODENAMES_CALENDAR, day, daily.today) ? day : undefined} refreshKey={daily.boardRefresh} placement="end" className="mt-6" />} picker={picker} />
  ) : null;

  if (practicing) return <CodenamesWordsPractice key={locale} locale={locale} surface={surface} onExit={() => setPracticing(false)} />;
  // Words has its own screens: whatever the picture daily restores (a finished run, the archive) does not take over.
  if (board === "words") {
    return (
      <Frame lang={locale}>
        <DailyIntro game={{ ...game, tag: c.words.practiceTag, lines: c.words.lines }} locale={locale} number={null} status="new" busy={false} notice={null}
          guestOnPastBoard={false} guestLockedOut={false} picker={picker} onStart={() => setPracticing(true)} onExit={onExit}
          friends={<div onClickCapture={() => setRoomPreset("words")}><PlayRoomWithFriends game={game} locale={locale} className="mt-3" /></div>} />
      </Frame>
    );
  }
  return (
    <WordDailyScreen game={game} locale={locale} daily={daily} status={status} onStart={() => void daily.play()} onExit={onExit} play={play} end={end} wide
      picker={picker} />
  );
}

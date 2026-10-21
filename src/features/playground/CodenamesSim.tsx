"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { randomBotAvatar } from "@/features/auction/data/botAvatars";
import { FIXTURE_CARDS, FIXTURE_CLUES } from "@/features/codenames/codenames.fixtures";
import { Users } from "lucide-react";
import { command, dealWords, dealWordsSolo, newRoomSim, reboard, tick, viewFor, type RoomSim } from "@/features/codenames/codenames.sim";
import { wordDeck } from "./codenamesWords.data";
import { newSolo, soloFlip, soloStop, type BoardKind, type CodenamesCommand } from "@/features/codenames/codenames.view";
import { BoardPicker } from "@/features/codenames/BoardPicker";
import { codenamesCopy } from "@/features/codenames/codenames.copy";
import { wordDailyCopy } from "@/features/wordgames/copy";
import { CodenamesGame, CodenamesResult, CodenamesTeams } from "@/features/codenames/CodenamesRoom";
import { CodenamesEndView, CodenamesPlayView } from "@/features/codenames/CodenamesSolo";
import { codenamesDailyGame } from "@/features/codenames/codenames.daily";
import { DailyIntro } from "@/features/wordgames/daily/WordDailyShell";
import { Frame, poppins } from "@/features/wordgames/ui";

type Log = (action: string, ...args: unknown[]) => void;

export const soloFixture = (day = "2026-10-22") => newSolo(day, FIXTURE_CARDS, FIXTURE_CLUES);

export const SEAT_NAMES = ["Vos", "Bruno", "Iker", "Dante", "Mateo", "Lucas", "Gael", "Hugo"];
export const seatPlayers = (n: number) => SEAT_NAMES.slice(0, n).map((name) => ({ name, avatar: randomBotAvatar(`codenames-${name}`) }));

export function CodenamesSoloSim({ locale, log, friends, leaderboard, day }: { locale: string; log: Log; friends: ReactNode; leaderboard: ReactNode; day?: string }) {
  const [screen, setScreen] = useState<"intro" | "play" | "end">("intro");
  const fresh = () => soloFixture(day);
  const [state, setState] = useState(fresh);
  const restart = () => { setState(fresh()); setScreen("intro"); };
  return (
    <Frame lang={locale}>
      {screen === "intro" ? (
        <DailyIntro game={codenamesDailyGame(locale)} locale={locale} number={3} status="new" busy={false} notice={null} guestOnPastBoard={false} guestLockedOut={false}
          friends={friends} onStart={() => setScreen("play")} onArchive={() => log("onArchive")} onExit={() => log("onExit")} />
      ) : screen === "play" ? (
        <CodenamesPlayView locale={locale} number={3} state={state} pending={false}
          onFlip={(id) => { log("onFlip", id); setState((s) => soloFlip(s, id)); }} onStop={() => setState(soloStop)} onResult={() => setScreen("end")} onExit={restart} />
      ) : (
        <CodenamesEndView locale={locale} number={3} state={state} guestOnPastBoard={false} friends={friends} leaderboard={leaderboard} onArchive={restart} onExit={restart} />
      )}
    </Frame>
  );
}

/** `board: "words"` deals 25 words from the locale's deck; `seed` 0 = new board each time. The host may switch the board on the teams screen. */
export interface CodenamesRoomConfig { seats: number; scoutMe: boolean; speed: number; board?: BoardKind; seed?: number }

export function CodenamesRoomSim({ config, locale, log, onExit }: { config: CodenamesRoomConfig; locale: string; log: Log; onExit?: () => void }) {
  const n = Math.min(8, Math.max(4, Math.round(config.seats)));
  const speed = config.speed > 0 ? config.speed : 1;
  const players = useMemo(() => seatPlayers(n), [n]);
  const [kind, setKind] = useState<BoardKind>(config.board ?? "pictures");
  const deal = (k: BoardKind) => (k === "words" ? dealWords(config.seed || Math.floor(Math.random() * 1e9), wordDeck(locale)) : undefined);
  const fresh = () => newRoomSim(players, config.scoutMe, Date.now(), true, deal(kind));
  const [sim, setSim] = useState<RoomSim>(() => fresh());
  const simRef = useRef(sim);
  useEffect(() => { simRef.current = sim; }, [sim]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      const next = tick(simRef.current, t, speed);
      if (next !== simRef.current) setSim(next);
    }, 200);
    return () => window.clearInterval(id);
  }, [speed]);

  const view = viewFor(sim);
  const send = (cmd: CodenamesCommand) => { log("send", cmd); setSim((s) => command(s, cmd, Date.now(), speed)); };
  const switchBoard = (board: BoardKind) => { log("board", board); setKind(board); setSim((s) => reboard(s, deal(board))); };
  const exit = onExit ?? (() => log("onExit"));
  const [resultShown, setResultShown] = useState(false);
  const reset = () => { setSim(fresh()); setResultShown(false); };
  useEffect(() => {
    if (sim.view.phase !== "over") return;
    const t = window.setTimeout(() => setResultShown(true), 2600);
    return () => window.clearTimeout(t);
  }, [sim.view.phase]);
  if (view.phase === "teams") return <CodenamesTeams view={view} locale={locale} onSend={send} onExit={exit} onBoard={switchBoard} />;
  if (view.phase === "over" && resultShown) return <CodenamesResult view={view} locale={locale} onRoom={reset} onExit={exit} />;
  return <CodenamesGame view={view} locale={locale} busy={false} onSend={send} onExit={reset} />;
}

/**
 * The Codenames start screen with the Pictures / Words switch: the solo board of the chosen kind, or a friend room
 * that opens on it (the host can still switch on the teams screen).
 */
export function CodenamesHubSim({ locale, log, leaderboard, initial = "pictures" }: { locale: string; log: Log; leaderboard: ReactNode; initial?: BoardKind }) {
  const [board, setBoard] = useState<BoardKind>(initial);
  const [screen, setScreen] = useState<"intro" | "play" | "end" | "room">("intro");
  const [state, setState] = useState(() => soloFixture());
  const c = codenamesCopy(locale);
  const base = codenamesDailyGame(locale);
  const game = board === "words" ? { ...base, tag: c.words.tag, lines: c.words.lines } : base;
  const home = () => setScreen("intro");
  const start = () => {
    setState(board === "words" ? dealWordsSolo(Math.floor(Math.random() * 1e9), wordDeck(locale), "2026-10-22") : soloFixture());
    setScreen("play");
  };
  if (screen === "room") return <CodenamesRoomSim key={`${board}-${locale}`} config={{ seats: 4, scoutMe: false, speed: 1, board }} locale={locale} log={log} onExit={home} />;
  return (
    <Frame lang={locale}>
      {screen === "intro" ? (
        <DailyIntro game={game} locale={locale} number={3} status="new" busy={false} notice={null} guestOnPastBoard={false} guestLockedOut={false}
          picker={<BoardPicker locale={locale} value={board} onChange={(b) => { log("board", b); setBoard(b); }} />}
          friends={
            <button type="button" onClick={() => setScreen("room")} style={poppins}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-blue text-sm font-black uppercase tracking-wide text-white hover:bg-brand-blue/90">
              <Users className="size-4" aria-hidden />{wordDailyCopy(locale).friends.replace("2–6", "2–8")}
            </button>
          }
          onStart={start} onArchive={() => log("onArchive")} onExit={() => log("onExit")} />
      ) : screen === "play" ? (
        <CodenamesPlayView locale={locale} number={3} state={state} pending={false}
          onFlip={(id) => { log("onFlip", id); setState((s) => soloFlip(s, id)); }} onStop={() => setState(soloStop)} onResult={() => setScreen("end")} onExit={home} />
      ) : (
        <CodenamesEndView locale={locale} number={3} state={state} guestOnPastBoard={false} leaderboard={leaderboard} onArchive={home} onExit={home} />
      )}
    </Frame>
  );
}

/** Playground only: sets off the Own Goal on a daily board, with a button to see it again. */
export function CodenamesOwnGoalDemo({ locale, log }: { locale: string; log: Log }) {
  const [round, setRound] = useState(0);
  return (
    <Frame lang={locale}>
      <OwnGoalRound key={round} locale={locale} log={log} />
      <button type="button" onClick={() => setRound((r) => r + 1)} className="mt-4 h-12 w-full rounded-full bg-white/10 text-sm font-bold uppercase tracking-wide text-white hover:bg-white/15">
        Replay the Own Goal
      </button>
    </Frame>
  );
}

function OwnGoalRound({ locale, log }: { locale: string; log: Log }) {
  const [state, setState] = useState(() => soloFixture());
  const ownGoal = state.cards.find((c) => c.kind === "owngoal")!.id;
  useEffect(() => {
    const t = window.setTimeout(() => setState((s) => soloFlip(s, ownGoal)), 900);
    return () => window.clearTimeout(t);
  }, [ownGoal]);
  return <CodenamesPlayView locale={locale} number={3} state={state} pending={false} onFlip={(c) => setState((s) => soloFlip(s, c))} onStop={() => log("onStop")} onResult={() => log("onResult")} onExit={() => log("onExit")} />;
}

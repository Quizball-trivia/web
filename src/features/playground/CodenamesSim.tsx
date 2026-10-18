"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { randomBotAvatar } from "@/features/auction/data/botAvatars";
import { FIXTURE_CARDS, FIXTURE_CLUES } from "@/features/codenames/codenames.fixtures";
import { command, newRoomSim, tick, viewFor, type RoomSim } from "@/features/codenames/codenames.sim";
import { newSolo, soloFlip, soloStop } from "@/features/codenames/codenames.view";
import { CodenamesGame, CodenamesResult, CodenamesTeams } from "@/features/codenames/CodenamesRoom";
import { CodenamesEndView, CodenamesPlayView } from "@/features/codenames/CodenamesSolo";
import { codenamesDailyGame } from "@/features/codenames/codenames.daily";
import { DailyIntro } from "@/features/wordgames/daily/WordDailyShell";
import { Frame } from "@/features/wordgames/ui";

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

export interface CodenamesRoomConfig { seats: number; scoutMe: boolean; speed: number }

export function CodenamesRoomSim({ config, locale, log }: { config: CodenamesRoomConfig; locale: string; log: Log }) {
  const n = Math.min(8, Math.max(4, Math.round(config.seats)));
  const speed = config.speed > 0 ? config.speed : 1;
  const players = useMemo(() => seatPlayers(n), [n]);
  const fresh = () => newRoomSim(players, config.scoutMe, Date.now(), true);
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
  const send = (cmd: Parameters<typeof command>[1]) => { log("send", cmd); setSim((s) => command(s, cmd, Date.now(), speed)); };
  const [resultShown, setResultShown] = useState(false);
  const reset = () => { setSim(fresh()); setResultShown(false); };
  useEffect(() => {
    if (sim.view.phase !== "over") return;
    const t = window.setTimeout(() => setResultShown(true), 2600);
    return () => window.clearTimeout(t);
  }, [sim.view.phase]);
  if (view.phase === "teams") return <CodenamesTeams view={view} locale={locale} onSend={send} onExit={() => log("onExit")} />;
  if (view.phase === "over" && resultShown) return <CodenamesResult view={view} locale={locale} onRoom={reset} onExit={() => log("onExit")} />;
  return <CodenamesGame view={view} locale={locale} busy={false} onSend={send} onExit={reset} />;
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

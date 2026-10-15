"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { top10Categories } from "@/features/game-mode-lab/data/top10";
import { TenableBoard, TenableResults, type TenableRoomLink } from "@/features/tenable/TenableRoom";
import { TenableEndView, TenablePlayView, tenableDailyGame } from "@/features/tenable/TenableSolo";
import { botMove, newRoom, newSolo, roomAnswer, roomTick, soloGiveUp, soloSay, withdraw, type RoomSim, type SimList } from "@/features/tenable/tenable.sim";
import type { TenableCommand } from "@/features/tenable/tenable.view";
import { DailyIntro } from "@/features/wordgames/daily/WordDailyShell";
import { Frame } from "@/features/wordgames/ui";
import { roomSnapshot } from "./fixtures/tenable";

/**
 * Prototype play on this device: the lists are the Game Mode Lab's (already public), judged by tenable.sim.ts; the real
 * game judges on the server against private lists.
 */
const LISTS: SimList[] = top10Categories.map((c) => ({ id: c.id, title: c.title, asOf: null, entries: c.entries, decoys: c.decoys }));

type Log = (action: string, ...args: unknown[]) => void;

export function TenableSoloSim({ locale, list, log, friends }: { locale: string; list: number; log: Log; friends: React.ReactNode }) {
  const source = LISTS[Math.max(0, Math.min(LISTS.length - 1, list))];
  const [screen, setScreen] = useState<"intro" | "play" | "end">("intro");
  const [state, setState] = useState(() => newSolo(source, "2026-10-22"));
  const game = tenableDailyGame(locale);
  const restart = () => { setState(newSolo(source, "2026-10-22")); setScreen("intro"); };
  return (
    <Frame lang={locale}>
      {screen === "intro" ? (
        <DailyIntro game={game} locale={locale} number={3} status="new" busy={false} notice={null} guestOnPastBoard={false} guestLockedOut={false} friends={friends}
          onStart={() => setScreen("play")} onArchive={() => log("onArchive")} onExit={() => log("onExit")} />
      ) : screen === "play" ? (
        <TenablePlayView locale={locale} number={3} state={state} pending={false} notice={null}
          onSay={(text) => { log("onSay", text); setState((s) => soloSay(source, s, text)); }} onGiveUp={() => setState((s) => soloGiveUp(source, s))}
          onResult={() => setScreen("end")} onExit={restart} />
      ) : (
        <TenableEndView locale={locale} number={3} state={state} guestOnPastBoard={false} friends={friends} onArchive={restart} onExit={restart}
          leaderboard={<div className="mt-6 rounded-2xl border border-dashed border-white/25 px-4 py-6 text-center text-xs text-white/60">Daily leaderboard: live data only</div>} />
      )}
    </Frame>
  );
}

/** 1 = bots answer half the time; higher = sharper bots. */
export interface TenableRoomConfig { seats: number; botSkill: number; speed: number; leaveAtList?: { seat: number; list: number } | null }

export function TenableRoomSim({ config, locale, log }: { config: TenableRoomConfig; locale: string; log: Log }) {
  const n = Math.min(6, Math.max(2, Math.round(config.seats)));
  const [sim, setSim] = useState<RoomSim>(() => newRoom(LISTS, n, Date.now()));
  const [left, setLeft] = useState(false);
  const simRef = useRef(sim);
  useEffect(() => { simRef.current = sim; }, [sim]);
  const botAt = useRef<{ epoch: number; at: number } | null>(null);
  const speed = config.speed > 0 ? config.speed : 1;

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      let s = roomTick(simRef.current, now);
      const v = s.view;
      if (config.leaveAtList && v.list === config.leaveAtList.list && v.seats[config.leaveAtList.seat]?.status === "in") s = withdraw(s, config.leaveAtList.seat);
      if (s.view.phase === "turn" && s.view.turn !== null && s.view.turn !== 0) {
        if (botAt.current?.epoch !== s.view.epoch) botAt.current = { epoch: s.view.epoch, at: now + (1_500 + Math.random() * 4_000) / speed };
        else if (now >= botAt.current.at) {
          const text = botMove(s, Math.min(1, 0.55 * config.botSkill));
          s = roomAnswer(s, s.view.turn!, text);
          botAt.current = null;
        }
      }
      if (s !== simRef.current) setSim(s);
    }, 120);
    return () => window.clearInterval(timer);
  }, [config.botSkill, config.leaveAtList, speed]);

  const room: TenableRoomLink = useMemo(() => ({
    send: (command: TenableCommand) => { log("send", command); setSim((s) => roomAnswer({ ...s, now: Date.now() }, 0, command.text)); return true; },
    nowMs: () => Date.now(), inFlight: 0, retained: null, connected: true, resendRetained: () => undefined,
    leave: () => { log("leave"); setLeft(true); },
    report: (round: number, text: string) => { log("report", { round, text }); return true; },
  }), [log]);

  const snapshot = roomSnapshot(n, sim.view);
  if (left || sim.view.phase === "over") {
    return <TenableResults view={sim.view.phase === "over" ? sim.view : { ...sim.view, standings: [] }} snapshot={snapshot} locale={locale}
      onRoom={() => { setLeft(false); setSim(newRoom(LISTS, n, Date.now())); }} onExit={() => log("onExit")} />;
  }
  return (
    <Frame lang={locale} wide={sim.view.format === "party"}>
      <TenableBoard view={sim.view} snapshot={snapshot} room={room} locale={locale} error={null} />
    </Frame>
  );
}

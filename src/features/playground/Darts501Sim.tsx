"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { stat501Categories } from "@/features/game-mode-lab/data/stat501";
import { D501Board, D501Results, type D501RoomLink } from "@/features/darts501/D501Room";
import { D501EndView, D501PlayView, d501DailyGame } from "@/features/darts501/D501Solo";
import { botMove, newRoom, newSolo, roomAnswer, roomTick, simLookup, soloGiveUp, soloSay, withdraw, type RoomSim, type SimCategory } from "@/features/darts501/d501.sim";
import type { D501Command } from "@/features/darts501/d501.view";
import { DailyIntro } from "@/features/wordgames/daily/WordDailyShell";
import { Frame } from "@/features/wordgames/ui";
import { d501Snapshot } from "./fixtures/darts501";

/** Prototype play on this device: the Game Mode Lab's categories (already public), judged by d501.sim.ts. */
const CATEGORIES: SimCategory[] = stat501Categories.map((c) => ({ id: c.id, title: c.title, unit: c.statLabel, asOf: null, players: c.players }));
const lookup = simLookup(CATEGORIES);

type Log = (action: string, ...args: unknown[]) => void;

export function D501SoloSim({ locale, category, pro = false, log, friends }: { locale: string; category: number; pro?: boolean; log: Log; friends: React.ReactNode }) {
  const cat = CATEGORIES[Math.max(0, Math.min(CATEGORIES.length - 1, category))];
  const [screen, setScreen] = useState<"intro" | "play" | "end">("intro");
  const [state, setState] = useState(() => newSolo(cat, "2026-11-01"));
  const restart = () => { setState(newSolo(cat, "2026-11-01")); setScreen("intro"); };
  return (
    <Frame lang={locale}>
      {screen === "intro" ? (
        <DailyIntro game={d501DailyGame(locale)} locale={locale} number={1} status="new" busy={false} notice={null} guestOnPastBoard={false} guestLockedOut={false} friends={friends}
          onStart={() => setScreen("play")} onArchive={() => log("onArchive")} onExit={() => log("onExit")} />
      ) : screen === "play" ? (
        <D501PlayView locale={locale} number={1} state={state} pending={false} notice={null} lookup={lookup}
          onSay={(text) => { log("onSay", text); setState((s) => soloSay(CATEGORIES, cat, s, text, pro)); }} onGiveUp={() => setState((s) => soloGiveUp(cat, s))}
          onResult={() => setScreen("end")} onExit={restart} />
      ) : (
        <D501EndView locale={locale} number={1} state={state} guestOnPastBoard={false} friends={friends} onArchive={restart} onExit={restart}
          leaderboard={<div className="mt-6 rounded-2xl border border-dashed border-white/25 px-4 py-6 text-center text-xs text-white/60">Daily leaderboard: live data only</div>} />
      )}
    </Frame>
  );
}

/** 1 = bots know the right name ~60% of the time; higher = sharper. */
export interface D501RoomConfig { seats: number; botSkill: number; speed: number; pro?: boolean; leaveAtLeg?: { seat: number; leg: number } | null }

export function D501RoomSim({ config, locale, log }: { config: D501RoomConfig; locale: string; log: Log }) {
  const n = Math.min(6, Math.max(2, Math.round(config.seats)));
  const [sim, setSim] = useState<RoomSim>(() => newRoom(CATEGORIES, n, Date.now(), config.pro));
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
      if (config.leaveAtLeg && v.leg === config.leaveAtLeg.leg && v.seats[config.leaveAtLeg.seat]?.status === "in") s = withdraw(s, config.leaveAtLeg.seat);
      if (s.view.phase === "turn" && s.view.turn !== null && s.view.turn !== 0) {
        if (botAt.current?.epoch !== s.view.epoch) botAt.current = { epoch: s.view.epoch, at: now + (1_500 + Math.random() * 3_000) / speed };
        else if (now >= botAt.current.at) {
          s = roomAnswer(s, s.view.turn!, botMove(s, Math.min(1, 0.6 * config.botSkill)));
          botAt.current = null;
        }
      }
      if (s !== simRef.current) setSim(s);
    }, 120);
    return () => window.clearInterval(timer);
  }, [config.botSkill, config.leaveAtLeg, speed]);

  const room: D501RoomLink = useMemo(() => ({
    send: (command: D501Command) => { log("send", command); setSim((s) => roomAnswer({ ...s, now: Date.now() }, 0, command.text)); return true; },
    nowMs: () => Date.now(), inFlight: 0, retained: null, connected: true, resendRetained: () => undefined,
    leave: () => { log("leave"); setLeft(true); },
  }), [log]);

  const snapshot = d501Snapshot(n, sim.view);
  if (left || sim.view.phase === "over") {
    return <D501Results view={sim.view.phase === "over" ? sim.view : { ...sim.view, standings: [] }} snapshot={snapshot} locale={locale}
      onRoom={() => { setLeft(false); setSim(newRoom(CATEGORIES, n, Date.now(), config.pro)); }} onExit={() => log("onExit")} />;
  }
  return (
    <Frame lang={locale} wide={sim.view.format === "party"}>
      <D501Board view={sim.view} snapshot={snapshot} room={room} locale={locale} error={null} lookup={lookup} />
    </Frame>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { randomBotAvatar } from "@/features/auction/data/botAvatars";
import { DatoFalsoBoard, DatoFalsoResults, type DfRoomLink } from "@/features/dato-falso/DatoFalsoRoom";
import { DatoFalsoEndView, DatoFalsoPlayView } from "@/features/dato-falso/DatoFalsoSolo";
import { datoFalsoDailyGame } from "@/features/dato-falso/datoFalso.game";
import { botAnswer, newRoom, newSolo, roomJoker, roomPick, roomTick, soloJoker, soloNext, soloSettle, viewFor, withdraw, type RoomSim } from "@/features/dato-falso/datoFalso.sim";
import type { DfCommand, DfRoomView } from "@/features/dato-falso/datoFalso.view";
import { DailyIntro } from "@/features/wordgames/daily/WordDailyShell";
import { Frame } from "@/features/wordgames/ui";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";
import type { SimCard } from "@/features/dato-falso/datoFalso.sim";
import { INVENTED_DECK } from "./fixtures/datoFalso.deck";

/** The real deck from the local private file when it is there (never committed); the invented one otherwise. */
let realDeck: Promise<SimCard[] | null> | null = null;
function useDeck(): SimCard[] {
  const [deck, setDeck] = useState<SimCard[]>(INVENTED_DECK);
  useEffect(() => {
    realDeck ??= fetch("/dev-data/dato-falso.json").then((r) => (r.ok ? r.json() : null)).then((d: { cards?: SimCard[] } | null) => d?.cards ?? null, () => null);
    let live = true;
    void realDeck.then((cards) => { if (live && cards && cards.length >= 10) setDeck(cards); });
    return () => { live = false; };
  }, []);
  return deck;
}
import { SEAT_NAMES } from "./fixtures/tenable";

type Log = (action: string, ...args: unknown[]) => void;

export function dfRoomSnapshot(n: number, view: DfRoomView, statuses: Record<number, "away" | "withdrawn"> = {}): RoomStatePayload {
  return {
    matchId: "playground", lobbyId: null, game: "name_chain", stateVersion: 1, status: view.phase === "over" ? "completed" : "active", phaseToken: 1,
    phaseDeadlineAt: view.deadline, serverNow: new Date().toISOString(),
    me: { userId: "pg-0", admitted: true, active: true, seat: 0, slot: 0, ready: true },
    seats: Array.from({ length: n }, (_, seat) => ({
      seat, slot: seat, userId: `pg-${seat}`, username: SEAT_NAMES[seat], avatarUrl: null, avatarCustomization: randomBotAvatar(`pg-${seat}`),
      isGuest: false, ready: true, connected: statuses[seat] !== "away", admitted: true, active: statuses[seat] !== "withdrawn",
    })) as RoomStatePayload["seats"],
    view, result: null,
  };
}

export const boardStandIn = <div className="mt-6 rounded-2xl border border-dashed border-white/25 px-4 py-6 text-center text-xs text-white/60">Daily leaderboard: live data only</div>;

/** The solo daily on this device: the prototype deck, judged by datoFalso.sim.ts (the real game judges on the server). */
/** A new deck (the real one arriving) starts the game over: a run never mixes two decks. */
export function DatoFalsoSoloSim(props: { locale: string; log: Log; friends: ReactNode }) {
  const deck = useDeck();
  return <SoloSim key={deck === INVENTED_DECK ? "invented" : "real"} {...props} DECK={deck} />;
}

function SoloSim({ locale, log, friends, DECK }: { locale: string; log: Log; friends: ReactNode; DECK: SimCard[] }) {
  const [screen, setScreen] = useState<"intro" | "play" | "end">("intro");
  const [state, setState] = useState(() => newSolo(DECK, "2026-11-03", Date.now()));
  const restart = () => { setState(newSolo(DECK, "2026-11-03", Date.now())); setScreen("intro"); };

  // The 30 s clock: a card whose time ran out settles with no answer.
  useEffect(() => {
    if (screen !== "play" || state.reveal || !state.deadline) return;
    const left = Date.parse(state.deadline) - Date.now();
    const id = window.setTimeout(() => setState((s) => soloSettle(DECK, s, null, locale)), Math.max(0, left));
    return () => window.clearTimeout(id);
  }, [screen, state.reveal, state.deadline, locale, DECK]);

  return (
    <Frame lang={locale}>
      {screen === "intro" ? (
        <DailyIntro game={datoFalsoDailyGame(locale)} locale={locale} number={3} status="new" busy={false} notice={null} guestOnPastBoard={false} guestLockedOut={false} friends={friends}
          onStart={() => { setState(newSolo(DECK, "2026-11-03", Date.now())); setScreen("play"); }} onArchive={() => log("onArchive")} onExit={() => log("onExit")} />
      ) : screen === "play" ? (
        <DatoFalsoPlayView locale={locale} number={3} state={state} pending={false}
          onJoker={(joker) => { log("onJoker", joker); setState((s) => soloJoker(DECK, s, joker)); }}
          onPick={(option) => { log("onPick", option); setState((s) => soloSettle(DECK, s, option, locale)); }}
          onNext={() => setState((s) => { const n = soloNext(DECK, s, Date.now()); if (n.status === "done") setScreen("end"); return n; })}
          onExit={restart} />
      ) : (
        <DatoFalsoEndView locale={locale} number={3} state={state} guestOnPastBoard={false} friends={friends} leaderboard={boardStandIn} onArchive={restart} onExit={restart} />
      )}
    </Frame>
  );
}

/** 1 = average bots; higher = sharper. `leaveAtCard`: that bot leaves when the card starts. */
export interface DfRoomConfig { seats: number; botSkill: number; speed: number; leaveAtCard?: { seat: number; card: number } | null }

export function DatoFalsoRoomSim(props: { config: DfRoomConfig; locale: string; log: Log }) {
  const deck = useDeck();
  return <RoomSimView key={deck === INVENTED_DECK ? "invented" : "real"} {...props} DECK={deck} />;
}

function RoomSimView({ config, locale, log, DECK }: { config: DfRoomConfig; locale: string; log: Log; DECK: SimCard[] }) {
  const n = Math.min(6, Math.max(2, Math.round(config.seats)));
  const [sim, setSim] = useState<RoomSim>(() => newRoom(DECK, n, Date.now(), locale));
  const [left, setLeft] = useState(false);
  const simRef = useRef(sim);
  useEffect(() => { simRef.current = sim; }, [sim]);
  const botAt = useRef<Record<number, { index: number; at: number }>>({});
  const speed = config.speed > 0 ? config.speed : 1;

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      let s = roomTick(simRef.current, now);
      if (config.leaveAtCard && s.phase === "card" && s.index === config.leaveAtCard.card && s.seats[config.leaveAtCard.seat]?.status === "in") s = withdraw(s, config.leaveAtCard.seat);
      if (s.phase === "card") {
        for (const seat of s.seats) {
          if (seat.seat === 0 || seat.status !== "in" || seat.pick !== null) continue;
          const plan = botAt.current[seat.seat];
          if (plan?.index !== s.index) botAt.current[seat.seat] = { index: s.index, at: now + (2_000 + Math.random() * 9_000) / speed };
          else if (now >= plan.at) s = botAnswer(s, seat.seat, config.botSkill);
          if (s.phase !== "card") break;
        }
      }
      if (s !== simRef.current) setSim(s);
    }, 120);
    return () => window.clearInterval(timer);
  }, [config.botSkill, config.leaveAtCard, speed]);

  const room: DfRoomLink = useMemo(() => ({
    send: (command: DfCommand) => {
      log("send", command);
      setSim((s) => {
        const at = { ...s, now: Date.now() };
        return command.type === "joker" ? roomJoker(at, 0, command.kind) : roomPick(at, 0, at.deck[at.index]?.options[command.option]?.id ?? "");
      });
      return true;
    },
    nowMs: () => Date.now(), inFlight: 0, retained: null, connected: true, resendRetained: () => undefined,
    leave: () => { log("leave"); setLeft(true); },
  }), [log]);

  const view = viewFor(sim, 0);
  const snapshot = dfRoomSnapshot(n, view);
  if (left || view.phase === "over") {
    return <DatoFalsoResults view={view.phase === "over" ? view : { ...view, standings: [] }} snapshot={snapshot} locale={locale}
      onRoom={() => { setLeft(false); setSim(newRoom(DECK, n, Date.now(), locale)); }} onExit={() => log("onExit")} />;
  }
  return (
    <Frame lang={locale} wide={view.format === "party"}>
      <DatoFalsoBoard view={view} snapshot={snapshot} room={room} locale={locale} error={null} />
    </Frame>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AproximadoBoard, AproximadoFrame, AproximadoIntro, AproximadoNotice, AproximadoPodium } from "@/features/aproximado/AproximadoRoom";
import { AproximadoPartyResults } from "@/features/aproximado/AproximadoParty";
import { finalStandings, isIdle, seatChanged, seatsChanged, startMatch, submitGuess, tick, type EngineConfig, type EngineState } from "@/features/aproximado/aproximado.engine";
import { ROUNDS, type Scoring } from "@/features/aproximado/aproximado.rules";
import { toPublicQuestion, type AproximadoRoomView, type RoomSeatView } from "@/features/aproximado/aproximado.views";
import { avatarFor, questionFor, SEAT_NAMES } from "./fixtures/aproximado";

/**
 * A room match on this device on the real engine (aproximado.engine.ts), bots in the other seats. Seat changes are
 * scripted: "away" lasts until a scripted "back" (the real 30 s / 60 s absence limits are the server's), "leave" is final.
 * Seat 0 is you: { seat: 0, do: "away" } shows your offline banner.
 */
export interface SimConfig {
  seats: number;
  scoring: Scoring;
  /** 1 = real time; 2 = everything twice as fast. */
  speed: number;
  /** Applied as question `round` (1-based) opens. */
  events: Array<{ round: number; seat: number; do: "away" | "back" | "leave" }>;
  /** "party" (default): Party Quiz standings + results screen. "classic": the seat strip + podium. */
  layout?: "party" | "classic";
}

const SKILL = [0, 0.06, 0.12, 0.2, 0.3, 0.45];
type BotPlan = Array<{ at: number; guess: number } | null>;

function planBots(s: EngineState, locale: string, roundMs: number): BotPlan {
  const q = questionFor(s.round, locale);
  const factor = 10 ** q.precision;
  const start = s.deadline - roundMs;
  return s.status.map((st, seat) => {
    if (seat === 0 || st !== "in" || Math.random() < 0.06) return null; // sometimes a bot just does not answer
    const noise = (Math.random() * 2 - 1) * SKILL[seat];
    return { at: start + (s.deadline - start) * (0.15 + Math.random() * 0.7), guess: Math.max(0, Math.round(q.value * (1 + noise) * factor) / factor) };
  });
}

export function AproximadoSim({ config, locale, log }: { config: SimConfig; locale: string; log: (action: string, ...args: unknown[]) => void }) {
  const n = Math.min(6, Math.max(2, Math.round(config.seats)));
  const speed = config.speed > 0 ? config.speed : 1;
  const engine: EngineConfig = useMemo(() => ({
    questions: Array.from({ length: ROUNDS }, (_, r) => questionFor(r, locale)), scoring: config.scoring,
    roundMs: 20_000 / speed, revealMs: 6_000 / speed, introMs: 3_000 / speed,
  }), [locale, config.scoring, speed]);
  const [now, setNow] = useState(() => Date.now());
  const [state, setState] = useState<EngineState>(() => startMatch(n, engine, Date.now()));
  const [left, setLeft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  const botsRef = useRef<BotPlan>([]);
  const logRef = useRef(log);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { logRef.current = log; }, [log]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      const before = stateRef.current;
      let s = before;
      // Bots answer when their time comes (through the same validation as a player).
      if (s.phase === "guess") botsRef.current.forEach((p, seat) => { if (p && t >= p.at && s.guesses[seat] === null) s = submitGuess(s, engine, seat, p.guess, t).state; });
      s = tick(s, engine, t);
      // A new question opened: the seat changes scripted for it, then the bots' plans.
      if (s.phase === "guess" && (before.phase !== "guess" || before.round !== s.round)) {
        s = seatsChanged(s, config.events.filter((e) => e.round === s.round + 1).map((e) => ({ seat: e.seat, change: e.do })));
        if (s.phase === "guess") botsRef.current = planBots(s, locale, engine.roundMs ?? 20_000);
      }
      if (s.phase === "reveal" && before.phase !== "reveal") {
        const r = s.results[s.results.length - 1];
        logRef.current("roundSettled", { round: s.round + 1, value: r.value, guesses: r.entries.map((e) => e.guess), points: r.entries.map((e) => e.points) });
      }
      if ((s.phase === "over" || s.phase === "cancelled") && s.phase !== before.phase) logRef.current(s.phase === "over" ? "matchOver" : "matchCancelled", finalStandings(s));
      if (s !== before) setState(s);
    }, 200);
    return () => window.clearInterval(timer);
  }, [engine, locale, config.events]);

  const view: AproximadoRoomView = useMemo(() => {
    const table = finalStandings(state);
    const reveal = state.phase === "reveal" ? state.results[state.results.length - 1] ?? null : null;
    const seats: RoomSeatView[] = Array.from({ length: n }, (_, seat) => ({
      seat, name: SEAT_NAMES[seat], avatar: avatarFor(seat), status: state.status[seat],
      answered: state.phase === "guess" ? state.guesses[seat] !== null : reveal ? reveal.entries[seat]?.guess !== null : false,
      idle: isIdle(state, seat), score: table.find((r) => r.seat === seat)!.points,
    }));
    return {
      phase: state.phase === "cancelled" ? "over" : state.phase, round: state.round, totalRounds: ROUNDS, scoring: config.scoring,
      question: toPublicQuestion(engine.questions[state.round]), seats, mySeat: 0, myGuess: state.guesses[0], reveal,
      results: state.results, standings: state.phase === "over" ? table : null,
    };
  }, [state, n, engine, config.scoring]);

  const secondsLeft = Math.max(0, Math.ceil(((state.deadline - now) / 1000) * speed));
  const restart = () => { setLeft(false); setError(null); setState(startMatch(n, engine, Date.now())); };
  const onRoom = () => { log("onRoom"); restart(); };
  const guess = (value: number) => {
    log("onGuess", value);
    const res = submitGuess(stateRef.current, engine, 0, value, Date.now());
    if (res.error) { log("guessRefused", res.error); setError(res.error); window.setTimeout(() => setError(null), 3000); return; }
    setState(res.state);
  };
  const leave = () => { log("onLeave"); setLeft(true); setState((s) => seatChanged(s, 0, "leave")); };

  const party = config.layout !== "classic";
  if (party && state.phase === "over" && !left) return <AproximadoPartyResults view={view} locale={locale} onRoom={onRoom} onExit={() => log("onExit")} />;
  return (
    <AproximadoFrame wide={party && !left && (state.phase === "guess" || state.phase === "reveal")}>
      {left ? (
        <AproximadoNotice kind="left" locale={locale} onRoom={onRoom} />
      ) : state.phase === "intro" ? (
        <AproximadoIntro seats={view.seats} mySeat={0} scoring={config.scoring} locale={locale} secondsLeft={secondsLeft} />
      ) : state.phase === "cancelled" ? (
        <AproximadoNotice kind="cancelled" locale={locale} onRoom={onRoom} />
      ) : state.phase === "over" ? (
        <AproximadoPodium view={view} locale={locale} onRoom={onRoom} onExit={() => log("onExit")} />
      ) : (
        <AproximadoBoard view={view} locale={locale} secondsLeft={secondsLeft} busy={false} onGuess={guess} onLeave={leave}
          connected={state.status[0] !== "away"} error={error} layout={party ? "party" : "classic"} />
      )}
    </AproximadoFrame>
  );
}

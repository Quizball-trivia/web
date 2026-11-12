"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  apply,
  createMatch,
  DEFAULT_CONFIG,
  projectView,
  standings,
  tick,
  type Command,
  type MentalistaConfig,
  type MentalistaState,
} from "@/features/mentalista/mentalista.engine";
import { MentalistaResults, MentalistaScreen, readsFromState } from "@/features/mentalista/MentalistaScreen";
import { categoriesFor, SEAT_META } from "./fixtures/mentalista";

/**
 * A Mentalista room on this device, on the real engine (mentalista.engine.ts): seat 0 is you, bots take the other seats.
 * The match starts in the lobby (an intro/rules screen with a Start button); bots then choose and predict on timers. A bot
 * predictor "reads" the chooser with probability `botSkill` (the sim knows the pick — on the server that stays secret).
 * Everything else (rotation, scoring, timeouts, end) is the pure engine.
 */
export interface MentalistaSimConfig {
  seats: number;
  /** Complete chooser cycles; the match runs `roundCycles × seats` rounds so every seat chooses `roundCycles` times. */
  roundCycles: number;
  /** 0–1: a bot predictor's chance of naming the chooser's exact pick. */
  botSkill: number;
  /** 1 = real time; 2 = twice as fast. */
  speed: number;
}

const randOf = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
let counter = 0;
const nextId = () => `sim-${counter++}`;

export function MentalistaSim({ config, locale, log }: { config: MentalistaSimConfig; locale: string; log: (action: string, ...args: unknown[]) => void }) {
  const n = Math.min(6, Math.max(3, Math.round(config.seats)));
  const speed = config.speed > 0 ? config.speed : 1;
  const categories = useMemo(() => categoriesFor(locale), [locale]);
  const engineConfig: MentalistaConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    roundCycles: Math.max(1, Math.min(4, Math.round(config.roundCycles || DEFAULT_CONFIG.roundCycles))),
    chooseMs: Math.round(DEFAULT_CONFIG.chooseMs / speed),
    guessMs: Math.round(DEFAULT_CONFIG.guessMs / speed),
    revealMs: Math.round(DEFAULT_CONFIG.revealMs / speed),
    categories,
  }), [categories, config.roundCycles, speed]);

  // Start in the lobby so the intro/rules screen is actually reachable; the player presses Start to begin.
  const [state, setState] = useState<MentalistaState>(() => createMatch(n, engineConfig));
  const [now, setNow] = useState(() => Date.now());
  const stateRef = useRef(state);
  const planRef = useRef<{ key: string; actions: Array<{ at: number; run: (s: MentalistaState) => MentalistaState }> }>({ key: "", actions: [] });
  const logRef = useRef(log);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { logRef.current = log; }, [log]);

  // Stable so it can sit in effect/plan deps without recreating them every render (logRef is a ref; apply is pure).
  const run = useCallback((s: MentalistaState, command: Command): MentalistaState => {
    const out = apply(s, command, Date.now());
    if (!out.result.ok) logRef.current("rejected", command.type, out.result.code);
    return out.state;
  }, []);

  // Reset to a fresh lobby when the knobs (seat count / engine config) change, or on Play Again.
  const reset = useCallback(() => {
    const fresh = createMatch(n, engineConfig);
    setState(fresh);
    stateRef.current = fresh;
    planRef.current = { key: "", actions: [] };
    return fresh;
  }, [n, engineConfig]);
  useEffect(() => { reset(); }, [reset]);

  const startMatch = useCallback(() => {
    setState((s) => (s.phase === "lobby" ? run(s, { type: "start", commandId: nextId(), baseVersion: s.version }) : s));
  }, [run]);

  // Plan bot actions whenever a scoring phase opens.
  useEffect(() => {
    const round = state.round;
    if (!round || state.phase === "over") return;
    const key = `${round.index}:${round.phase}`;
    if (planRef.current.key === key) return;
    const answers = categories[round.index % categories.length].answers;
    const actions: Array<{ at: number; run: (s: MentalistaState) => MentalistaState }> = [];
    const base = Date.now();
    const window = round.phase === "choosing" ? engineConfig.chooseMs : engineConfig.guessMs;
    if (round.phase === "choosing" && round.chooserSeat !== 0) {
      actions.push({ at: base + window * 0.3, run: (s) => run(s, { type: "commit_pick", seat: round.chooserSeat, answer: randOf(answers), commandId: nextId(), baseVersion: s.version }) });
    }
    if (round.phase === "guessing") {
      for (let seat = 0; seat < n; seat++) {
        if (seat === 0 || seat === round.chooserSeat) continue;
        const guess = Math.random() < config.botSkill && round.pick ? round.pick : randOf(answers);
        actions.push({ at: base + window * (0.25 + Math.random() * 0.5), run: (s) => run(s, { type: "predict", seat, answer: guess, commandId: nextId(), baseVersion: s.version }) });
      }
    }
    planRef.current = { key, actions };
  }, [state.phase, state.round?.index, state.round?.phase, state.round?.chooserSeat, state.round?.pick, categories, engineConfig, n, config.botSkill, run]);

  // The clock: advance deadlines and fire due bot actions. Stops once the match is over (no point ticking a dead match).
  const over = state.phase === "over";
  useEffect(() => {
    if (over) return;
    const timer = window.setInterval(() => {
      const t = Date.now();
      let s = tick(stateRef.current, t);
      const due = planRef.current.actions.filter((a) => a.at <= t);
      if (due.length) {
        planRef.current = { ...planRef.current, actions: planRef.current.actions.filter((a) => a.at > t) };
        for (const a of due) s = a.run(s);
      }
      stateRef.current = s;
      setState(s);
      setNow(t);
    }, 250);
    return () => window.clearInterval(timer);
  }, [over]);

  if (over) {
    return (
      <MentalistaResults table={standings(state)} seats={SEAT_META} viewerSeat={0} locale={locale} reads={readsFromState(state)}
        onRoom={() => { reset(); logRef.current("onRoom"); }} onExit={() => logRef.current("onExit")} />
    );
  }

  const view = projectView(state, 0);
  const round = state.round;
  const answers = round ? categories[round.index % categories.length].answers : [];
  const label = round ? categories[round.index % categories.length].label : "";
  const myPick = round && round.chooserSeat === 0 ? round.pick : null;
  const myPrediction = round?.predictions[0]?.raw ?? null;
  const secondsLeft = round ? Math.max(0, Math.ceil((round.deadline - now) / 1000)) : null;

  return (
    <MentalistaScreen view={view} seats={SEAT_META} categoryLabel={label} answers={answers} secondsLeft={secondsLeft} locale={locale}
      myPick={myPick} myPrediction={myPrediction}
      onStart={startMatch}
      onPick={(a) => setState((s) => run(s, { type: "commit_pick", seat: 0, answer: a, commandId: nextId(), baseVersion: s.version }))}
      onPredict={(a) => setState((s) => run(s, { type: "predict", seat: 0, answer: a, commandId: nextId(), baseVersion: s.version }))}
      onExit={() => logRef.current("onExit")} />
  );
}

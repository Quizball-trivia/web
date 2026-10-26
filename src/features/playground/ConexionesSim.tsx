"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { randomBotAvatar } from "@/features/auction/data/botAvatars";
import { ConexionesDuelResult, ConexionesDuelView, type CxDuelSeat } from "@/features/conexiones/ConexionesDuel";
import { ConexionesEndView, ConexionesPlayView } from "@/features/conexiones/ConexionesSolo";
import { conexionesDailyGame } from "@/features/conexiones/conexiones.game";
import {
  duelForfeit, duelName, duelNext, duelSubmit, duelTimeout, newDuel, newSolo, soloGuess, tryKey,
  type CxBoard, type CxDuelState, type CxSeat, type CxSoloOutcome, type CxSoloState,
} from "@/features/conexiones/conexiones.logic";
import { DailyIntro } from "@/features/wordgames/daily/WordDailyShell";
import { Frame } from "@/features/wordgames/ui";
import { INVENTED_BOARDS } from "./fixtures/conexiones.deck";

type Log = (action: string, ...args: unknown[]) => void;

/** The real boards from the local private file when it is there (never committed); the invented ones otherwise. */
let realBoards: Promise<CxBoard[] | null> | null = null;
export function useBoards(): { boards: CxBoard[]; real: boolean } {
  const [state, setState] = useState<{ boards: CxBoard[]; real: boolean }>({ boards: INVENTED_BOARDS, real: false });
  useEffect(() => {
    realBoards ??= fetch("/dev-data/conexiones.json").then((r) => (r.ok ? r.json() : null)).then((d: { boards?: CxBoard[] } | null) => d?.boards ?? null, () => null);
    let live = true;
    void realBoards.then((b) => { if (live && b && b.length >= 6) setState({ boards: b, real: true }); });
    return () => { live = false; };
  }, []);
  return state;
}

export const DAILY_INDEX = 5;
export const DUEL_BOARDS_OF = (boards: CxBoard[]) => boards.slice(0, 5);

export function shuffled<T>(xs: readonly T[], rnd: () => number = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export const SEATS: [CxDuelSeat, CxDuelSeat] = [
  { name: "Vos", avatar: randomBotAvatar("cx-me") },
  { name: "LaCobra_9", avatar: randomBotAvatar("cx-rival") },
];

export function SoloSim({ locale, log, friends }: { locale: string; log: Log; friends: ReactNode }) {
  const { boards } = useBoards();
  const board = boards[DAILY_INDEX];
  return <SoloRun key={board.id} board={board} locale={locale} log={log} friends={friends} />;
}

function SoloRun({ board, locale, log, friends }: { board: CxBoard; locale: string; log: Log; friends: ReactNode }) {
  const [screen, setScreen] = useState<"intro" | "play" | "end">("intro");
  const [state, setState] = useState<CxSoloState>(() => newSolo(board, "2026-11-01", Date.now()));
  const [selected, setSelected] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<CxSoloOutcome | null>(null);
  const [shake, setShake] = useState(0);
  useEffect(() => {
    if (state.status === "playing") return;
    const t = window.setTimeout(() => setScreen("end"), 1600);
    return () => window.clearTimeout(t);
  }, [state.status]);
  if (screen === "intro") {
    return (
      <Frame lang={locale}>
        <DailyIntro game={conexionesDailyGame(locale)} locale={locale} number={1} status="new" busy={false} notice={null} guestOnPastBoard={false} guestLockedOut={false}
          friends={friends} onStart={() => { setState(newSolo(board, "2026-11-01", Date.now())); setScreen("play"); }} onArchive={() => log("onArchive")} onExit={() => log("onExit")} />
      </Frame>
    );
  }
  if (screen === "end") {
    return (
      <Frame lang={locale}>
        <ConexionesEndView locale={locale} number={1} board={board} state={{ ...state, rank: 214 }} guestOnPastBoard={false} friends={friends} leaderboard={null}
          onArchive={() => log("onArchive")} onExit={() => { setScreen("intro"); setSelected([]); setOutcome(null); }} />
      </Frame>
    );
  }
  return (
    <Frame lang={locale}>
      <ConexionesPlayView locale={locale} number={1} board={board} state={state} selected={selected} outcome={outcome} shakeKey={shake} pending={false}
        onToggle={(id) => { setOutcome(null); setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 4 ? [...s, id] : s)); }}
        onSubmit={() => {
          const r = soloGuess(board, state, selected, Date.now());
          log("guess", r.outcome);
          setState(r.state); setOutcome(r.outcome);
          if (r.outcome === "right") setSelected([]); else setShake((k) => k + 1);
        }}
        onShuffle={() => setState((s) => ({ ...s, order: shuffled(s.order) }))} onClear={() => setSelected([])} onExit={() => setScreen("intro")} />
    </Frame>
  );
}

// ── 1v1 vs a bot ──────────────────────────────────────────────────────────────────────────────────────────────────

export interface DuelSimConfig { botSkill: number; speed: number; youStart: boolean }

/** The bot goes for the easiest group left; it misses more on harder ones, often by one. */
export function botTry(s: CxDuelState, skill: number, rnd: () => number = Math.random): string[] {
  const board = s.boards[s.index];
  const open = board.groups.filter((g) => !s.solved.some((x) => x.groupId === g.id)).sort((a, b) => a.tier - b.tier);
  const tried = new Set(s.tries.map((t) => tryKey(t.ids)));
  const target = open[0];
  if (rnd() < Math.min(0.95, skill * (0.8 - 0.14 * (target.tier - 1))) && !tried.has(tryKey(target.members))) return [...target.members];
  for (let k = 0; k < 20; k++) {
    const g = open[Math.floor(rnd() * open.length)];
    const others = open.filter((x) => x.id !== g.id).flatMap((x) => x.members);
    const ids = rnd() < 0.6 && others.length ? [...shuffled(g.members, rnd).slice(0, 3), others[Math.floor(rnd() * others.length)]] : shuffled(s.order, rnd).slice(0, 4);
    if (!tried.has(tryKey(ids))) return ids;
  }
  return [...target.members];
}

export function DuelSim({ config, locale, log }: { config: DuelSimConfig; locale: string; log: Log }) {
  const { boards } = useBoards();
  return <DuelRun key={boards[0].id} boards={boards} config={config} locale={locale} log={log} />;
}

function DuelRun({ boards, config, locale, log }: { boards: CxBoard[]; config: DuelSimConfig; locale: string; log: Log }) {
  const fresh = useCallback(() => newDuel(DUEL_BOARDS_OF(boards), config.youStart ? 0 : 1, Date.now()), [boards, config.youStart]);
  const [state, setState] = useState<CxDuelState>(fresh);
  const [selected, setSelected] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const me: CxSeat = 0;

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      const s = stateRef.current;
      if (s.phase !== "over" && t >= s.deadline) setState(s.phase === "reveal" ? duelNext(s, t) : duelTimeout(s, t));
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  // A new turn clears my picks (set during render: no flash of the old selection).
  const [turnKey, setTurnKey] = useState(`${state.index}:${state.tries.length}:${state.phase}`);
  const key = `${state.index}:${state.tries.length}:${state.phase}`;
  if (turnKey !== key) { setTurnKey(key); setSelected([]); }

  useEffect(() => {
    if (state.turn === me || (state.phase !== "turn" && state.phase !== "name")) return;
    const delay = (state.phase === "name" ? 2500 : 2500 + Math.random() * 3500) / config.speed;
    const t = window.setTimeout(() => {
      const s = stateRef.current;
      const at = Date.now();
      if (s.phase === "turn") setState(duelSubmit(s, 1, botTry(s, config.botSkill), at, (xs) => shuffled(xs)));
      else if (s.phase === "name" && s.nameOptions) {
        const g = s.boards[s.index].groups.find((x) => !s.solved.some((y) => y.groupId === x.id))!;
        const pick = Math.random() < 0.7 * config.botSkill ? g.link.en : s.nameOptions.find((o) => o.en !== g.link.en)!.en;
        setState(duelName(s, 1, pick, at));
      }
    }, delay);
    return () => window.clearTimeout(t);
  }, [state.turn, state.phase, state.index, state.tries.length, config.speed, config.botSkill]);

  if (state.phase === "over") {
    return (
      <Frame lang={locale}>
        <ConexionesDuelResult locale={locale} state={state} me={me} seats={SEATS} onRoom={() => { log("onRoom"); setState(fresh()); }} onLeave={() => log("onLeave")} />
      </Frame>
    );
  }
  return (
    <Frame lang={locale}>
      <ConexionesDuelView locale={locale} state={state} me={me} seats={SEATS} selected={selected} msLeft={Math.max(0, state.deadline - now)} pending={false}
        onToggle={(id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 4 ? [...s, id] : s))}
        onSubmit={() => { log("submit", selected); setState((s) => duelSubmit(s, me, selected, Date.now(), (xs) => shuffled(xs))); }}
        onClear={() => setSelected([])}
        onName={(pick) => { log("name", pick); setState((s) => duelName(s, me, pick, Date.now())); }}
        onNext={() => setState((s) => duelNext(s, Date.now()))}
        onExit={() => { log("forfeit"); setState((s) => duelForfeit(s, me)); }} />
    </Frame>
  );
}

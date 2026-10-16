"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RaceBoard, RaceDraft, RaceFrame, RaceIntro, RaceResults } from "@/features/football-race/RaceRoom";
import { startMatch, submitPick, tick, type EngineConfig, type EngineState } from "@/features/football-race/race.engine";
import { compare, dealMatch, MAX_SEATS, rng, targetFor, type Deal, type RacePack } from "@/features/football-race/race.rules";
import { draftPick, draftTick, startDraft, type DraftState } from "@/features/football-race/race.draft";
import { toRaceView, toWording } from "@/features/football-race/race.views";
import { avatarFor, SEAT_NAMES } from "./fixtures/aproximado";
import { inventedRacePack } from "./fixtures/football-race";

/**
 * A whole race on this device on the real engine (race.engine.ts): seat 0 is you, bots take the other seats. Bots know
 * who leads a stat only some of the time (`botSkill`), so they backfire like people do.
 */
export interface RaceSimConfig {
  seats: number;
  /** 1 = real time; 2 = everything twice as fast. */
  speed: number;
  /** Spaces to the goal; 0 = by lobby size (5 for 2–3 players, seats + 2 from 4). */
  target: number;
  /** 0–1: how often a bot reads a stat correctly. */
  botSkill: number;
  pickSeconds: number;
  /** "real" = the local private pack when it is on this machine (never committed); "invented" = the public fixture. */
  data: "real" | "invented";
  /** Nation ids to seat in order (yours first); empty = dealt. */
  nations: string[];
  /** Scope ids for the theme; empty = dealt. Packs with tournaments use `tournament` instead. */
  scopes: string[];
  /** A tournament id (WC, EURO, COPA, AFCON, ASIA, GOLD, WCQ, EUROQ, NL, ALL) or "random"; packs without tournaments ignore it. */
  tournament: string;
  /** Change it for a different deal. */
  seed: number;
  /** "instant": first flag on the line wins at once. "round": the round is played out and the racer alone in front wins. */
  finish: "instant" | "round";
}

const REAL_PACK_URL = "/dev-data/football-race.json";

type BotPlan = Array<{ at: number; statId: string } | null>;

/** Each bot looks at a handful of unused stats, believes it knows who leads each (right `skill` of the time), and takes one it thinks is its own. */
function planBots(state: EngineState, cfg: EngineConfig, skill: number, random: () => number): BotPlan {
  const metricOf = new Map(cfg.pack.metrics.map((m) => [m.id, m]));
  const statOf = new Map(cfg.pack.stats.map((s) => [s.id, s]));
  const free = cfg.statIds.filter((id) => !state.used.includes(id));
  const window = state.deadline - Date.now();
  return state.picks.map((_, seat) => {
    if (seat === 0 || !free.length) return null;
    const hand = Array.from({ length: Math.min(12, free.length) }, () => free[Math.floor(random() * free.length)]);
    const believesMine = hand.filter((id) => {
      const stat = statOf.get(id)!;
      const truth = compare(stat, metricOf.get(stat.metric)!, cfg.racers)?.leaders ?? [];
      return random() < skill ? truth.includes(seat) : Math.floor(random() * cfg.racers.length) === seat;
    });
    const statId = (believesMine.length ? believesMine : hand)[0];
    return { at: Date.now() + window * (0.12 + random() * 0.6), statId };
  });
}

function DealError({ message }: { message: string }) {
  return <RaceFrame><p role="alert" className="m-auto max-w-xs text-center text-sm text-white/70">{message}</p></RaceFrame>;
}

export function FootballRaceSim({ config, locale, log }: { config: RaceSimConfig; locale: string; log: (action: string, ...args: unknown[]) => void }) {
  const n = Math.min(MAX_SEATS, Math.max(2, Math.round(config.seats)));
  const speed = config.speed > 0 ? config.speed : 1;
  const [pack, setPack] = useState<RacePack | null>(config.data === "invented" ? inventedRacePack : null);
  useEffect(() => {
    if (config.data === "invented") return;
    let alive = true;
    fetch(REAL_PACK_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((p: RacePack) => { if (alive) setPack(p); })
      .catch(() => { if (alive) setPack(inventedRacePack()); });
    return () => { alive = false; };
  }, [config.data]);
  const [game, setGame] = useState(0);
  if (!pack) return <RaceFrame><p className="m-auto text-sm text-white/60">…</p></RaceFrame>;
  // A rematch is a new deal: new racers, new theme, a fresh match.
  return <Race key={`${pack.version}-${game}`} pack={pack} n={n} speed={speed} game={game} config={config} locale={locale} log={log} onAgain={() => setGame((g) => g + 1)} />;
}

function Race({ pack, n, speed, game, config, locale, log, onAgain }: {
  pack: RacePack; n: number; speed: number; game: number; config: RaceSimConfig; locale: string; log: (action: string, ...args: unknown[]) => void; onAgain: () => void;
}) {
  const deal = useMemo(() => {
    try { return dealMatch(pack, n, config.seed + game * 101, { nations: config.nations, scopes: config.scopes, tournament: config.tournament || "random" }); }
    catch (e) { return e instanceof Error ? e.message : "no deal"; }
  }, [pack, n, config.seed, config.nations, config.scopes, config.tournament, game]);
  const [drafted, setDrafted] = useState<string[] | null>(null);
  if (typeof deal === "string") return <DealError message={deal} />;
  // Nations fixed in the state skip the draft (seated in the order given).
  if (!drafted && config.nations.length === 0) {
    return <Draft pack={pack} deal={deal} n={n} speed={speed} seed={config.seed + game} locale={locale} log={log} onDone={setDrafted} />;
  }
  return <Match pack={pack} n={n} speed={speed} game={game} deal={drafted ? { ...deal, racers: drafted } : deal} config={config} locale={locale} log={log} onAgain={onAgain} />;
}

const DRAFT_PICK_MS = 10_000;

/** The dealt nations picked in turn; bots take a random free one after a second or two. */
function Draft({ pack, deal, n, speed, seed, locale, log, onDone }: {
  pack: RacePack; deal: Deal; n: number; speed: number; seed: number; locale: string; log: (action: string, ...args: unknown[]) => void; onDone: (racers: string[]) => void;
}) {
  const pickMs = DRAFT_PICK_MS / speed;
  const [draft, setDraft] = useState<DraftState>(() => startDraft(n, seed, Date.now(), pickMs));
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef(draft);
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; }, [onDone]);
  const people = useMemo(() => Array.from({ length: n }, (_, seat) => ({ seat, name: SEAT_NAMES[seat], avatar: avatarFor(seat) })), [n]);
  const nations = useMemo(() => deal.racers.map((id) => pack.nations.find((x) => x.id === id)!), [deal, pack]);
  useEffect(() => {
    const random = rng(seed + 5);
    let botAt = 0;
    const timer = window.setInterval(() => {
      const t = Date.now(); setNow(t);
      let d = ref.current;
      const seat = d.done ? -1 : d.order[d.turn];
      if (seat > 0) {
        if (!botAt) botAt = t + (1000 + random() * 1500) / speed;
        if (t >= botAt) { const free = deal.racers.filter((id) => !d.picks.includes(id)); d = draftPick(d, deal.racers, seat, free[Math.floor(random() * free.length)], t, pickMs).state; botAt = 0; }
      }
      d = draftTick(d, deal.racers, seed, t, pickMs);
      if (d !== ref.current) { ref.current = d; setDraft(d); }
      if (d.done) { window.clearInterval(timer); window.setTimeout(() => doneRef.current(d.picks as string[]), 1200 / speed); }
    }, 150);
    return () => window.clearInterval(timer);
  }, [deal, seed, speed, pickMs]);
  const pick = (id: string) => {
    log("onDraftPick", id);
    const res = draftPick(ref.current, deal.racers, 0, id, Date.now(), pickMs);
    if (res.error) { log("draftRefused", res.error); return; }
    ref.current = res.state; setDraft(res.state);
  };
  const tournament = pack.tournaments?.find((t) => t.id === deal.tournament)?.label ?? null;
  return (
    <RaceFrame>
      <RaceDraft nations={nations} seats={people} mySeat={0} draft={draft} tournament={tournament} locale={locale}
        secondsLeft={Math.max(0, Math.ceil(((draft.deadline - now) / 1000) * speed))} onPick={pick} />
    </RaceFrame>
  );
}

function Match({ pack, n, speed, game, deal, config, locale, log, onAgain }: {
  pack: RacePack; n: number; speed: number; game: number; deal: Deal; config: RaceSimConfig; locale: string; log: (action: string, ...args: unknown[]) => void; onAgain: () => void;
}) {
  const engine: EngineConfig = useMemo(() => ({
    pack, racers: deal.racers, statIds: deal.statIds, target: config.target > 0 ? Math.max(2, Math.round(config.target)) : targetFor(n), seed: config.seed + game,
    introMs: 4_000 / speed, pickMs: (config.pickSeconds * 1000) / speed, revealStepMs: 4_200 / speed, revealTailMs: 1_600 / speed, maxRounds: 12, finish: config.finish === "round" ? "round" : "instant",
  }), [pack, deal, n, config.target, config.seed, config.pickSeconds, config.finish, speed, game]);
  const wording = useMemo(() => toWording(pack), [pack]);
  const people = useMemo(() => Array.from({ length: n }, (_, seat) => ({ name: SEAT_NAMES[seat], avatar: avatarFor(seat) })), [n]);
  const [now, setNow] = useState(() => Date.now());
  const [state, setState] = useState<EngineState>(() => startMatch(n, engine, Date.now()));
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  const botsRef = useRef<BotPlan>([]);
  const randomRef = useRef(rng(config.seed + 17));
  const logRef = useRef(log);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { logRef.current = log; }, [log]);

  useEffect(() => {
    logRef.current("dealt", { tournament: deal.tournament, racers: deal.racers, scopes: deal.scopes, stats: deal.statIds.length, leadsPerRacer: deal.leads, fair: deal.fair });
  }, [deal]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      const before = stateRef.current;
      let s = before;
      // Bots lock in at their own planned moment, earliest first: the poll's tick must not reorder two picks due in it.
      const due = botsRef.current.flatMap((p, seat) => (p && t >= p.at ? [{ seat, ...p }] : [])).sort((a, b) => a.at - b.at);
      for (const p of due) if (s.phase === "pick" && s.picks[p.seat] === null) s = submitPick(s, engine, p.seat, p.statId, p.at).state;
      s = tick(s, engine, t);
      if (s.phase === "pick" && (before.phase !== "pick" || before.round !== s.round)) botsRef.current = planBots(s, engine, config.botSkill, randomRef.current);
      // Logged as each pick's values come out, never ahead of its reveal.
      if (s.phase === "reveal" && s.revealOpen && s.reveal && (!before.revealOpen || before.revealIndex !== s.revealIndex || before.phase !== "reveal")) {
        const r = s.reveal[s.revealIndex];
        logRef.current("pickRevealed", { round: s.round + 1, seat: r.seat, stat: r.statId, auto: r.auto, moves: r.leaders.map((l) => engine.racers[l]) });
      }
      if (s.phase === "over" && before.phase !== "over") logRef.current("matchOver", { positions: s.positions, winners: s.winners, rounds: s.rounds.length, endedBy: s.endedBy });
      if (s !== before) { stateRef.current = s; setState(s); }
    }, 150);
    return () => window.clearInterval(timer);
  }, [engine, config.botSkill]);

  const view = useMemo(() => toRaceView(state, engine, deal.scopes, people, 0), [state, engine, deal.scopes, people]);
  const secondsLeft = Math.max(0, Math.ceil(((state.deadline - now) / 1000) * speed));
  const pick = (statId: string) => {
    log("onPick", statId);
    const res = submitPick(stateRef.current, engine, 0, statId, Date.now());
    if (res.error) { log("pickRefused", res.error); setError(res.error); window.setTimeout(() => setError(null), 3000); return; }
    stateRef.current = res.state;
    setState(res.state);
  };
  const again = () => { log("onRoom"); onAgain(); };

  if (state.phase === "over") return <RaceResults view={view} locale={locale} onRoom={again} onExit={() => log("onExit")} />;
  return (
    <RaceFrame wide={state.phase !== "intro"}>
      {state.phase === "intro"
        ? <RaceIntro view={view} wording={wording} locale={locale} secondsLeft={secondsLeft} />
        : <RaceBoard view={view} wording={wording} locale={locale} secondsLeft={secondsLeft} busy={false} onPick={pick} error={error} onLeave={() => log("onLeave")} />}
    </RaceFrame>
  );
}

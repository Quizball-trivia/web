// Prototype room on one device: the full key lives here and bots play the other seats. The real game keeps the key on
// the server and sends it only to Scouts.
import type { AvatarCustomization } from "@/types/game";
import { FIXTURE_CARDS, FIXTURE_CLUES, FIXTURE_RIVAL_TURNS, FIXTURE_SINGLE_CLUES } from "./codenames.fixtures";
import { cardsLeft, foldClue, type CardKey, type Clue, type CodenamesCommand, type CodenamesRoomView, type RoomPlayer, type Team } from "./codenames.view";

export interface RoomSim {
  view: CodenamesRoomView;
  keys: Record<string, CardKey>;
  /** Next moment a bot may act. */
  botAt: number;
  ourScript: number;
  rivalScript: number;
  /** The rival picks still to make this turn. */
  rivalPlan: string[];
  rngSeed: number;
  /** Clue names per card on a dealt board; null on the scripted pilot board. */
  deckClues: Record<string, string[]> | null;
}

/** A card with the clue names it fits (a playground deck: the real one is server-side). */
export interface DeckCard { id: string; face: boolean; clues: string[] }

const sameClue = (a: string, b: string) => foldClue(a) === foldClue(b);

export interface DealtBoard { cards: { id: string; key: CardKey }[]; clues: Record<string, string[]> }

const shuffled = <T,>(items: T[], seed: number): T[] => {
  let x = seed || 1;
  const next = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648;
  return items.map((item) => ({ item, r: next() })).sort((a, b) => a.r - b.r).map((e) => e.item);
};

/** 20 random cards with at most `faces` caricatures, keyed 8 / 7 / 4 / 1. */
export function dealBoard(seed: number, deck: DeckCard[], faces = 6): DealtBoard {
  const withFace = shuffled(deck.filter((c) => c.face), seed).slice(0, faces);
  const rest = shuffled(deck.filter((c) => !c.face), seed + 1).slice(0, 20 - withFace.length);
  const picked = shuffled([...withFace, ...rest], seed + 2);
  const keys: CardKey[] = [...Array(8).fill("t0"), ...Array(7).fill("t1"), ...Array(4).fill("neutral"), "owngoal"];
  const order = shuffled(keys, seed + 3);
  return { cards: picked.map((c, i) => ({ id: c.id, key: order[i] })), clues: Object.fromEntries(picked.map((c) => [c.id, c.clues])) };
}

const toKey = (kind: string): CardKey => (kind === "mine" ? "t0" : kind === "theirs" ? "t1" : kind === "owngoal" ? "owngoal" : "neutral");
const other = (t: Team): Team => (t === 0 ? 1 : 0);

function rng(sim: RoomSim): [number, RoomSim] {
  const seed = (sim.rngSeed * 1103515245 + 12345) % 2147483648;
  return [seed / 2147483648, { ...sim, rngSeed: seed }];
}

/** `arriving`: the player has just opened the room and has no side yet (the bots are already seated). */
export function newRoomSim(players: { name: string; avatar: AvatarCustomization }[], scoutMe: boolean, now: number, arriving = false, board?: DealtBoard): RoomSim {
  const seats: RoomPlayer[] = players.map((p, seat) => ({
    seat, name: p.name, avatar: p.avatar, team: arriving && seat === 0 ? null : ((seat % 2) as Team), status: "in",
    scout: arriving ? seat === 1 || seat === 2 : scoutMe ? seat === 0 || seat === 1 : seat === 2 || seat === 1,
  }));
  const cards = board?.cards ?? FIXTURE_CARDS.map((c) => ({ id: c.id, key: toKey(c.kind) }));
  const keys = Object.fromEntries(cards.map((c) => [c.id, c.key]));
  return {
    view: {
      phase: "teams", mySeat: 0, host: 0, turnNo: 0, botScout: [false, false], used: [], players: seats, starting: 0, turn: 0,
      cards: cards.map((c) => ({ id: c.id, key: null, revealed: null, picks: [] })),
      clue: null, guessesLeft: null, history: [], result: null,
    },
    keys, botAt: now + 2_500, ourScript: 0, rivalScript: 0, rivalPlan: [], rngSeed: 7, deckClues: board?.clues ?? null,
  };
}

/** Whoever still has no side at kick-off joins the smaller team as a guesser. */
function seatEveryone(sim: RoomSim): RoomSim {
  const players = [...sim.view.players];
  players.forEach((p, i) => {
    if (p.team !== null) return;
    const size = (t: Team) => players.filter((q) => q.team === t).length;
    players[i] = { ...p, team: size(0) <= size(1) ? 0 : 1, scout: false };
  });
  // The bot scripts are written for seat 0's side being team 0; the real server keeps sides as picked.
  const flipSides = players[sim.view.mySeat].team === 1;
  return withView(sim, { players: flipSides ? players.map((p) => ({ ...p, team: p.team === 0 ? 1 : 0 })) : players });
}

/** An even random split; the first player dealt to each team starts as its Scout. */
export function shuffleTeams(sim: RoomSim): RoomSim {
  let s = sim;
  const order = sim.view.players.map((p) => {
    const [r, next] = rng(s);
    s = next;
    return { seat: p.seat, r };
  }).sort((a, b) => a.r - b.r).map((x) => x.seat);
  const teamOf = new Map(order.map((seat, i) => [seat, (i % 2) as Team]));
  const players = sim.view.players.map((p) => ({ ...p, team: teamOf.get(p.seat)!, scout: order.indexOf(p.seat) < 2 }));
  return withView(s, { players });
}

/** What seat 0 is allowed to see: the key only as a Scout or once the game is over. */
export function viewFor(sim: RoomSim): CodenamesRoomView {
  const v = sim.view;
  const scout = v.players[v.mySeat].scout;
  const show = scout || v.phase === "over";
  return { ...v, cards: v.cards.map((c) => ({ ...c, key: show ? sim.keys[c.id] : null })) };
}

function withView(sim: RoomSim, patch: Partial<CodenamesRoomView>): RoomSim {
  return { ...sim, view: { ...sim.view, ...patch } };
}

function startClue(sim: RoomSim, team: Team, now: number, speed: number): RoomSim {
  return {
    ...withView(sim, { phase: "clue", turn: team, clue: null, guessesLeft: null, cards: sim.view.cards.map((c) => ({ ...c, picks: [] })) }),
    botAt: now + 2_500 / speed, rivalPlan: [],
  };
}

export function giveClue(sim: RoomSim, clue: Clue, now: number, speed: number): RoomSim {
  if (sim.view.phase !== "clue" || sim.view.history.some((t) => sameClue(t.clue?.word ?? "", clue.word))) return sim;
  const team = sim.view.turn;
  const next = withView(sim, { phase: "guess", clue, guessesLeft: clue.count + 1, history: [...sim.view.history, { team, clue, flips: [] }] });
  return { ...next, botAt: now + 2_000 / speed };
}

export function endTurn(sim: RoomSim, now: number, speed: number): RoomSim {
  if (sim.view.phase !== "guess") return sim;
  return startClue(sim, other(sim.view.turn), now, speed);
}

export function flip(sim: RoomSim, cardId: string, now: number, speed: number): RoomSim {
  const v = sim.view;
  const card = v.cards.find((c) => c.id === cardId);
  if (v.phase !== "guess" || !card || card.revealed) return sim;
  const key = sim.keys[cardId];
  const history = v.history.map((t, i) => (i === v.history.length - 1 ? { ...t, flips: [...t.flips, key] } : t));
  const cards = v.cards.map((c) => (c.id === cardId ? { ...c, revealed: key, picks: [] } : c));
  let next = withView(sim, { cards, history });
  const turn = v.turn;
  if (key === "owngoal") return withView(next, { phase: "over", result: { winner: other(turn), reason: "owngoal" } });
  for (const team of [0, 1] as Team[]) {
    if (cardsLeft(next.view, team) === 0) return withView(next, { phase: "over", result: { winner: team, reason: "cleared" } });
  }
  if (key !== `t${turn}`) return startClue(next, other(turn), now, speed);
  const guessesLeft = (v.guessesLeft ?? 1) - 1;
  if (guessesLeft === 0) return startClue(next, other(turn), now, speed);
  next = withView(next, { guessesLeft });
  return { ...next, botAt: now + 1_600 / speed };
}

export function pick(sim: RoomSim, seat: number, cardId: string | null): RoomSim {
  return withView(sim, { cards: sim.view.cards.map((c) => ({ ...c, picks: c.id === cardId ? [...c.picks.filter((s) => s !== seat), seat] : c.picks.filter((s) => s !== seat) })) });
}

export function command(sim: RoomSim, cmd: CodenamesCommand, now: number, speed: number): RoomSim {
  const seat = sim.view.mySeat;
  switch (cmd.type) {
    case "join": return withView(sim, {
      players: sim.view.players.map((p) => {
        if (p.seat === seat) return { ...p, team: cmd.team, scout: cmd.scout };
        return cmd.scout && p.team === cmd.team ? { ...p, scout: false } : p;
      }),
    });
    case "shuffle": return shuffleTeams(sim);
    case "kickoff": return startClue(seatEveryone(sim), sim.view.starting, now, speed);
    case "clue": return giveClue(sim, { word: cmd.word, count: cmd.count }, now, speed);
    case "pick": return pick(sim, seat, cmd.cardId);
    case "flip": return flip(sim, cmd.cardId, now, speed);
    case "endTurn": return endTurn(sim, now, speed);
  }
}

const unrevealed = (sim: RoomSim, key?: CardKey) => sim.view.cards.filter((c) => !c.revealed && (!key || sim.keys[c.id] === key)).map((c) => c.id);

function ourBotClue(sim: RoomSim): { clue: Clue; next: number } {
  for (let i = sim.ourScript; i < FIXTURE_CLUES.length; i += 1) {
    const left = FIXTURE_CLUES[i].targets.filter((id) => !sim.view.cards.find((c) => c.id === id)!.revealed);
    if (left.length > 0 && !used(sim, FIXTURE_CLUES[i].word)) return { clue: { word: FIXTURE_CLUES[i].word, count: left.length }, next: i + 1 };
  }
  return { clue: singleClue(sim, "t0"), next: FIXTURE_CLUES.length };
}

const used = (sim: RoomSim, word: string) => sim.view.history.some((t) => sameClue(t.clue?.word ?? "", word));

/** A one-card clue nobody has said yet, so a replayed card never repeats a clue. */
function singleClue(sim: RoomSim, key: CardKey): Clue {
  const id = unrevealed(sim, key)[0];
  const word = [FIXTURE_SINGLE_CLUES[id], ...Object.values(FIXTURE_SINGLE_CLUES)].find((w) => w && !used(sim, w)) ?? `${id} ${sim.view.history.length}`;
  return { word, count: 1 };
}

/** Unrevealed cards that carry the clue name, on a dealt board. */
const matching = (sim: RoomSim, word: string) => unrevealed(sim).filter((id) => sim.deckClues?.[id]?.some((n) => sameClue(n, word)));

/** The bot Scout's pick on a dealt board: the name covering most of its cards, steering clear of the Own Goal and the rival's. */
function bestClue(sim: RoomSim, key: CardKey): Clue {
  const score = new Map<string, { mine: number; bad: number }>();
  for (const id of unrevealed(sim)) {
    for (const name of sim.deckClues?.[id] ?? []) {
      if (used(sim, name)) continue;
      const e = score.get(name) ?? { mine: 0, bad: 0 };
      const k = sim.keys[id];
      if (k === key) e.mine += 1;
      else e.bad += k === "owngoal" ? 100 : k === "neutral" ? 1 : 2;
      score.set(name, e);
    }
  }
  const best = [...score.entries()].filter(([, e]) => e.mine > 0).sort(([, a], [, b]) => b.mine * 2 - b.bad - (a.mine * 2 - a.bad) || b.mine - a.mine)[0];
  return best ? { word: best[0], count: best[1].mine } : { word: `Card ${sim.view.history.length + 1}`, count: 1 };
}

/** How bot guessers read a clue: the clue's cards, usually their own first. */
function guessPlan(sim: RoomSim, word: string, key: CardKey, count: number): [string[], RoomSim] {
  const [r, s] = rng(sim);
  const cards = matching(s, word).sort((a, b) => Number(s.keys[b] === key) - Number(s.keys[a] === key));
  if (r < 0.3 && cards.length > 1) [cards[0], cards[cards.length - 1]] = [cards[cards.length - 1], cards[0]];
  return [cards.slice(0, count), s];
}

/** Bots: the Scouts who are not the player, the rival guessers, and the player's teammates (they point at cards). */
export function tick(sim: RoomSim, now: number, speed: number): RoomSim {
  const v = sim.view;
  if (v.phase === "teams" || v.phase === "over") return sim;
  const meP = v.players[v.mySeat];
  const scoutIsMe = meP.scout && v.turn === meP.team;
  if (now < sim.botAt) return sim;

  if (v.phase === "clue" && sim.deckClues) {
    if (scoutIsMe) return sim;
    const key: CardKey = v.turn === 0 ? "t0" : "t1";
    const clue = bestClue(sim, key);
    const given = giveClue(sim, clue, now, speed);
    if (v.turn === 0) return given;
    const [plan, s] = guessPlan(given, clue.word, key, clue.count);
    return { ...s, rivalPlan: plan };
  }
  if (v.phase === "clue") {
    if (scoutIsMe) return sim;
    if (v.turn === 1) {
      const scripted = FIXTURE_RIVAL_TURNS[sim.rivalScript];
      const turn = scripted && !used(sim, scripted.word) ? scripted : undefined;
      const plan = turn ? turn.picks.filter((id) => !v.cards.find((c) => c.id === id)!.revealed) : unrevealed(sim, "t1").slice(0, 1);
      const clue = turn ? { word: turn.word, count: turn.count } : singleClue(sim, "t1");
      return { ...giveClue(sim, clue, now, speed), rivalScript: sim.rivalScript + 1, rivalPlan: plan };
    }
    const { clue, next } = ourBotClue(sim);
    return { ...giveClue(sim, clue, now, speed), ourScript: next };
  }

  if (v.turn === 1) {
    const [id, ...rest] = sim.rivalPlan;
    if (!id) return endTurn(sim, now, speed);
    return { ...flip({ ...sim, rivalPlan: rest }, id, now, speed) };
  }
  if (meP.scout && sim.deckClues) {
    const [plan, s] = guessPlan(sim, v.clue?.word ?? "", "t0", 1);
    if (plan[0]) return flip(s, plan[0], now, speed);
    // A clue the deck doesn't know: the bots take a best guess, usually right.
    const [r, s2] = rng(s);
    const pool = r < 0.7 ? unrevealed(s2, "t0") : unrevealed(s2);
    return pool.length ? flip(s2, pool[Math.floor(r * 997) % pool.length], now, speed) : endTurn(s2, now, speed);
  }
  if (meP.scout) {
    const [r, s] = rng(sim);
    const mine = unrevealed(s, "t0");
    const wrong = unrevealed(s).filter((id) => s.keys[id] !== "t0");
    const id = r < 0.78 || wrong.length === 0 ? mine[Math.floor(r * 97) % mine.length] : wrong[Math.floor(r * 89) % wrong.length];
    return flip(s, id, now, speed);
  }
  const mates = v.players.filter((p) => p.team === meP.team && !p.scout && p.seat !== v.mySeat);
  if (mates.some((p) => v.cards.some((c) => c.picks.includes(p.seat)))) return { ...sim, botAt: Number.POSITIVE_INFINITY };
  const targets = sim.deckClues ? matching(sim, v.clue?.word ?? "") : FIXTURE_CLUES.find((c) => c.word === v.clue?.word)?.targets.filter((id) => !v.cards.find((c) => c.id === id)!.revealed) ?? unrevealed(sim, "t0").slice(0, 1);
  let s = sim;
  mates.forEach((p, i) => {
    const trap = i === 1 ? unrevealed(s).find((id) => s.keys[id] !== "t0") : undefined;
    const id = trap ?? targets[i % Math.max(1, targets.length)];
    if (id) s = pick(s, p.seat, id);
  });
  return { ...s, botAt: Number.POSITIVE_INFINITY };
}

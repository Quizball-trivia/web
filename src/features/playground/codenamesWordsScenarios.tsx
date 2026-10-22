import { useState } from "react";
import { command, dealWords, dealWordsSolo, flip, giveClue, newRoomSim, tick, viewFor, type RoomSim } from "@/features/codenames/codenames.sim";
import { soloFlip, soloStop, type CodenamesRoomView, type CodenamesSoloState } from "@/features/codenames/codenames.view";
import { CodenamesEndView, CodenamesPlayView } from "@/features/codenames/CodenamesSolo";
import { CodenamesGame, CodenamesResult, CodenamesTeams } from "@/features/codenames/CodenamesRoom";
import { CodenamesBoard } from "@/features/codenames/CodenamesBoard";
import { codenamesCopy } from "@/features/codenames/codenames.copy";
import { Frame } from "@/features/wordgames/ui";
import { CodenamesHubSim, CodenamesRoomSim, seatPlayers, type CodenamesRoomConfig } from "./CodenamesSim";
import { wordDeck } from "./codenamesWords.data";
import { scenario, type Scenario, type ScenarioContext } from "./types";

const T0 = Date.parse("2031-05-01T12:00:00.000Z");
const SEED = 2026;

const room = (locale: string, n: number, scoutMe: boolean, arriving = false) =>
  newRoomSim(seatPlayers(n), scoutMe, T0, arriving, dealWords(SEED, wordDeck(locale)));
const start = (s: RoomSim) => command(s, { type: "kickoff" }, T0, 1);
/** Lets the bots act once, as if their delay had passed. */
const later = (s: RoomSim, ms = 10_000) => tick(s, s.botAt + ms, 1);
const idsOf = (s: RoomSim, key: string) => s.view.cards.filter((c) => !c.revealed && s.keys[c.id] === key).map((c) => c.id);

const screens: Record<string, { name: string; build: (locale: string, n: number) => RoomSim }> = {
  teams: { name: "Just arrived · pick a side", build: (l, n) => room(l, n, false, true) },
  "scout-clue": { name: "You're the Scout · give a clue (sees the key)", build: (l, n) => start(room(l, n, true)) },
  guess: { name: "Your turn to guess · teammate points at a word", build: (l, n) => later(later(start(room(l, n, false)))) },
  "mid-game": {
    name: "A few turns in", build: (l, n) => {
      let s = later(start(room(l, n, false)));
      const [a, b] = idsOf(s, "t0");
      s = flip(flip(s, a, T0, 1), b, T0, 1);
      s = command(s, { type: "endTurn" }, T0, 1);
      s = later(s);
      return later(later(later(later(s))));
    },
  },
  "teams-guest": {
    name: "Teams · not the host (sees the board, can't switch)", build: (l, n) => {
      const s = room(l, n, false, true);
      return { ...s, view: { ...s.view, host: 1 } };
    },
  },
  "result-win": {
    name: "Result · you found all 9", build: (l, n) => idsOf(start(room(l, n, false)), "t0")
      .reduce((s, id) => flip(s, id, T0, 1), giveClue(start(room(l, n, false)), { word: "Champions", count: 9 }, T0, 1)),
  },
  "result-owngoal": {
    name: "Result · your team hit the Own Goal", build: (l, n) => {
      const s = giveClue(start(room(l, n, false)), { word: "Champions", count: 2 }, T0, 1);
      return flip(s, idsOf(s, "owngoal")[0], T0, 1);
    },
  },
};

interface Frozen { screen: string; seats: number }
const frozen = (id: string, seats = 6) =>
  scenario<Frozen>({
    id: seats === 6 ? id : `${seats}p-${id}`, name: seats === 6 ? screens[id].name : `${seats}p · ${screens[id].name}`, data: { screen: id, seats },
    render: (d, ctx) => {
      const view: CodenamesRoomView = viewFor(screens[d.screen].build(ctx.locale, d.seats));
      const send = (cmd: unknown) => ctx.log("send", cmd);
      if (view.phase === "teams") return <FrozenTeams view={view} locale={ctx.locale} ctx={ctx} />;
      if (view.phase === "over") return <CodenamesResult view={view} locale={ctx.locale} onRoom={() => ctx.log("onRoom")} onExit={() => ctx.log("onExit")} />;
      return <CodenamesGame view={view} locale={ctx.locale} busy={false} onSend={send} onExit={() => ctx.log("onExit")} />;
    },
  });

const live = (id: string, name: string, config: CodenamesRoomConfig, note: string) =>
  scenario<CodenamesRoomConfig>({ id, name, note, data: { board: "words", seed: 0, ...config },
    render: (d, ctx) => <CodenamesRoomSim key={`${JSON.stringify(d)}-${ctx.locale}`} config={d} locale={ctx.locale} log={ctx.log} /> });

const LIVE_NOTE = "A new 25-word board every time from the playground's invented deck, the same in every language (set seed to replay one). Bots play the other seats.";

/** The locale's whole deck on real cards, with each word's clues: to read the list and check every word fits. */
const deckCheck = scenario<Record<string, never>>({
  id: "deck", name: "📖 The whole word deck", note: "Every word of the playground's invented deck on a real card, with the clues the bot links to it (the real decks are private and come from the server).", data: {},
  render: (_d, ctx) => {
    const deck = wordDeck(ctx.locale);
    return (
      <Frame lang={ctx.locale} wide>
        <p className="text-sm font-bold text-white/70">{deck.length} words</p>
        <CodenamesBoard className="mt-3" mode="end" kinds={codenamesCopy(ctx.locale).kinds}
          cards={deck.map((d) => ({ id: d.w, word: d.w, kind: null, revealed: null }))} />
        <ul className="mt-4 columns-1 gap-4 text-xs text-white/70 sm:columns-2">
          {deck.map((d) => <li key={d.w} className="mb-1 break-inside-avoid"><span className="font-black text-white">{d.w}</span> · {d.clues.join(", ")}</li>)}
        </ul>
      </Frame>
    );
  },
});

const boardStandIn = <div className="mt-6 rounded-2xl border border-dashed border-white/25 px-4 py-6 text-center text-xs text-white/60">Daily leaderboard: live data only</div>;

const hub = (id: string, name: string, initial: "pictures" | "words", note: string) =>
  scenario<Record<string, never>>({ id, name, note, data: {},
    render: (_d, ctx) => <CodenamesHubSim key={`${id}-${ctx.locale}`} locale={ctx.locale} log={ctx.log} leaderboard={boardStandIn} initial={initial} /> });

/** A fixed word daily, played by a script: one card on the first clue, all of the second, a miss on the third. */
const soloBoard = (locale: string) => dealWordsSolo(SEED, wordDeck(locale), "2026-10-22");
const playedOut = (s0: CodenamesSoloState) => {
  let s = s0;
  const open = (id: string) => !s.flips.some((f) => f.cardId === id);
  const neutral = () => s.cards.find((c) => c.kind === "neutral" && open(c.id))!.id;
  for (let i = 0; s.status === "playing" && i < 10; i++) {
    const at = s.clue;
    const meant = (s.clues[at].cards ?? []).map((m) => m.id).filter(open);
    const take = at === 0 ? meant.slice(0, 1) : at === 2 ? [] : meant;
    for (const id of take) if (s.status === "playing" && s.clue === at) s = soloFlip(s, id);
    if (s.status === "playing" && s.clue === at) s = take.length > 0 ? soloStop(s) : soloFlip(s, neutral());
  }
  return s;
};
const soloScreen = (id: string, name: string, screen: "play" | "end", build: (s: CodenamesSoloState) => CodenamesSoloState) =>
  scenario<Record<string, never>>({ id, name, data: {},
    render: (_d, ctx) => {
      const state = build(soloBoard(ctx.locale));
      return (
        <Frame lang={ctx.locale}>
          {screen === "play"
            ? <CodenamesPlayView locale={ctx.locale} number={3} state={state} pending={false} onFlip={(c) => ctx.log("onFlip", c)} onStop={() => ctx.log("onStop")} onResult={() => ctx.log("onResult")} onExit={() => ctx.log("onExit")} />
            : <CodenamesEndView locale={ctx.locale} number={3} state={state} guestOnPastBoard={false} leaderboard={boardStandIn} onArchive={() => ctx.log("onArchive")} onExit={() => ctx.log("onExit")} />}
        </Frame>
      );
    },
  });

export const CODENAMES_WORDS_SOLO: Scenario<never>[] = [
  hub("start", "▶ Start screen · pick Pictures or Words", "pictures", "The switch under the title picks the board for Play (solo) and for Play with friends. Try both, then play with friends: the host can still switch on the teams screen."),
  hub("start-words", "Start screen · Words picked", "words", "Same screen with Words picked: the tag and the how-to lines change with the board."),
  soloScreen("words-first-clue", "Words daily · first clue", "play", (s) => s),
  soloScreen("words-result", "Words daily · result (both meanings of each word)", "end", playedOut),
];

export const CODENAMES_WORDS_ROOM: Scenario<never>[] = [
  deckCheck,
  live("live-4", "▶ Play 4 players (you guess)", { seats: 4, scoutMe: false, speed: 1 }, `${LIVE_NOTE} The bot Scout picks the clue that links most of its words.`),
  live("live-4-scout", "▶ Play 4 players (you're the Scout)", { seats: 4, scoutMe: true, speed: 1 }, `${LIVE_NOTE} You type the clues: any word, but not one on the board.`),
  live("live-8", "▶ Play 8 players", { seats: 8, scoutMe: false, speed: 1.5 }, LIVE_NOTE),
  live("live-pictures", "▶ Friend room · opens on Pictures (host can switch)", { seats: 4, scoutMe: false, speed: 1, board: "pictures" }, "Opens on the picture board. Switch to Words on the teams screen: a new 25-word deal, everyone keeps their side."),
  ...Object.keys(screens).map((id) => frozen(id)),
  frozen("guess", 4),
  frozen("guess", 8),
];

/** The frozen teams screen keeps the picked board, so the switch (and its arrow keys) behaves as in a room. */
function FrozenTeams({ view, locale, ctx }: { view: CodenamesRoomView; locale: string; ctx: ScenarioContext }) {
  const [board, setBoard] = useState(view.board);
  return (
    <CodenamesTeams view={{ ...view, board }} locale={locale} onSend={(cmd) => ctx.log("send", cmd)} onExit={() => ctx.log("onExit")}
      onBoard={(next) => { setBoard(next); ctx.log("board", next); }} />
  );
}

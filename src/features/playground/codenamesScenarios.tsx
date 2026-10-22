import { command, flip, giveClue, newRoomSim, pick, viewFor, type RoomSim } from "@/features/codenames/codenames.sim";
import { soloFlip, soloStop, type CodenamesRoomView, type CodenamesSoloState } from "@/features/codenames/codenames.view";
import { CodenamesGame, CodenamesResult, CodenamesTeams } from "@/features/codenames/CodenamesRoom";
import { CodenamesEndView, CodenamesPlayView } from "@/features/codenames/CodenamesSolo";
import { codenamesDailyGame } from "@/features/codenames/codenames.daily";
import { DailyIntro } from "@/features/wordgames/daily/WordDailyShell";
import { Frame } from "@/features/wordgames/ui";
import { CodenamesOwnGoalDemo, CodenamesRoomSim, CodenamesSoloSim, seatPlayers, soloFixture, type CodenamesRoomConfig } from "./CodenamesSim";
import { scenario, type Scenario, type ScenarioContext } from "./types";

const friendsStandIn = (ctx: ScenarioContext) => (
  <button type="button" onClick={() => ctx.log("openFriendRoom", "codenames")} className="mt-3 h-12 w-full rounded-full bg-brand-blue text-sm font-black uppercase tracking-wide text-white">
    Play with friends (4–8)
  </button>
);
const boardStandIn = <div className="mt-6 rounded-2xl border border-dashed border-white/25 px-4 py-6 text-center text-xs text-white/60">Daily leaderboard: live data only</div>;

const after = (...steps: ((s: CodenamesSoloState) => CodenamesSoloState)[]) => steps.reduce((s, f) => f(s), soloFixture());
const flipS = (id: string) => (s: CodenamesSoloState) => soloFlip(s, id);

interface SoloData { screen: "intro" | "play" | "end"; state: CodenamesSoloState }
const solo = (id: string, name: string, screen: SoloData["screen"], state: CodenamesSoloState) =>
  scenario<SoloData>({
    id, name, data: { screen, state },
    render: (d, ctx) => (
      <Frame lang={ctx.locale}>
        {d.screen === "intro" ? (
          <DailyIntro game={codenamesDailyGame(ctx.locale)} locale={ctx.locale} number={3} status="new" busy={false} notice={null} guestOnPastBoard={false} guestLockedOut={false}
            friends={friendsStandIn(ctx)} onStart={() => ctx.log("onStart")} onArchive={() => ctx.log("onArchive")} onExit={() => ctx.log("onExit")} />
        ) : d.screen === "play" ? (
          <CodenamesPlayView locale={ctx.locale} number={3} state={d.state} pending={false} onFlip={(c) => ctx.log("onFlip", c)} onStop={() => ctx.log("onStop")}
            onResult={() => ctx.log("onResult")} onExit={() => ctx.log("onExit")} />
        ) : (
          <CodenamesEndView locale={ctx.locale} number={3} state={d.state} guestOnPastBoard={false} friends={friendsStandIn(ctx)} leaderboard={boardStandIn}
            onArchive={() => ctx.log("onArchive")} onExit={() => ctx.log("onExit")} />
        )}
      </Frame>
    ),
  });

const perfect = after(flipS("ferguson-hairdryer"), flipS("cantona-seagull"), flipS("oldtrafford-theatre"), flipS("messi-goat"), flipS("bombonera-chocolates"), flipS("zidane-ram"), flipS("bernabeu-toaster"), flipS("mourinho-bus"));
const ownGoal = after(flipS("ferguson-hairdryer"), flipS("cantona-seagull"), flipS("oldtrafford-theatre"), flipS("maradona-hand"));
const mixed = after(flipS("ferguson-hairdryer"), flipS("ronaldo-bottle"), flipS("cantona-seagull"), flipS("oldtrafford-theatre"), flipS("sansiro-corkscrew"), flipS("messi-goat"), soloStop, flipS("bombonera-chocolates"), flipS("bale-golf"), flipS("zidane-ram"), flipS("cuckoo-71"), flipS("mourinho-bus"), soloStop);

export const CODENAMES_SOLO: Scenario<never>[] = [
  scenario<Record<string, never>>({ id: "fx-owngoal", name: "💥 Own Goal animation + sound", note: "Sets off the Own Goal a second after opening; turn sound on. Replay with the button.", data: {},
    render: (_d, ctx) => <CodenamesOwnGoalDemo key={ctx.locale} locale={ctx.locale} log={ctx.log} /> }),
  scenario<Record<string, never>>({ id: "live", name: "▶ Play the daily (prototype board)", note: "Live: 4 clues (names and football words), tap a card to pick it, tap again to flip", data: {},
    render: (_d, ctx) => <CodenamesSoloSim key={ctx.locale} locale={ctx.locale} log={ctx.log} friends={friendsStandIn(ctx)} leaderboard={boardStandIn} /> }),
  solo("intro", "Intro", "intro", soloFixture()),
  solo("first-clue", "First clue", "play", soloFixture()),
  solo("right", "Right card · clue goes on", "play", after(flipS("ferguson-hairdryer"))),
  solo("rival", "Rival card · next clue (shows why)", "play", after(flipS("ferguson-hairdryer"), flipS("ronaldo-bottle"))),
  solo("neutral", "Neutral card · next clue", "play", after(flipS("ferguson-hairdryer"), flipS("panenka-spoon"))),
  solo("over-owngoal", "Own Goal · game over", "play", ownGoal),
  solo("over-complete", "All 8 found", "play", perfect),
  solo("result", "Result page · 7/8 with misses", "end", mixed),
  solo("result-owngoal", "Result page · Own Goal", "end", ownGoal),
];

const T0 = Date.parse("2031-05-01T12:00:00.000Z");
const room = (n: number, scoutMe: boolean) => newRoomSim(seatPlayers(n), scoutMe, T0);
const start = (s: RoomSim) => command(s, { type: "kickoff" }, T0, 1);
/** A few turns in: we found 2 (one guess left unused), the rival found 1 and hit a neutral. */
const midGame = (s: RoomSim) => {
  let x = giveClue(start(s), { word: "Hairdryer", count: 1 }, T0, 1);
  x = flip(x, "ferguson-hairdryer", T0, 1);
  x = flip(x, "cantona-seagull", T0, 1);
  x = giveClue(x, { word: "Portugal", count: 1 }, T0, 1);
  x = flip(x, "ronaldo-bottle", T0, 1);
  x = flip(x, "sansiro-corkscrew", T0, 1);
  return x;
};

interface RoomData { view: CodenamesRoomView }
const roomScreen = (id: string, name: string, sim: RoomSim) =>
  scenario<RoomData>({
    id, name, data: { view: viewFor(sim) },
    render: (d, ctx) => {
      const send = (cmd: unknown) => ctx.log("send", cmd);
      if (d.view.phase === "teams") return <CodenamesTeams view={d.view} locale={ctx.locale} onSend={send} onExit={() => ctx.log("onExit")} />;
      if (d.view.phase === "over") return <CodenamesResult view={d.view} locale={ctx.locale} onRoom={() => ctx.log("onRoom")} onExit={() => ctx.log("onExit")} />;
      return <CodenamesGame view={d.view} locale={ctx.locale} busy={false} onSend={send} onExit={() => ctx.log("onExit")} />;
    },
  });

const live = (id: string, name: string, config: CodenamesRoomConfig, note: string) =>
  scenario<CodenamesRoomConfig>({ id, name, note, data: config, render: (d, ctx) => <CodenamesRoomSim key={`${JSON.stringify(d)}-${ctx.locale}`} config={d} locale={ctx.locale} log={ctx.log} /> });

function roomScreens(n: number): Scenario<never>[] {
  const frozen = giveClue(midGame(room(n, false)), { word: "Costa Real", count: 2 }, T0, 1);
  const guessing = n > 4 ? pick(frozen, 4, "zidane-ram") : frozen;
  const ourTurnOver = command(giveClue(start(room(n, false)), { word: "Hairdryer", count: 1 }, T0, 1), { type: "endTurn" }, T0, 1);
  const won = ["messi-goat", "oldtrafford-theatre", "bombonera-chocolates", "zidane-ram", "bernabeu-toaster", "mourinho-bus"].reduce((s, id) => flip(s, id, T0, 1), giveClue(midGame(room(n, false)), { word: "Champions League", count: 6 }, T0, 1));
  const lost = flip(giveClue(midGame(room(n, false)), { word: "Valdoria", count: 1 }, T0, 1), "maradona-hand", T0, 1);
  return [
    roomScreen("teams", "Just arrived · pick a side", newRoomSim(seatPlayers(n), false, T0, true)),
    roomScreen("teams-joined", "Joined Home as guesser", command(newRoomSim(seatPlayers(n), false, T0, true), { type: "join", team: 0, scout: false }, T0, 1)),
    roomScreen("scout-clue", "You're the Scout · give a clue (sees the key)", midGame(room(n, true))),
    roomScreen("wait-scout", "Your Scout is thinking", midGame(room(n, false))),
    roomScreen("guess", "Your turn to guess · teammate points at a card", guessing),
    roomScreen("scout-watch", "Scout watches the team guess", pick(giveClue(midGame(room(n, true)), { word: "Costa Real", count: 2 }, T0, 1), 2, "zidane-ram")),
    roomScreen("rival-clue", "Rival Scout is thinking", ourTurnOver),
    roomScreen("rival-guess", "Rival team guessing", giveClue(ourTurnOver, { word: "Borussia Dortmund", count: 3 }, T0, 1)),
    roomScreen("result-win", "Result · you cleared your cards", won),
    roomScreen("result-owngoal", "Result · your team hit the Own Goal", lost),
  ];
}

export const CODENAMES_ROOM: Scenario<never>[] = [
  live("live-4", "▶ Play 4 players (you guess)", { seats: 4, scoutMe: false, speed: 1 }, "Live: bot Scout gives the prototype clues, teammates point at cards, rival plays a script"),
  live("live-4-scout", "▶ Play 4 players (you're the Scout)", { seats: 4, scoutMe: true, speed: 1 }, "Live: you type the clues; bot teammates guess (right ~78%)"),
  live("live-8", "▶ Play 8 players", { seats: 8, scoutMe: false, speed: 1.5 }, "Live: 4 v 4"),
  ...roomScreens(6),
  ...roomScreens(4).filter((s) => ["teams", "teams-joined", "guess"].includes(s.id)).map((s) => ({ ...s, id: `4-${s.id}`, name: `4p · ${s.name}` })),
  ...roomScreens(8).map((s) => ({ ...s, id: `8-${s.id}`, name: `8p · ${s.name}` })),
];

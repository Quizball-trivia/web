import { DuelMatchView } from "@/features/duel/DuelMatchView";
import { duelCopy } from "@/features/duel/duel.copy";
import type { BuscaminasDuelView, PistasDuelView, Seat, UltimoDuelView } from "@/features/duel/duel.views";
import type { DuelGameId, DuelStatePayload } from "@/lib/realtime/socket.types";
import { buscaminasBase, pistasBase, ultimoBase } from "./fixtures/duel";
import { FRIEND_BUTTON_CLASS, PlayWithFriendContent } from "@/features/duel/PlayWithFriendButton";
import { UltimoArchiveView, UltimoEndView, UltimoFrame, UltimoIntroView, UltimoPlayView, type Feedback, type UltimoSlots } from "@/features/ultimo/ultimo.views";
import { puzzleNumber } from "@/features/ultimo/ultimo.logic";
import type { UltimoRunState } from "@/lib/repositories/ultimo.repo";
import type { AvatarCustomization } from "@/types/game";
import { randomBotAvatar } from "@/features/auction/data/botAvatars";
import { cn } from "@/lib/utils";
import { DEADLINE, finished, playing, settled } from "./fixtures/ultimo-solo";
import { NAMES, PLAYERS } from "./fixtures/universe";
import { scenario, type GameEntry, type Scenario, type ScenarioContext } from "./types";

/** A full duel screen: the snapshot (status, view, seats, result) plus the screen's own flags. */
interface DuelData { snapshot: DuelStatePayload; secondsLeft: number | null; connected: boolean; busy: boolean; error: string | null; confirmLeave: boolean }

function snap(game: DuelGameId, status: DuelStatePayload["status"], view: unknown, extra: Partial<DuelStatePayload> & { away?: Seat } = {}): DuelStatePayload {
  const { away, ...rest } = extra;
  return {
    matchId: "playground", lobbyId: null, game, stateVersion: 1, status, phaseToken: 1, phaseDeadlineAt: "2031-05-01T12:00:20.000Z",
    serverNow: "2031-05-01T12:00:08.000Z", mySeat: 0, view, pausedFrom: status === "paused" ? "active" : null, result: null,
    seats: [
      { seat: 0, userId: "pg-me", username: NAMES[0], avatarUrl: null, avatarCustomization: null, isGuest: true, ready: true, connected: away !== 0, absenceBudgetMs: 60_000 },
      { seat: 1, userId: "pg-rival", username: NAMES[1], avatarUrl: null, avatarCustomization: null, isGuest: true, ready: status !== "ready", connected: away !== 1, absenceBudgetMs: 60_000 },
    ],
    ...rest,
  };
}

const duelScreen = (id: string, name: string, snapshot: DuelStatePayload, extra: Partial<Omit<DuelData, "snapshot">> = {}) =>
  scenario<DuelData>({
    id, name,
    data: { snapshot, secondsLeft: 12, connected: true, busy: false, error: null, confirmLeave: false, ...extra },
    render: (d, ctx) => (
      <DuelMatchView snapshot={d.snapshot} locale={ctx.locale} copy={duelCopy(ctx.locale)} secondsLeft={d.secondsLeft} connected={d.connected} busy={d.busy}
        error={d.error} confirmLeave={d.confirmLeave} onSend={(command) => ctx.log("onSend", command)} onExit={() => ctx.log("onExit")}
        onConfirmForfeit={() => ctx.log("onConfirmForfeit")} onCancelForfeit={() => ctx.log("onCancelForfeit")} onRoom={() => ctx.log("onRoom")} onLeave={() => ctx.log("onLeave")} />
    ),
  });

/** The screens every duel game shares (intro, pause, connection, forfeit, every result), for one game's board. */
/** `live` = a board mid-play (for pause, offline, forfeit, error); `over` = the finished board behind every result. */
function commonDuel(game: DuelGameId, live: unknown, over: unknown, finalScores: [number, number]): Scenario<never>[] {
  const done = (id: string, name: string, result: DuelStatePayload["result"]) =>
    duelScreen(id, name, snap(game, result?.reason === "cancelled" ? "cancelled" : "completed", over, { result }), { secondsLeft: null });
  return [
    duelScreen("intro-ready", "VS intro · waiting for the rival", snap(game, "ready", null), { secondsLeft: null }),
    duelScreen("intro-countdown", "VS intro · 3-2-1", snap(game, "countdown", null), { secondsLeft: 3 }),
    duelScreen("pause-rival", "Paused · rival disconnected", snap(game, "paused", live, { away: 1 }), { secondsLeft: 24 }),
    duelScreen("pause-me", "Paused · you disconnected", snap(game, "paused", live, { away: 0 }), { secondsLeft: 24 }),
    duelScreen("offline", "Your connection dropped", snap(game, "active", live), { connected: false }),
    duelScreen("forfeit-confirm", "Leave? (forfeit confirmation)", snap(game, "active", live), { confirmLeave: true }),
    duelScreen("error", "Error toast", snap(game, "active", live), { error: "duel_unavailable" }),
    done("result-win", "Result · you won", { scores: finalScores, winnerSeat: 0, reason: "score", leftSeat: null }),
    done("result-lose", "Result · you lost", { scores: [finalScores[1], finalScores[0]], winnerSeat: 1, reason: "score", leftSeat: null }),
    done("result-draw", "Result · draw", { scores: [finalScores[0], finalScores[0]], winnerSeat: null, reason: "score", leftSeat: null }),
    done("result-rival-left", "Result · rival forfeited", { scores: [0, 0], winnerSeat: 0, reason: "forfeit", leftSeat: 1 }),
    done("result-you-left", "Result · you forfeited", { scores: [0, 0], winnerSeat: 1, reason: "forfeit", leftSeat: 0 }),
    done("result-disconnect", "Result · rival disconnected", { scores: [1, 0], winnerSeat: 0, reason: "disconnect", leftSeat: 1 }),
    done("result-idle", "Result · rival stopped playing", { scores: [2, 1], winnerSeat: 0, reason: "idle", leftSeat: 1 }),
    done("result-cancelled", "Result · cancelled", { scores: [0, 0], winnerSeat: null, reason: "cancelled", leftSeat: null }),
  ];
}

const ultimoView = (v: Partial<UltimoDuelView>): UltimoDuelView => ({ ...ultimoBase, ...v });
const ultimoPlay = (id: string, name: string, v: Partial<UltimoDuelView>, extra: Partial<Omit<DuelData, "snapshot">> = {}) =>
  duelScreen(id, name, snap("ultimo", "active", ultimoView(v)), extra);
const buscaminasPlay = (id: string, name: string, v: Partial<BuscaminasDuelView>) =>
  duelScreen(id, name, snap("buscaminas", "active", { ...buscaminasBase, ...v }));
const pistasPlay = (id: string, name: string, v: Partial<PistasDuelView>) =>
  duelScreen(id, name, snap("pistas", "active", { ...pistasBase, ...v }));

/** Stand-ins for the connected widgets a view shows (the real ones sign in, navigate or fetch). */
const slotsFor = (ctx: ScenarioContext): UltimoSlots => ({
  friend: (
    <button type="button" onClick={() => ctx.log("openFriendRoom", "ultimo")} className={cn(FRIEND_BUTTON_CLASS, "mt-3")} style={{ fontFamily: "'Poppins', sans-serif" }}>
      <PlayWithFriendContent game="ultimo" locale={ctx.locale} />
    </button>
  ),
  signIn: (className, label) => <button type="button" className={className} onClick={() => ctx.log("signIn")}>{label}</button>,
  leaderboard: (
    <div className="mt-6 rounded-2xl border border-dashed border-white/25 px-4 py-6 text-center text-xs text-white/60">
      Daily leaderboard: live data only (UltimoLeaderboard)
    </div>
  ),
});
const PLAYER_AVATAR: AvatarCustomization = randomBotAvatar("playground-player");

interface UltimoSoloData { state: UltimoRunState | null; secondsLeft: number; pending: string | null; notice: string | null; feedback: Feedback | null; guestOnPastBoard: boolean; guestLockedOut: boolean }
const solo = (id: string, name: string, screen: "intro" | "play" | "end" | "archive", data: Partial<UltimoSoloData>, note?: string) =>
  scenario<UltimoSoloData>({
    id, name, note,
    data: { state: null, secondsLeft: 12, pending: null, notice: null, feedback: null, guestOnPastBoard: false, guestLockedOut: false, ...data },
    render: (d, ctx) => {
      const day = d.state?.day ?? "2026-10-03";
      const view = screen === "intro" ? (
        <UltimoIntroView locale={ctx.locale} number={puzzleNumber(day)} state={d.state} busy={d.pending !== null} notice={d.notice}
          guestOnPastBoard={d.guestOnPastBoard} guestLockedOut={d.guestLockedOut} slots={slotsFor(ctx)}
          onStart={() => ctx.log("onStart")} onArchive={() => ctx.log("onArchive")} onExit={() => ctx.log("onExit")} />
      ) : screen === "play" && d.state ? (
        <UltimoPlayView locale={ctx.locale} state={d.state} avatar={PLAYER_AVATAR} pending={d.pending} notice={d.notice} feedback={d.feedback}
          // The clock stands still: the playground shows exactly `secondsLeft` on the deadline.
          now={Date.parse(d.state.deadline ?? DEADLINE) - d.secondsLeft * 1000}
          onBegin={() => ctx.log("onBegin")} onSay={(text) => { ctx.log("onSay", text); return true; }} onNext={() => ctx.log("onNext")}
          onResult={() => ctx.log("onResult")} onExit={() => ctx.log("onExit")} />
      ) : screen === "end" && d.state ? (
        <UltimoEndView locale={ctx.locale} day={day} state={d.state} guestOnPastBoard={d.guestOnPastBoard} slots={slotsFor(ctx)}
          onShare={async () => { ctx.log("onShare"); return true; }} onCopy={async () => { ctx.log("onCopy"); return true; }}
          onArchive={() => ctx.log("onArchive")} onExit={() => ctx.log("onExit")} />
      ) : (
        <UltimoArchiveView locale={ctx.locale} days={["2026-10-05", "2026-10-04", "2026-10-03", "2026-10-02", "2026-10-01"]} today="2026-10-05" current={day}
          onBack={() => ctx.log("onBack")} onOpen={(target) => ctx.log("onOpen", target)} />
      );
      return <UltimoFrame>{view}</UltimoFrame>;
    },
  });

const fb = (kind: Feedback["kind"], text: string, misses = 0): Feedback => ({ id: 1, kind, text, misses });

const ULTIMO_SOLO = [
  solo("intro-new", "Intro · first visit", "intro", {}),
  solo("intro-continue", "Intro · continue category 3", "intro", { state: playing(2, 4) }),
  solo("intro-finished", "Intro · already finished", "intro", { state: finished(42) }),
  solo("intro-guest-locked", "Intro · guest, today locked", "intro", { guestOnPastBoard: true, guestLockedOut: true }),
  solo("intro-busy", "Intro · loading", "intro", { pending: "start" }),
  solo("play-begin", "Category ready to start", "play", { state: playing(1, 0, { open: false, deadline: null, title: null, total: null }) }),
  solo("play-reveal", "Title reveal (3-2-1)", "play", { state: playing(1, 0), secondsLeft: 19 }),
  solo("play-first", "Clock running · first answer", "play", { state: playing(1, 0), secondsLeft: 14 }),
  solo("play-hit", "Correct answer", "play", { state: playing(1, 3), feedback: fb("ok", "Nico Arrizábal"), secondsLeft: 15 }),
  solo("play-wrong", "Wrong name (a miss)", "play", { state: playing(1, 3, { misses: 1 }), feedback: fb("wrong", "Nadie Inventado", 1) }),
  solo("play-repeat", "Repeated name (a miss)", "play", { state: playing(1, 3, { misses: 2 }), feedback: fb("repeat", "Tomás Varelo", 2) }),
  solo("play-ambiguous", "Ambiguous surname (no miss)", "play", { state: playing(1, 3), feedback: fb("ambiguous", "Varelo") }),
  solo("play-urgent", "3 seconds left, 2 misses", "play", { state: playing(1, 6, { misses: 2, turnMs: 8_000 }), secondsLeft: 3 }),
  solo("play-busy", "Answer in flight", "play", { state: playing(1, 3), pending: "answer" }),
  solo("play-offline", "Connection lost", "play", { state: playing(1, 3), notice: "Conexión inestable: recuperando tu partida…" }),
  solo("sheet-time", "Category end · clock ran out (today)", "play", { state: settled(1, 5, "time", false) }),
  solo("sheet-misses-closed", "Category end · 3 misses, closed day (names shown)", "play", { state: settled(1, 4, "misses", true) }),
  solo("sheet-complete", "Category end · whole list (+5)", "play", { state: settled(1, 11, "complete", true) }),
  solo("sheet-last", "Last category end → result", "play", { state: settled(4, 2, "time", false) }),
  solo("end-ranked", "Result · ranked with a rank", "end", { state: finished(42, { rank: 3 }) }),
  solo("end-low", "Result · low score", "end", { state: finished(6, { results: finished(6).results.map((r) => ({ ...r, named: 1, complete: false, points: 1 })) }) }),
  solo("end-guest-past", "Result · guest on a past day", "end", { state: finished(31, { ranked: false }), guestOnPastBoard: true }),
  solo("archive", "Archive of past days", "archive", { state: playing(0, 0) }),
];

export const GAMES: GameEntry[] = [
  {
    id: "ultimo",
    name: "Último en pie",
    scenarios: {
      solo: ULTIMO_SOLO,
      duel: [
        ultimoPlay("reveal", "Category reveal (you start)", { phase: "reveal", said: [], last: null, k: 0, category: 0, results: [], scores: [0, 0] }, { secondsLeft: 3 }),
        ultimoPlay("my-turn", "Your turn · fresh clock", {}),
        ultimoPlay("my-turn-urgent", "Your turn · 2 misses, 4 s left", { misses: 2, last: { seat: 0, kind: "wrong", text: "Nadie Inventado", name: null } }, { secondsLeft: 4 }),
        ultimoPlay("their-turn", "Rival's turn", { turn: 1, last: { seat: 0, kind: "ok", text: PLAYERS[2], name: PLAYERS[2] } }),
        ultimoPlay("repeat", "You repeated a name", { misses: 1, last: { seat: 0, kind: "repeat", text: PLAYERS[0], name: null } }),
        ultimoPlay("ambiguous", "Ambiguous surname (no miss)", { last: { seat: 0, kind: "ambiguous", text: "Varelo", name: null } }),
        ultimoPlay("busy", "Answer sent, waiting for the server", {}, { busy: true }),
        ultimoPlay("cat-end-won", "Category end · you stand", { phase: "catEnd", misses: 3, turn: 1, missing: PLAYERS.slice(4, 11) as unknown as string[], results: [{ winner: 0, reason: "misses", said: 6, named: [4, 2] }, { winner: 0, reason: "misses", said: 4, named: [3, 1] }], scores: [2, 0] }, { secondsLeft: 6 }),
        ultimoPlay("cat-end-time", "Category end · rival ran out of time", { phase: "catEnd", turn: 1, missing: PLAYERS.slice(4, 11) as unknown as string[], results: [{ winner: 0, reason: "misses", said: 6, named: [4, 2] }, { winner: 0, reason: "time", said: 4, named: [2, 2] }] }),
        ultimoPlay("cat-end-complete", "Category end · whole list named (both score)", { phase: "catEnd", said: PLAYERS.slice(0, 11).map((name, i) => ({ seat: (i % 2) as Seat, name })), missing: [], results: [{ winner: 0, reason: "misses", said: 6, named: [4, 2] }, { winner: null, reason: "complete", said: 11, named: [6, 5] }], scores: [2, 1] }),
        ...commonDuel("ultimo", ultimoView({}), ultimoView({ phase: "over", missing: PLAYERS.slice(4, 11) as unknown as string[], scores: [3, 1] }), [3, 1]),
      ],
    },
  },
  {
    id: "buscaminas",
    name: "Buscaminas futbolero",
    scenarios: {
      duel: [
        buscaminasPlay("my-turn", "Your pick", {}),
        buscaminasPlay("their-turn", "Rival's pick", { turn: 1 }),
        buscaminasPlay("mine", "Someone hit a mine", { phase: "reveal", cards: buscaminasBase.cards.map((c, i) => (i === 9 ? { ...c, pick: { seat: 1, auto: false }, fits: false } : c)), results: [...buscaminasBase.results, { outcome: "mine", by: 1, points: [2, 0] }] }),
        ...commonDuel("buscaminas", buscaminasBase, { ...buscaminasBase, phase: "over", scores: [9, 4] }, [9, 4]),
      ],
    },
  },
  {
    id: "pistas",
    name: "Pistas futboleras",
    scenarios: {
      duel: [
        pistasPlay("first-clue", "First clue", { clue: 1, clues: pistasBase.clues.slice(0, 1), pointsInPlay: 10 }),
        pistasPlay("clues", "Four clues in", {}),
        pistasPlay("rival-locked", "Rival locked an answer", { seats: [{ locked: false, passed: false, wrong: null }, { locked: true, passed: false, wrong: null }] }),
        pistasPlay("i-passed", "You passed", { seats: [{ locked: false, passed: true, wrong: null }, { locked: false, passed: false, wrong: null }] }),
        pistasPlay("wrong", "Your wrong guess", { seats: [{ locked: false, passed: false, wrong: "Dante Ferrolo" }, { locked: false, passed: false, wrong: null }] }),
        pistasPlay("settled", "Round won", { phase: "reveal", settled: { winner: 0, clue: 4, points: 7, answer: PLAYERS[6] } }),
        ...commonDuel("pistas", pistasBase, { ...pistasBase, phase: "over", scores: [31, 24] }, [31, 24]),
      ],
    },
  },
];

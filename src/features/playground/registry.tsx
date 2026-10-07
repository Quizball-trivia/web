import type { Locale } from "@/lib/i18n/locale";
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
import { AproximadoBoard, AproximadoFrame, AproximadoIntro, AproximadoNotice, AproximadoPodium } from "@/features/aproximado/AproximadoRoom";
import { AproximadoPartyResults } from "@/features/aproximado/AproximadoParty";
import type { AproximadoRoomView } from "@/features/aproximado/aproximado.views";
import { StatSniperGame } from "@/features/daily/StatSniperGame";
import { FixedLocaleProvider } from "@/contexts/LocaleContext";
import { buildDemoDailySession } from "@/features/demos/data/demoDailySessions";
import type { StatSniperSession } from "@/lib/domain/dailyChallenge";
import { AproximadoSim, type SimConfig } from "./AproximadoSim";
import { roomView } from "./fixtures/aproximado";
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


/** A Stat Sniper room screen from a full view; the clock stands still at `secondsLeft`. */
interface RoomData {
  view: AproximadoRoomView; secondsLeft: number | null; busy: boolean;
  connected?: boolean; error?: string | null; leaveConfirm?: boolean; notice?: "cancelled" | "left" | "excluded" | null;
  /** "party" (default): Party Quiz standings sidebar / phone bar and results screen. "classic": the seat strip + podium. */
  layout?: "party" | "classic";
}
const room = (id: string, name: string, make: (locale: string) => AproximadoRoomView, extra: Partial<Omit<RoomData, "view">> = {}, note?: string) =>
  scenario<RoomData>({
    id, name, note: note ?? "Fixture prompts are Spanish; edit the view JSON (seats, guesses, statuses, scores) and Apply",
    data: { view: make("es"), secondsLeft: 12, busy: false, layout: "party", ...extra },
    render: (data, ctx) => {
      const v = data.view;
      const party = data.layout !== "classic";
      if (party && v.phase === "over" && !data.notice) return <FixedLocaleProvider locale={ctx.locale as Locale}><AproximadoPartyResults view={v} locale={ctx.locale} onRoom={() => ctx.log("onRoom")} onExit={() => ctx.log("onExit")} /></FixedLocaleProvider>;
      return (
        <FixedLocaleProvider locale={ctx.locale as Locale}>
        <AproximadoFrame wide={party && !data.notice && v.phase !== "intro"}>
          {data.notice ? <AproximadoNotice kind={data.notice} locale={ctx.locale} onRoom={() => ctx.log("onRoom")} />
            : v.phase === "intro" ? <AproximadoIntro seats={v.seats} mySeat={v.mySeat} scoring={v.scoring} locale={ctx.locale} secondsLeft={data.secondsLeft} />
              : v.phase === "over" ? <AproximadoPodium view={v} locale={ctx.locale} onRoom={() => ctx.log("onRoom")} onExit={() => ctx.log("onExit")} />
                : <AproximadoBoard view={v} locale={ctx.locale} secondsLeft={data.secondsLeft} busy={data.busy} onGuess={(value) => ctx.log("onGuess", value)}
                    connected={data.connected ?? true} error={data.error ?? null} onLeave={() => ctx.log("onLeave")} leaveConfirmOpen={data.leaveConfirm ?? false} layout={party ? "party" : "classic"} />}
        </AproximadoFrame>
        </FixedLocaleProvider>
      );
    },
  });
const live = (id: string, name: string, config: SimConfig, note: string) =>
  scenario<SimConfig>({ id, name, note, data: config, render: (d, ctx) => <FixedLocaleProvider locale={ctx.locale as Locale}><AproximadoSim key={JSON.stringify(d)} config={d} locale={ctx.locale} log={ctx.log} /></FixedLocaleProvider> });

function roomScreens(n: number): Scenario<never>[] {
  const v = (o: Omit<Parameters<typeof roomView>[0], "n" | "locale">) => (locale: string) => roomView({ n, locale, ...o });
  return [
    room("intro", "Intro · players + rules", v({ phase: "intro" }), { secondsLeft: 3 }),
    room("guess-fresh", "Question · nobody answered", v({ phase: "guess" })),
    room("guess-some", "Question · some answered", v({ phase: "guess", answered: n === 2 ? [1] : [1, 3] })),
    room("guess-mine", "Question · you answered, waiting", v({ phase: "guess", answered: [0, 2], myGuess: 58.5 })),
    room("guess-urgent", "Question · 4 s left", v({ phase: "guess", answered: [0], myGuess: 70 }), { secondsLeft: 4 }),
    room("guess-busy", "Question · guess in flight", v({ phase: "guess" }), { busy: true }),
    room("reveal-spread", "Reveal · spread out", v({ phase: "reveal", pattern: "spread" }), { secondsLeft: null }),
    room("reveal-tie", "Reveal · tie at the top", v({ phase: "reveal", pattern: "tie" }), { secondsLeft: null }),
    room("reveal-exact", "Reveal · you hit it exactly", v({ phase: "reveal", pattern: "exact" }), { secondsLeft: null }),
    room("reveal-missing", "Reveal · some did not answer", v({ phase: "reveal", pattern: "missing" }), { secondsLeft: null }),
    ...(n > 2 ? [
      room("seats-away", "Question · one disconnected, one left, one idle", v({ phase: "guess", answered: [1], statuses: { 2: "away", 3: "withdrawn" }, idle: n > 4 ? [4] : [] })),
    ] : [room("seats-away", "Question · rival disconnected", v({ phase: "guess", statuses: { 1: "away" } }))]),
    room("over", "Final result", v({ phase: "over" })),
    room("over-tie", "Final result · tied for first", v({ phase: "over", pastPattern: "tie" })),
    room("reveal-same", "Reveal · everyone typed the same number", v({ phase: "reveal", pattern: "same" }), { secondsLeft: null }),
    room("reveal-none", "Reveal · nobody answered", v({ phase: "reveal", pattern: "none" }), { secondsLeft: null }),
    room("offline", "Question · your connection dropped", v({ phase: "guess", answered: [1] }), { connected: false }),
    room("refused-late", "Question · your answer arrived too late", v({ phase: "guess", answered: [1] }), { error: "not_open" }),
    room("leave-confirm", "Leave? (confirmation)", v({ phase: "guess" }), { leaveConfirm: true }),
    room("you-left", "You left the match", v({ phase: "guess" }), { notice: "left" }),
    room("excluded", "Match started without you (not ready in time)", v({ phase: "intro" }), { notice: "excluded" }),
    room("cancelled", "Match cancelled", v({ phase: "intro" }), { notice: "cancelled" }),
  ];
}

const soloSession = (locale: string) => buildDemoDailySession("statSniper", locale as never) as StatSniperSession;
const APROXIMADO_SOLO: Scenario<never>[] = [
  scenario<null>({
    id: "daily", name: "Today's daily (sliders, current game)", note: "The live Stat Sniper daily, demo session: what solo players get today",
    data: null,
    // practice: no member completion modal (it needs app providers the preview leaves out); the language follows the preview.
    render: (_d, ctx) => (
      <FixedLocaleProvider locale={ctx.locale}>
        <StatSniperGame key={ctx.locale} session={soloSession(ctx.locale)} demo practice onBack={() => ctx.log("onBack")} onComplete={(score) => ctx.log("onComplete", score)} />
      </FixedLocaleProvider>
    ),
  }),
];

export const GAMES: GameEntry[] = [
  {
    id: "aproximado",
    name: "Closest Wins · Aproximado",
    scenarios: {
      solo: APROXIMADO_SOLO,
      duel: [
        live("live-1v1", "▶ Play a 1v1 vs a bot", { seats: 2, scoring: "closest", speed: 1, events: [] }, "Live: real rules + screens, a bot rival. Edit seats/scoring/speed/events and press Reset"),
        ...roomScreens(2),
      ],
      room: [
        live("live-4", "▶ Play with 3 bots", { seats: 4, scoring: "podium", speed: 1, events: [{ round: 3, seat: 2, do: "away" }, { round: 5, seat: 2, do: "back" }] }, "Live: 4 players, one bot drops at question 3 and is back at 5. Seat 0 = you ({ seat: 0, do: \"away\" } = your connection drops). Edit and Reset"),
        live("live-6", "▶ Play with 5 bots (one leaves)", { seats: 6, scoring: "podium", speed: 1, events: [{ round: 4, seat: 5, do: "leave" }] }, "Live: 6 players, a bot leaves at question 4"),
        ...roomScreens(4).map((sc) => ({ ...sc, id: `4-${sc.id}`, name: `4p · ${sc.name}` })),
        ...roomScreens(6).map((sc) => ({ ...sc, id: `6-${sc.id}`, name: `6p · ${sc.name}` })),
        ...roomScreens(3).filter((sc) => ["intro", "reveal-spread", "over"].includes(sc.id)).map((sc) => ({ ...sc, id: `3-${sc.id}`, name: `3p · ${sc.name}` })),
      ],
    },
  },
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

"use client";

import { useEffect, useRef, useState } from "react";
import { PARTY_SUCCESS_FLIGHT_MS, isUsableScoreAnchor } from "@/features/party/realtime/partyQuizScreen.helpers";
import type { ScoreFlight } from "@/features/party/realtime/partyQuizScreen.types";
import { PartyQuizResultsScreen } from "@/features/party/PartyQuizResultsScreen";
import type { PartyStandingViewModel } from "@/features/party/realtime/partyQuizScreen.types";
import type { MatchFinalResultsPayload, MatchParticipant } from "@/lib/realtime/socket.types";
import { aproximadoCopy } from "./aproximado.copy";
import type { AproximadoRoomView } from "./aproximado.views";

/** Seats stand in for user ids on the Party Quiz pieces (the room view knows seats, names and avatars). */
const idOf = (seat: number) => `seat-${seat}`;

/**
 * The room's seats as Party Quiz standings: rank by points (shared), this round's points as the "+N" once landed.
 * `holding`: the reveal's score flights are still in the air, so totals (and ranks) show the score before this round.
 */
export function toPartyStandings(view: AproximadoRoomView, holding = false, labels?: { away: string; withdrawn: string }): PartyStandingViewModel[] {
  const gained = view.phase !== "guess" && view.reveal ? new Map(view.reveal.entries.map((e) => [e.seat, e.points])) : null;
  const shown = (s: AproximadoRoomView["seats"][number]) => s.score - (holding ? gained?.get(s.seat) ?? 0 : 0);
  // Players who left rank below everyone still playing (as in the final table) and never lead; away is temporary.
  const out = (s: AproximadoRoomView["seats"][number]) => s.status === "withdrawn";
  const playing = view.seats.filter((s) => !out(s));
  const top = Math.max(0, ...playing.map(shown));
  const rankOf = (s: AproximadoRoomView["seats"][number]) => (out(s)
    ? playing.length + 1 + view.seats.filter((o) => out(o) && shown(o) > shown(s)).length
    : 1 + playing.filter((o) => shown(o) > shown(s)).length);
  return [...view.seats]
    .sort((a, b) => Number(out(a)) - Number(out(b)) || shown(b) - shown(a) || a.seat - b.seat)
    .map((s) => ({
      userId: idOf(s.seat),
      username: s.name,
      avatarUrl: null,
      avatarCustomization: s.avatar,
      rank: rankOf(s),
      totalPoints: shown(s),
      answered: view.phase === "guess" ? s.answered : true,
      // Away is shown like a dropped seat while it lasts (greyed); it turns back the moment the seat returns.
      status: s.status === "in" ? "active" : "dropped",
      statusLabel: s.status === "withdrawn" ? labels?.withdrawn : s.status === "away" ? labels?.away : undefined,
      isLeader: !out(s) && top > 0 && shown(s) === top,
      isSelf: s.seat === view.mySeat,
      rankShift: 0,
      roundDelta: holding ? null : gained?.get(s.seat) ?? null,
    }));
}

/** Where the reveal's "+N" leaves from (a chalkboard row's points pill); the standings avatars are the landing spots. */
export const scoreSourceAttr = (seat: number) => ({ "data-room-score-source": idOf(seat) });
const FLIGHT_DELAY_MS = 700;

/**
 * The Party Quiz score flights for a room reveal: once the chalkboard is up, each seat that scored sends its "+N" from
 * its row to its standings avatar (desktop sidebar or phone bar, whichever is visible); totals hold the old score until
 * the flights land. Reduced motion: no flights, totals update at once.
 */
export function useRoomScoreFlights(view: AproximadoRoomView, enabled: boolean): { flights: ScoreFlight[]; holding: boolean } {
  // Reduced motion: no flights and no hold, so totals move with the chalkboard at once.
  const [reduced] = useState(() => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches));
  const key = enabled && !reduced && view.phase === "reveal" && view.reveal ? `r${view.round}` : null;
  const [landed, setLanded] = useState<string | null>(null);
  const [flights, setFlights] = useState<ScoreFlight[]>([]);
  // Read at take-off time, so a later snapshot of the same reveal (a resync) never restarts the schedule.
  const entriesRef = useRef(view.reveal?.entries);
  useEffect(() => { entriesRef.current = view.reveal?.entries; });
  useEffect(() => {
    const entries = entriesRef.current;
    if (!key || !entries) return;
    const start = window.setTimeout(() => {
      const next: ScoreFlight[] = [];
      for (const e of entries) {
        if (e.points <= 0) continue;
        const from = document.querySelector<HTMLElement>(`[data-room-score-source="${idOf(e.seat)}"]`);
        const to = [...document.querySelectorAll<HTMLElement>(`[data-party-score-anchor="${idOf(e.seat)}"]`)].find(isUsableScoreAnchor);
        if (!from || !to) continue;
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        next.push({ id: `${key}-${e.seat}`, userId: idOf(e.seat), points: e.points, from: { x: a.left + a.width / 2, y: a.top + a.height / 2 }, to: { x: b.left + b.width / 2, y: b.top + b.height / 2 } });
      }
      setFlights(next);
    }, FLIGHT_DELAY_MS);
    const land = window.setTimeout(() => { setLanded(key); setFlights([]); }, FLIGHT_DELAY_MS + PARTY_SUCCESS_FLIGHT_MS);
    return () => { window.clearTimeout(start); window.clearTimeout(land); };
  }, [key]);
  return { flights: key && landed !== key ? flights : [], holding: Boolean(key && landed !== key) };
}

/** The final result on the Party Quiz results screen: the room's own places (shared), no XP, rounds won as the stat. */
export function AproximadoPartyResults({ view, locale, onRoom, onExit }: { view: AproximadoRoomView; locale: string; onRoom: () => void; onExit: () => void }) {
  const copy = aproximadoCopy(locale);
  const table = view.standings ?? [];
  const mine = table.find((s) => s.seat === view.mySeat);
  const firsts = table.filter((s) => s.place === 1);
  const headline = mine?.place === 1 ? (firsts.length > 1 ? copy.tieFirst : copy.youWon) : copy.youPlace(mine?.place ?? table.length);
  const participants: MatchParticipant[] = view.seats.map((s) => ({
    userId: idOf(s.seat), seat: s.seat, avatarUrl: null, avatarCustomization: s.avatar,
    username: s.status === "withdrawn" ? `${s.name} · ${copy.withdrawn}` : s.name,
  }));
  const finalResults: MatchFinalResultsPayload = {
    matchId: "room",
    winnerId: firsts.length === 1 ? idOf(firsts[0].seat) : null,
    players: {},
    standings: table.map((s) => ({ userId: idOf(s.seat), rank: s.place, totalPoints: s.points, correctAnswers: s.roundWins, avgTimeMs: null })),
    durationMs: 0,
    resultVersion: 1,
  };
  const rounds = Math.max(1, view.results.length);
  const rowDetail = Object.fromEntries(table.map((s) => [idOf(s.seat), copy.resultDetail(s.roundWins, Math.round((s.totalError / rounds) * 100))]));
  return (
    <PartyQuizResultsScreen finalResults={finalResults} participants={participants} selfUserId={idOf(view.mySeat)}
      onPlayAgain={onRoom} onMainMenu={onExit} headline={headline} hideXp correctLabel={copy.colWins} useGivenRanks
      rowDetail={rowDetail} notOnPodium={view.seats.filter((s) => s.status === "withdrawn").map((s) => idOf(s.seat))} />
  );
}

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PartyResultsScreen, PartyScoreFlights, PartyStandingsPill, PartyStandingsSidebar, PARTY_SUCCESS_FLIGHT_MS, isUsableScoreAnchor, type PartyStandingViewModel, type ScoreFlight } from "@/features/party-kit";
import type { MatchFinalResultsPayload, MatchParticipant } from "@/lib/realtime/socket.types";
import type { AvatarCustomization } from "@/types/game";

/**
 * The 3–6 player screens of the word games on the party-game kit (docs/PARTY-GAME-UI-BLUEPRINT.md): standings sidebar
 * on desktop, "me vs leader" pill on phones, "+N" flights into the standings and the Party Quiz results screen.
 */
const idOf = (seat: number) => `seat-${seat}`;

/** A seat as the screens know it: who it is, and where it stands. */
export interface WordSeat { seat: number; name: string; avatar: AvatarCustomization; status: "in" | "away" | "withdrawn"; score: number }
export interface WordStanding { seat: number; points: number; roundWins: number; place: number }

/**
 * Seats as party standings, best first; rank is shared on ties and seats that left rank last. `hold` keeps this
 * round's points out of the totals while their "+N" is still flying; `gains` (once landed) is the "+N" per seat.
 */
export function toPartyStandings({ seats, mySeat, answered, labels, hold, gains }: {
  seats: readonly WordSeat[]; mySeat: number; answered: (seat: number) => boolean; labels: { away: string; left: string };
  hold: readonly number[] | null; gains: readonly number[] | null;
}): PartyStandingViewModel[] {
  const shown = (s: WordSeat) => s.score - (hold?.[s.seat] ?? 0);
  const out = (s: WordSeat) => s.status === "withdrawn";
  const playing = seats.filter((s) => !out(s));
  const top = Math.max(0, ...playing.map(shown));
  const rankOf = (s: WordSeat) => (out(s) ? playing.length + 1 : 1 + playing.filter((o) => shown(o) > shown(s)).length);
  return [...seats]
    .sort((a, b) => Number(out(a)) - Number(out(b)) || shown(b) - shown(a) || a.seat - b.seat)
    .map((s) => ({
      userId: idOf(s.seat), username: s.name, avatarUrl: null, avatarCustomization: s.avatar, rank: rankOf(s), totalPoints: shown(s), answered: answered(s.seat),
      status: s.status === "in" ? "active" : "dropped", statusLabel: s.status === "withdrawn" ? labels.left : s.status === "away" ? labels.away : undefined,
      isLeader: !out(s) && top > 0 && shown(s) === top, isSelf: s.seat === mySeat, rankShift: 0, roundDelta: gains ? gains[s.seat] || null : null,
    }));
}

/** Where a round's "+N" leaves from; the standings avatars are where it lands. */
export const scoreSourceAttr = (seat: number) => ({ "data-room-score-source": idOf(seat) });
const FLIGHT_DELAY_MS = 700;

/**
 * Score flights for a round result: once it is on screen, each seat that scored sends its "+N" from its result row to its
 * standings avatar; totals hold the old score until the flights land. Reduced motion: no flights, totals move at once.
 */
export function useScoreFlights(key: string | null, gains: readonly number[]): { flights: ScoreFlight[]; holding: boolean } {
  const [reduced] = useState(() => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches));
  const live = reduced ? null : key;
  const [landed, setLanded] = useState<string | null>(null);
  const [flights, setFlights] = useState<ScoreFlight[]>([]);
  // Read at take-off time, so a later snapshot of the same result (a resync) never restarts the schedule.
  const gainsRef = useRef(gains);
  useEffect(() => { gainsRef.current = gains; });
  useEffect(() => {
    if (!live) return;
    const start = window.setTimeout(() => {
      const next: ScoreFlight[] = [];
      gainsRef.current.forEach((points, seat) => {
        if (points <= 0) return;
        const from = document.querySelector<HTMLElement>(`[data-room-score-source="${idOf(seat)}"]`);
        const to = [...document.querySelectorAll<HTMLElement>(`[data-party-score-anchor="${idOf(seat)}"]`)].find(isUsableScoreAnchor);
        if (!from || !to) return;
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        next.push({ id: `${live}-${seat}`, userId: idOf(seat), points, from: { x: a.left + a.width / 2, y: a.top + a.height / 2 }, to: { x: b.left + b.width / 2, y: b.top + b.height / 2 } });
      });
      setFlights(next);
    }, FLIGHT_DELAY_MS);
    const land = window.setTimeout(() => { setLanded(live); setFlights([]); }, FLIGHT_DELAY_MS + PARTY_SUCCESS_FLIGHT_MS);
    return () => { window.clearTimeout(start); window.clearTimeout(land); };
  }, [live]);
  return { flights: live && landed !== live ? flights : [], holding: Boolean(live && landed !== live) };
}

/** The party page: round content on the left, standings sidebar on desktop, standings pill on phones. */
export function PartyPage({ standings, flights, resolved, children }: { standings: PartyStandingViewModel[]; flights: ScoreFlight[]; resolved: boolean; children: ReactNode }) {
  return (
    <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">{children}</div>
      <PartyStandingsSidebar standings={standings} roundResolved={resolved} showOptions={!resolved} />
      <PartyStandingsPill standings={standings} flyingTo={flights.map((f) => f.userId)} />
      <PartyScoreFlights scoreFlights={flights} />
    </div>
  );
}

/** The final table on the Party Quiz results screen: the game's own places (shared on ties), no XP. */
export function PartyResults({ seats, standings, mySeat, headline, statLabel, detail, leftLabel, onRoom, onExit }: {
  seats: readonly WordSeat[]; standings: readonly WordStanding[]; mySeat: number; headline: string; statLabel: string;
  detail: (row: WordStanding) => string; leftLabel: string; onRoom: () => void; onExit: () => void;
}) {
  const firsts = standings.filter((r) => r.place === 1);
  const participants: MatchParticipant[] = seats.map((s) => ({
    userId: idOf(s.seat), seat: s.seat, avatarUrl: null, avatarCustomization: s.avatar,
    username: s.status === "withdrawn" ? `${s.name} · ${leftLabel}` : s.name,
  }));
  const finalResults: MatchFinalResultsPayload = {
    matchId: "room", winnerId: firsts.length === 1 ? idOf(firsts[0].seat) : null, players: {},
    standings: standings.map((r) => ({ userId: idOf(r.seat), rank: r.place, totalPoints: r.points, correctAnswers: r.roundWins, avgTimeMs: null })),
    durationMs: 0, resultVersion: 1,
  };
  return (
    <PartyResultsScreen finalResults={finalResults} participants={participants} selfUserId={idOf(mySeat)} onPlayAgain={onRoom} onMainMenu={onExit}
      headline={headline} hideXp correctLabel={statLabel} useGivenRanks rowDetail={Object.fromEntries(standings.map((r) => [idOf(r.seat), detail(r)]))}
      notOnPodium={seats.filter((s) => s.status === "withdrawn").map((s) => idOf(s.seat))} />
  );
}

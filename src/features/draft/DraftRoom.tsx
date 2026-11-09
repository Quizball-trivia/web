"use client";

import { useEffect, useMemo, useState } from "react";
import { wordSharedCopy } from "@/features/wordgames/copy";
import { wordSeats, type RoomConnection, type RoomGameScreens } from "@/features/wordgames/RoomGameShell";
import { Frame, Sheet, QuietButton, GreenButton, useResendRetained } from "@/features/wordgames/ui";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";
import { draftCopy } from "./draft.copy";
import { DraftBoard, MatchDayView, RoomTable, type BoardSeat } from "./DraftViews";
import { FORMATIONS, lines, type ClubSeason, type League, type MatchDay, type SeasonResult } from "./draft.rules";
import type { DraftRoomCommand, DraftRoomView } from "./draft.room";

function useSecondsLeft(deadline: number, nowMs: () => number, live: boolean): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!live) return;
    const tick = () => setNow(nowMs());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 250);
    return () => { window.clearTimeout(first); window.clearInterval(id); };
  }, [live, nowMs]);
  return live && now !== null ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;
}

const seatsOf = (view: DraftRoomView, snapshot: RoomStatePayload, labels: { away: string; left: string }): BoardSeat[] => {
  const rows = wordSeats(snapshot, view.status.map((status, seat) => ({ seat, status, score: 0 })));
  return view.picks.map((picks, seat) => ({ name: rows[seat]?.name ?? "—", avatar: rows[seat]?.avatar ?? null, picks, me: seat === view.you, active: view.activeSeat === seat, note: view.status[seat] === "away" ? labels.away : view.status[seat] === "withdrawn" ? labels.left : null }));
};

function Board({ view, snapshot, room, locale, error }: { view: DraftRoomView; snapshot: RoomStatePayload; room: RoomConnection<DraftRoomCommand>; locale: string; error: string | null }) {
  const c = draftCopy(locale);
  const shared = wordSharedCopy(locale);
  const seats = useMemo(() => seatsOf(view, snapshot, shared), [view, snapshot, shared]);
  const seconds = useSecondsLeft(view.deadline, room.nowMs, view.phase === "picking");
  const me = view.you;
  const myTurn = view.activeSeat === me;
  const unconfirmed = useResendRetained(room);
  const [leaving, setLeaving] = useState(false);
  const youOr = (seat: number) => (seat === me ? c.you : seats[seat]?.name ?? "—");
  const last = view.feed[view.feed.length - 1];
  const league = view.league as League;
  if (!view.spin) return null;
  const spin: ClubSeason = { ...view.spin, clubId: view.spin.id, leagueId: league.id };
  return (
    <>
      <DraftBoard locale={locale} slots={FORMATIONS[view.formation]} spin={spin} league={league} variant={view.variant} round={view.round} seats={seats} myPicks={view.picks[me]}
        taken={view.taken.map((t) => ({ playerId: t.playerId, by: youOr(t.seat) }))} respins={0} respinCost={null} coins={null} mode={view.seats === 2 ? "duel" : "room"} budget={view.budget ?? undefined}
        notice={error ? c.roomError : null} seconds={myTurn ? seconds : null} waitingFor={myTurn ? null : youOr(view.activeSeat ?? 0)} feed={last ? c.signedFeed(youOr(last.seat), last.name, last.club, last.season) : null}
        onPick={(playerId, slotId) => { if (myTurn && !unconfirmed && room.inFlight === 0) room.send({ type: "pick", round: view.round, turn: view.turn, playerId, slotId }); }}
        onAcademy={(slotId) => { if (myTurn && !unconfirmed && room.inFlight === 0) room.send({ type: "academy", round: view.round, turn: view.turn, slotId }); }}
        onRespin={() => undefined} onExit={() => setLeaving(true)} />
      {leaving && (
        <Sheet label={shared.leave} asks>
          <p className="text-lg font-black">{shared.leaveConfirm}</p>
          <GreenButton className="mt-5" onClick={() => setLeaving(false)}>{shared.leaveNo}</GreenButton>
          <QuietButton className="mt-3" onClick={() => { setLeaving(false); room.leave(); }}>{shared.leaveYes}</QuietButton>
        </Sheet>
      )}
    </>
  );
}

/** The tie from the other side: their goals first, their home leg first, their attack against the first side's defence. */
const flipTie = (t: MatchDay): MatchDay => {
  const by = (key: MatchDay["battles"][number]["key"]) => t.battles.find((b) => b.key === key)!;
  const turn = (b: MatchDay["battles"][number], key: MatchDay["battles"][number]["key"]) => ({ key, mine: b.theirs, theirs: b.mine, winner: b.winner === null ? null : ((1 - b.winner) as 0 | 1) });
  return {
    ...t, goals: [t.goals[1], t.goals[0]], legs: [[t.legs[1][1], t.legs[1][0]], [t.legs[0][1], t.legs[0][0]]], penalties: t.penalties ? [t.penalties[1], t.penalties[0]] : null, winner: (1 - t.winner) as 0 | 1,
    battles: [turn(by("defence"), "attack"), turn(by("midfield"), "midfield"), turn(by("attack"), "defence")],
  };
};

function Results({ view, snapshot, locale, onRoom, onExit }: { view: DraftRoomView; snapshot: RoomStatePayload; locale: string; onRoom: () => void; onExit: () => void }) {
  const shared = wordSharedCopy(locale);
  const seats = useMemo(() => seatsOf(view, snapshot, shared), [view, snapshot, shared]);
  const slots = FORMATIONS[view.formation];
  const me = view.you;
  if (view.tie && view.seats === 2) {
    const tie = me === 0 ? view.tie : flipTie(view.tie);
    // Someone who left lost, whatever the legs said.
    const shown = view.winner === me && tie.winner !== 0 ? { ...tie, winner: 0 as const } : view.winner !== me && tie.winner === 0 ? { ...tie, winner: 1 as const } : tie;
    return <Frame lang={locale}><MatchDayView locale={locale} match={shown} me={seats[me]} rival={seats[1 - me]} slots={slots} seed={snapshot.matchId} reveal onBack={onRoom} backLabel={shared.backToRoom} resultNote={view.status[1 - me] === "withdrawn" ? shared.rivalLeft : null} onExit={onExit} /></Frame>;
  }
  const rows = seats.map((seat, i) => ({ seat: { ...seat, name: seat.note ? `${seat.name} · ${seat.note}` : seat.name }, season: view.seasons![i] as unknown as SeasonResult, team: view.lines?.[i] ?? lines(slots, seat.picks).overall, withdrawn: view.status[i] === "withdrawn" }))
    .sort((a, b) => Number(a.withdrawn) - Number(b.withdrawn) || b.season.points - a.season.points || (b.season.gf - b.season.ga) - (a.season.gf - a.season.ga) || b.season.gf - a.season.gf);
  return <Frame lang={locale} wide><RoomTable locale={locale} rows={rows} slots={slots} againLabel={shared.backToRoom} onAgain={onRoom} onExit={onExit} /></Frame>;
}

export const draftScreens: RoomGameScreens<DraftRoomView, DraftRoomCommand> = {
  brand: (locale) => draftCopy(locale).brand,
  Board,
  Results,
  wide: () => true,
};

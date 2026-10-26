"use client";

import { useEffect, useMemo, useState } from "react";
import { wordSharedCopy } from "@/features/wordgames/copy";
import { wordSeats, type RoomConnection, type RoomGameScreens } from "@/features/wordgames/RoomGameShell";
import { CountIn, Frame, GreenButton, QuietButton, Sheet, TopBar, poppins, useResendRetained } from "@/features/wordgames/ui";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";
import { conexionesCopy } from "./conexiones.copy";
import { tryKey, type CxSeat } from "./conexiones.logic";
import { toDuelState, type ConexionesServerView, type CxCommand } from "./conexiones.server";
import { ConexionesDuelResult, ConexionesDuelView, type CxDuelSeat } from "./ConexionesDuel";

type Link = Pick<RoomConnection<CxCommand>, "send" | "nowMs" | "inFlight" | "retained" | "connected" | "resendRetained" | "leave">;

function useMsLeft(deadlineIso: string | null, nowMs: () => number): number {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!deadlineIso) return;
    const tick = () => setNow(nowMs());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 100);
    return () => { window.clearTimeout(first); window.clearInterval(id); };
  }, [deadlineIso, nowMs]);
  return deadlineIso && now !== null ? Math.max(0, Date.parse(deadlineIso) - now) : 0;
}

function useDuelSeats(snapshot: RoomStatePayload, view: ConexionesServerView, awayLabel: string): [CxDuelSeat, CxDuelSeat] {
  return useMemo(() => {
    const rows = wordSeats(snapshot, view.seats.map((s) => ({ seat: s.seat, status: s.status, score: view.scores[s.seat] ?? 0 })));
    const of = (seat: number): CxDuelSeat => {
      const row = rows.find((r) => r.seat === seat)!;
      return { name: row.name, avatar: row.avatar, away: row.status === "away" ? awayLabel : null };
    };
    return [of(0), of(1)];
  }, [snapshot, view.seats, view.scores, awayLabel]);
}

export function ConexionesBoardScreen({ view, snapshot, room, locale, error }: { view: ConexionesServerView; snapshot: RoomStatePayload; room: Link; locale: string; error: string | null }) {
  const c = conexionesCopy(locale);
  const shared = wordSharedCopy(locale);
  const me: CxSeat = view.mySeat === 1 ? 1 : 0;
  const seats = useDuelSeats(snapshot, view, shared.away);
  const state = useMemo(() => toDuelState(view), [view]);
  const msLeft = useMsLeft(view.deadline, room.nowMs);
  const unconfirmed = useResendRetained(room);
  const pending = room.inFlight > 0 || unconfirmed;
  const [leaving, setLeaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  // A new turn (any move, a run-out, the next board) starts with nothing picked.
  const turnKey = `${view.board}:${view.n}`;
  const [selectedFor, setSelectedFor] = useState(turnKey);
  const [repeat, setRepeat] = useState(false);
  if (selectedFor !== turnKey) { setSelectedFor(turnKey); setSelected([]); setRepeat(false); }
  // A refusal belongs to the turn it was sent on: a new turn starts without it.
  const [errorFor, setErrorFor] = useState<string | null>(null);
  if (error && errorFor === null) setErrorFor(turnKey);
  if (!error && errorFor !== null) setErrorFor(null);
  const refused = error && errorFor === turnKey ? (error === "repeat" ? c.repeatHint : c.refused) : null;

  const leaveSheet = leaving && (
    <Sheet label={shared.leave} asks>
      <p className="text-lg font-black" style={poppins}>{shared.leaveConfirm}</p>
      <GreenButton className="mt-5" onClick={() => setLeaving(false)}>{shared.leaveNo}</GreenButton>
      <QuietButton className="mt-3" onClick={() => { setLeaving(false); room.leave(); }}>{shared.leaveYes}</QuietButton>
    </Sheet>
  );

  if (view.phase === "intro") {
    return (
      <div className="flex flex-1 flex-col">
        <TopBar wrap brand={c.brand} seconds={null} exitLabel={shared.leave} onExit={() => setLeaving(true)} />
        <CountIn label={shared.startsIn} value={Math.max(1, Math.ceil(msLeft / 1000))} />
        {leaveSheet}
      </div>
    );
  }

  const submit = () => {
    if (selected.length !== 4 || view.phase !== "turn") return;
    // A four already tried on this board is refused by the server and passes nothing: not sent.
    if (state.tries.some((t) => t.ids.length === 4 && tryKey(t.ids) === tryKey(selected))) { setRepeat(true); return; }
    room.send({ type: "try", board: view.board, n: view.n, ids: [...selected] });
  };

  return (
    <>
      <ConexionesDuelView locale={locale} state={state} me={me} seats={seats} selected={selected} msLeft={msLeft} pending={pending}
        notice={repeat ? c.repeatHint : refused}
        onToggle={(id) => { setRepeat(false); setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 4 ? [...s, id] : s)); }}
        onSubmit={submit}
        onClear={() => setSelected([])}
        onName={(pick) => {
          const index = view.options?.indexOf(pick) ?? -1;
          if (index >= 0) room.send({ type: "name", board: view.board, n: view.n, pick: index });
        }}
        onExit={() => setLeaving(true)} />
      {leaveSheet}
    </>
  );
}

export function ConexionesResultsScreen({ view, snapshot, locale, onRoom, onExit }: { view: ConexionesServerView; snapshot: RoomStatePayload; locale: string; onRoom: () => void; onExit: () => void }) {
  const seats = useDuelSeats(snapshot, view, wordSharedCopy(locale).away);
  const state = useMemo(() => toDuelState(view), [view]);
  return (
    <Frame lang={locale}>
      <ConexionesDuelResult locale={locale} state={state} me={view.mySeat === 1 ? 1 : 0} seats={seats} onRoom={onRoom} onLeave={onExit} />
    </Frame>
  );
}

/** The room runtime's screens: the server view, drawn by the same views the playground shows. */
export const conexionesScreens: RoomGameScreens<ConexionesServerView, CxCommand> = {
  brand: (locale) => conexionesCopy(locale).brand,
  Board: ({ view, snapshot, room, locale, error }) => <ConexionesBoardScreen view={view} snapshot={snapshot} room={room} locale={locale} error={error} />,
  Results: (props) => <ConexionesResultsScreen {...props} />,
  wide: () => false,
};

"use client";

import { useEffect, useState } from "react";
import type { RoomConnection, RoomGameScreens } from "@/features/wordgames/RoomGameShell";
import { GreenButton, QuietButton, Sheet, poppins, useResendRetained } from "@/features/wordgames/ui";
import { wordSharedCopy } from "@/features/wordgames/copy";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";
import { codenamesCopy } from "./codenames.copy";
import { toRoomView, toServerCommand, type CodenamesServerCommand, type CodenamesServerView } from "./codenames.server";
import type { CodenamesCommand } from "./codenames.view";
import { CodenamesGame, CodenamesResult, CodenamesTeams } from "./CodenamesRoom";

/** How long a game that ended on the board (the Own Goal going off, the last card) stays on it before the result. */
const FINALE_MS = 2_600;
/** The match whose board this tab was showing: only a game that ended in front of the player replays its finale. */
let boardOf: string | null = null;

function Board({ view, snapshot, room, locale, error }: { view: CodenamesServerView; snapshot: RoomStatePayload; room: RoomConnection<CodenamesServerCommand>; locale: string; error: string | null }) {
  const c = wordSharedCopy(locale);
  const shown = toRoomView(view, snapshot);
  const unconfirmed = useResendRetained(room);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => { boardOf = snapshot.matchId; }, [snapshot.matchId]);
  const send = (command: CodenamesCommand) => {
    const server = toServerCommand(command, view);
    if (server) room.send(server);
  };
  // The server judges every tap in order and refuses what came too late (a stale turn, a card already shown), so taps
  // are never held while one is on its way; only a lost connection or an answer still unknown holds them.
  const busy = !room.connected || unconfirmed;
  // A clue is one per turn: the form waits for the first one's answer, so a second one is never sent into its slot.
  const sending = room.inFlight > 0;
  return (
    <>
      {view.phase === "teams"
        ? <CodenamesTeams view={shown} locale={locale} error={error} onSend={send} onExit={() => setLeaving(true)} />
        : <CodenamesGame view={shown} locale={locale} busy={busy} sending={sending} error={error} onSend={send} onExit={() => setLeaving(true)} />}
      {!room.connected && <p role="status" className="mt-3 text-center text-xs font-semibold text-white/60">{c.offline}</p>}
      {leaving && (
        <Sheet label={c.leave} asks>
          <p className="text-lg font-black" style={poppins}>{c.leaveConfirm}</p>
          <GreenButton className="mt-5" onClick={() => setLeaving(false)}>{c.leaveNo}</GreenButton>
          <QuietButton className="mt-3" onClick={() => { setLeaving(false); room.leave(); }}>{c.leaveYes}</QuietButton>
        </Sheet>
      )}
    </>
  );
}

/** A game that ended in front of the player stays on the board for the Own Goal blast (or the last card), then the result. */
function Results({ view, snapshot, locale, onRoom, onExit }: { view: CodenamesServerView; snapshot: RoomStatePayload; locale: string; onRoom: () => void; onExit: () => void }) {
  const shown = toRoomView(view, snapshot);
  const [finale, setFinale] = useState(() => boardOf === snapshot.matchId && view.result !== null);
  useEffect(() => {
    boardOf = null;
    if (!finale) return;
    const id = window.setTimeout(() => setFinale(false), FINALE_MS);
    return () => window.clearTimeout(id);
  }, [finale]);
  if (!view.result) return null;
  if (finale) return <CodenamesGame view={{ ...shown, phase: "guess", clue: null }} locale={locale} busy onSend={() => undefined} onExit={onExit} finale />;
  return <CodenamesResult view={shown} locale={locale} onRoom={onRoom} onExit={onExit} />;
}

export const codenamesScreens: RoomGameScreens<CodenamesServerView, CodenamesServerCommand> = {
  brand: (locale) => codenamesCopy(locale).brand,
  Board,
  Results,
  wide: () => true,
  clockless: true,
  cancelled: (view, locale) => {
    const c = codenamesCopy(locale);
    return view.cancelReason === "idle" ? [c.idleTitle, c.idleText] : null;
  },
};

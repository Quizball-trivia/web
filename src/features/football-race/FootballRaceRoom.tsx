"use client";

import { useEffect, useMemo, useState } from "react";
import { seatAvatar } from "@/features/duel/DuelAvatar";
import { useSecondsLeft } from "@/features/duel/useDuel";
import { wordSharedCopy } from "@/features/wordgames/copy";
import type { RoomConnection, RoomGameScreens } from "@/features/wordgames/RoomGameShell";
import { GreenButton, QuietButton, Sheet, poppins, useResendRetained } from "@/features/wordgames/ui";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";
import { raceCopy } from "./race.copy";
import { toServerDraft, toServerRaceView, toServerWording, type FootballRaceCommand, type FootballRaceServerView } from "./race.server";
import { RaceBoard, RaceDraft, RaceIntro, RaceResults, RaceTrack, RevealCard } from "./RaceRoom";

/** How long the pick that crossed the line stays on screen before the result table. */
const FINALE_MS = 3_500;

/** Each seat's name and face from the room's seat rows, indexed by seat. */
function usePeople(snapshot: RoomStatePayload, seats: number) {
  return useMemo(() => {
    const bySeat = new Map(snapshot.seats.filter((s) => s.seat !== null).map((s) => [s.seat!, s]));
    return Array.from({ length: seats }, (_, seat) => {
      const who = bySeat.get(seat);
      return { seat, name: who?.username ?? "—", avatar: seatAvatar(who ?? { userId: String(seat), avatarCustomization: null, avatarUrl: null, isGuest: true }) };
    });
  }, [snapshot.seats, seats]);
}

function Board({ view, snapshot, room, locale, error }: { view: FootballRaceServerView; snapshot: RoomStatePayload; room: RoomConnection<FootballRaceCommand>; locale: string; error: string | null }) {
  const c = wordSharedCopy(locale);
  const people = usePeople(snapshot, view.seats.length);
  const wording = toServerWording(view);
  const race = toServerRaceView(view, people);
  const secondsLeft = useSecondsLeft(view.deadline, room.nowMs);
  const unconfirmed = useResendRetained(room);
  const busy = room.inFlight > 0 || unconfirmed || !room.connected;
  const [leaving, setLeaving] = useState(false);

  let body: React.ReactNode;
  if (view.phase === "draft") {
    body = (
      <RaceDraft nations={wording.nations} seats={people} mySeat={view.mySeat} draft={toServerDraft(view, 0)} tournament={race.tournament} locale={locale}
        secondsLeft={secondsLeft} busy={busy} onPick={(nation) => view.draft.turn !== null && room.send({ type: "draft", turn: view.draft.turn, nation })} />
    );
  } else if (view.phase === "intro") {
    body = <RaceIntro view={race} wording={wording} locale={locale} secondsLeft={secondsLeft} />;
  } else {
    body = (
      <RaceBoard view={race} wording={wording} locale={locale} secondsLeft={secondsLeft} busy={busy} error={error} onLeave={() => setLeaving(true)}
        onPick={(stat) => room.send({ type: "pick", round: view.round, stat })} />
    );
  }
  return (
    <>
      {body}
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

/** A race won on the line first replays the pick that got there, then the table. */
function Results({ view, snapshot, locale, onRoom, onExit }: { view: FootballRaceServerView; snapshot: RoomStatePayload; locale: string; onRoom: () => void; onExit: () => void }) {
  const people = usePeople(snapshot, view.seats.length);
  const race = toServerRaceView(view, people);
  const [finale, setFinale] = useState(view.finale !== null);
  useEffect(() => {
    if (!finale) return;
    const id = window.setTimeout(() => setFinale(false), FINALE_MS);
    return () => window.clearTimeout(id);
  }, [finale]);
  if (finale && view.finale) {
    const copy = raceCopy(locale);
    const wording = toServerWording(view);
    const shown = toServerRaceView({ ...view, phase: "reveal", reveal: { item: view.finale, index: 0, total: 1, open: true } }, people);
    return (
      <div className="fixed inset-0 z-40 overflow-y-auto bg-surface-page-alt text-white">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4 pb-6 pt-4 lg:max-w-3xl">
          <p className="text-center text-sm font-black uppercase tracking-[0.2em] text-brand-yellow" style={poppins}>{copy.finalTitle}</p>
          <RaceTrack view={shown} copy={copy} locale={locale} />
          <RevealCard view={shown} wording={wording} copy={copy} locale={locale} />
          <QuietButton className="mt-2" onClick={() => setFinale(false)}>{copy.next}</QuietButton>
        </div>
      </div>
    );
  }
  return <RaceResults view={race} locale={locale} onRoom={onRoom} onExit={onExit} />;
}

export const footballRaceScreens: RoomGameScreens<FootballRaceServerView, FootballRaceCommand> = {
  brand: (locale) => { const copy = raceCopy(locale); return [copy.brandA, copy.brandB] as const; },
  Board,
  Results,
  wide: (view) => view.phase === "pick" || view.phase === "reveal",
};

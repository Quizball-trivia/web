"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, WifiOff } from "lucide-react";
import { aproximadoCopy } from "@/features/aproximado/aproximado.copy";
import { DuelAvatar } from "@/features/duel/DuelAvatar";
import { wordSharedCopy } from "@/features/wordgames/copy";
import { PartyPage, PartyResults, scoreSourceAttr, toPartyStandings, useScoreFlights, type WordSeat } from "@/features/wordgames/party";
import { wordSeats, type RoomConnection, type RoomGameScreens } from "@/features/wordgames/RoomGameShell";
import { CountIn, Frame, GreenButton, QuietButton, SeatCard, Sheet, TimeBar, TopBar, poppins, useResendRetained } from "@/features/wordgames/ui";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";
import { cn } from "@/lib/utils";
import { datoFalsoCopy } from "./datoFalso.copy";
import { DfClaim, DfJokers, DfOptions, DfVerdict, type DfPicker } from "./DatoFalsoCard";
import { toRoomView, type DatoFalsoServerView } from "./datoFalso.server";
import { useRevealSound } from "./datoFalso.sounds";
import type { DfCommand, DfRoomView } from "./datoFalso.view";

export type DfRoomLink = Pick<RoomConnection<DfCommand>, "send" | "nowMs" | "inFlight" | "retained" | "connected" | "resendRetained" | "leave">;

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

export function DatoFalsoBoard({ view, snapshot, room, locale, error }: { view: DfRoomView; snapshot: RoomStatePayload; room: DfRoomLink; locale: string; error: string | null }) {
  const c = wordSharedCopy(locale);
  const t = datoFalsoCopy(locale);
  const roomCopy = aproximadoCopy(locale);
  const seatRows = useMemo(() => view.seats.map((s) => ({ seat: s.seat, status: s.status, score: s.score })), [view.seats]);
  const seats = useMemo(() => wordSeats(snapshot, seatRows), [snapshot, seatRows]);
  const me = view.mySeat;
  const duel = view.format === "duel";
  const rival = duel ? (me === 0 ? 1 : 0) : -1;
  const msLeft = useMsLeft(view.deadline, room.nowMs);
  const secs = Math.ceil(msLeft / 1000);
  const seatOf = (seat: number) => seats.find((s) => s.seat === seat);
  const nameOf = (seat: number) => (seat === me ? c.you : seatOf(seat)?.name ?? "—");
  const unconfirmed = useResendRetained(room);
  const busy = room.inFlight > 0 || unconfirmed;
  const [leaving, setLeaving] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedFor, setSelectedFor] = useState(view.index);
  if (selectedFor !== view.index) { setSelectedFor(view.index); setSelected(null); }

  const reveal = view.phase === "reveal" ? view.reveal : null;
  const gains = useMemo(() => view.seats.map((s) => reveal?.picks.find((p) => p.seat === s.seat)?.points ?? 0), [view.seats, reveal]);
  const { flights, holding } = useScoreFlights(!duel && reveal ? `c${view.index}` : null, gains.map((g) => Math.max(0, g)));
  const card = view.card;
  const locked = view.myPick !== null;
  const live = view.seats.filter((s) => s.status !== "withdrawn");
  const answered = live.filter((s) => s.answered).length;
  const choice = locked ? view.myPick : selected && !view.removed.includes(selected) ? selected : null;
  const fakeLabel = reveal && card ? card.options.find((o) => o.id === reveal.fake)?.label ?? "" : "";
  const mine = reveal?.picks.find((p) => p.seat === me) ?? null;
  useRevealSound(reveal ? `${snapshot.matchId}:${view.index}` : null, Boolean(mine && mine.pick === reveal?.fake));

  const pickers = (option: string): DfPicker[] =>
    (reveal?.picks ?? []).filter((p) => p.pick === option).map((p) => {
      const s = seatOf(p.seat);
      return { seat: p.seat, mine: p.seat === me, doubled: p.doubled, avatar: s ? <DuelAvatar customization={s.avatar} size="xs" /> : null };
    });

  const top = (
    <TopBar wrap brand={t.brand} seconds={view.phase === "card" ? secs : null} exitLabel={c.leave} onExit={() => setLeaving(true)}
      right={<span className="shrink-0 text-[11px] font-black uppercase tracking-wide text-white/55 tabular-nums" style={poppins}>{t.cardOf(view.index + 1, view.total)}</span>} />
  );
  const timeBar = view.phase === "card" && <TimeBar className="mt-3" share={msLeft / view.cardMs} urgent={msLeft <= 5_000} />;

  const roundRows = reveal && card && (
    <ul className="mt-3 space-y-1.5">
      {seats.filter((s) => s.status !== "withdrawn").sort((a, b) => gains[b.seat] - gains[a.seat] || a.seat - b.seat).map((s) => {
        const p = reveal.picks.find((x) => x.seat === s.seat);
        const label = p?.pick ? card.options.find((o) => o.id === p.pick)?.label ?? "" : t.nobody;
        const g = gains[s.seat];
        return (
          <li key={s.seat} className={cn("flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm font-semibold", s.seat === me ? "bg-white/15" : "bg-white/[0.07]")}>
            <DuelAvatar customization={s.avatar} size="xs" />
            <span className="min-w-0 flex-1 truncate"><span className="font-bold">{nameOf(s.seat)}</span> <span className="text-white/60">· {label}</span></span>
            {(p?.cut || p?.doubled) && <span className="shrink-0 rounded-full bg-brand-yellow/20 px-1.5 text-[10px] font-black text-brand-yellow" style={poppins}>{[p.doubled && "×2", p.cut && "✂"].filter(Boolean).join(" ")}</span>}
            <span {...scoreSourceAttr(s.seat)} className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-black tabular-nums",
              g > 0 ? "bg-brand-green-light text-black" : g < 0 ? "bg-brand-red-soft text-white" : "bg-white/15 text-white/70")} style={poppins}>{g > 0 ? `+${g}` : g}</span>
          </li>
        );
      })}
    </ul>
  );

  const body = (
    <>
      {view.phase === "intro" && <CountIn label={c.startsIn} value={Math.max(1, secs)} />}
      {timeBar}
      {card && view.phase !== "intro" && (
        <>
          <DfClaim card={card} copy={t} className="mt-4" />
          {view.myDoubled && !reveal && <p className="mt-3 rounded-xl bg-brand-yellow/15 px-3 py-2 text-xs font-bold text-brand-yellow">{t.doubleOn}</p>}
          {view.phase === "card" && view.seats[me]?.idle && !view.myPick && <p role="status" data-df-idle className="mt-3 rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-bold text-white/85">{t.idleNote}</p>}
          <DfOptions card={card} copy={t} removed={view.removed} selected={choice} reveal={reveal} myPick={reveal ? mine?.pick ?? null : null} pickers={pickers}
            disabled={locked || busy || !room.connected || view.phase !== "card"} onSelect={setSelected} />
        </>
      )}
      {reveal && mine && (
        <DfVerdict copy={t} fakeLabel={fakeLabel} points={mine.points} pick={mine.pick} explain={reveal.explain}>
          {roundRows}
          <p className="mt-2 text-xs font-bold text-white/60">{view.final ? t.lastCard : t.nextCard}</p>
        </DfVerdict>
      )}
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-brand-red-light">{roomCopy.errors[error] ?? roomCopy.errors.default}</p>}
      {view.phase === "card" && card && (
        <>
          <div className="flex-1" />
          <div className={cn("sticky bottom-0 z-20 mt-5 space-y-3 bg-surface-page-alt/95 pb-1 pt-2", !duel && "bottom-[104px] lg:bottom-0")}>
            {locked ? (
              <p className="flex h-14 items-center justify-center gap-2 rounded-full bg-white/[0.07] text-sm font-black uppercase tracking-wide text-white/80" style={poppins} data-df-locked>
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4 text-brand-green-light" strokeWidth={3} aria-hidden />}
                {busy ? t.sending : `${t.lockedIn} · ${duel ? t.waiting : t.answeredOf(answered, live.length)}`}
              </p>
            ) : (
              <>
                <DfJokers copy={t} used={view.seats[me].jokersUsed} doubled={view.myDoubled} disabled={busy || !room.connected}
                  onJoker={(joker) => room.send({ type: "joker", card: view.index, kind: joker })} />
                <GreenButton disabled={!choice || busy || !room.connected} onClick={() => choice && card && room.send({ type: "pick", card: view.index, option: card.options.findIndex((o) => o.id === choice) })}>
                  {!room.connected ? c.offline : choice ? t.lockIn : t.pickHint}
                </GreenButton>
              </>
            )}
          </div>
        </>
      )}
    </>
  );

  const leaveSheet = leaving && (
    <Sheet label={c.leave} asks>
      <p className="text-lg font-black" style={poppins}>{c.leaveConfirm}</p>
      <GreenButton className="mt-5" onClick={() => setLeaving(false)}>{c.leaveNo}</GreenButton>
      <QuietButton className="mt-3" onClick={() => { setLeaving(false); room.leave(); }}>{c.leaveYes}</QuietButton>
    </Sheet>
  );

  if (!duel) {
    const standings = toPartyStandings({
      seats, mySeat: me, answered: (seat) => view.phase !== "card" || Boolean(view.seats[seat]?.answered), labels: { away: c.away, left: c.left },
      hold: holding ? gains : null, gains: reveal && !holding ? gains : null,
    });
    return (
      <>
        {top}
        <PartyPage standings={standings} flights={flights} resolved={view.phase === "reveal"}>{body}</PartyPage>
        {leaveSheet}
      </>
    );
  }

  const status = (seat: number) => {
    // An icon, not a name suffix: a long name would cut "disconnected" off.
    if (seatOf(seat)?.status === "away") return <span role="img" aria-label={c.away} title={c.away} data-df-rival="away" className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-red-soft/80"><WifiOff className="size-3.5 text-white" /></span>;
    if (view.phase !== "card") return null;
    const done = view.seats[seat]?.answered;
    return done
      ? <span role="img" aria-label={t.rivalAnswered} data-df-rival="answered" className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-green-light"><Check className="size-3.5 text-black" strokeWidth={3} /></span>
      : <span role="img" aria-label={t.rivalThinking} data-df-rival="thinking" className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10"><Loader2 className="size-3.5 animate-spin text-white/60" /></span>;
  };
  const mineSeat = seatOf(me);
  const theirs = seatOf(rival);
  return (
    <div className="flex flex-1 flex-col">
      {top}
      <div className="mt-3 flex gap-2">
        {mineSeat && <SeatCard name={c.you} avatar={mineSeat.avatar} tone="you" active={false} score={mineSeat.score} />}
        {theirs && <SeatCard name={theirs.name} avatar={theirs.avatar} tone="rival" active={false} score={theirs.score} marks={status(rival)} />}
      </div>
      {body}
      {leaveSheet}
    </div>
  );
}

export function DatoFalsoResults({ view, snapshot, locale, onRoom, onExit }: { view: DfRoomView; snapshot: RoomStatePayload; locale: string; onRoom: () => void; onExit: () => void }) {
  const c = wordSharedCopy(locale);
  const t = datoFalsoCopy(locale);
  const seats: WordSeat[] = wordSeats(snapshot, view.seats.map((s) => ({ seat: s.seat, status: s.status, score: s.score })));
  const table = view.standings ?? [];
  const me = view.mySeat;
  const own = table.find((r) => r.seat === me);
  const firsts = table.filter((r) => r.place === 1);
  if (view.format === "party") {
    return (
      <PartyResults seats={seats} standings={table} mySeat={me} headline={own?.place === 1 ? (firsts.length > 1 ? c.tieFirst : c.youWon) : c.youPlace(own?.place ?? table.length)}
        statLabel={t.rightStat} detail={(row) => t.rightDetail(row.roundWins)} leftLabel={c.left} onRoom={onRoom} onExit={onExit} />
    );
  }
  const rival = me === 0 ? 1 : 0;
  return (
    <Frame lang={locale}>
      <div className="flex flex-1 flex-col" data-df-result>
        <div className="mt-4 rounded-3xl bg-brand-blue px-5 pb-5 pt-4 text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">{t.brand.join(" ")}</p>
          <p className="mt-2 text-3xl font-black" style={poppins}>{firsts.length > 1 ? c.draw : own?.place === 1 ? c.won : c.lost}</p>
          <p className="mt-1 text-5xl font-black tabular-nums" style={poppins}>{view.seats[me].score} – {view.seats[rival].score}</p>
          {seats[rival]?.status === "withdrawn" && <p className="mt-2 text-sm text-white/80">{c.rivalLeft}</p>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          {[me, rival].map((seat) => (
            <div key={seat} className="rounded-2xl border border-white/10 px-3 py-3">
              <p className="truncate text-xs font-bold text-white/70">{seat === me ? c.you : seats[seat]?.name}</p>
              <p className="mt-1 text-2xl font-black tabular-nums" style={poppins}>{view.seats[seat].right}/{view.total}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/55">{t.rightStat}</p>
              <p className="mt-1 text-[11px] font-bold text-white/45">{view.seats[seat].jokersUsed.map((j) => (j === "double" ? "×2" : "✂")).join(" ")}</p>
            </div>
          ))}
        </div>
        <div className="flex-1" />
        <GreenButton className="mt-6" onClick={onRoom}>{c.backToRoom}</GreenButton>
        <QuietButton className="mt-3" onClick={onExit}>{c.exit}</QuietButton>
      </div>
    </Frame>
  );
}

/** The room runtime's screens: the server view, drawn by the same board and results the playground shows. */
export const datoFalsoScreens: RoomGameScreens<DatoFalsoServerView, DfCommand> = {
  brand: (locale) => datoFalsoCopy(locale).brand,
  Board: ({ view, ...rest }) => <DatoFalsoBoard view={toRoomView(view)} {...rest} />,
  Results: ({ view, ...rest }) => <DatoFalsoResults view={toRoomView(view)} {...rest} />,
  wide: (view) => view.seats.length > 2,
};

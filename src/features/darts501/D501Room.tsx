"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Target } from "lucide-react";
import { aproximadoCopy } from "@/features/aproximado/aproximado.copy";
import { DuelAvatar } from "@/features/duel/DuelAvatar";
import { SuggestBox, type SuggestLookup } from "@/features/tenable/SuggestBox";
import { wordSharedCopy } from "@/features/wordgames/copy";
import { PartyPage, PartyResults, scoreSourceAttr, toPartyStandings, useScoreFlights, type WordSeat } from "@/features/wordgames/party";
import { wordSeats, type RoomConnection, type RoomGameScreens } from "@/features/wordgames/RoomGameShell";
import { CountIn, Frame, GreenButton, QuietButton, Sheet, TimeBar, TopBar, poppins, useResendRetained } from "@/features/wordgames/ui";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";
import { cn } from "@/lib/utils";
import { DartFeedback, DartLog, Dartboard, useCountTo } from "./D501Board";
import { CategoryCard } from "./D501Solo";
import { d501Copy } from "./d501.copy";
import { checkoutWindow } from "./d501.rules";
import { d501Places, type D501Command, type D501Seat, type D501View } from "./d501.view";

export type D501RoomLink = Pick<RoomConnection<D501Command>, "send" | "nowMs" | "inFlight" | "retained" | "connected" | "resendRetained" | "leave">;

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

/** One scoreboard row, TV-darts style: legs won, darts left, what is left. */
function Row({ seat, info, me, active, maxDarts, legsToWin, name, locale }: { seat: WordSeat; info: D501Seat; me: boolean; active: boolean; maxDarts: number; legsToWin: number; name: string; locale: string }) {
  const c = d501Copy(locale);
  const shown = useCountTo(info.remaining);
  const done = info.remaining <= 0;
  // My finished row turns green with dark text; a rival's stays blue (seat colours), ringed in yellow.
  const out = done && me;
  return (
    <li data-d501-seat={info.seat} data-active={active || undefined}
      className={cn("relative flex items-center gap-2.5 rounded-2xl px-3 py-2 transition-colors", done ? (me ? "bg-brand-green text-black" : "bg-brand-blue ring-2 ring-brand-yellow") : active ? (me ? "bg-brand-green/15 ring-2 ring-brand-green" : "bg-brand-blue/25 ring-2 ring-brand-blue") : "bg-white/[0.05]", info.status === "withdrawn" && "opacity-50")}>
      {active && !out && <motion.span layoutId="d501-throw" className={cn("absolute -left-1.5 top-1/2 size-3 -translate-y-1/2 rounded-full", me ? "bg-brand-green" : "bg-brand-blue")} aria-hidden />}
      <DuelAvatar customization={seat.avatar} size="xs" />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-xs font-bold", out ? "text-black/80" : "text-white/80")}>{name}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="flex gap-1" aria-hidden>
            {Array.from({ length: legsToWin }, (_, i) => <span key={i} className={cn("size-2 rounded-full", i < info.legsWon ? "bg-brand-yellow" : out ? "bg-black/20" : "bg-white/20")} />)}
          </span>
          <span className={cn("flex items-center gap-0.5 text-[10px] font-bold tabular-nums", out ? "text-black/60" : "text-white/45")} aria-hidden><Target className="size-3" aria-hidden />{maxDarts - info.dartsUsed}</span>
          <span className="sr-only">{c.legsDetail(info.legsWon)} · {c.dartsLeft(Math.max(0, maxDarts - info.dartsUsed))}</span>
        </div>
      </div>
      <span className="text-3xl font-black tabular-nums leading-none" style={poppins}>{shown}</span>
    </li>
  );
}

export function D501Board({ view, snapshot, room, locale, error, lookup }: { view: D501View; snapshot: RoomStatePayload; room: D501RoomLink; locale: string; error: string | null; lookup?: SuggestLookup }) {
  const c = wordSharedCopy(locale);
  const t = d501Copy(locale);
  const roomCopy = aproximadoCopy(locale);
  // A benched seat throws no more and ranks with the seats that left (as the server's standings do).
  const seatRows = useMemo(() => view.seats.map((s) => ({ seat: s.seat, status: s.benched ? "withdrawn" as const : s.status, score: s.legsWon })), [view.seats]);
  const seats = useMemo(() => wordSeats(snapshot, seatRows), [snapshot, seatRows]);
  const me = view.mySeat;
  const duel = view.format === "duel";
  const myTurn = view.phase === "turn" && view.turn === me;
  const msLeft = useMsLeft(view.deadline, room.nowMs);
  const secs = Math.ceil(msLeft / 1000);
  const seatOf = (seat: number) => seats.find((s) => s.seat === seat);
  const nameOf = (seat: number) => (seat === me ? c.you : seatOf(seat)?.name ?? "—");
  const unconfirmed = useResendRetained(room);
  const busy = room.inFlight > 0 || unconfirmed;
  const [leaving, setLeaving] = useState(false);
  const legsToWin = duel ? Math.floor(view.legs / 2) + 1 : view.legs;
  const gains = useMemo(() => view.seats.map((s) => (view.phase === "legEnd" && view.legEnd?.winner === s.seat ? 1 : 0)), [view.seats, view.phase, view.legEnd]);
  const { flights, holding } = useScoreFlights(!duel && view.phase === "legEnd" ? `l${view.leg}` : null, gains);

  const thrower = view.turn !== null ? view.seats[view.turn] : null;
  const window_ = thrower && thrower.remaining > 0 ? checkoutWindow(thrower.remaining) : null;
  const top = (
    <TopBar wrap brand={t.brand} seconds={view.phase === "turn" ? secs : null} exitLabel={c.leave} onExit={() => setLeaving(true)}
      right={<span className="shrink-0 text-[11px] font-black uppercase tracking-wide text-white/55">{t.legOf(view.leg + 1, view.legs)}</span>} />
  );
  const board = (
    <ol className="mt-3 space-y-1.5">
      {view.seats.map((info) => {
        const seat = seatOf(info.seat);
        if (!seat) return null;
        const name = info.benched ? `${nameOf(info.seat)} · ${t.benched}` : info.status === "away" ? `${nameOf(info.seat)} · ${c.away}` : info.status === "withdrawn" ? `${nameOf(info.seat)} · ${c.left}` : nameOf(info.seat);
        return <Row locale={locale} key={info.seat} seat={seat} info={info} me={info.seat === me} active={view.phase === "turn" && view.turn === info.seat} maxDarts={view.maxDarts} legsToWin={legsToWin} name={name} />;
      })}
    </ol>
  );
  const turnSeat = view.turn !== null ? seatOf(view.turn) : null;
  const turnCard = view.phase === "turn" && view.turn !== null && (
    <div data-d501-turn={myTurn ? "me" : "other"} className={cn("mt-3 rounded-2xl px-4 py-2.5 text-white shadow-lg shadow-black/20", myTurn ? "bg-brand-green" : "bg-brand-blue")}>
      <div className="flex min-w-0 items-center gap-2 text-sm font-black uppercase leading-snug tracking-wide" style={poppins}>
        {!myTurn && turnSeat && <DuelAvatar customization={turnSeat.avatar} size="xs" />}
        <span className={cn("min-w-0 flex-1 truncate", myTurn && "text-black")}>{myTurn ? t.yourTurn : t.seatTurn(nameOf(view.turn))}</span>
        {thrower && <span className={cn("shrink-0 text-lg tabular-nums", myTurn && "text-black")}>{thrower.remaining}</span>}
      </div>
      <p className={cn("mt-1 flex items-center gap-1.5 text-xs font-bold", myTurn ? "text-black/75" : "text-white/80")}>
        <Target className="size-3.5 shrink-0" aria-hidden />{window_ ? t.window(window_.low, window_.high) : t.maxHint}
        {window_ && view.outs != null && <span className={cn("ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px]", myTurn ? "bg-black/15" : "bg-white/15")}>{t.outs(view.outs)}</span>}
      </p>
      <TimeBar className="mt-2" share={msLeft / view.turnMs} urgent={msLeft <= 5_000} />
    </div>
  );
  const last = view.last;
  const leader = view.finishing.length > 0 ? view.finishing.reduce((a, b) => (b.at > a.at ? b : a)) : null;
  const feedbackLine = view.phase === "turn" && (
    <div className="mt-2">
      {leader && <p data-d501-finishing className="mb-2 rounded-xl bg-brand-yellow px-3 py-2 text-sm font-bold text-black">{t.lastThrows(nameOf(leader.seat), leader.at)}</p>}
      <DartFeedback locale={locale} last={last} mine={last?.by === me} prefix={last && last.by !== me ? nameOf(last.by) : undefined} />
      {error && <p role="alert" className="mt-1 text-sm font-semibold text-brand-red-light">{roomCopy.errors[error] ?? roomCopy.errors.default}</p>}
    </div>
  );
  const legHeadline = view.legEnd?.winner === me ? t.legWonYou : view.legEnd?.winner != null ? t.legWon(nameOf(view.legEnd.winner)) : t.legOut;
  const legEnd = view.phase === "legEnd" && view.legEnd && (
    <section aria-live="polite" aria-label={legHeadline} className={cn("mt-3 rounded-2xl px-4 py-3 shadow-lg shadow-black/20", view.legEnd.winner === me ? "bg-brand-green text-black" : "bg-brand-blue text-white")}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xl font-black" style={poppins}>{legHeadline}</p>
        <p className="shrink-0 text-xs font-bold uppercase tracking-wide opacity-75">{t.legOf(view.leg + 1, view.legs)}</p>
      </div>
      {view.legEnd.reason === "darts" && <p className="mt-1 text-sm font-semibold opacity-80">{t.legNoCheckout}</p>}
      {!duel && view.legEnd.winner !== null && <span {...scoreSourceAttr(view.legEnd.winner)} className="mt-2 inline-block rounded-full bg-brand-yellow px-2.5 py-0.5 text-xs font-black text-black" style={poppins}>+1</span>}
      {!view.final && <p className="mt-2 text-sm opacity-80">{t.nextLeg}</p>}
    </section>
  );
  const answerBox = view.phase === "turn" && (
    <SuggestBox className={cn("z-20", !duel && "bottom-[104px] lg:bottom-0")} kind={view.current.kind} release={view.current.release} locale={locale} lookup={lookup}
      placeholder={t.placeholder} say={t.say} disabled={!myTurn || busy || !room.connected} note={busy ? t.sending : !room.connected ? c.offline : t.waiting}
      onSubmit={(text, pick) => room.send({ type: "throw", epoch: view.epoch, attempt: view.attempt, text, pick })} />
  );
  const leaveSheet = leaving && (
    <Sheet label={c.leave} asks>
      <p className="text-lg font-black" style={poppins}>{c.leaveConfirm}</p>
      <GreenButton className="mt-5" onClick={() => setLeaving(false)}>{c.leaveNo}</GreenButton>
      <QuietButton className="mt-3" onClick={() => { setLeaving(false); room.leave(); }}>{c.leaveYes}</QuietButton>
    </Sheet>
  );
  const middle = (
    <>
      {view.phase === "intro" && <CountIn label={c.startsIn} value={Math.max(1, secs)} />}
      <CategoryCard className="mt-3" locale={locale} category={view.current} />
      {board}
      {turnCard}
      {feedbackLine}
      {legEnd}
      <div className="mt-3 flex items-start gap-3">
        <Dartboard darts={view.darts} className="hidden size-24 shrink-0 sm:block" />
        <DartLog className="min-w-0 flex-1" locale={locale} darts={view.darts} who={nameOf} limit={3} />
      </div>
      <div className="flex-1" />
      {answerBox}
    </>
  );

  if (!duel) {
    const places = d501Places(view.seats);
    const rankOf = (seat: number) => places.get(seat) ?? view.seats.length;
    const standings = toPartyStandings({
      seats, mySeat: me, answered: (seat) => view.phase !== "turn" || view.turn !== seat, labels: { away: c.away, left: c.left },
      hold: holding ? gains : null, gains: view.phase === "legEnd" && !holding ? gains : null,
    }).map((row) => {
      const seat = Number(row.userId.replace("seat-", ""));
      const rank = rankOf(seat);
      return { ...row, rank, isLeader: row.isLeader && rank === 1, statusLabel: view.seats[seat]?.benched ? t.benched : row.statusLabel };
    }).sort((a, b) => a.rank - b.rank);
    return (
      <>
        {top}
        <PartyPage standings={standings} flights={flights} resolved={view.phase === "legEnd"}>{middle}</PartyPage>
        {leaveSheet}
      </>
    );
  }
  return (
    <div className="flex flex-1 flex-col">
      {top}
      {middle}
      {leaveSheet}
    </div>
  );
}

export function D501Results({ view, snapshot, locale, onRoom, onExit }: { view: D501View; snapshot: RoomStatePayload; locale: string; onRoom: () => void; onExit: () => void }) {
  const c = wordSharedCopy(locale);
  const t = d501Copy(locale);
  const seats = wordSeats(snapshot, view.seats.map((s) => ({ seat: s.seat, status: s.status, score: s.legsWon })));
  const table = view.standings ?? [];
  const me = view.mySeat;
  const own = table.find((r) => r.seat === me);
  const firsts = table.filter((r) => r.place === 1);
  if (view.format === "party") {
    return (
      <PartyResults seats={seats} standings={table} mySeat={me} headline={own?.place === 1 ? (firsts.length > 1 ? c.tieFirst : c.youWon) : c.youPlace(own?.place ?? table.length)}
        statLabel={t.legsStat} detail={(row) => t.endLeft(view.seats[row.seat]?.leftTotal ?? 0)} leftLabel={c.left} onRoom={onRoom} onExit={onExit} />
    );
  }
  const rival = me === 0 ? 1 : 0;
  const won = own?.place === 1 && firsts.length === 1;
  return (
    <Frame lang={locale}>
      <div className="flex flex-1 flex-col">
        <div className={cn("mt-4 rounded-3xl px-5 pb-5 pt-4 text-center", won ? "bg-brand-green text-black" : "bg-brand-blue")}>
          <p className="text-xs font-black uppercase tracking-[0.2em] opacity-75">{t.brand.join(" ")}</p>
          <p className="mt-2 text-3xl font-black" style={poppins}>{firsts.length > 1 ? c.draw : won ? c.won : c.lost}</p>
          <p className="mt-1 text-5xl font-black tabular-nums" style={poppins}>{view.seats[me].legsWon} – {view.seats[rival].legsWon}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide opacity-70">{t.legsStat}</p>
          {seats[rival]?.status === "withdrawn" && <p className="mt-2 text-sm opacity-80">{c.rivalLeft}</p>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          {[me, rival].map((seat) => (
            <div key={seat} className="rounded-2xl border border-white/10 px-3 py-3">
              <p className="truncate text-xs font-bold text-white/70">{seat === me ? c.you : seats[seat]?.name}</p>
              <p className="mt-1 text-2xl font-black tabular-nums" style={poppins}>{view.seats[seat].leftTotal}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/55">{t.left}</p>
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

export const d501Screens: RoomGameScreens<D501View, D501Command> = {
  brand: (locale) => d501Copy(locale).brand,
  Board: D501Board,
  Results: D501Results,
  wide: (view) => view.format === "party",
};

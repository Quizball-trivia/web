"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { aproximadoCopy } from "@/features/aproximado/aproximado.copy";
import { DuelAvatar } from "@/features/duel/DuelAvatar";
import { GameFeedbackSlot } from "@/features/feedback/GameFeedback";
import { wordSharedCopy } from "@/features/wordgames/copy";
import { PartyPage, PartyResults, scoreSourceAttr, toPartyStandings, useScoreFlights } from "@/features/wordgames/party";
import { wordSeats, type RoomConnection, type RoomGameScreens } from "@/features/wordgames/RoomGameShell";
import { CountIn, Frame, GreenButton, QuietButton, RefusedReports, SeatCard, Sheet, TimeBar, TopBar, poppins, useRefused, useResendRetained } from "@/features/wordgames/ui";
import { SuggestBox, type SuggestLookup } from "./SuggestBox";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";
import { cn } from "@/lib/utils";
import { sendTenableFeedback } from "./tenable.api";
import { tenableCopy } from "./tenable.copy";
import { Lives, TenableTower } from "./TenableTower";
import type { TenableCommand, TenableView } from "./tenable.view";

/** What the board needs from the room connection (the playground hands in a stand-in). */
export type TenableRoomLink = Pick<RoomConnection<TenableCommand>, "send" | "nowMs" | "inFlight" | "retained" | "connected" | "resendRetained" | "leave" | "report">;

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

export function TenableBoard({ view, snapshot, room, locale, error, lookup }: { view: TenableView; snapshot: RoomStatePayload; room: TenableRoomLink; locale: string; error: string | null; lookup?: SuggestLookup }) {
  const c = wordSharedCopy(locale);
  const t = tenableCopy(locale);
  const roomCopy = aproximadoCopy(locale);
  const seatRows = useMemo(() => view.seats.map((s) => ({ seat: s.seat, status: s.status, score: s.score })), [view.seats]);
  const seats = useMemo(() => wordSeats(snapshot, seatRows), [snapshot, seatRows]);
  const me = view.mySeat;
  const duel = view.format === "duel";
  const rival = duel ? (me === 0 ? 1 : 0) : -1;
  const myTurn = view.phase === "turn" && view.turn === me;
  const msLeft = useMsLeft(view.deadline, room.nowMs);
  const secs = Math.ceil(msLeft / 1000);
  const seatOf = (seat: number) => seats.find((s) => s.seat === seat);
  const nameOf = (seat: number) => (seat === me ? c.you : seatOf(seat)?.name ?? "—");
  const unconfirmed = useResendRetained(room);
  const busy = room.inFlight > 0 || unconfirmed;
  const [leaving, setLeaving] = useState(false);
  const gains = useMemo(() => view.seats.map((s) => (view.phase === "listEnd" ? view.listPoints?.[s.seat] ?? 0 : 0)), [view.seats, view.phase, view.listPoints]);
  const { flights, holding } = useScoreFlights(!duel && view.phase === "listEnd" ? `l${view.list}` : null, gains);

  // My answers this list refused (a real footballer read as not on the list): reportable once the list is revealed.
  const refused = useRefused();
  const lastSaid = view.last;
  useEffect(() => {
    if (lastSaid && lastSaid.seat === me && lastSaid.kind === "wrong") refused.add(view.list, lastSaid.text);
    // Keyed on the turn and attempt: one entry per refused answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSaid?.epoch, lastSaid?.attempt, lastSaid?.kind, me, view.list]);
  const reports = view.phase === "listEnd" && (
    <RefusedReports className="mt-3" texts={refused.of(view.list)} line={(text) => t.wrong(text)} label={c.iWasRight} thanks={c.reported}
      onReport={(text) => Promise.resolve(room.report(view.list, text))} />
  );

  const f = view.last;
  const feedback = f && view.phase === "turn" && (() => {
    const mine = f.seat === me;
    const slotName = f.rank !== null ? view.slots[f.rank - 1]?.name ?? f.text : f.text;
    if (f.kind === "right" && f.rank !== null) return { tone: "ok" as const, text: `${nameOf(f.seat)}: ${t.ok(slotName, f.rank)}` };
    if (f.kind === "wrong") return { tone: "bad" as const, text: mine ? t.wrong(f.name ?? f.text) : `${t.lifeLost(nameOf(f.seat))} · ${t.wrong(f.name ?? f.text)}` };
    if (f.kind === "time") return { tone: "bad" as const, text: `${t.lifeLost(nameOf(f.seat))} · ${t.time}` };
    if (!mine) return null;
    return { tone: "warn" as const, text: f.kind === "repeat" ? t.repeat(f.name ?? f.text) : f.kind === "unknown" ? t.unknown(f.text) : t.ambiguous(f.text) };
  })();
  const fresh = f?.kind === "right" ? f.rank : null;

  const top = (
    <TopBar brand={t.brand} seconds={view.phase === "turn" ? secs : null} exitLabel={c.leave} onExit={() => setLeaving(true)}
      right={<span className="shrink-0 text-[11px] font-black uppercase tracking-wide text-white/55">{t.listOf(view.list + 1, view.lists)}</span>} />
  );
  const turnSeat = view.turn !== null ? seatOf(view.turn) : null;
  const turnCard = view.phase === "turn" && view.turn !== null && (
    <div data-tenable-turn={myTurn ? "me" : "other"} className={cn("mt-3 rounded-2xl px-4 py-2.5 text-white shadow-lg shadow-black/20", myTurn ? "bg-brand-green" : "bg-brand-blue")}>
      <div className="flex min-w-0 items-center gap-2 text-sm font-black uppercase leading-snug tracking-wide" style={poppins}>
        {!myTurn && turnSeat && <DuelAvatar customization={turnSeat.avatar} size="xs" />}
        <span className={cn("min-w-0 flex-1 truncate", myTurn && "text-black")}>{myTurn ? t.yourTurn : t.seatTurn(nameOf(view.turn))}</span>
        {!duel && <Lives lives={view.seats[view.turn].lives} max={view.maxLives} label={t.livesLeft(view.seats[view.turn].lives)} small />}
      </div>
      <TimeBar className="mt-2" share={msLeft / view.turnMs} urgent={msLeft <= 5_000} />
    </div>
  );
  const feedbackLine = view.phase === "turn" && (
    <div className="mt-2 min-h-6" aria-live="polite">
      <AnimatePresence mode="wait">
        {feedback && f && (
          <motion.p key={`${f.epoch}-${f.attempt}`} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0, x: feedback.tone === "bad" ? [0, -6, 6, -3, 0] : 0 }} exit={{ opacity: 0 }}
            className={cn("flex items-center gap-1.5 text-sm font-bold", feedback.tone === "ok" ? "text-white" : feedback.tone === "bad" ? "text-brand-red-light" : "text-brand-yellow")}>
            {feedback.tone === "ok" && <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-green"><Check className="size-3.5 text-black" strokeWidth={3} /></span>}
            <span className="min-w-0 truncate">{feedback.text}</span>
          </motion.p>
        )}
      </AnimatePresence>
      {error && <p role="alert" className="mt-1 text-sm font-semibold text-brand-red-light">{roomCopy.errors[error] ?? roomCopy.errors.default}</p>}
    </div>
  );
  const tower = view.phase !== "intro" && (
    <div className="mt-3">
      <TenableTower list={view.current} slots={view.slots} mySeat={me} fresh={view.phase === "turn" ? fresh : null} hiddenLabel={t.hidden} asOfLabel={t.asOf} compact dense={!duel}
        finder={(seat) => seatOf(seat)?.avatar ?? null} />
    </div>
  );
  const outOfLives = view.seats[me].lives === 0;
  const waitingNote = outOfLives ? t.youOut : busy ? t.sending : !room.connected ? c.offline : t.waiting;
  const answerBox = view.phase === "turn" && (
    // On phones the party standings bar is pinned to the bottom: the answer box sticks above it.
    <SuggestBox className={cn("z-20", !duel && "bottom-[104px] lg:bottom-0")} kind={view.current.kind} release={view.current.release} lookup={lookup}
      placeholder={t.placeholder} say={t.say} disabled={!myTurn || busy || !room.connected} note={waitingNote}
      onSubmit={(text, pick) => room.send({ type: "answer", epoch: view.epoch, attempt: view.attempt, text, pick })} />
  );
  const leaveSheet = leaving && (
    <Sheet label={c.leave} asks>
      <p className="text-lg font-black" style={poppins}>{c.leaveConfirm}</p>
      <GreenButton className="mt-5" onClick={() => setLeaving(false)}>{c.leaveNo}</GreenButton>
      <QuietButton className="mt-3" onClick={() => { setLeaving(false); room.leave(); }}>{c.leaveYes}</QuietButton>
    </Sheet>
  );
  const listHeadline = view.listEnd?.reason === "complete" ? t.listDone : t.listOut;

  if (!duel) {
    const standings = toPartyStandings({
      seats, mySeat: me, answered: (seat) => view.phase !== "turn" || view.turn !== seat, labels: { away: c.away, left: c.left },
      hold: holding ? gains : null, gains: view.phase === "listEnd" && !holding ? gains : null,
    }).map((row) => {
      const seat = seats.find((s) => `seat-${s.seat}` === row.userId);
      const out = seat && view.phase === "turn" && seat.status === "in" && view.seats[seat.seat].lives === 0;
      return out ? { ...row, status: "dropped" as const, statusLabel: t.outOfList } : row;
    });
    return (
      <>
        {top}
        <PartyPage standings={standings} flights={flights} resolved={view.phase === "listEnd"}>
          {view.phase === "intro" && <CountIn label={c.startsIn} value={Math.max(1, secs)} />}
          {turnCard}
          {feedbackLine}
          {view.phase === "listEnd" && (
            <div className="mt-3 rounded-2xl bg-brand-blue px-4 py-4 text-white shadow-lg shadow-black/20">
              <p className="text-xs font-bold uppercase tracking-wide text-white/75">{t.listOf(view.list + 1, view.lists)}</p>
              <p className="mt-1 text-2xl font-black" style={poppins}>{listHeadline}</p>
              <ul className="mt-3 space-y-1.5">
                {seats.filter((s) => s.status !== "withdrawn").sort((a, b) => gains[b.seat] - gains[a.seat] || a.seat - b.seat).map((s) => (
                  <li key={s.seat} className={cn("flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm font-semibold", s.seat === me ? "bg-white/20" : "bg-white/10", gains[s.seat] === 0 && "opacity-70")}>
                    <DuelAvatar customization={s.avatar} size="xs" />
                    <span className="min-w-0 flex-1 truncate">{nameOf(s.seat)}</span>
                    <span {...scoreSourceAttr(s.seat)} className={cn("rounded-full px-2.5 py-0.5 text-xs font-black tabular-nums", gains[s.seat] > 0 ? "bg-brand-yellow text-black" : "bg-white/15 text-white/70")} style={poppins}>+{gains[s.seat]}</span>
                  </li>
                ))}
              </ul>
              {reports}
              {!view.final && <p className="mt-3 text-sm text-white/75">{t.nextList}</p>}
            </div>
          )}
          {tower}
          <div className="flex-1" />
          {answerBox}
        </PartyPage>
        {leaveSheet}
      </>
    );
  }

  const mine = seatOf(me);
  const theirs = seatOf(rival);
  return (
    <div className="flex flex-1 flex-col">
      {top}
      <div className="mt-3 flex gap-2">
        {mine && <SeatCard name={c.you} avatar={mine.avatar} tone="you" active={myTurn} score={mine.score} marks={<Lives lives={view.seats[me].lives} max={view.maxLives} label={t.livesLeft(view.seats[me].lives)} small />} />}
        {theirs && <SeatCard name={theirs.status === "away" ? `${theirs.name} · ${c.away}` : theirs.name} avatar={theirs.avatar} tone="rival" active={view.phase === "turn" && view.turn === rival} score={theirs.score}
          marks={<Lives lives={view.seats[rival].lives} max={view.maxLives} label={t.livesLeft(view.seats[rival].lives)} small />} />}
      </div>
      {view.phase === "intro" && <CountIn label={c.startsIn} value={Math.max(1, secs)} />}
      {turnCard}
      {feedbackLine}
      {view.phase === "listEnd" && (
        <section aria-live="polite" aria-label={listHeadline} className="mt-3 rounded-2xl bg-brand-blue px-4 py-3 text-white shadow-lg shadow-black/20">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xl font-black" style={poppins}>{listHeadline}</p>
            <p className="shrink-0 text-xs font-bold uppercase tracking-wide text-white/75">{t.listOf(view.list + 1, view.lists)}</p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center">
            {[me, rival].map((seat) => (
              <div key={seat} className="rounded-xl bg-white/10 px-3 py-2">
                <p className="truncate text-xs font-bold text-white/75">{nameOf(seat)}</p>
                <p className="text-xl font-black tabular-nums" style={poppins}>+{gains[seat]}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-sm text-white/80"><span className="font-black tabular-nums" style={poppins}>{view.seats[me].score} – {view.seats[rival].score}</span>{!view.final && <> · {t.nextList}</>}</p>
          {reports}
        </section>
      )}
      {tower}
      {view.phase === "turn" && <div className="flex-1" />}
      {answerBox}
      {leaveSheet}
    </div>
  );
}

export function TenableResults({ view, snapshot, locale, onRoom, onExit }: { view: TenableView; snapshot: RoomStatePayload; locale: string; onRoom: () => void; onExit: () => void }) {
  const c = wordSharedCopy(locale);
  const t = tenableCopy(locale);
  const seats = wordSeats(snapshot, view.seats.map((s) => ({ seat: s.seat, status: s.status, score: s.score })));
  const table = view.standings ?? [];
  const me = view.mySeat;
  const own = table.find((r) => r.seat === me);
  const firsts = table.filter((r) => r.place === 1);
  const feedback = <GameFeedbackSlot className="mt-4" game="tenable" title={t.title} locale={locale} send={(answer) => sendTenableFeedback("room", answer, locale)} />;
  if (view.format === "party") {
    return (
      <PartyResults seats={seats} standings={table} mySeat={me} headline={own?.place === 1 ? (firsts.length > 1 ? c.tieFirst : c.youWon) : c.youPlace(own?.place ?? table.length)}
        statLabel={t.foundStat} detail={(row) => t.slotsDetail(view.seats[row.seat]?.found ?? 0)} leftLabel={c.left} onRoom={onRoom} onExit={onExit}
        footer={<div className="mx-auto w-full max-w-md pb-4">{feedback}</div>} />
    );
  }
  const rival = me === 0 ? 1 : 0;
  return (
    <Frame lang={locale}>
      <div className="flex flex-1 flex-col">
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
              <p className="mt-1 text-2xl font-black tabular-nums" style={poppins}>{view.seats[seat].found}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/55">{t.foundStat}</p>
            </div>
          ))}
        </div>
        <div className="flex-1" />
        <GreenButton className="mt-6" onClick={onRoom}>{c.backToRoom}</GreenButton>
        <QuietButton className="mt-3" onClick={onExit}>{c.exit}</QuietButton>
        {feedback}
      </div>
    </Frame>
  );
}

export const tenableScreens: RoomGameScreens<TenableView, TenableCommand> = {
  brand: (locale) => tenableCopy(locale).brand,
  Board: TenableBoard,
  Results: TenableResults,
  wide: (view) => view.format === "party",
};

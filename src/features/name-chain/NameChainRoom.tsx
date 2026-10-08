"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Crown } from "lucide-react";
import { aproximadoCopy } from "@/features/aproximado/aproximado.copy";
import { DuelAvatar } from "@/features/duel/DuelAvatar";
import { nameChainCopy, wordSharedCopy } from "@/features/wordgames/copy";
import { PartyPage, PartyResults, scoreSourceAttr, toPartyStandings, useScoreFlights } from "@/features/wordgames/party";
import { wordSeats, type RoomConnection, type RoomGameScreens } from "@/features/wordgames/RoomGameShell";
import { AnswerBox, Chips, CountIn, Dots, Frame, GreenButton, QuietButton, RefusedReports, SeatCard, Sheet, TimeBar, TopBar, poppins, useRefused, useResendRetained } from "@/features/wordgames/ui";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";
import { cn } from "@/lib/utils";
import type { NameChainCommand, NameChainView } from "./nameChain.view";

/** Milliseconds until `deadlineIso` on the server's clock, refreshed often enough for a smooth bar. */
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

/** A name with the letter the chain hangs on picked out. */
function Lettered({ name, className }: { name: string; className?: string }) {
  const letters = [...name];
  const at = letters.length - 1 - [...letters].reverse().findIndex((ch) => /\p{L}/u.test(ch));
  return (
    <span className={className} style={poppins}>
      {letters.map((ch, i) => <span key={i} className={i === at ? "text-brand-yellow" : undefined}>{ch}</span>)}
    </span>
  );
}

function Board({ view, snapshot, room, locale, error }: { view: NameChainView; snapshot: RoomStatePayload; room: RoomConnection<NameChainCommand>; locale: string; error: string | null }) {
  const c = wordSharedCopy(locale);
  const g = nameChainCopy(locale);
  const roomCopy = aproximadoCopy(locale);
  const seatScores = useMemo(() => view.seats.map((s) => ({ seat: s.seat, status: s.status, score: s.score })), [view.seats]);
  const seats = useMemo(() => wordSeats(snapshot, seatScores), [snapshot, seatScores]);
  const me = view.mySeat;
  const duel = view.format === "duel";
  const rival = duel ? (me === 0 ? 1 : 0) : -1;
  const myTurn = view.phase === "turn" && view.turn === me;
  const msLeft = useMsLeft(view.deadline, room.nowMs);
  const secs = Math.ceil(msLeft / 1000);
  const current = view.chain.at(-1) ?? null;
  const seatOf = (seat: number) => seats.find((s) => s.seat === seat);
  const nameOf = (seat: number) => (seat === me ? c.you : seatOf(seat)?.name ?? "—");
  const who = (by: number | null) => (by === null ? g.supplied : nameOf(by));
  const unconfirmed = useResendRetained(room);
  const busy = room.inFlight > 0 || unconfirmed;
  const [leaving, setLeaving] = useState(false);
  const refused = useRefused();
  const lastSaid = view.last;
  useEffect(() => {
    if (lastSaid && lastSaid.seat === me && lastSaid.kind === "unknown") refused.add(view.round, lastSaid.text);
    // Keyed on the turn and attempt: one entry per refused answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSaid?.epoch, lastSaid?.attempt, lastSaid?.kind, me, view.round]);
  const reports = view.phase === "roundEnd" && (
    <RefusedReports className="mt-3" texts={refused.of(view.round)} line={g.unknown} label={c.iWasRight} thanks={c.reported}
      onReport={(text) => Promise.resolve(room.report(0, text))} />
  );

  // The round's point flies from the result card into the standings.
  const gain = useMemo(() => view.seats.map((s) => (view.phase === "roundEnd" && view.roundWinner === s.seat ? 1 : 0)), [view.seats, view.phase, view.roundWinner]);
  const { flights, holding } = useScoreFlights(!duel && view.phase === "roundEnd" && view.roundWinner !== null ? `r${view.round}` : null, gain);

  const f = view.last;
  const feedback = f && (() => {
    const mine = f.seat === me;
    const name = f.name ?? f.text;
    if (f.kind === "ok") return { tone: "ok" as const, text: `${nameOf(f.seat)}: ${name}` };
    if (!mine) return null;
    if (f.kind === "unknown") return { tone: "bad" as const, text: g.unknown(f.text) };
    if (f.kind === "repeat") return { tone: "bad" as const, text: g.repeat(name) };
    return { tone: "bad" as const, text: g.letter(name, f.starts.join(" / ") || "?", view.letter) };
  })();
  const fresh = view.phase === "turn" && view.chain.length > 1 && current?.by === null;
  const lostReason = (reason: "time" | "pass" | "left") => (reason === "time" ? g.time : reason === "pass" ? g.passed : g.leftTurn);

  const nameCard = view.phase !== "intro" && current && (
    <div className="mt-3 rounded-2xl border border-white/10 px-4 py-4 text-center">
      <p className="text-[11px] font-black uppercase tracking-wide text-white/55">{who(current.by)}</p>
      <AnimatePresence mode="wait">
        <motion.div key={`${view.chain.length}-${current.name}`} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
          <Lettered name={current.game} className="mt-1 block break-words text-4xl font-black uppercase leading-tight" />
          {current.name !== current.game && <p className="mt-1 text-sm text-white/60">{current.name}</p>}
        </motion.div>
      </AnimatePresence>
      <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide text-white/60">
        {g.nextLetter}<ArrowRight className="size-3.5" aria-hidden />
        <span data-chain-letter className="flex size-9 items-center justify-center rounded-xl bg-brand-yellow text-xl font-black text-black" style={poppins}>{view.letter}</span>
      </div>
    </div>
  );
  const turnSeat = view.turn !== null ? seatOf(view.turn) : null;
  const turnCard = view.phase === "turn" && view.turn !== null && (
    <div className={cn("mt-3 rounded-2xl px-4 py-3 text-white shadow-lg shadow-black/20", myTurn ? "bg-brand-green" : "bg-brand-blue")}>
      <div className="flex min-w-0 items-center gap-2 text-sm font-black uppercase leading-snug tracking-wide" style={poppins}>
        {!myTurn && turnSeat && <DuelAvatar customization={turnSeat.avatar} size="xs" />}
        <span>{myTurn ? g.yourTurn(view.letter) : g.seatTurn(nameOf(view.turn), view.letter)}</span>
      </div>
      <TimeBar className="mt-2" share={msLeft / view.turnMs} urgent={msLeft <= 5_000} />
    </div>
  );
  const feedbackLine = view.phase === "turn" && (
    <div className="mt-3 min-h-6" aria-live="polite">
      <AnimatePresence mode="wait">
        {feedback && f && (
          <motion.p key={`${f.epoch}-${f.attempt}`} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0, x: feedback.tone === "ok" ? 0 : [0, -6, 6, -3, 0] }} exit={{ opacity: 0 }}
            className={cn("flex items-center gap-1.5 text-sm font-bold", feedback.tone === "ok" ? "text-white" : "text-brand-red-light")}>
            {feedback.tone === "ok" && <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-green"><Check className="size-3.5" strokeWidth={3} /></span>}
            {feedback.text}
          </motion.p>
        )}
      </AnimatePresence>
      {!duel && view.ended && view.seats.filter((s) => s.alive).length > 1 && <p className="mt-1 text-xs font-semibold text-brand-red-light">{g.knocked(nameOf(view.ended.seat))} · {lostReason(view.ended.reason)}</p>}
      {fresh && <p className="mt-1 text-xs font-semibold text-brand-yellow">{g.fresh}</p>}
      {error && <p role="alert" className="mt-1 text-sm font-semibold text-brand-red-light">{roomCopy.errors[error] ?? roomCopy.errors.default}</p>}
    </div>
  );
  const chips = view.phase === "turn" && (
    <ul className="mt-2 flex flex-wrap items-center gap-1.5" aria-label={g.chainTitle}>
      {view.chain.slice(-10, -1).map((link, i) => (
        <li key={`${i}-${link.name}`} className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold text-white", link.by === null ? "border-white/25 bg-white/10" : link.by === me ? "border-brand-green/60 bg-brand-green/20" : "border-brand-blue bg-brand-blue/30")}>
          {link.game}
        </li>
      ))}
    </ul>
  );
  const top = (
    <TopBar brand={g.brand} seconds={view.phase === "turn" ? secs : null} exitLabel={c.leave} onExit={() => setLeaving(true)}
      right={<span className="shrink-0 text-[11px] font-black uppercase tracking-wide text-white/55">{g.round(view.round + 1)}</span>} />
  );
  const waitingNote = !view.seats[me].alive ? g.youOut : view.turn !== null && view.turn !== me ? g.seatTurn(nameOf(view.turn), view.letter) : busy ? g.sending : !room.connected ? c.offline : null;
  const answerBox = view.phase === "turn" && (
    <>
      <AnswerBox placeholder={c.placeholder} say={c.say} disabled={!myTurn || busy || !room.connected} note={duel && !myTurn ? g.waiting : waitingNote}
        onSubmit={(text) => room.send({ type: "answer", epoch: view.epoch, attempt: view.attempt, text })} />
      {myTurn && (
        <button type="button" disabled={busy} onClick={() => room.send({ type: "pass", epoch: view.epoch })}
          className="mx-auto mt-1 min-h-9 px-3 text-xs font-bold uppercase tracking-wide text-white/55 underline-offset-4 hover:text-white hover:underline disabled:opacity-50">{g.giveUp}</button>
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
      seats, mySeat: me, answered: (seat) => view.phase !== "turn" || view.turn !== seat, labels: { away: c.away, left: c.left },
      hold: holding ? gain : null, gains: view.phase === "roundEnd" && !holding ? gain : null,
    }).map((row, i, rows) => {
      // A seat knocked out of the round is greyed until the next round, with its own label.
      const seat = seats.find((s) => `seat-${s.seat}` === row.userId);
      const out = seat && view.phase !== "intro" && seat.status === "in" && !view.seats[seat.seat].alive;
      return out ? { ...rows[i], status: "dropped" as const, statusLabel: g.out } : row;
    });
    return (
      <>
        {top}
        <PartyPage standings={standings} flights={flights} resolved={view.phase === "roundEnd"}>
          {view.phase === "intro" && <CountIn label={c.startsIn} value={Math.max(1, secs)} />}
          {nameCard}
          {turnCard}
          {feedbackLine}
          {chips}
          {view.phase === "roundEnd" && (
            <div className="mt-3 rounded-2xl bg-brand-blue px-4 py-4 text-white shadow-lg shadow-black/20">
              <p className="text-xs font-bold uppercase tracking-wide text-white/75">{g.lastStanding}</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-black" style={poppins}>
                <Crown className="size-6 text-brand-yellow" aria-hidden />{view.roundWinner === null ? g.time : view.roundWinner === me ? g.roundWon : g.roundTo(nameOf(view.roundWinner))}
              </p>
              <ul className="mt-3 space-y-1.5">
                {seats.filter((s) => s.status !== "withdrawn").map((s) => ({ s, won: gain[s.seat] })).sort((a, b) => b.won - a.won || a.s.seat - b.s.seat).map(({ s, won }) => (
                  <li key={s.seat} className={cn("flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm font-semibold", s.seat === me ? "bg-white/20" : "bg-white/10", won === 0 && "opacity-70")}>
                    <DuelAvatar customization={s.avatar} size="xs" />
                    <span className="min-w-0 flex-1 truncate">{nameOf(s.seat)}</span>
                    <span {...scoreSourceAttr(s.seat)} className={cn("rounded-full px-2.5 py-0.5 text-xs font-black tabular-nums", won > 0 ? "bg-brand-yellow text-black" : "bg-white/15 text-white/70")} style={poppins}>{won > 0 ? "+1" : g.out}</span>
                  </li>
                ))}
              </ul>
              {view.could.length > 0 && (
                <>
                  <p className="mt-4 text-xs font-black uppercase tracking-wide text-white/75">{g.could(view.letter)}</p>
                  <Chips className="mt-2" names={view.could} />
                </>
              )}
              {reports}
              {!view.final && <p className="mt-3 text-sm text-white/75">{g.nextRound}</p>}
            </div>
          )}
          <div className="flex-1" />
          {answerBox}
        </PartyPage>
        {leaveSheet}
      </>
    );
  }

  const mine = seatOf(me);
  const theirs = seatOf(rival);
  const lost = view.ended?.seat === me;
  return (
    <div className="flex flex-1 flex-col">
      {top}
      <div className="mt-3 flex gap-2">
        {mine && <SeatCard name={c.you} avatar={mine.avatar} tone="you" active={myTurn} score={mine.score} marks={<Dots filled={Math.min(view.pointsToWin, mine.score)} total={view.pointsToWin} tone="you" />} />}
        {theirs && <SeatCard name={theirs.status === "away" ? `${theirs.name} · ${c.away}` : theirs.name} avatar={theirs.avatar} tone="rival" active={view.phase === "turn" && view.turn === rival} score={theirs.score} marks={<Dots filled={Math.min(view.pointsToWin, theirs.score)} total={view.pointsToWin} tone="rival" />} />}
      </div>
      {view.phase === "intro" && <CountIn label={c.startsIn} value={Math.max(1, secs)} />}
      {nameCard}
      {turnCard}
      {feedbackLine}
      {chips}
      {view.phase === "turn" && <div className="flex-1" />}
      {answerBox}
      {view.phase === "roundEnd" && view.ended && (
        <Sheet label={lost ? g.roundLost : g.roundWon}>
          <p className="text-xs font-bold uppercase tracking-wide text-white/75">{lostReason(view.ended.reason)}</p>
          <p className="mt-2 text-2xl font-black" style={poppins}>{lost ? g.roundLost : g.roundWon}</p>
          <p className="mt-1 text-lg font-black tabular-nums" style={poppins}>{view.seats[me].score} – {view.seats[rival].score}</p>
          {view.could.length > 0 && (
            <>
              <p className="mt-4 text-xs font-black uppercase tracking-wide text-white/75">{g.could(view.letter)}</p>
              <Chips className="mt-2" names={view.could} />
            </>
          )}
          {reports}
          {!view.final && <p className="mt-4 text-sm text-white/75">{g.nextRound}</p>}
        </Sheet>
      )}
      {leaveSheet}
    </div>
  );
}

function Results({ view, snapshot, locale, onRoom, onExit }: { view: NameChainView; snapshot: RoomStatePayload; locale: string; onRoom: () => void; onExit: () => void }) {
  const c = wordSharedCopy(locale);
  const g = nameChainCopy(locale);
  const seats = wordSeats(snapshot, view.seats.map((s) => ({ seat: s.seat, status: s.status, score: s.score })));
  const table = view.standings ?? [];
  const me = view.mySeat;
  const own = table.find((r) => r.seat === me);
  const firsts = table.filter((r) => r.place === 1);
  if (view.format === "party") {
    return (
      <PartyResults seats={seats} standings={table} mySeat={me} headline={own?.place === 1 ? (firsts.length > 1 ? c.tieFirst : c.youWon) : c.youPlace(own?.place ?? table.length)}
        statLabel={g.answersStat} detail={(row) => g.answersDetail(row.roundWins)} leftLabel={c.left} onRoom={onRoom} onExit={onExit} />
    );
  }
  const rival = me === 0 ? 1 : 0;
  return (
    <Frame lang={locale}>
      <div className="flex flex-1 flex-col">
        <div className="mt-4 rounded-3xl bg-brand-blue px-5 pb-5 pt-4 text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">{g.brand.join(" ")}</p>
          <p className="mt-2 text-3xl font-black" style={poppins}>{firsts.length > 1 ? c.draw : own?.place === 1 ? c.won : c.lost}</p>
          <p className="mt-1 text-5xl font-black tabular-nums" style={poppins}>{view.seats[me].score} – {view.seats[rival].score}</p>
          {seats[rival]?.status === "withdrawn" && <p className="mt-2 text-sm text-white/80">{c.rivalLeft}</p>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          {[me, rival].map((seat) => (
            <div key={seat} className="rounded-2xl border border-white/10 px-3 py-3">
              <p className="truncate text-xs font-bold text-white/70">{seat === me ? c.you : seats[seat]?.name}</p>
              <p className="mt-1 text-2xl font-black tabular-nums" style={poppins}>{view.seats[seat].answers}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/55">{g.answersStat}</p>
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

export const nameChainScreens: RoomGameScreens<NameChainView, NameChainCommand> = {
  brand: (locale) => nameChainCopy(locale).brand,
  Board,
  Results,
  wide: (view) => view.format === "party",
};

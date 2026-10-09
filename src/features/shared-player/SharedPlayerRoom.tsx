"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "lucide-react";
import { aproximadoCopy } from "@/features/aproximado/aproximado.copy";
import { DuelAvatar } from "@/features/duel/DuelAvatar";
import { ClubTile, CrestPreload } from "@/features/wordgames/ClubTile";
import { sharedPlayerCopy, wordSharedCopy } from "@/features/wordgames/copy";
import { PartyPage, PartyResults, scoreSourceAttr, toPartyStandings, useScoreFlights } from "@/features/wordgames/party";
import { wordSeats, type RoomConnection, type RoomGameScreens } from "@/features/wordgames/RoomGameShell";
import { AnswerBox, Chips, Dots, Frame, GreenButton, QuietButton, RefusedReports, SeatCard, Sheet, TimeBar, TopBar, poppins, useRefused, useResendRetained } from "@/features/wordgames/ui";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";
import { cn } from "@/lib/utils";
import type { SharedPlayerCommand, SharedPlayerResult, SharedPlayerView } from "./sharedPlayer.view";

const RACE_MS = 10_000;

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

function Board({ view, snapshot, room, locale, error }: { view: SharedPlayerView; snapshot: RoomStatePayload; room: RoomConnection<SharedPlayerCommand>; locale: string; error: string | null }) {
  const c = wordSharedCopy(locale);
  const g = sharedPlayerCopy(locale);
  const roomCopy = aproximadoCopy(locale);
  const seats = useMemo(() => wordSeats(snapshot, view.seats), [snapshot, view.seats]);
  const me = view.mySeat;
  const duel = view.format === "duel";
  const rival = duel ? (me === 0 ? 1 : 0) : -1;
  const racing = view.phase === "race" || view.phase === "settle";
  const msLeft = useMsLeft(view.deadline, room.nowMs);
  const lockLeft = useMsLeft(racing ? view.myLockedUntil : null, room.nowMs);
  const answered = view.myHit !== null;
  const unconfirmed = useResendRetained(room);
  const busy = room.inFlight > 0 || unconfirmed;
  const result = view.reveal;
  const nameOf = (seat: number) => (seat === me ? c.you : seats.find((s) => s.seat === seat)?.name ?? "—");
  const noGains = useMemo(() => view.seats.map(() => 0), [view.seats]);
  const { flights, holding } = useScoreFlights(!duel && view.phase === "reveal" && result ? `r${view.round}` : null, result?.gains ?? noGains);
  const [leaving, setLeaving] = useState(false);
  const refused = useRefused();
  const myLast = view.myLast;
  useEffect(() => {
    if (myLast?.kind === "wrong") refused.add(view.round, myLast.text);
    // Keyed on the attempt: one entry per refused answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myLast?.attempt, myLast?.kind, view.round]);
  const reports = view.phase === "reveal" && (
    <RefusedReports className="mt-3" texts={refused.of(view.round)} line={g.wrong} label={c.iWasRight} thanks={c.reported}
      onReport={(text) => Promise.resolve(room.report(view.round, text))} />
  );
  const last = view.phase === "reveal" && (view.round + 1 >= view.totalRounds || (duel && view.seats.some((s) => s.score >= view.pointsToWin) && view.seats[0].score !== view.seats[1].score));

  const roundLabel = duel ? g.roundOpen(view.round + 1) : g.round(view.round + 1, view.totalRounds);
  const top = (
    <TopBar brand={g.brand} seconds={racing ? Math.ceil(msLeft / 1000) : null} exitLabel={c.leave} onExit={() => setLeaving(true)}
      right={<span className="shrink-0 text-[11px] font-black uppercase tracking-wide text-white/55">{roundLabel}</span>} />
  );
  const tiles = (
    <div className="mt-4 flex items-center gap-2" style={{ perspective: 600 }}>
      <ClubTile club={view.clubs?.[0] ?? null} />
      <X className="size-5 shrink-0 text-white/40" aria-hidden />
      <ClubTile club={view.clubs?.[1] ?? null} />
    </div>
  );
  const countdown = view.phase === "countdown" && (
    <div className="flex flex-1 items-center justify-center py-6">
      <AnimatePresence mode="popLayout">
        <motion.span key={Math.ceil(msLeft / 1000)} initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} className="text-8xl font-black tabular-nums text-brand-yellow" style={poppins}>
          {Math.max(1, Math.ceil(msLeft / 1000))}
        </motion.span>
      </AnimatePresence>
    </div>
  );
  const found = view.seats.filter((s) => s.answered).length;
  const note = answered ? (duel ? g.waitRival : g.lockedIn) : lockLeft > 0 ? g.locked(Math.ceil(lockLeft / 1000)) : busy ? g.sending : !room.connected ? c.offline : null;
  const race = racing && (
    <>
      <div className="mt-4 rounded-2xl bg-brand-green px-4 py-3 text-white shadow-lg shadow-black/20">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black uppercase leading-snug tracking-wide" style={poppins}>{g.prompt}</p>
          {!duel && <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-white/80">{g.answeredCount(found, view.seats.filter((s) => s.status !== "withdrawn").length)}</span>}
        </div>
        <TimeBar className="mt-2" share={view.phase === "settle" ? 0 : msLeft / RACE_MS} urgent={msLeft <= 5_000} />
      </div>
      <div className="mt-3 min-h-6" aria-live="polite">
        <AnimatePresence mode="wait">
          {view.myLast && (
            <motion.p key={view.myLast.attempt} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0, x: view.myLast.kind === "ok" ? 0 : [0, -6, 6, -3, 0] }} exit={{ opacity: 0 }}
              className={cn("flex items-center gap-1.5 text-sm font-bold", view.myLast.kind === "ok" ? "text-white" : "text-brand-red-light")}>
              {view.myLast.kind === "ok" && <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-green"><Check className="size-3.5" strokeWidth={3} /></span>}
              {view.myLast.kind === "ok" ? g.got(view.myLast.text) : g.wrong(view.myLast.text)}
            </motion.p>
          )}
        </AnimatePresence>
        {error && <p role="alert" className="text-sm font-semibold text-brand-red-light">{roomCopy.errors[error] ?? roomCopy.errors.default}</p>}
      </div>
      <div className="flex-1" />
      <AnswerBox placeholder={c.placeholder} say={c.say} disabled={note !== null} note={note}
        onSubmit={(text) => room.send({ type: "answer", round: view.round, attempt: view.myAttempt, text })} />
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
      seats, mySeat: me, answered: (seat) => !racing || view.seats[seat].answered, labels: { away: c.away, left: c.left },
      hold: holding && result ? result.gains : null, gains: view.phase === "reveal" && result && !holding ? result.gains : null,
    });
    const order = result ? [...result.winners, ...result.answers.map((_, seat) => seat).filter((seat) => !result.winners.includes(seat))] : [];
    return (
      <>
        <CrestPreload crests={view.crests} />
        {top}
        <PartyPage standings={standings} flights={flights} resolved={view.phase === "reveal"}>
          {tiles}
          {countdown}
          {race}
          {view.phase === "reveal" && result && (
            <div className="mt-4 rounded-2xl bg-brand-blue px-4 py-4 text-white shadow-lg shadow-black/20">
              <p className="text-2xl font-black" style={poppins}>{result.winners.length === 0 ? g.nobody : result.winners[0] === me ? g.youFirst : g.firstWas(nameOf(result.winners[0]))}</p>
              <ul className="mt-3 space-y-1.5">
                {order.map((seat) => {
                  const answer = result.answers[seat];
                  const who = seats.find((s) => s.seat === seat);
                  return (
                    <li key={seat} className={cn("flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm font-semibold", seat === me ? "bg-white/20" : "bg-white/10", answer === null && "opacity-60")}>
                      {who && <DuelAvatar customization={who.avatar} size="xs" />}
                      <span className="min-w-0 flex-1 truncate">{nameOf(seat)}<span className="ml-2 font-normal text-white/80">{answer ?? g.noAnswer}</span></span>
                      <span {...scoreSourceAttr(seat)} className={cn("rounded-full px-2.5 py-0.5 text-xs font-black tabular-nums", result.gains[seat] > 0 ? "bg-brand-yellow text-black" : "bg-white/15 text-white/70")} style={poppins}>+{result.gains[seat]}</span>
                    </li>
                  );
                })}
              </ul>
              <RevealAnswers result={result} locale={locale} />
              {reports}
              {!last && <p className="mt-3 text-sm text-white/75">{g.next}</p>}
            </div>
          )}
        </PartyPage>
        {leaveSheet}
      </>
    );
  }

  const mine = seats.find((s) => s.seat === me);
  const theirs = seats.find((s) => s.seat === rival);
  const verdict = result && (result.winners.length === 2 ? g.pointBoth : result.winners.length === 0 ? g.nobody : result.winners[0] === me ? g.pointYou : g.pointRival);
  return (
    <div className="flex flex-1 flex-col">
      <CrestPreload crests={view.crests} />
      {top}
      <div className="mt-3 flex gap-2">
        {mine && <SeatCard name={c.you} avatar={mine.avatar} tone="you" active={racing && !answered} score={mine.score} marks={<Dots filled={Math.min(view.pointsToWin, mine.score)} total={view.pointsToWin} tone="you" />} />}
        {theirs && <SeatCard name={theirs.status === "away" ? `${theirs.name} · ${c.away}` : theirs.name} avatar={theirs.avatar} tone="rival" active={racing && !view.seats[rival].answered} score={theirs.score} marks={<Dots filled={Math.min(view.pointsToWin, theirs.score)} total={view.pointsToWin} tone="rival" />} />}
      </div>
      {tiles}
      {countdown}
      {race}
      {view.phase === "reveal" && result && (
        <Sheet label={verdict ?? ""}>
          <p className="text-xs font-bold uppercase tracking-wide text-white/75">{result.clubs[0].name} × {result.clubs[1].name}</p>
          <p className="mt-2 text-2xl font-black" style={poppins}>{verdict}</p>
          <ul className="mt-2 space-y-1 text-sm font-semibold">
            {result.answers[me] !== null && <li className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-brand-green-light" />{c.you}: {result.answers[me]}</li>}
            {result.answers[rival] !== null && <li className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-white" />{nameOf(rival)}: {result.answers[rival]}</li>}
          </ul>
          <RevealAnswers result={result} locale={locale} />
          {reports}
          <div className="mt-4 flex items-center justify-between text-sm text-white/75">
            <span>{last ? "" : g.next}</span>
            <span className="font-black tabular-nums text-white" style={poppins}>{view.seats[me].score} – {view.seats[rival].score}</span>
          </div>
        </Sheet>
      )}
      {leaveSheet}
    </div>
  );
}

function RevealAnswers({ result, locale }: { result: SharedPlayerResult; locale: string }) {
  const g = sharedPlayerCopy(locale);
  return (
    <>
      <p className="mt-4 text-xs font-black uppercase tracking-wide text-white/75">{g.answers(result.total)}</p>
      <Chips className="mt-2" names={result.examples} />
      {result.total > result.examples.length && <p className="mt-2 text-xs text-white/70">{g.more(result.total - result.examples.length)}</p>}
    </>
  );
}

function Results({ view, snapshot, locale, onRoom, onExit }: { view: SharedPlayerView; snapshot: RoomStatePayload; locale: string; onRoom: () => void; onExit: () => void }) {
  const c = wordSharedCopy(locale);
  const g = sharedPlayerCopy(locale);
  const seats = wordSeats(snapshot, view.seats);
  const table = view.standings ?? [];
  const me = view.mySeat;
  const own = table.find((r) => r.seat === me);
  const firsts = table.filter((r) => r.place === 1);
  if (view.format === "party") {
    return (
      <PartyResults seats={seats} standings={table} mySeat={me} headline={own?.place === 1 ? (firsts.length > 1 ? c.tieFirst : c.youWon) : c.youPlace(own?.place ?? table.length)}
        statLabel={g.foundStat} detail={(row) => g.foundDetail(row.roundWins, view.results.length)} leftLabel={c.left} onRoom={onRoom} onExit={onExit} />
    );
  }
  const rival = me === 0 ? 1 : 0;
  const rivalLeft = seats[rival]?.status === "withdrawn";
  return (
    <Frame lang={locale}>
      <div className="flex flex-1 flex-col">
        <div className="mt-4 rounded-3xl bg-brand-blue px-5 pb-5 pt-4 text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">{g.brand.join(" ")}</p>
          <p className="mt-2 text-3xl font-black" style={poppins}>{firsts.length > 1 ? c.draw : own?.place === 1 ? c.won : c.lost}</p>
          <p className="mt-1 text-5xl font-black tabular-nums" style={poppins}>{view.seats[me].score} – {view.seats[rival].score}</p>
          {rivalLeft && <p className="mt-2 text-sm text-white/80">{c.rivalLeft}</p>}
        </div>
        <p className="mt-4 text-xs font-black uppercase tracking-wide text-white/60">{g.summary}</p>
        <ul className="mt-2 space-y-1.5">
          {view.results.map((r) => {
            const won = r.winners.includes(me);
            return (
              <li key={r.round} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm">
                <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full", won ? "bg-brand-green" : "bg-white/15")}>{won ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3 text-white/60" />}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{r.clubs[0].name} × {r.clubs[1].name}</span>
                <span className="shrink-0 truncate text-xs text-white/65">{r.answers[me] ?? r.answers.find((a) => a !== null) ?? r.examples[0]}</span>
              </li>
            );
          })}
        </ul>
        <div className="flex-1" />
        <GreenButton className="mt-6" onClick={onRoom}>{c.backToRoom}</GreenButton>
        <QuietButton className="mt-3" onClick={onExit}>{c.exit}</QuietButton>
      </div>
    </Frame>
  );
}

export const sharedPlayerScreens: RoomGameScreens<SharedPlayerView, SharedPlayerCommand> = {
  brand: (locale) => sharedPlayerCopy(locale).brand,
  Board,
  Results,
  wide: (view) => view.format === "party",
};

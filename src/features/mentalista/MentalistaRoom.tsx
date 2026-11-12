"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Eye, Loader2 } from "lucide-react";
import { aproximadoCopy } from "@/features/aproximado/aproximado.copy";
import { DuelAvatar } from "@/features/duel/DuelAvatar";
import { wordSharedCopy } from "@/features/wordgames/copy";
import { PartyPage, PartyResults, scoreSourceAttr, toPartyStandings, useScoreFlights, type WordSeat } from "@/features/wordgames/party";
import { wordSeats, type RoomConnection, type RoomGameScreens } from "@/features/wordgames/RoomGameShell";
import { GreenButton, QuietButton, Sheet, TopBar, poppins, useResendRetained } from "@/features/wordgames/ui";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";
import { cn } from "@/lib/utils";
import { mentalistaRoomCopy } from "./mentalista.room.copy";
import type { MentalistaView, MvCommand } from "./mentalista.server";

type MvRoomLink = Pick<RoomConnection<MvCommand>, "send" | "nowMs" | "inFlight" | "retained" | "connected" | "resendRetained" | "leave" | "isSlotPending">;

/** Ms left until an ISO deadline, measured on the server clock (never a device clock). */
function useMsLeft(deadlineIso: string | null, nowMs: () => number): number {
  const [now, setNow] = useState<number>(() => nowMs());
  useEffect(() => {
    if (!deadlineIso) return;
    const tick = () => setNow(nowMs());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 100);
    return () => { window.clearTimeout(first); window.clearInterval(id); };
  }, [deadlineIso, nowMs]);
  return deadlineIso ? Math.max(0, Date.parse(deadlineIso) - now) : 0;
}

export function MentalistaBoard({ view, snapshot, room, locale, error }: { view: MentalistaView; snapshot: RoomStatePayload; room: MvRoomLink; locale: string; error: string | null }) {
  const c = wordSharedCopy(locale);
  const t = mentalistaRoomCopy(locale);
  const roomCopy = aproximadoCopy(locale);
  const me = view.mySeat;
  const seatRows = useMemo(() => view.seats.map((s) => ({ seat: s.seat, status: s.status, score: s.score })), [view.seats]);
  const seats = useMemo(() => wordSeats(snapshot, seatRows), [snapshot, seatRows]);
  const seatOf = (seat: number) => seats.find((s) => s.seat === seat);
  const nameOf = (seat: number) => (seat === me ? c.you : seatOf(seat)?.name ?? "—");

  const unconfirmed = useResendRetained(room);
  const busy = room.inFlight > 0 || unconfirmed;
  const [leaving, setLeaving] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  // A transient selection belongs to one (round, phase): a new round or phase never inherits the last tap.
  const slotKey = `${view.round}:${view.phase}`;
  const [selectedFor, setSelectedFor] = useState(slotKey);
  if (selectedFor !== slotKey) { setSelectedFor(slotKey); setSelected(null); }

  const chooserSeat = view.chooserSeat;
  const iAmChooser = view.iAmChooser;
  const category = view.category;
  const reveal = view.phase === "reveal" ? view.reveal : null;

  // The command type encodes the phase: a choose in the choose phase, a predict in the predict phase.
  const cmdType: MvCommand["type"] | null = view.phase === "choose" ? "choose" : view.phase === "predict" ? "predict" : null;
  const myTurn = (view.phase === "choose" && iAmChooser) || (view.phase === "predict" && !iAmChooser);
  // The actor's own value for THIS phase: my committed choice (as chooser) or my locked prediction (as predictor).
  const myActed = view.phase === "choose" ? view.myChoice !== null : view.phase === "predict" ? view.myPrediction !== null : false;
  const locked = myTurn && myActed;
  // The option this viewer should see highlighted while the round is open (never another seat's secret): the chooser's
  // own committed pick in BOTH open phases (so they still see it while being read), a predictor's own locked prediction.
  const mineOption =
    view.phase === "choose" ? (iAmChooser ? view.myChoice : null)
    : view.phase === "predict" ? (iAmChooser ? view.myChoice : view.myPrediction)
    : null;
  const slotPending = cmdType ? room.isSlotPending(`${cmdType}:${view.round}`) : false;

  const msLeft = useMsLeft(view.deadline, room.nowMs);
  const secs = Math.ceil(msLeft / 1000);
  // Fail closed: no deadline = no new actions allowed.
  const expired = !view.deadline || !Number.isFinite(msLeft) || msLeft <= 0;
  // While a slot is pending (or any input is busy) the options are frozen, so a changed payload can never ride the
  // retained command id and the final pick stays immutable.
  const choosable = myTurn && cmdType !== null && !locked && !busy && !slotPending && room.connected && category !== null && !expired;

  // Per-seat reveal points for the score flights and the +N pills — ALWAYS the server's own entry points, never derived.
  const gains = useMemo(
    () => view.seats.map((s) => reveal?.entries.find((e) => e.seat === s.seat)?.points ?? 0),
    [view.seats, reveal],
  );
  const { flights, holding } = useScoreFlights(reveal ? `${snapshot.matchId}:${view.round}` : null, gains.map((g) => Math.max(0, g)));

  const live = view.seats.filter((s) => s.status !== "withdrawn");
  const predictors = live.filter((s) => !s.isChooser);
  const lockedCount = predictors.filter((s) => s.predicted).length;

  const optionName = (i: number | null) => (i === null || !category ? null : category.options[i]?.name ?? null);
  const myEntry = reveal?.entries.find((e) => e.seat === me) ?? null;

  const top = (
    <TopBar
      wrap
      brand={t.brand}
      seconds={view.deadline && (view.phase === "choose" || view.phase === "predict") ? secs : null}
      exitLabel={c.leave}
      onExit={() => setLeaving(true)}
      right={<span className="shrink-0 text-[11px] font-black uppercase tracking-wide text-white/55 tabular-nums" style={poppins}>{t.round(view.round + 1, view.totalRounds)}</span>}
    />
  );
  // The round prompt / instruction, by phase and role.
  const heading = (() => {
    if (view.phase === "choose") return iAmChooser ? t.youChoose : t.waitChoose(nameOf(chooserSeat));
    if (view.phase === "predict") return iAmChooser ? t.beingRead : t.youPredict(nameOf(chooserSeat));
    if (view.phase === "reveal") return reveal?.voided ? t.voided : t.pickWas(nameOf(chooserSeat));
    return t.waiting;
  })();
  const hint = view.phase === "choose" && iAmChooser ? t.youChooseHint : view.phase === "predict" && !iAmChooser ? t.youPredictHint : null;

  const optionRow = (opt: { id: string; name: string }, i: number) => {
    const isTarget = reveal ? reveal.target === i : false;
    const mineHere = reveal ? myEntry?.prediction === i : mineOption === i;
    // Who predicted this option — only ever drawn at reveal.
    const pickers = reveal ? reveal.entries.filter((e) => e.prediction === i) : [];
    const selectedNow = !reveal && mineOption === null && selected === i;
    const chosen = selectedNow || mineHere;
    return (
      <li key={opt.id}>
        <button
          type="button"
          disabled={!choosable}
          aria-pressed={chosen}
          aria-disabled={!choosable}
          data-mv-option={i}
          data-mv-target={isTarget || undefined}
          data-mv-mine={mineHere || undefined}
          onClick={() => choosable && setSelected(i)}
          className={cn(
            "flex w-full items-center gap-2 rounded-2xl px-3.5 py-3 text-left text-sm font-bold transition",
            reveal && isTarget ? "bg-brand-green-light text-black"
              : reveal && mineHere ? "bg-brand-red-soft/80 text-white"
              : chosen ? "bg-white/20 text-white ring-2 ring-brand-green-light"
              : "bg-white/[0.07] text-white",
            choosable && "hover:bg-white/15",
          )}
        >
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{opt.name}</span>
          {reveal && pickers.length > 0 && (
            <span className="flex shrink-0 -space-x-1.5">
              {pickers.map((p) => { const s = seatOf(p.seat); return s ? <DuelAvatar key={p.seat} customization={s.avatar} size="xs" /> : null; })}
            </span>
          )}
          {!reveal && mineHere && <Check className="size-4 shrink-0 text-brand-green-light" strokeWidth={3} aria-hidden />}
          {reveal && isTarget && <Eye className="size-4 shrink-0" aria-hidden />}
        </button>
      </li>
    );
  };

  const revealRows = reveal && (
    <ul className="mt-3 space-y-2">
      {seats.filter((s) => s.status !== "withdrawn").sort((a, b) => gains[b.seat] - gains[a.seat] || a.seat - b.seat).map((s) => {
        const isChooser = s.seat === chooserSeat;
        const entry = reveal.entries.find((x) => x.seat === s.seat);
        const predLabel = isChooser ? t.chooserTag : entry ? optionName(entry.prediction) ?? t.noPrediction : t.noPrediction;
        const g = gains[s.seat];
        return (
          <li key={s.seat} className={cn("space-y-1.5 rounded-xl px-2.5 py-2", s.seat === me ? "bg-white/15" : "bg-white/[0.07]")}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <DuelAvatar customization={s.avatar} size="xs" />
              <span className="min-w-[4rem] flex-1 break-words text-sm font-bold text-white/85">{nameOf(s.seat)}</span>
              {entry?.matched && <span className="shrink-0 rounded-full bg-brand-yellow/20 px-1.5 text-[10px] font-black text-brand-yellow" style={poppins}>{t.readIt}</span>}
              <span {...scoreSourceAttr(s.seat)} className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-black tabular-nums", g > 0 ? "bg-brand-green-light text-black" : "bg-white/15 text-white/70")} style={poppins}>
                {g > 0 ? `+${g}` : "0"}
              </span>
            </div>
            <p className="break-words text-sm text-white/60 [overflow-wrap:anywhere]">{predLabel}</p>
          </li>
        );
      })}
    </ul>
  );

  const final = view.round + 1 >= view.totalRounds;
  const body = (
    <>
      {!room.connected && (
        <p role="status" className="mt-3 rounded-xl bg-white/[0.08] px-3.5 py-2.5 text-sm font-semibold text-white/85 break-words [overflow-wrap:anywhere]">{t.disconnectedNotice}</p>
      )}
      <div className="mt-4">
        <p className="text-lg font-black leading-tight" style={poppins} aria-live="polite">{heading}</p>
        {hint && <p className="mt-1 text-sm font-semibold text-white/60">{hint}</p>}
        {category?.prompt && <p className="mt-3 rounded-2xl bg-brand-blue/40 px-3.5 py-2.5 text-sm font-bold text-white">{category.prompt}</p>}
      </div>

      {/* Every role sees the SAME public options through choose, predict and reveal; only the legal role can interact
          (the rest render disabled). A non-actor's own open secret is the only thing ever highlighted to them. */}
      {category && (view.phase === "choose" || view.phase === "predict" || view.phase === "reveal") && (
        <ul className="mt-3 space-y-2" aria-label={category.prompt}>{category.options.map(optionRow)}</ul>
      )}

      {/* Waiting states that are not the actor's: never reveal anyone's hidden pick, only a status dot. */}
      {!myTurn && (view.phase === "choose" || view.phase === "predict") && (
        <ul className="mt-4 space-y-1.5">
          {live.map((s) => {
            const done = view.phase === "choose" ? (s.seat === chooserSeat && s.committed) : (s.seat !== chooserSeat && s.predicted);
            const waitingOn = view.phase === "choose" ? s.seat === chooserSeat : s.seat !== chooserSeat;
            if (!waitingOn) return null;
            const wordSeat = seatOf(s.seat);
            return (
              <li key={s.seat} className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-2.5 py-1.5 text-sm font-semibold">
                {wordSeat && <DuelAvatar customization={wordSeat.avatar} size="xs" />}
                <span className="min-w-0 flex-1 truncate">{nameOf(s.seat)}{s.status === "away" && <span className="ml-1 text-xs text-white/45">· {c.away}</span>}</span>
                {done
                  ? <Check className="size-4 shrink-0 text-brand-green-light" strokeWidth={3} aria-label={view.phase === "choose" ? t.chosen : t.predicted} />
                  : <Loader2 className="size-4 shrink-0 animate-spin text-white/40" aria-hidden />}
              </li>
            );
          })}
        </ul>
      )}

      {reveal && (
        <>
          {revealRows}
          <p className="mt-2 text-xs font-bold text-white/60">{final ? t.lastRound : t.nextRound}</p>
        </>
      )}

      {error && <p role="alert" className="mt-2 text-sm font-semibold text-brand-red-light">{roomCopy.errors[error] ?? roomCopy.errors.default}</p>}

      {myTurn && cmdType && category && (
        <>
          <div className="flex-1" />
          <div className="sticky bottom-[104px] z-20 mt-5 space-y-3 bg-surface-page-alt/95 pb-1 pt-2 lg:bottom-0">
            {locked ? (
              <p className="flex h-14 items-center justify-center gap-2 rounded-full bg-white/[0.07] text-sm font-black uppercase tracking-wide text-white/80" style={poppins} data-mv-locked>
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4 text-brand-green-light" strokeWidth={3} aria-hidden />}
                {busy ? t.sending : `${t.locked} · ${view.phase === "predict" ? t.lockedOf(lockedCount, predictors.length) : t.waiting}`}
              </p>
            ) : (
              <GreenButton
                disabled={expired || selected === null || busy || slotPending || !room.connected}
                onClick={() => {
                  if (selected !== null) {
                    const deadlineMs = view.deadline ? Date.parse(view.deadline) : 0;
                    if (room.nowMs() < deadlineMs) {
                      room.send({ type: cmdType, round: view.round, option: selected });
                    }
                  }
                }}
              >
                {!room.connected ? c.offline : expired ? t.waiting : selected === null ? t.pickFirst : t.lock}
              </GreenButton>
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

  const standings = toPartyStandings({
    seats,
    mySeat: me,
    answered: (seat) => {
      const row = view.seats.find((s) => s.seat === seat);
      if (view.phase === "choose") return seat === chooserSeat ? Boolean(row?.committed) : true;
      if (view.phase === "predict") return seat === chooserSeat ? true : Boolean(row?.predicted);
      return true;
    },
    labels: { away: c.away, left: c.left },
    hold: holding ? gains : null,
    gains: reveal && !holding ? gains : null,
  });

  return (
    <>
      {top}
      <PartyPage standings={standings} flights={flights} resolved={view.phase === "reveal"}>{body}</PartyPage>
      {leaveSheet}
    </>
  );
}

export function MentalistaResults({ view, snapshot, locale, onRoom, onExit }: { view: MentalistaView; snapshot: RoomStatePayload; locale: string; onRoom: () => void; onExit: () => void }) {
  const c = wordSharedCopy(locale);
  const t = mentalistaRoomCopy(locale);
  const seats: WordSeat[] = wordSeats(snapshot, view.seats.map((s) => ({ seat: s.seat, status: s.status, score: s.score })));
  // The server owns scoring: take `roundWins` straight from the final table — never recompute "reads" on the client.
  const table = (view.standings ?? []).map((r) => ({ seat: r.seat, points: r.points, roundWins: r.roundWins, place: r.place }));
  const me = view.mySeat;
  const own = table.find((r) => r.seat === me);
  const firsts = table.filter((r) => r.place === 1);
  return (
    <PartyResults
      seats={seats}
      standings={table}
      mySeat={me}
      headline={own?.place === 1 ? (firsts.length > 1 ? c.tieFirst : c.youWon) : c.youPlace(own?.place ?? table.length)}
      statLabel={t.readsStat}
      detail={(row) => t.readsDetail(row.roundWins)}
      leftLabel={c.left}
      onRoom={onRoom}
      onExit={onExit}
    />
  );
}

/** The room runtime's screens for Mentalista: the server view, drawn by the party board and the party results. */
export const mentalistaScreens: RoomGameScreens<MentalistaView, MvCommand> = {
  brand: (locale) => mentalistaRoomCopy(locale).brand,
  Board: MentalistaBoard,
  Results: MentalistaResults,
  // Always the party (standings-sidebar) layout: a Mentalista room is 3–6 seats.
  wide: () => true,
};

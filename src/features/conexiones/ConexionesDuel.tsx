"use client";

import { motion } from "motion/react";
import { Check, WifiOff, X } from "lucide-react";
import { DuelAvatar } from "@/features/duel/DuelAvatar";
import { GreenButton, QuietButton, SeatCard, Sheet, TimeBar, TopBar, poppins } from "@/features/wordgames/ui";
import type { AvatarCustomization } from "@/types/game";
import { cn } from "@/lib/utils";
import { conexionesCopy, type ConexionesCopy } from "./conexiones.copy";
import { DUEL_MISSES, NAME_MS, TURN_MS, namesOf, textIn, type CxDuelState, type CxLast, type CxSeat } from "./conexiones.logic";
import { ConexionesGrid } from "./ConexionesBoard";

/** `away`: disconnected right now (a room match); its own label says so to a screen reader. */
export interface CxDuelSeat { name: string; avatar: AvatarCustomization; away?: string | null }

function lastLine(c: ConexionesCopy, last: CxLast, who: string, mine: boolean) {
  if (mine && last.kind !== "repeat") return c.mine[last.kind];
  switch (last.kind) {
    case "right": return c.lastRight(who);
    case "oneAway": return c.lastOneAway(who);
    case "wrong": return c.lastWrong(who);
    case "timeout": return c.lastTimeout(who);
    case "named": return c.lastNamed(who);
    case "misnamed": return c.lastMisnamed(who);
    case "repeat": return c.repeatHint;
  }
}

export function ConexionesDuelView({ locale, state, me, seats, selected, msLeft, pending, notice, onToggle, onSubmit, onClear, onName, onNext, onExit }: {
  locale: string; state: CxDuelState; me: CxSeat; seats: [CxDuelSeat, CxDuelSeat]; selected: readonly string[]; msLeft: number; pending: boolean;
  /** A move of this turn that was not taken (already tried, or refused by the server). */
  notice?: string | null;
  onToggle: (id: string) => void; onSubmit: () => void; onClear: () => void; onName: (pick: string) => void;
  /** Absent when the server moves on by itself (a room match): the sheet then has no button. */
  onNext?: () => void; onExit: () => void;
}) {
  const c = conexionesCopy(locale);
  const board = state.boards[state.index];
  const rival: CxSeat = me === 0 ? 1 : 0;
  const myTurn = state.turn === me;
  const who = (seat: CxSeat) => (seat === me ? c.you : seats[seat].name);
  const live = state.phase === "turn" || state.phase === "name";
  const totalMs = state.phase === "name" ? NAME_MS : TURN_MS;
  const last = state.last;
  const rivalTry = last && last.seat !== me && last.ids && (last.kind === "oneAway" || last.kind === "wrong") ? last.ids : [];
  const lastRemaining = state.phase === "name" ? state.order : [];
  const missesLeft = DUEL_MISSES - state.misses;
  const revealedLink = state.phase === "reveal" && last && (last.kind === "named" || last.kind === "misnamed") ? board.groups.find((x) => x.id === last.groupId)?.link : null;

  return (
    <div className="flex flex-1 flex-col">
      <TopBar wrap brand={c.brand} seconds={live ? Math.ceil(msLeft / 1000) : null} exitLabel={c.leave} onExit={onExit}
        right={<span className="shrink-0 text-[11px] font-black uppercase tracking-wide text-white/55 tabular-nums" style={poppins}>{c.boardOf(state.index + 1, state.boards.length)}</span>} />
      <div className="mt-3 flex gap-2">
        <SeatCard name={c.you} avatar={seats[me].avatar} tone="you" active={live && myTurn} score={state.scores[me]} />
        <SeatCard name={seats[rival].name} avatar={seats[rival].avatar} tone="rival" active={live && !myTurn} score={state.scores[rival]}
          marks={seats[rival].away ? <span role="img" aria-label={seats[rival].away} title={seats[rival].away} data-cx-rival="away" className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-red-soft/80"><WifiOff className="size-3.5 text-white" /></span> : undefined} />
      </div>
      {live && <TimeBar className="mt-2" share={msLeft / totalMs} urgent={msLeft <= 10_000} />}

      <div className="mb-2 mt-2 min-h-[52px] text-center" aria-live="polite" data-cx-status>
        <p className={cn("text-sm font-black uppercase tracking-wide", myTurn && live ? "text-brand-green-light" : "text-white/80")} style={poppins}>
          {state.phase === "name" ? (myTurn ? c.nameTitle : c.rivalNaming(seats[rival].name)) : state.phase === "turn" ? (myTurn ? c.yourTurn : c.rivalTurn(seats[rival].name)) : c.boardDone}
        </p>
        {notice && <p role="alert" className="mt-0.5 text-xs font-bold text-brand-yellow" data-cx-refused>{notice}</p>}
        {/* The result sheet has no button in a room (it moves on by itself), so focus stays on the board: read it out here. */}
        {state.phase === "reveal" && <span className="sr-only" data-cx-reveal-said>{[revealedLink && textIn(revealedLink, locale), `${c.you} ${state.scores[me]}`, `${seats[rival].name} ${state.scores[rival]}`].filter(Boolean).join(". ")}</span>}
        {last && !notice && (
          <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-white/65">
            {lastLine(c, last, who(last.seat), last.seat === me)}
            {rivalTry.length > 0 && <> · <span className="text-white/85">{namesOf(board, rivalTry, locale).join(", ")}</span></>}
          </p>
        )}
      </div>

      <ConexionesGrid board={board} order={state.order} solved={state.solved} selected={state.phase === "name" ? lastRemaining : selected} locale={locale}
        disabled={!myTurn || state.phase !== "turn" || pending} flagged={rivalTry}
        shakeKey={last?.seat === me && (last.kind === "wrong" || last.kind === "oneAway" || last.kind === "repeat") ? state.tries.length + (last.kind === "repeat" ? 100 : 0) : undefined}
        bandTone={(s) => (s.by === null ? "none" : s.by === me ? "you" : "rival")}
        bandLabel={(s) => (s.by === null ? c.unsolved : who(s.by as CxSeat))} onToggle={onToggle} />

      {state.phase === "turn" && <p className="mt-3 text-center text-[11px] font-bold text-white/55">{c.missesLeft(missesLeft)}</p>}
      <div className="flex-1" />

      {state.phase === "name" && state.nameOptions && (
        <div className="mt-4 rounded-3xl bg-white/[0.07] p-3" data-cx-naming>
          <p className="text-center text-xs font-semibold text-white/70">{c.nameHint}</p>
          <div className="mt-2 grid gap-2">
            {state.nameOptions.map((o) => (
              <button key={o.en} type="button" disabled={!myTurn || pending} onClick={() => onName(o.en)}
                className="min-h-12 rounded-2xl bg-brand-blue px-4 py-2 text-left text-sm font-bold text-white hover:bg-brand-blue/85 disabled:opacity-60">
                {textIn(o, locale)}
              </button>
            ))}
          </div>
        </div>
      )}

      {state.phase === "turn" && (
        <div className="sticky bottom-0 mt-4 grid grid-cols-[1fr_2fr] gap-2 bg-surface-page-alt/95 pb-1 pt-2">
          <QuietButton className="h-14" onClick={onClear}>{c.clear}</QuietButton>
          <GreenButton disabled={!myTurn || selected.length !== 4 || pending} onClick={onSubmit}>
            {!myTurn ? c.rivalTurn(seats[rival].name) : selected.length === 4 ? c.submit : c.pickFour(selected.length)}
          </GreenButton>
        </div>
      )}

      {state.phase === "reveal" && <BoardSheet state={state} me={me} seats={seats} locale={locale} onNext={onNext} />}
    </div>
  );
}

function BoardSheet({ state, me, seats, locale, onNext }: { state: CxDuelState; me: CxSeat; seats: [CxDuelSeat, CxDuelSeat]; locale: string; onNext?: () => void }) {
  const c = conexionesCopy(locale);
  const gained = state.perBoard[state.index] ?? [0, 0];
  const last = state.index + 1 >= state.boards.length;
  const g = state.boards[state.index].groups.find((x) => x.id === state.last?.groupId);
  const naming = state.last && (state.last.kind === "named" || state.last.kind === "misnamed") ? state.last : null;
  return (
    <Sheet label={c.boardDone}>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75" style={poppins}>{c.boardOf(state.index + 1, state.boards.length)} · {c.boardDone}</p>
      {naming && g && (
        <p className="mt-2 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm font-bold">
          {naming.kind === "named" ? <Check className="size-4 shrink-0 text-brand-green-light" /> : <X className="size-4 shrink-0 text-brand-red-light" />}
          <span className="min-w-0">{textIn(g.link, locale)}</span>
        </p>
      )}
      <div className="mt-3 space-y-1.5">
        {([me, me === 0 ? 1 : 0] as CxSeat[]).map((seat) => (
          <div key={seat} className="flex items-center gap-2 rounded-xl bg-white/[0.08] px-3 py-2">
            <DuelAvatar customization={seats[seat].avatar} size="xs" />
            <span className="min-w-0 flex-1 truncate text-sm font-bold">{seat === me ? c.you : seats[seat].name}</span>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-black tabular-nums", gained[seat] > 0 ? "bg-brand-green-light text-black" : "bg-white/15 text-white/70")} style={poppins}>+{gained[seat]}</span>
            <span className="w-8 text-right text-lg font-black tabular-nums" style={poppins}>{state.scores[seat]}</span>
          </div>
        ))}
      </div>
      {onNext && <GreenButton className="mt-4 h-12 text-sm" onClick={onNext}>{last ? c.seeResult : c.nextBoard}</GreenButton>}
    </Sheet>
  );
}

export function ConexionesDuelResult({ locale, state, me, seats, onRoom, onLeave }: {
  locale: string; state: CxDuelState; me: CxSeat; seats: [CxDuelSeat, CxDuelSeat]; onRoom: () => void; onLeave: () => void;
}) {
  const c = conexionesCopy(locale);
  const rival: CxSeat = me === 0 ? 1 : 0;
  const winner = state.result?.winner ?? null;
  const title = winner === null ? c.draw : winner === me ? c.win : c.lose;
  return (
    <div className="flex flex-1 flex-col" data-cx-result>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-6 rounded-3xl bg-brand-blue px-5 pb-5 pt-5 text-center">
        <p className="text-4xl font-black uppercase" style={poppins}>{title}</p>
        {state.result?.reason === "forfeit" && <p className="mt-1 text-sm font-bold text-white/70">{c.byForfeit}</p>}
        <div className="mt-5 flex items-center justify-center gap-5">
          {([me, rival] as CxSeat[]).map((seat, i) => (
            <div key={seat} className="flex items-center gap-5">
              {i === 1 && <span className="text-2xl font-black text-white/50">–</span>}
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn("rounded-full p-0.5 ring-2", seat === me ? "ring-brand-green" : "ring-white/40")}><DuelAvatar customization={seats[seat].avatar} size="md" /></div>
                <span className="max-w-24 truncate text-xs font-bold text-white/85">{seat === me ? c.you : seats[seat].name}</span>
                <span className="text-4xl font-black tabular-nums" style={poppins}>{state.scores[seat]}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
      <div className="mt-4 rounded-2xl bg-white/[0.06] p-3">
        <p className="text-xs font-black uppercase tracking-wide text-white/55" style={poppins}>{c.boards}</p>
        <div className="mt-2 grid grid-cols-[auto_repeat(5,minmax(0,1fr))] items-center gap-x-2 gap-y-1.5 text-center text-sm font-black tabular-nums" style={poppins}>
          {([me, rival] as CxSeat[]).map((seat) => (
            <div key={seat} className="contents">
              <span className="pr-2 text-left text-xs font-bold text-white/70">{seat === me ? c.you : seats[seat].name}</span>
              {Array.from({ length: state.boards.length }, (_, i) => {
                const p = state.perBoard[i];
                const v = p ? p[seat] : null;
                return <span key={i} className={cn("rounded-lg py-1", v === null ? "bg-white/[0.04] text-white/30" : v > 0 ? (seat === me ? "bg-brand-green text-black" : "bg-brand-blue text-white") : "bg-white/10 text-white/60")}>{v ?? "–"}</span>;
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1" />
      <GreenButton className="mt-6" onClick={onRoom}>{c.backToRoom}</GreenButton>
      <QuietButton className="mt-2" onClick={onLeave}>{c.leave}</QuietButton>
    </div>
  );
}

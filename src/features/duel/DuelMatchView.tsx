"use client";

import { AnimatePresence, motion } from "motion/react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/locale";
import type { DuelSeatPayload, DuelStatePayload } from "@/lib/realtime/socket.types";
import type { DuelCopy } from "./duel.copy";
import { SEAT_BG, SEAT_LABEL } from "./duel.seats";
import type { BuscaminasDuelView, DuelCommand, PistasDuelView, Seat, UltimoDuelView } from "./duel.views";
import type { ShowsCommand } from "./useDuel";
import { BuscaminasDuelBoard } from "./BuscaminasDuelBoard";
import { PistasDuelBoard } from "./PistasDuelBoard";
import { UltimoDuelBoard } from "./UltimoDuelBoard";
import { DuelIntro } from "./DuelIntro";
import { DuelAvatar, seatAvatar } from "./DuelAvatar";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;

export interface DuelMatchViewProps {
  snapshot: DuelStatePayload;
  locale: Locale;
  copy: DuelCopy;
  /** Seconds left on the current deadline (the screen ticks it; the playground holds it still). */
  secondsLeft: number | null;
  /** This screen's own connection (false shows the "no connection" strip). */
  connected: boolean;
  /** A command is still being judged: the board holds its input. */
  busy: boolean;
  error: string | null;
  confirmLeave: boolean;
  onSend: (command: DuelCommand, shows?: ShowsCommand) => void;
  /** The X button: asks to confirm a forfeit while the match is live, else leaves. */
  onExit: () => void;
  onConfirmForfeit: () => void;
  onCancelForfeit: () => void;
  onRoom: () => void;
  onLeave: () => void;
}

/**
 * The duel screen as a pure view: header + clock, connection strip, scoreboard, the game's board, pause overlay, result
 * sheet and the forfeit confirmation, all from the snapshot and a few flags. The live screen (DuelScreen) and the games
 * playground render this same component.
 */
export function DuelMatchView({ snapshot, locale, copy, secondsLeft, connected, busy, error, confirmLeave, onSend, onExit, onConfirmForfeit, onCancelForfeit, onRoom, onLeave }: DuelMatchViewProps) {
  const live = snapshot.status === "active" || snapshot.status === "countdown" || snapshot.status === "paused";
  const mySeat = snapshot.mySeat as Seat;
  const names = seatNames(snapshot, copy);
  const view = snapshot.view as BuscaminasDuelView | PistasDuelView | UltimoDuelView | null;
  const turnSeat = (snapshot.game === "buscaminas" || snapshot.game === "ultimo") && view && (view as BuscaminasDuelView | UltimoDuelView).phase === "turn"
    ? (view as BuscaminasDuelView | UltimoDuelView).turn : null;
  // The clock is shown only while someone can act; a reveal's few seconds are not a countdown to worry about.
  const actionable = snapshot.status === "active" && !!view && (
    ((snapshot.game === "buscaminas" || snapshot.game === "ultimo") && (view as BuscaminasDuelView | UltimoDuelView).phase === "turn")
    || (snapshot.game === "pistas" && (view as PistasDuelView).phase === "clue"));
  const introPhase = snapshot.status === "ready" || snapshot.status === "countdown" || (snapshot.status === "paused" && snapshot.pausedFrom === "countdown");
  const awaySeat = snapshot.status === "paused" ? snapshot.seats.find((s) => !s.connected) : undefined;
  const finished = snapshot.status === "completed" || snapshot.status === "cancelled";
  // Último has no idle rule: a seat that stops answering simply loses each category to the clock.
  const idle = !view || snapshot.game === "ultimo" ? 0
    : snapshot.game === "buscaminas" ? (view as BuscaminasDuelView).timeouts[mySeat] : (view as PistasDuelView).idle[mySeat] >= 2 ? 1 : 0;

  return (
    <Shell>
      <header className="relative z-40 flex items-center gap-3">
        <button type="button" onClick={onExit} aria-label={live ? copy.forfeit.button : copy.result.exit} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-4" /></button>
        <p className="min-w-0 flex-1 truncate text-[13px] font-black uppercase tracking-wide" style={poppins}>{copy.games[snapshot.game]}</p>
        {live && actionable && secondsLeft !== null && <Clock seconds={secondsLeft} copy={copy} />}
      </header>

      {!connected && live && <p role="status" className="mt-2 rounded-xl bg-brand-orange/15 px-3 py-2 text-center text-xs font-semibold text-brand-orange-light">{copy.offline}</p>}

      {!introPhase && <Scoreboard snapshot={snapshot} names={names} turnSeat={turnSeat} copy={copy} />}

      {live && idle > 0 && <p className="mt-2 rounded-xl bg-brand-orange/15 px-3 py-2 text-center text-xs font-semibold text-brand-orange-light">{copy.idleWarning}</p>}

      <div className="mt-3 flex flex-1 flex-col">
        {introPhase && <DuelIntro snapshot={snapshot} names={names} copy={copy} secondsLeft={snapshot.status === "countdown" ? secondsLeft : null} />}
        {view && !introPhase && snapshot.game === "buscaminas" && (
          <BuscaminasDuelBoard view={view as BuscaminasDuelView} mySeat={mySeat} names={names} copy={copy} finished={finished || snapshot.status === "paused"}
            onPick={(cardId) => onSend({ type: "pick", round: (view as BuscaminasDuelView).round, at: (view as BuscaminasDuelView).pickIndex, cardId })} />
        )}
        {view && !introPhase && snapshot.game === "ultimo" && (
          <UltimoDuelBoard key={(view as UltimoDuelView).category} view={view as UltimoDuelView} mySeat={mySeat} names={names} copy={copy} finished={finished || snapshot.status === "paused"}
            secondsLeft={secondsLeft} busy={busy}
            onAnswer={(text) => {
              const { category, k } = view as UltimoDuelView;
              // Held until a snapshot shows the answer judged (a new attempt, another category, or the end).
              onSend({ type: "answer", cat: category, k, text }, (next) => {
                const shownView = next.view as UltimoDuelView | null;
                return !shownView || shownView.category !== category || shownView.k !== k || shownView.phase !== "turn";
              });
            }} />
        )}
        {view && !introPhase && snapshot.game === "pistas" && (
          <PistasDuelBoard key={(view as PistasDuelView).round} view={view as PistasDuelView} mySeat={mySeat} names={names} copy={copy} locale={locale} finished={finished || snapshot.status === "paused"}
            onGuess={(text) => onSend({ type: "guess", round: (view as PistasDuelView).round, text })}
            onPass={() => onSend({ type: "pass", round: (view as PistasDuelView).round, clue: (view as PistasDuelView).clue })} />
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p key={error} role="alert" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-sm rounded-xl bg-brand-red-soft/90 px-3 py-2 text-center text-sm font-semibold text-white">
            {copy.errors[error] ?? copy.errors.default}
          </motion.p>
        )}
      </AnimatePresence>

      {awaySeat && (
        <PauseOverlay mine={awaySeat.seat === mySeat} name={names[awaySeat.seat]} copy={copy} secondsLeft={secondsLeft} />
      )}

      {(snapshot.status === "completed" || snapshot.status === "cancelled") && (
        <ResultCard snapshot={snapshot} names={names} copy={copy} onRoom={onRoom} onExit={onLeave} />
      )}

      {confirmLeave && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-3xl bg-brand-blue p-5 text-center text-white">
            <p className="text-base font-bold">{copy.forfeit.confirm}</p>
            <button type="button" onClick={onConfirmForfeit} className="mt-4 h-12 w-full rounded-full bg-brand-red-soft text-sm font-black uppercase text-white" style={poppins}>{copy.forfeit.yes}</button>
            <button type="button" onClick={onCancelForfeit} className="mt-2 h-11 w-full rounded-full bg-white/15 text-sm font-bold uppercase text-white hover:bg-black/15" style={poppins}>{copy.forfeit.no}</button>
          </div>
        </div>
      )}
    </Shell>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface-page-alt text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-4 pt-[max(env(safe-area-inset-top),16px)]">{children}</div>
    </div>
  );
}

function seatNames(snapshot: DuelStatePayload, copy: DuelCopy): [string, string] {
  const name = (seat: DuelSeatPayload | undefined) => seat?.username?.trim() || copy.you;
  return [name(snapshot.seats.find((s) => s.seat === 0)), name(snapshot.seats.find((s) => s.seat === 1))];
}

function Scoreboard({ snapshot, names, turnSeat, copy }: { snapshot: DuelStatePayload; names: [string, string]; turnSeat: Seat | null; copy: DuelCopy }) {
  const view = snapshot.view as { scores?: [number, number] } | null;
  const scores = snapshot.result?.scores ?? view?.scores ?? [0, 0];
  const order: Seat[] = [snapshot.mySeat, snapshot.mySeat === 0 ? 1 : 0];
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {order.map((seat) => {
        const me = seat === snapshot.mySeat;
        const side = me ? "me" : "rival";
        return (
          <div key={seat} className={cn("flex items-center gap-2.5 rounded-2xl px-3 py-2 transition-colors", turnSeat === seat ? SEAT_BG[side] : "bg-white/[0.05]", !me && "flex-row-reverse text-right")}>
            <DuelAvatar size="xs"
              customization={seatAvatar(snapshot.seats.find((s) => s.seat === seat) ?? { userId: `seat-${seat}`, avatarCustomization: null, avatarUrl: null, isGuest: true })} />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-xs font-bold", SEAT_LABEL[side])}>{me ? copy.you : names[seat]}</p>
              <p className="text-2xl font-black leading-none tabular-nums" style={poppins}>{scores[seat]}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Quiet until the last 10 seconds: the clock is there so a match ends, not to rush anyone. */
function Clock({ seconds, copy }: { seconds: number; copy: DuelCopy }) {
  const urgent = seconds <= 10;
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-black tabular-nums transition-colors", urgent ? "bg-brand-red-soft/20 text-brand-red-light" : "bg-white/[0.06] text-white/50")} style={poppins}>
      {copy.secondsLeft(seconds)}
    </span>
  );
}

/** A seat has gone (the server paused the match): the clock is its reconnect window, not a game clock. */
function PauseOverlay({ mine, name, copy, secondsLeft }: { mine: boolean; name: string; copy: DuelCopy; secondsLeft: number | null }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-6" role="status" aria-live="polite">
      <div className="w-full max-w-sm rounded-3xl bg-brand-blue p-6 text-center text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
        <Loader2 className="mx-auto size-7 animate-spin text-white" />
        {mine ? (
          <p className="mt-3 text-base font-bold">{copy.pause.reconnecting}</p>
        ) : (
          <>
            <p className="mt-3 text-lg font-black" style={poppins}>{copy.pause.rivalGone(name)}</p>
            <p className="mt-1 text-sm text-white/85">{copy.pause.waiting}</p>
            {secondsLeft !== null && <p className="mt-3 text-4xl font-black tabular-nums text-white" style={poppins}>{`0:${String(secondsLeft).padStart(2, "0")}`}</p>}
            <p className="mt-2 text-xs text-white/85">{copy.pause.ifNotBack}</p>
          </>
        )}
      </div>
    </div>
  );
}

function ResultCard({ snapshot, names, copy, onRoom, onExit }: { snapshot: DuelStatePayload; names: [string, string]; copy: DuelCopy; onRoom: () => void; onExit: () => void }) {
  const result = snapshot.result;
  const me = snapshot.mySeat;
  const headline = !result || result.reason === "cancelled" ? copy.result.cancelled
    : result.winnerSeat === null ? copy.result.draw
    : result.winnerSeat === me ? copy.result.win : copy.result.lose;
  const left = result?.leftSeat ?? null;
  const leftName = left === null ? "" : left === me ? copy.you : names[left];
  const byMe = left === me;
  const reason = !result || left === null ? null
    : result.reason === "forfeit" ? (byMe ? copy.result.youForfeit : copy.result.forfeit(leftName))
    : result.reason === "idle" ? (byMe ? copy.result.youIdle : copy.result.idle(leftName))
    : result.reason === "disconnect" ? (byMe ? copy.result.youDisconnect : copy.result.disconnect(leftName))
    : result.reason === "cancelled" ? (byMe ? copy.result.youNoShow : copy.result.noShow(leftName)) : null;
  return (
    <>
    <div aria-hidden className="fixed inset-0 z-30 bg-black/55" />
    <motion.div role="dialog" aria-modal="true" initial={{ y: 40 }} animate={{ y: 0 }}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md rounded-t-3xl bg-brand-blue px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-5 text-white shadow-[0_-12px_40px_rgba(0,0,0,0.5)]">
      <p className="text-center text-3xl font-black uppercase" style={poppins}>{headline}</p>
      {result && result.reason !== "cancelled" && (
        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-start gap-3 text-center">
          <div className="min-w-0">
            <p className="text-4xl font-black leading-none tabular-nums" style={poppins}>{result.scores[me]}</p>
            <p className="mt-1 truncate text-xs font-bold uppercase text-white/85">{copy.you}</p>
          </div>
          <span className="text-4xl font-black leading-none text-white/40" style={poppins}>–</span>
          <div className="min-w-0">
            <p className="text-4xl font-black leading-none tabular-nums" style={poppins}>{result.scores[me === 0 ? 1 : 0]}</p>
            <p className="mt-1 truncate text-xs font-bold uppercase text-white/85">{names[me === 0 ? 1 : 0]}</p>
          </div>
        </div>
      )}
      {reason && <p className="mt-3 text-center text-sm text-white/85">{reason}</p>}
      <button type="button" onClick={onRoom} className="mt-5 h-14 w-full rounded-full bg-brand-green text-base font-black uppercase tracking-wide text-white hover:bg-brand-green-deep" style={poppins}>{copy.result.backToRoom}</button>
      <button type="button" onClick={onExit} className="mt-2 h-11 w-full rounded-full bg-white/15 text-sm font-bold uppercase text-white hover:bg-black/15" style={poppins}>{copy.result.exit}</button>
    </motion.div>
    </>
  );
}

export { Shell as DuelShell };

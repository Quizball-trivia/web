"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import type { Locale } from "@/lib/i18n/locale";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useRealtimePrincipal } from "@/lib/realtime/realtime-principal";
import { useActiveDuelStore } from "@/stores/activeDuel.store";
import type { DuelSeatPayload, DuelStatePayload } from "@/lib/realtime/socket.types";
import { duelCopy, type DuelCopy } from "./duel.copy";
import { SEAT_BG, SEAT_TEXT } from "./duel.seats";
import type { BuscaminasDuelView, PistasDuelView, Seat } from "./duel.views";
import { BuscaminasDuelBoard } from "./BuscaminasDuelBoard";
import { PistasDuelBoard } from "./PistasDuelBoard";
import { useDuel, useSecondsLeft } from "./useDuel";
import { DuelIntro } from "./DuelIntro";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;

/**
 * Everything on the duel screen belongs to one principal: signing in or out mid-match remounts it, so a
 * previous identity's snapshot and unacknowledged commands can never be shown to (or replayed as) the next one.
 */
export function DuelScreen({ matchId }: { matchId: string }) {
  const principal = useRealtimePrincipal();
  return <DuelRoom key={`${principal.kind}:${principal.userId ?? "none"}`} matchId={matchId} />;
}

function DuelRoom({ matchId }: { matchId: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = duelCopy(locale as Locale);
  const duel = useDuel(matchId);
  const { snapshot, error, fatal, clearError } = duel;
  const lobby = useRealtimeMatchStore((state) => state.lobby);
  const roomPath = snapshot?.lobbyId && lobby?.lobbyId === snapshot.lobbyId && lobby.inviteCode ? `/friend/room/${lobby.inviteCode}?source=rematch` : "/play/friend";
  const [confirmLeave, setConfirmLeave] = useState(false);
  const secondsLeft = useSecondsLeft(snapshot && ["ready", "countdown", "active", "paused"].includes(snapshot.status) ? snapshot.phaseDeadlineAt : null, duel.nowMs);

  // The screen keeps the browser's pointer to this duel current: live → remembered, finished → forgotten.
  const setActive = useActiveDuelStore((state) => state.set);
  const clearActive = useActiveDuelStore((state) => state.clear);
  const status = snapshot?.status;
  const game = snapshot?.game;
  const lobbyId = snapshot?.lobbyId ?? null;
  const owner = duel.principal.userId;
  useEffect(() => {
    if (!status || !game) return;
    if (status === "completed" || status === "cancelled") clearActive(matchId);
    else setActive({ matchId, game, lobbyId }, owner);
  }, [status, game, lobbyId, matchId, owner, setActive, clearActive]);

  useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(clearError, 3_000);
    return () => window.clearTimeout(id);
  }, [error, clearError]);

  const live = snapshot?.status === "active" || snapshot?.status === "countdown" || snapshot?.status === "paused";
  const exit = () => {
    if (live) {
      setConfirmLeave(true);
      return;
    }
    // Leaving at the ready gate cancels on the server, so the rival is not started into a match without us.
    if (snapshot?.status === "ready") duel.forfeit();
    router.push(roomPath);
  };

  if (!snapshot) {
    if (fatal) clearActive(matchId);
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          {fatal ? <p className="text-white/80">{copy.errors[fatal] ?? copy.errors.default}</p> : <Loader2 className="size-8 animate-spin text-white/60" />}
          {!fatal && <p className="text-sm text-white/60">{copy.connecting}</p>}
          {fatal && (
            <div className="flex gap-2">
              <button type="button" onClick={duel.resync} className="h-11 rounded-full bg-white/10 px-6 text-sm font-bold uppercase" style={poppins}>{copy.retry}</button>
              <button type="button" onClick={() => router.push("/play")} className="h-11 rounded-full bg-white/10 px-6 text-sm font-bold uppercase" style={poppins}>{copy.result.exit}</button>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  const mySeat = snapshot.mySeat as Seat;
  const names = seatNames(snapshot, copy);
  const view = snapshot.view as BuscaminasDuelView | PistasDuelView | null;
  const turnSeat = snapshot.game === "buscaminas" && view && (view as BuscaminasDuelView).phase === "turn" ? (view as BuscaminasDuelView).turn : null;
  // The clock is shown only while someone can act; a reveal's few seconds are not a countdown to worry about.
  const actionable = snapshot.status === "active" && !!view && ((snapshot.game === "buscaminas" && (view as BuscaminasDuelView).phase === "turn") || (snapshot.game === "pistas" && (view as PistasDuelView).phase === "clue"));
  const introPhase = snapshot.status === "ready" || snapshot.status === "countdown" || (snapshot.status === "paused" && snapshot.pausedFrom === "countdown");
  const awaySeat = snapshot.status === "paused" ? snapshot.seats.find((s) => !s.connected) : undefined;
  const finished = snapshot.status === "completed" || snapshot.status === "cancelled";
  const idle = !view ? 0 : snapshot.game === "buscaminas" ? (view as BuscaminasDuelView).timeouts[mySeat] : (view as PistasDuelView).idle[mySeat] >= 2 ? 1 : 0;

  return (
    <Shell>
      <header className="relative z-40 flex items-center gap-3">
        <button type="button" onClick={exit} aria-label={live ? copy.forfeit.button : copy.result.exit} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-4" /></button>
        <p className="min-w-0 flex-1 truncate text-[13px] font-black uppercase tracking-wide" style={poppins}>{copy.games[snapshot.game]}</p>
        {live && actionable && secondsLeft !== null && <Clock seconds={secondsLeft} copy={copy} />}
      </header>

      {!duel.connected && live && <p role="status" className="mt-2 rounded-xl bg-brand-orange/15 px-3 py-2 text-center text-xs font-semibold text-brand-orange-light">{copy.offline}</p>}

      {!introPhase && <Scoreboard snapshot={snapshot} names={names} turnSeat={turnSeat} copy={copy} />}

      {live && idle > 0 && <p className="mt-2 rounded-xl bg-brand-orange/15 px-3 py-2 text-center text-xs font-semibold text-brand-orange-light">{copy.idleWarning}</p>}

      <div className="mt-3 flex flex-1 flex-col">
        {introPhase && <DuelIntro snapshot={snapshot} names={names} copy={copy} secondsLeft={snapshot.status === "countdown" ? secondsLeft : null} />}
        {view && !introPhase && snapshot.game === "buscaminas" && (
          <BuscaminasDuelBoard view={view as BuscaminasDuelView} mySeat={mySeat} names={names} copy={copy} finished={finished || snapshot.status === "paused"}
            onPick={(cardId) => duel.send({ type: "pick", round: (view as BuscaminasDuelView).round, at: (view as BuscaminasDuelView).pickIndex, cardId })} />
        )}
        {view && !introPhase && snapshot.game === "pistas" && (
          <PistasDuelBoard key={(view as PistasDuelView).round} view={view as PistasDuelView} mySeat={mySeat} names={names} copy={copy} locale={locale as Locale} finished={finished || snapshot.status === "paused"}
            onGuess={(text) => duel.send({ type: "guess", round: (view as PistasDuelView).round, text })}
            onPass={() => duel.send({ type: "pass", round: (view as PistasDuelView).round, clue: (view as PistasDuelView).clue })} />
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
        <ResultCard snapshot={snapshot} names={names} copy={copy} onRoom={() => router.push(roomPath)} onExit={() => router.push("/play")} />
      )}

      {confirmLeave && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-3xl bg-surface-page-deep p-5 text-center">
            <p className="text-base font-bold">{copy.forfeit.confirm}</p>
            <button type="button" onClick={() => { setConfirmLeave(false); duel.forfeit(); }} className="mt-4 h-12 w-full rounded-full bg-brand-red-soft text-sm font-black uppercase text-white" style={poppins}>{copy.forfeit.yes}</button>
            <button type="button" onClick={() => setConfirmLeave(false)} className="mt-2 h-11 w-full rounded-full bg-white/10 text-sm font-bold uppercase" style={poppins}>{copy.forfeit.no}</button>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
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
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-black uppercase", SEAT_TEXT[side])} style={poppins}>{names[seat].slice(0, 1)}</span>
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-xs font-bold", SEAT_TEXT[side])}>{me ? copy.you : names[seat]}</p>
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
      <div className="w-full max-w-sm rounded-3xl bg-surface-page-deep p-6 text-center">
        <Loader2 className="mx-auto size-7 animate-spin text-sky-300" />
        {mine ? (
          <p className="mt-3 text-base font-bold">{copy.pause.reconnecting}</p>
        ) : (
          <>
            <p className="mt-3 text-lg font-black" style={poppins}>{copy.pause.rivalGone(name)}</p>
            <p className="mt-1 text-sm text-white/70">{copy.pause.waiting}</p>
            {secondsLeft !== null && <p className="mt-3 text-4xl font-black tabular-nums text-white" style={poppins}>{`0:${String(secondsLeft).padStart(2, "0")}`}</p>}
            <p className="mt-2 text-xs text-white/55">{copy.pause.ifNotBack}</p>
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
  const won = result?.winnerSeat === me && result.reason !== "cancelled";
  return (
    <>
    <div aria-hidden className="fixed inset-0 z-30 bg-black/55" />
    <motion.div role="dialog" aria-modal="true" initial={{ y: 40 }} animate={{ y: 0 }}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md rounded-t-3xl border-t border-white/10 bg-surface-page-deep px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-5 shadow-[0_-12px_40px_rgba(0,0,0,0.5)]">
      <p className={cn("text-center text-3xl font-black uppercase", won ? "text-brand-green-light" : "text-white")} style={poppins}>{headline}</p>
      {result && result.reason !== "cancelled" && (
        <p className="mt-1 text-center text-4xl font-black tabular-nums" style={poppins}>
          <span className={SEAT_TEXT.me}>{result.scores[me]}</span>
          <span className="mx-2 text-white/30">–</span>
          <span className={SEAT_TEXT.rival}>{result.scores[me === 0 ? 1 : 0]}</span>
        </p>
      )}
      {reason && <p className="mt-1 text-center text-sm text-white/65">{reason}</p>}
      <button type="button" onClick={onRoom} className="mt-5 h-14 w-full rounded-full bg-brand-green text-base font-black uppercase tracking-wide text-white hover:bg-brand-green-deep" style={poppins}>{copy.result.backToRoom}</button>
      <button type="button" onClick={onExit} className="mt-2 h-11 w-full rounded-full bg-white/10 text-sm font-bold uppercase text-white/85 hover:bg-white/15" style={poppins}>{copy.result.exit}</button>
    </motion.div>
    </>
  );
}
